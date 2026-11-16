import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyWorkspace } from './components/EmptyWorkspace';
import { HeaderBar } from './components/HeaderBar';
import { InspectorPanel } from './components/InspectorPanel';
import { ToolPreviewOverlay } from './components/ToolPreviewOverlay';
import { DesktopToolRail, MobileToolBar } from './components/ToolRail';
import { BlurifyCanvasEngine } from './engine/canvasRenderer';
import { HistoryManager } from './engine/history';
import {
  clamp,
  computeFitTransform,
  computeZoomTransform,
  normalizeAngle,
  screenToImage,
} from './engine/math';
import {
  createSampleCanvas,
  ensureCanvasFontsLoaded,
} from './engine/sampleImage';
import type {
  EditorSettings,
  ExportFormat,
  ImageMeta,
  Point,
  ToolType,
  Transform,
} from './types/editor';

const INITIAL_SETTINGS: EditorSettings = {
  tool: 'move',
  action: 'draw',
  effectType: 'blur',
  strength: 32,
  size: 80,
  feather: 30,
  angle: 0,
  overlayEnabled: false,
  overlayColor: '#e5484d',
};

export default function App() {
  const engineRef = useRef<BlurifyCanvasEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new BlurifyCanvasEngine();
  }
  const historyRef = useRef<HistoryManager<HTMLCanvasElement>>(
    new HistoryManager<HTMLCanvasElement>(20)
  );

  const workspaceRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [settings, setSettings] = useState<EditorSettings>(INITIAL_SETTINGS);
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
    step: 0,
  });
  const [isMaskEmpty, setIsMaskEmpty] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('image/png');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : true
  );

  // Mutable refs for zero-latency 60Hz pointer/wheel interactions
  const settingsRef = useRef<EditorSettings>(settings);
  settingsRef.current = settings;

  const transformRef = useRef<Transform>(transform);
  transformRef.current = transform;

  const compareRef = useRef<boolean>(isComparing);
  compareRef.current = isComparing;

  const spaceHeldRef = useRef<boolean>(isSpaceHeld);
  spaceHeldRef.current = isSpaceHeld;

  const viewportSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const hoverImgPosRef = useRef<Point | null>(null);
  const panStateRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const pinchStateRef = useRef<{ dist: number; cx: number; cy: number }>({
    dist: 0,
    cx: 0,
    cy: 0,
  });
  const rafIdRef = useRef<number | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const renderNow = useCallback(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    const { width, height } = viewportSizeRef.current;
    if (!engine || !canvas || !engine.hasImage || width <= 0 || height <= 0) {
      return;
    }
    engine.renderToScreen(canvas, width, height, {
      transform: transformRef.current,
      settings: settingsRef.current,
      compareOriginal: compareRef.current,
      hoverImgPos: hoverImgPosRef.current,
    });
  }, []);

  const scheduleRender = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderNow();
    });
  }, [renderNow]);

  const syncHistoryFlags = useCallback(() => {
    const h = historyRef.current;
    const engine = engineRef.current!;
    setHistoryState({
      canUndo: h.canUndo,
      canRedo: h.canRedo,
      step: h.step,
    });
    setIsMaskEmpty(engine.isMaskEmpty());
  }, []);

  const triggerToolPreview = useCallback(() => {
    setPreviewVisible(true);
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = window.setTimeout(() => {
      setPreviewVisible(false);
    }, 900);
  }, []);

  const commitHistorySnapshot = useCallback(() => {
    const engine = engineRef.current!;
    historyRef.current.push(engine.captureMaskSnapshot());
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const applyTransform = useCallback(
    (next: Transform) => {
      transformRef.current = next;
      setTransform(next);
      scheduleRender();
    },
    [scheduleRender]
  );

  const fitToScreen = useCallback(() => {
    const engine = engineRef.current!;
    const ws = workspaceRef.current;
    if (!engine.hasImage || !ws) return;
    const rect = ws.getBoundingClientRect();
    const width = rect.width || viewportSizeRef.current.width;
    const height = rect.height || viewportSizeRef.current.height;
    if (width <= 0 || height <= 0) return;
    viewportSizeRef.current = { width, height };
    const next = computeFitTransform(
      width,
      height,
      engine.width,
      engine.height,
      width < 500 ? 14 : 28
    );
    applyTransform(next);
  }, [applyTransform]);

  const resetZoom100 = useCallback(() => {
    const engine = engineRef.current!;
    if (!engine.hasImage) return;
    const { width, height } = viewportSizeRef.current;
    applyTransform({
      scale: 1,
      x: (width - engine.width) / 2,
      y: (height - engine.height) / 2,
    });
  }, [applyTransform]);

  const zoomStep = useCallback(
    (factor: number) => {
      const { width, height } = viewportSizeRef.current;
      const next = computeZoomTransform(
        transformRef.current,
        factor,
        width / 2,
        height / 2
      );
      applyTransform(next);
    },
    [applyTransform]
  );

  const initializeSource = useCallback(
    (source: HTMLImageElement | HTMLCanvasElement, name: string) => {
      const engine = engineRef.current!;
      setErrorMessage(null);

      const nextTool: ToolType =
        settingsRef.current.tool === 'move' ? 'brush' : settingsRef.current.tool;
      const nextSettings: EditorSettings = {
        ...settingsRef.current,
        tool: nextTool,
      };
      settingsRef.current = nextSettings;
      setSettings(nextSettings);

      engine.loadSource(
        source,
        nextSettings.effectType,
        nextSettings.strength
      );

      historyRef.current.reset(engine.captureMaskSnapshot());
      syncHistoryFlags();

      setImageMeta({
        name,
        width: engine.width,
        height: engine.height,
      });

      const { width, height } = viewportSizeRef.current;
      if (width > 0 && height > 0) {
        const fit = computeFitTransform(
          width,
          height,
          engine.width,
          engine.height
        );
        transformRef.current = fit;
        setTransform(fit);
      }
      scheduleRender();
    },
    [scheduleRender, syncHistoryFlags]
  );

  const sampleLoadTokenRef = useRef(0);

  const loadImageFile = useCallback(
    (file: File) => {
      sampleLoadTokenRef.current += 1;
      if (!file.type.startsWith('image/')) {
        setErrorMessage('지원되는 이미지 파일(PNG, JPG, WebP 등)을 선택해 주세요.');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        initializeSource(img, file.name);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setErrorMessage('이미지를 불러오지 못했습니다. 손상되지 않은 다른 파일을 시도해 주세요.');
      };
      img.src = objectUrl;
    },
    [initializeSource]
  );

  const handleLoadSample = useCallback(() => {
    const token = ++sampleLoadTokenRef.current;
    const sample = createSampleCanvas();
    initializeSource(sample, 'sample_privacy_scene.png');

    ensureCanvasFontsLoaded().then(() => {
      const engine = engineRef.current;
      if (
        sampleLoadTokenRef.current === token &&
        engine?.hasImage &&
        engine.isMaskEmpty() &&
        !engine.interacting
      ) {
        const refreshed = createSampleCanvas();
        initializeSource(refreshed, 'sample_privacy_scene.png');
      }
    });
  }, [initializeSource]);

  const handleUndo = useCallback(() => {
    const snap = historyRef.current.undo();
    if (!snap) return;
    engineRef.current!.restoreMaskSnapshot(snap);
    syncHistoryFlags();
    scheduleRender();
  }, [scheduleRender, syncHistoryFlags]);

  const handleRedo = useCallback(() => {
    const snap = historyRef.current.redo();
    if (!snap) return;
    engineRef.current!.restoreMaskSnapshot(snap);
    syncHistoryFlags();
    scheduleRender();
  }, [scheduleRender, syncHistoryFlags]);

  const handleClearMask = useCallback(() => {
    const engine = engineRef.current!;
    if (!engine.hasImage || engine.isMaskEmpty()) return;
    engine.clearMask();
    commitHistorySnapshot();
    scheduleRender();
  }, [commitHistorySnapshot, scheduleRender]);

  const handleFillMask = useCallback(() => {
    const engine = engineRef.current!;
    if (!engine.hasImage) return;
    const { effectType, strength } = settingsRef.current;
    if (engine.fillEntireMask(effectType, strength)) {
      commitHistorySnapshot();
      scheduleRender();
    }
  }, [commitHistorySnapshot, scheduleRender]);

  const updateSettings = useCallback(
    (patch: Partial<EditorSettings>, showPreview = false) => {
      const prev = settingsRef.current;
      const merged: EditorSettings = { ...prev, ...patch };
      settingsRef.current = merged;
      setSettings(merged);

      if (showPreview) {
        triggerToolPreview();
      }
      scheduleRender();
    },
    [scheduleRender, triggerToolPreview]
  );

  const handleSelectTool = useCallback(
    (clickedTool: ToolType) => {
      const isMobile = window.innerWidth < 768;
      if (settingsRef.current.tool === clickedTool) {
        if (isMobile) {
          setIsMobileSheetOpen((open) => !open);
        }
        return;
      }
      updateSettings({ tool: clickedTool });
    },
    [updateSettings]
  );

  const handleSave = useCallback(async () => {
    const engine = engineRef.current!;
    if (!engine.hasImage || isSaving) return;
    setIsSaving(true);
    try {
      const blob = await engine.exportBlob(exportFormat, 0.92);
      if (!blob) return;
      const ext =
        exportFormat === 'image/jpeg'
          ? 'jpg'
          : exportFormat === 'image/webp'
          ? 'webp'
          : 'png';
      const baseName = (imageMeta?.name || 'image')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '_');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `blurify_${baseName}.${ext}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } finally {
      setIsSaving(false);
    }
  }, [exportFormat, imageMeta?.name, isSaving]);

  // Track responsive breakpoint cleanly so only one Inspector / ToolRail mounts
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setIsMobileSheetOpen(false);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Observe workspace size changes and keep image framed cleanly
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const prevW = viewportSizeRef.current.width;
      const prevH = viewportSizeRef.current.height;
      viewportSizeRef.current = { width: rect.width, height: rect.height };

      const engine = engineRef.current!;
      if (engine.hasImage) {
        if (prevW === 0 || Math.abs(rect.width - prevW) > 240) {
          const fit = computeFitTransform(
            rect.width,
            rect.height,
            engine.width,
            engine.height,
            rect.width < 500 ? 14 : 28
          );
          transformRef.current = fit;
          setTransform(fit);
        } else if (prevW !== rect.width || prevH !== rect.height) {
          const cur = transformRef.current;
          const shifted: Transform = {
            scale: cur.scale,
            x: cur.x + (rect.width - prevW) / 2,
            y: cur.y + (rect.height - prevH) / 2,
          };
          transformRef.current = shifted;
          setTransform(shifted);
        }
        scheduleRender();
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [scheduleRender]);

  // Optional ?autostart=1 or ?sample=1 support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('sample') === '1') {
      handleLoadSample();
    }
  }, [handleLoadSample]);

  // Clipboard image paste support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            loadImageFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [loadImageFile]);

  // Global keyboard shortcuts
  useEffect(() => {
    const isTypingElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'SELECT' || tag === 'TEXTAREA') return true;
      if (tag === 'INPUT') {
        const type = (target as HTMLInputElement).type;
        return type !== 'range' && type !== 'checkbox' && type !== 'color';
      }
      return target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingElement(e.target)) return;

      if (e.code === 'Space') {
        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true;
          setIsSpaceHeld(true);
        }
        e.preventDefault();
        return;
      }

      if (!engineRef.current?.hasImage) return;

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (key === 'y') {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      if (e.key === '\\') {
        if (!compareRef.current) {
          compareRef.current = true;
          setIsComparing(true);
          scheduleRender();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'o') {
        e.preventDefault();
        updateSettings({ overlayEnabled: !settingsRef.current.overlayEnabled });
      } else if (key === 'x') {
        e.preventDefault();
        updateSettings({
          action: settingsRef.current.action === 'draw' ? 'erase' : 'draw',
        });
      } else if (key === 'v') {
        updateSettings({ tool: 'move' });
      } else if (key === 'b') {
        updateSettings({ tool: 'brush' });
      } else if (key === 'r') {
        updateSettings({ tool: 'rect' });
      } else if (key === 'e') {
        updateSettings({ tool: 'ellipse' });
      } else if (key === 'g') {
        updateSettings({ tool: 'linear' });
      } else if (key === '0') {
        fitToScreen();
      } else if (e.key === '[') {
        updateSettings(
          { size: clamp(settingsRef.current.size - 10, 5, 300) },
          true
        );
      } else if (e.key === ']') {
        updateSettings(
          { size: clamp(settingsRef.current.size + 10, 5, 300) },
          true
        );
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        setIsSpaceHeld(false);
      } else if (e.key === '\\') {
        compareRef.current = false;
        setIsComparing(false);
        scheduleRender();
      }
    };

    const onWindowBlur = () => {
      spaceHeldRef.current = false;
      setIsSpaceHeld(false);
      if (compareRef.current) {
        compareRef.current = false;
        setIsComparing(false);
        scheduleRender();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [fitToScreen, handleRedo, handleUndo, scheduleRender, updateSettings]);

  // Wheel zoom & modifier shortcuts on workspace
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const engine = engineRef.current!;
      if (!engine.hasImage) return;
      e.preventDefault();

      const cur = settingsRef.current;

      if (e.ctrlKey || e.metaKey) {
        if (cur.tool === 'brush') {
          const delta = e.deltaY < 0 ? 5 : -5;
          updateSettings({ size: clamp(cur.size + delta, 5, 300) }, true);
          return;
        }
      } else if (e.shiftKey) {
        if (cur.tool !== 'linear' && cur.tool !== 'move') {
          const delta = e.deltaY < 0 ? 3 : -3;
          updateSettings({ feather: clamp(cur.feather + delta, 0, 100) }, true);
          return;
        }
      } else if (e.altKey) {
        if (cur.tool === 'rect' || cur.tool === 'ellipse') {
          const delta = e.deltaY < 0 ? 5 : -5;
          updateSettings({ angle: normalizeAngle(cur.angle + delta) }, true);
          return;
        }
      }

      const rect = el.getBoundingClientRect();
      const posX = e.clientX - rect.left;
      const posY = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const next = computeZoomTransform(
        transformRef.current,
        zoomFactor,
        posX,
        posY
      );
      applyTransform(next);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyTransform, updateSettings]);

  // Touch gestures (1-finger paint/pan, 2-finger pinch-zoom + pan)
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const getLocalTouch = (t: Touch): Point => {
      const rect = el.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const onTouchStart = (e: TouchEvent) => {
      const engine = engineRef.current!;
      if (!engine.hasImage) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, input, select')) {
        return;
      }
      e.preventDefault();
      setIsMobileSheetOpen(false);

      if (e.touches.length >= 2) {
        if (engine.interacting) {
          engine.cancelInteraction();
          scheduleRender();
        }
        panStateRef.current.active = false;
        const p1 = getLocalTouch(e.touches[0]);
        const p2 = getLocalTouch(e.touches[1]);
        pinchStateRef.current = {
          dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
          cx: (p1.x + p2.x) / 2,
          cy: (p1.y + p2.y) / 2,
        };
        return;
      }

      if (e.touches.length === 1) {
        const pos = getLocalTouch(e.touches[0]);
        if (settingsRef.current.tool === 'move') {
          panStateRef.current = { active: true, lastX: pos.x, lastY: pos.y };
        } else {
          const imgPos = screenToImage(pos, transformRef.current);
          engine.beginInteraction(imgPos, settingsRef.current);
          scheduleRender();
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const engine = engineRef.current!;
      if (!engine.hasImage) return;
      e.preventDefault();

      if (e.touches.length >= 2) {
        const p1 = getLocalTouch(e.touches[0]);
        const p2 = getLocalTouch(e.touches[1]);
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;

        let next = transformRef.current;
        if (pinchStateRef.current.dist > 0) {
          next = computeZoomTransform(
            next,
            dist / pinchStateRef.current.dist,
            cx,
            cy
          );
          next = {
            ...next,
            x: next.x + (cx - pinchStateRef.current.cx),
            y: next.y + (cy - pinchStateRef.current.cy),
          };
        }
        pinchStateRef.current = { dist, cx, cy };
        applyTransform(next);
        return;
      }

      if (e.touches.length === 1) {
        const pos = getLocalTouch(e.touches[0]);
        if (panStateRef.current.active) {
          const dx = pos.x - panStateRef.current.lastX;
          const dy = pos.y - panStateRef.current.lastY;
          panStateRef.current.lastX = pos.x;
          panStateRef.current.lastY = pos.y;
          applyTransform({
            ...transformRef.current,
            x: transformRef.current.x + dx,
            y: transformRef.current.y + dy,
          });
        } else if (engine.interacting) {
          const imgPos = screenToImage(pos, transformRef.current);
          engine.updateInteraction(imgPos);
          scheduleRender();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const engine = engineRef.current!;
      if (engine.interacting && e.touches.length === 0) {
        if (engine.endInteraction()) {
          commitHistorySnapshot();
        }
        scheduleRender();
      }
      if (e.touches.length < 2) {
        pinchStateRef.current.dist = 0;
      }
      if (e.touches.length === 0) {
        panStateRef.current.active = false;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyTransform, commitHistorySnapshot, scheduleRender]);

  // Desktop mouse pointer handlers
  const getWorkspacePos = (clientX: number, clientY: number): Point => {
    const rect = workspaceRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const engine = engineRef.current!;
    if (!engine.hasImage) return;
    if (e.target instanceof HTMLElement && e.target.closest('button, input, select')) {
      return;
    }

    const pos = getWorkspacePos(e.clientX, e.clientY);

    // Middle button, Spacebar held, or Move tool -> Pan
    if (
      e.button === 1 ||
      (e.button === 0 &&
        (spaceHeldRef.current || settingsRef.current.tool === 'move'))
    ) {
      e.preventDefault();
      panStateRef.current = { active: true, lastX: pos.x, lastY: pos.y };
      setIsPanningActive(true);
      return;
    }

    if (e.button === 0) {
      const imgPos = screenToImage(pos, transformRef.current);
      hoverImgPosRef.current = imgPos;
      engine.beginInteraction(imgPos, settingsRef.current, {
        altKey: e.altKey,
        shiftKey: e.shiftKey,
      });
      scheduleRender();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const engine = engineRef.current!;
    if (!engine.hasImage) return;

    const pos = getWorkspacePos(e.clientX, e.clientY);
    const imgPos = screenToImage(pos, transformRef.current);
    hoverImgPosRef.current = imgPos;

    if (panStateRef.current.active) {
      const dx = pos.x - panStateRef.current.lastX;
      const dy = pos.y - panStateRef.current.lastY;
      panStateRef.current.lastX = pos.x;
      panStateRef.current.lastY = pos.y;
      applyTransform({
        ...transformRef.current,
        x: transformRef.current.x + dx,
        y: transformRef.current.y + dy,
      });
      return;
    }

    if (engine.interacting) {
      engine.updateInteraction(imgPos, {
        altKey: e.altKey,
        shiftKey: e.shiftKey,
      });
    }
    scheduleRender();
  };

  useEffect(() => {
    const onWindowMouseUp = (e: MouseEvent) => {
      if (panStateRef.current.active) {
        panStateRef.current.active = false;
        setIsPanningActive(false);
      }
      const engine = engineRef.current!;
      if (engine.interacting && e.button === 0) {
        if (engine.endInteraction()) {
          commitHistorySnapshot();
        }
        scheduleRender();
      }
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [commitHistorySnapshot, scheduleRender]);

  const handleMouseLeave = () => {
    hoverImgPosRef.current = null;
    scheduleRender();
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  const zoomPercent = Math.round(transform.scale * 100);
  const hasImage = Boolean(imageMeta);

  const workspaceCursor = !hasImage
    ? 'cursor-default'
    : isPanningActive
    ? 'cursor-grabbing'
    : isSpaceHeld || settings.tool === 'move'
    ? 'cursor-grab'
    : settings.tool === 'brush'
    ? 'cursor-none'
    : 'cursor-crosshair';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-dvh w-full flex flex-col bg-[#141415] text-[#ededed] select-none overflow-hidden"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadImageFile(file);
          e.target.value = '';
        }}
      />

      <HeaderBar
        imageMeta={imageMeta}
        zoomPercent={zoomPercent}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        isComparing={isComparing}
        isSaving={isSaving}
        exportFormat={exportFormat}
        onOpenFileClick={() => fileInputRef.current?.click()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFitToScreen={fitToScreen}
        onCompareChange={(comparing) => {
          compareRef.current = comparing;
          setIsComparing(comparing);
          scheduleRender();
        }}
        onExportFormatChange={setExportFormat}
        onSave={handleSave}
      />

      <div className="flex-1 flex min-h-0 relative">
        {isDesktop && (
          <DesktopToolRail
            activeTool={settings.tool}
            disabled={!hasImage}
            onSelectTool={handleSelectTool}
          />
        )}

        {/* Main Canvas Workspace */}
        <main
          ref={workspaceRef}
          data-testid="blurify-workspace"
          data-has-image={hasImage ? 'true' : 'false'}
          data-tool={settings.tool}
          data-effect={settings.effectType}
          data-history-step={historyState.step}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`flex-1 relative overflow-hidden workspace-grid ${
            hasImage ? 'touch-none' : 'touch-pan-y'
          } ${workspaceCursor}`}
        >
          {errorMessage && (
            <div
              role="alert"
              className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-[#19191b] border border-[#e5484d]/40 text-xs text-[#ededed] flex items-center gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[#a1a1a6] hover:text-[#ededed] font-medium cursor-pointer"
              >
                닫기
              </button>
            </div>
          )}

          {isComparing && hasImage && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md bg-[#0f0f10]/90 border border-[#ededed]/[0.10] text-xs font-normal text-[#ededed]">
              원본 미리보기
            </div>
          )}

          {!hasImage && (
            <EmptyWorkspace
              isDraggingOver={isDraggingOver}
              onOpenFileClick={() => fileInputRef.current?.click()}
              onLoadSample={handleLoadSample}
            />
          )}

          <canvas
            ref={canvasRef}
            data-testid="blurify-canvas"
            className={`absolute inset-0 w-full h-full ${
              hasImage ? 'block' : 'hidden'
            }`}
          />

          {hasImage && (
            <ToolPreviewOverlay
              visible={previewVisible}
              settings={settings}
              scale={transform.scale}
              imgWidth={imageMeta?.width ?? 0}
              imgHeight={imageMeta?.height ?? 0}
            />
          )}

          {/* Drag-over highlight overlay when an image is already open */}
          {hasImage && isDraggingOver && (
            <div className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-[#3b82f6] bg-[#19191b]/70 flex items-center justify-center z-30">
              <span className="px-4 py-2 rounded-lg bg-[#0f0f10] border border-[#ededed]/[0.10] text-sm font-medium text-[#ededed]">
                놓아서 새 이미지 열기
              </span>
            </div>
          )}
        </main>

        <InspectorPanel
          isDesktop={isDesktop}
          settings={settings}
          hasImage={hasImage}
          isMaskEmpty={isMaskEmpty}
          zoomPercent={zoomPercent}
          mobileOpen={isMobileSheetOpen}
          onCloseMobile={() => setIsMobileSheetOpen(false)}
          onUpdateSettings={updateSettings}
          onClearMask={handleClearMask}
          onFillMask={handleFillMask}
          onZoomStep={zoomStep}
          onResetZoom100={resetZoom100}
          onFitToScreen={fitToScreen}
        />
      </div>

      {!isDesktop && (
        <MobileToolBar
          activeTool={settings.tool}
          disabled={!hasImage}
          isInspectorOpen={isMobileSheetOpen}
          onSelectTool={handleSelectTool}
          onToggleInspector={() => setIsMobileSheetOpen((v) => !v)}
        />
      )}
    </div>
  );
}
