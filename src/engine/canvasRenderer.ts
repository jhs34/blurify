import type {
  EditorSettings,
  EffectType,
  ExportFormat,
  MaskAction,
  Point,
  ToolType,
  Transform,
} from '../types/editor';
import {
  clamp,
  computeBlurPipelineParams,
  computePixelateParams,
  computeRotatedBox,
  computeStrokeFeatherParams,
} from './math';

interface DirtyBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RenderOptions {
  transform: Transform;
  settings: EditorSettings;
  compareOriginal: boolean;
  hoverImgPos: Point | null;
}

export class BlurifyCanvasEngine {
  private origCanvas = document.createElement('canvas');
  private origCtx = this.origCanvas.getContext('2d')!;

  private effectCanvas = document.createElement('canvas');
  private effectCtx = this.effectCanvas.getContext('2d')!;

  private maskCanvas = document.createElement('canvas');
  private maskCtx = this.maskCanvas.getContext('2d')!;

  private tempMaskCanvas = document.createElement('canvas');
  private tempMaskCtx = this.tempMaskCanvas.getContext('2d')!;

  private workMaskCanvas = document.createElement('canvas');
  private workMaskCtx = this.workMaskCanvas.getContext('2d')!;

  private scratchScaleCanvas = document.createElement('canvas');
  private scratchScaleCtx = this.scratchScaleCanvas.getContext('2d')!;

  private screenLayerCanvas = document.createElement('canvas');
  private screenLayerCtx = this.screenLayerCanvas.getContext('2d')!;

  private hasLoadedImage = false;
  private isDrawing = false;
  private strokeModified = false;

  private activeTool: ToolType = 'brush';
  private activeAction: MaskAction = 'draw';
  private activeAngle = 0;
  private activeFromCenter = false;
  private activeShiftStraight = false;
  private strokeDrawWidth = 0;
  private strokeBlurRadius = 0;

  private startPos: Point = { x: 0, y: 0 };
  private lastPos: Point = { x: 0, y: 0 };
  private currPos: Point = { x: 0, y: 0 };
  private dirtyBounds: DirtyBounds | null = null;
  private prevClippedBounds: DirtyBounds | null = null;

  get hasImage(): boolean {
    return this.hasLoadedImage;
  }

  get width(): number {
    return this.origCanvas.width;
  }

  get height(): number {
    return this.origCanvas.height;
  }

  get interacting(): boolean {
    return this.isDrawing;
  }

  loadSource(
    source: HTMLImageElement | HTMLCanvasElement,
    effectType: EffectType,
    strength: number
  ): void {
    const w = source.width;
    const h = source.height;
    if (w <= 0 || h <= 0) return;

    for (const c of [
      this.origCanvas,
      this.effectCanvas,
      this.maskCanvas,
      this.tempMaskCanvas,
      this.workMaskCanvas,
    ]) {
      c.width = w;
      c.height = h;
    }

    this.origCtx.clearRect(0, 0, w, h);
    this.origCtx.drawImage(source, 0, 0, w, h);

    this.maskCtx.clearRect(0, 0, w, h);
    this.tempMaskCtx.clearRect(0, 0, w, h);
    this.workMaskCtx.clearRect(0, 0, w, h);

    this.hasLoadedImage = true;
    this.isDrawing = false;
    this.strokeModified = false;

    this.rebuildEffect(effectType, strength);
  }

  rebuildEffect(effectType: EffectType, strength: number): void {
    if (!this.hasLoadedImage) return;
    const w = this.origCanvas.width;
    const h = this.origCanvas.height;

    this.effectCtx.clearRect(0, 0, w, h);
    this.effectCtx.drawImage(this.origCanvas, 0, 0, w, h);

    if (strength <= 0) return;

    if (effectType === 'pixelate') {
      const { cols, rows } = computePixelateParams(strength, w, h);
      this.scratchScaleCanvas.width = cols;
      this.scratchScaleCanvas.height = rows;

      this.scratchScaleCtx.imageSmoothingEnabled = true;
      this.scratchScaleCtx.imageSmoothingQuality = 'medium';
      this.scratchScaleCtx.clearRect(0, 0, cols, rows);
      this.scratchScaleCtx.drawImage(this.origCanvas, 0, 0, cols, rows);

      this.effectCtx.save();
      this.effectCtx.imageSmoothingEnabled = false;
      this.effectCtx.drawImage(
        this.scratchScaleCanvas,
        0,
        0,
        cols,
        rows,
        0,
        0,
        w,
        h
      );
      this.effectCtx.restore();
      return;
    }

    // Gaussian blur with edge-clamped padding to prevent dark/transparent border bleed
    const { scaleDown, scaledBlurRadius, padPx } = computeBlurPipelineParams(
      strength,
      w,
      h
    );
    const sw = Math.max(1, Math.round(w * scaleDown));
    const sh = Math.max(1, Math.round(h * scaleDown));
    const pw = sw + padPx * 2;
    const ph = sh + padPx * 2;

    this.scratchScaleCanvas.width = pw;
    this.scratchScaleCanvas.height = ph;
    const sCtx = this.scratchScaleCtx;
    sCtx.clearRect(0, 0, pw, ph);
    sCtx.imageSmoothingEnabled = true;

    // Draw main scaled image in center
    sCtx.drawImage(this.origCanvas, 0, 0, w, h, padPx, padPx, sw, sh);

    // Clamp 4 edges so blur kernel never samples transparent black outside image bounds
    sCtx.drawImage(this.origCanvas, 0, 0, w, 1, padPx, 0, sw, padPx); // top
    sCtx.drawImage(this.origCanvas, 0, h - 1, w, 1, padPx, padPx + sh, sw, padPx); // bottom
    sCtx.drawImage(this.origCanvas, 0, 0, 1, h, 0, padPx, padPx, sh); // left
    sCtx.drawImage(this.origCanvas, w - 1, 0, 1, h, padPx + sw, padPx, padPx, sh); // right

    // Clamp 4 corners
    sCtx.drawImage(this.origCanvas, 0, 0, 1, 1, 0, 0, padPx, padPx);
    sCtx.drawImage(this.origCanvas, w - 1, 0, 1, 1, padPx + sw, 0, padPx, padPx);
    sCtx.drawImage(this.origCanvas, 0, h - 1, 1, 1, 0, padPx + sh, padPx, padPx);
    sCtx.drawImage(
      this.origCanvas,
      w - 1,
      h - 1,
      1,
      1,
      padPx + sw,
      padPx + sh,
      padPx,
      padPx
    );

    // Apply blur in-place onto a clean region via filter
    const blurredTemp = document.createElement('canvas');
    blurredTemp.width = pw;
    blurredTemp.height = ph;
    const bCtx = blurredTemp.getContext('2d')!;
    bCtx.filter = `blur(${scaledBlurRadius}px)`;
    bCtx.drawImage(this.scratchScaleCanvas, 0, 0);
    bCtx.filter = 'none';

    this.effectCtx.imageSmoothingEnabled = true;
    this.effectCtx.imageSmoothingQuality = 'high';
    this.effectCtx.drawImage(blurredTemp, padPx, padPx, sw, sh, 0, 0, w, h);
  }

  captureMaskSnapshot(): HTMLCanvasElement {
    const snap = document.createElement('canvas');
    snap.width = Math.max(1, this.maskCanvas.width);
    snap.height = Math.max(1, this.maskCanvas.height);
    if (this.hasLoadedImage) {
      snap.getContext('2d')!.drawImage(this.maskCanvas, 0, 0);
    }
    return snap;
  }

  restoreMaskSnapshot(snap: HTMLCanvasElement): void {
    if (!this.hasLoadedImage) return;
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.maskCtx.drawImage(
      snap,
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    );
  }

  isMaskEmpty(): boolean {
    if (!this.hasLoadedImage) return true;
    // Quick sample check via downscaled 64x64 alpha probe
    const probeW = Math.min(64, this.maskCanvas.width);
    const probeH = Math.min(64, this.maskCanvas.height);
    const probe = document.createElement('canvas');
    probe.width = probeW;
    probe.height = probeH;
    const pCtx = probe.getContext('2d')!;
    pCtx.drawImage(this.maskCanvas, 0, 0, probeW, probeH);
    const data = pCtx.getImageData(0, 0, probeW, probeH).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return false;
    }
    return true;
  }

  clearMask(): boolean {
    if (!this.hasLoadedImage) return false;
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.workMaskCtx.clearRect(
      0,
      0,
      this.workMaskCanvas.width,
      this.workMaskCanvas.height
    );
    return true;
  }

  fillEntireMask(): boolean {
    if (!this.hasLoadedImage) return false;
    this.maskCtx.fillStyle = '#ffffff';
    this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    return true;
  }

  beginInteraction(
    imgPos: Point,
    settings: EditorSettings,
    modifiers: { altKey?: boolean; shiftKey?: boolean } = {}
  ): void {
    if (!this.hasLoadedImage || settings.tool === 'move') return;

    const w = this.origCanvas.width;
    const h = this.origCanvas.height;
    const params = computeStrokeFeatherParams(
      settings.tool,
      settings.size,
      settings.feather,
      w,
      h
    );

    this.isDrawing = true;
    this.strokeModified = false;
    this.activeTool = settings.tool;
    this.activeAction = settings.action;
    this.activeAngle = settings.angle;
    this.activeFromCenter = Boolean(modifiers.altKey);
    this.activeShiftStraight = Boolean(modifiers.shiftKey);
    this.strokeDrawWidth = params.drawWidth;
    this.strokeBlurRadius = params.blurRadius;

    this.startPos = { ...imgPos };
    this.lastPos = { ...imgPos };
    this.currPos = { ...imgPos };
    this.dirtyBounds = null;
    this.prevClippedBounds = null;

    this.tempMaskCtx.clearRect(0, 0, w, h);
    this.workMaskCtx.clearRect(0, 0, w, h);
    this.workMaskCtx.drawImage(this.maskCanvas, 0, 0);

    if (this.activeTool === 'brush') {
      this.drawBrushSegment(imgPos, true);
    }
  }

  updateInteraction(
    imgPos: Point,
    modifiers: { altKey?: boolean; shiftKey?: boolean } = {}
  ): void {
    if (!this.isDrawing || !this.hasLoadedImage) return;

    this.activeFromCenter = Boolean(modifiers.altKey);
    this.activeShiftStraight = Boolean(modifiers.shiftKey);
    this.currPos = { ...imgPos };

    if (this.activeTool === 'brush') {
      if (this.activeShiftStraight) {
        // Straight-line brush preview from startPos to currPos
        this.tempMaskCtx.clearRect(
          0,
          0,
          this.tempMaskCanvas.width,
          this.tempMaskCanvas.height
        );
        const ctx = this.tempMaskCtx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = this.strokeDrawWidth;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.startPos.x, this.startPos.y);
        ctx.lineTo(imgPos.x, imgPos.y);
        ctx.stroke();

        const r = this.strokeDrawWidth / 2 + 2;
        this.dirtyBounds = {
          minX: Math.min(this.startPos.x, imgPos.x) - r,
          minY: Math.min(this.startPos.y, imgPos.y) - r,
          maxX: Math.max(this.startPos.x, imgPos.x) + r,
          maxY: Math.max(this.startPos.y, imgPos.y) + r,
        };
        this.strokeModified = true;
        this.syncWorkingMask();
      } else {
        this.drawBrushSegment(imgPos, false);
      }
      return;
    }

    this.drawShapePreview(imgPos);
  }

  endInteraction(): boolean {
    if (!this.isDrawing) return false;
    this.isDrawing = false;

    if (!this.strokeModified) {
      this.tempMaskCtx.clearRect(
        0,
        0,
        this.tempMaskCanvas.width,
        this.tempMaskCanvas.height
      );
      return false;
    }

    // Commit workMaskCanvas directly so there is zero discrepancy with live preview
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.maskCtx.drawImage(this.workMaskCanvas, 0, 0);
    this.tempMaskCtx.clearRect(
      0,
      0,
      this.tempMaskCanvas.width,
      this.tempMaskCanvas.height
    );
    this.dirtyBounds = null;
    this.prevClippedBounds = null;
    this.strokeModified = false;
    return true;
  }

  cancelInteraction(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.strokeModified = false;
    this.dirtyBounds = null;
    this.prevClippedBounds = null;
    this.tempMaskCtx.clearRect(
      0,
      0,
      this.tempMaskCanvas.width,
      this.tempMaskCanvas.height
    );
  }

  private drawBrushSegment(pos: Point, isFirst: boolean): void {
    const ctx = this.tempMaskCtx;
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.strokeDrawWidth;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';

    ctx.beginPath();
    if (isFirst) {
      ctx.arc(pos.x, pos.y, this.strokeDrawWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(this.lastPos.x, this.lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    const r = this.strokeDrawWidth / 2 + 2;
    const segMinX = Math.min(this.lastPos.x, pos.x) - r;
    const segMinY = Math.min(this.lastPos.y, pos.y) - r;
    const segMaxX = Math.max(this.lastPos.x, pos.x) + r;
    const segMaxY = Math.max(this.lastPos.y, pos.y) + r;

    if (!this.dirtyBounds) {
      this.dirtyBounds = {
        minX: segMinX,
        minY: segMinY,
        maxX: segMaxX,
        maxY: segMaxY,
      };
    } else {
      this.dirtyBounds.minX = Math.min(this.dirtyBounds.minX, segMinX);
      this.dirtyBounds.minY = Math.min(this.dirtyBounds.minY, segMinY);
      this.dirtyBounds.maxX = Math.max(this.dirtyBounds.maxX, segMaxX);
      this.dirtyBounds.maxY = Math.max(this.dirtyBounds.maxY, segMaxY);
    }

    this.lastPos = { ...pos };
    this.strokeModified = true;
    this.syncWorkingMask();
  }

  private drawShapePreview(curr: Point): void {
    const w = this.tempMaskCanvas.width;
    const h = this.tempMaskCanvas.height;
    const ctx = this.tempMaskCtx;
    ctx.clearRect(0, 0, w, h);

    if (this.activeTool === 'linear') {
      const dist = Math.hypot(curr.x - this.startPos.x, curr.y - this.startPos.y);
      if (dist < 1) return;

      const grad = ctx.createLinearGradient(
        this.startPos.x,
        this.startPos.y,
        curr.x,
        curr.y
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      this.dirtyBounds = { minX: 0, minY: 0, maxX: w, maxY: h };
      this.strokeModified = true;
      this.syncWorkingMask();
      return;
    }

    const box = computeRotatedBox(
      this.startPos,
      curr,
      this.activeAngle,
      this.activeFromCenter
    );
    if (box.width < 1 || box.height < 1) return;

    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(box.cx, box.cy);
    ctx.rotate(box.angleRad);
    ctx.beginPath();
    if (this.activeTool === 'rect') {
      ctx.rect(-box.width / 2, -box.height / 2, box.width, box.height);
    } else if (this.activeTool === 'ellipse') {
      ctx.ellipse(0, 0, box.rx, box.ry, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();

    const diagRadius = Math.hypot(box.rx, box.ry) + 4;
    this.dirtyBounds = {
      minX: box.cx - diagRadius,
      minY: box.cy - diagRadius,
      maxX: box.cx + diagRadius,
      maxY: box.cy + diagRadius,
    };
    this.strokeModified = true;
    this.syncWorkingMask();
  }

  private syncWorkingMask(): void {
    const w = this.workMaskCanvas.width;
    const h = this.workMaskCanvas.height;

    if (!this.dirtyBounds) return;

    // For full-canvas tools like linear gradient (blurRadius === 0), fast full composite
    if (this.activeTool === 'linear') {
      this.workMaskCtx.clearRect(0, 0, w, h);
      this.workMaskCtx.drawImage(this.maskCanvas, 0, 0);
      this.workMaskCtx.save();
      this.workMaskCtx.globalCompositeOperation =
        this.activeAction === 'erase' ? 'destination-out' : 'source-over';
      this.workMaskCtx.drawImage(this.tempMaskCanvas, 0, 0);
      this.workMaskCtx.restore();
      return;
    }

    const pad = Math.ceil(this.strokeBlurRadius * 3.5 + 10);
    const curBox: DirtyBounds = {
      minX: clamp(Math.floor(this.dirtyBounds.minX - pad), 0, w),
      minY: clamp(Math.floor(this.dirtyBounds.minY - pad), 0, h),
      maxX: clamp(Math.ceil(this.dirtyBounds.maxX + pad), 0, w),
      maxY: clamp(Math.ceil(this.dirtyBounds.maxY + pad), 0, h),
    };

    const restoreBox: DirtyBounds = this.prevClippedBounds
      ? {
          minX: Math.min(curBox.minX, this.prevClippedBounds.minX),
          minY: Math.min(curBox.minY, this.prevClippedBounds.minY),
          maxX: Math.max(curBox.maxX, this.prevClippedBounds.maxX),
          maxY: Math.max(curBox.maxY, this.prevClippedBounds.maxY),
        }
      : curBox;

    const rw = restoreBox.maxX - restoreBox.minX;
    const rh = restoreBox.maxY - restoreBox.minY;
    if (rw <= 0 || rh <= 0) return;

    this.workMaskCtx.save();
    this.workMaskCtx.beginPath();
    this.workMaskCtx.rect(restoreBox.minX, restoreBox.minY, rw, rh);
    this.workMaskCtx.clip();

    this.workMaskCtx.clearRect(restoreBox.minX, restoreBox.minY, rw, rh);
    this.workMaskCtx.drawImage(
      this.maskCanvas,
      restoreBox.minX,
      restoreBox.minY,
      rw,
      rh,
      restoreBox.minX,
      restoreBox.minY,
      rw,
      rh
    );

    const cw = curBox.maxX - curBox.minX;
    const ch = curBox.maxY - curBox.minY;
    if (cw > 0 && ch > 0) {
      this.workMaskCtx.globalCompositeOperation =
        this.activeAction === 'erase' ? 'destination-out' : 'source-over';
      if (this.strokeBlurRadius > 0) {
        this.workMaskCtx.filter = `blur(${this.strokeBlurRadius}px)`;
      }
      // Expand source sample by pad so Gaussian blur at curBox edges sees neighboring pixels
      const srcMinX = clamp(curBox.minX - pad, 0, w);
      const srcMinY = clamp(curBox.minY - pad, 0, h);
      const srcMaxX = clamp(curBox.maxX + pad, 0, w);
      const srcMaxY = clamp(curBox.maxY + pad, 0, h);
      const srcW = srcMaxX - srcMinX;
      const srcH = srcMaxY - srcMinY;
      if (srcW > 0 && srcH > 0) {
        this.workMaskCtx.drawImage(
          this.tempMaskCanvas,
          srcMinX,
          srcMinY,
          srcW,
          srcH,
          srcMinX,
          srcMinY,
          srcW,
          srcH
        );
      }
      this.workMaskCtx.filter = 'none';
    }

    this.workMaskCtx.restore();
    this.prevClippedBounds = curBox;
  }

  renderToScreen(
    screenCanvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
    options: RenderOptions
  ): void {
    if (!this.hasLoadedImage || cssWidth <= 0 || cssHeight <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.max(1, Math.round(cssWidth * dpr));
    const targetH = Math.max(1, Math.round(cssHeight * dpr));

    if (screenCanvas.width !== targetW || screenCanvas.height !== targetH) {
      screenCanvas.width = targetW;
      screenCanvas.height = targetH;
    }
    if (
      this.screenLayerCanvas.width !== targetW ||
      this.screenLayerCanvas.height !== targetH
    ) {
      this.screenLayerCanvas.width = targetW;
      this.screenLayerCanvas.height = targetH;
    }

    const ctx = screenCanvas.getContext('2d')!;
    const layerCtx = this.screenLayerCtx;
    const { transform, settings, compareOriginal, hoverImgPos } = options;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const imgW = this.origCanvas.width;
    const imgH = this.origCanvas.height;
    const crispPixels = transform.scale >= 2.5;

    // 1. Subtle canvas elevation shadow + original image
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#090c10';
    ctx.fillRect(
      transform.x,
      transform.y,
      imgW * transform.scale,
      imgH * transform.scale
    );
    ctx.restore();

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.imageSmoothingEnabled = !crispPixels;
    ctx.drawImage(this.origCanvas, 0, 0);
    ctx.restore();

    const activeMask = this.isDrawing ? this.workMaskCanvas : this.maskCanvas;

    // 2. Masked blur / pixelate composite layer (skipped while holding Compare Original)
    if (!compareOriginal) {
      layerCtx.save();
      layerCtx.setTransform(1, 0, 0, 1, 0, 0);
      layerCtx.clearRect(0, 0, targetW, targetH);

      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layerCtx.save();
      layerCtx.translate(transform.x, transform.y);
      layerCtx.scale(transform.scale, transform.scale);
      layerCtx.imageSmoothingEnabled =
        settings.effectType === 'pixelate' ? false : !crispPixels;
      layerCtx.drawImage(this.effectCanvas, 0, 0);
      layerCtx.restore();

      layerCtx.globalCompositeOperation = 'destination-in';
      layerCtx.save();
      layerCtx.translate(transform.x, transform.y);
      layerCtx.scale(transform.scale, transform.scale);
      layerCtx.imageSmoothingEnabled = true;
      layerCtx.drawImage(activeMask, 0, 0);
      layerCtx.restore();
      layerCtx.restore();

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.screenLayerCanvas, 0, 0);
      ctx.restore();

      // 3. Optional tinted mask overlay
      if (settings.overlayEnabled) {
        layerCtx.save();
        layerCtx.setTransform(1, 0, 0, 1, 0, 0);
        layerCtx.clearRect(0, 0, targetW, targetH);
        layerCtx.fillStyle = settings.overlayColor;
        layerCtx.fillRect(0, 0, targetW, targetH);

        layerCtx.globalCompositeOperation = 'destination-in';
        layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        layerCtx.translate(transform.x, transform.y);
        layerCtx.scale(transform.scale, transform.scale);
        layerCtx.drawImage(activeMask, 0, 0);
        layerCtx.restore();

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(this.screenLayerCanvas, 0, 0);
        ctx.restore();
      }
    }

    // Crisp hairline border around photo boundary
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      transform.x,
      transform.y,
      imgW * transform.scale,
      imgH * transform.scale
    );

    // 4. Interactive shape drag guides
    if (this.isDrawing && this.activeTool !== 'move') {
      this.drawActiveInteractionGuides(ctx, transform);
    }

    // 5. Live hover cursor guide on desktop
    if (!this.isDrawing && hoverImgPos && settings.tool !== 'move') {
      this.drawHoverCursorGuide(ctx, hoverImgPos, transform, settings);
    }

    ctx.restore();
  }

  private drawActiveInteractionGuides(
    ctx: CanvasRenderingContext2D,
    transform: Transform
  ): void {
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const inv = 1 / transform.scale;
    const accent =
      this.activeAction === 'erase'
        ? 'rgba(248, 113, 113, 0.95)'
        : 'rgba(56, 189, 248, 0.95)';

    if (this.activeTool === 'brush' && this.activeShiftStraight) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.75 * inv;
      ctx.setLineDash([5 * inv, 4 * inv]);
      ctx.beginPath();
      ctx.moveTo(this.startPos.x, this.startPos.y);
      ctx.lineTo(this.currPos.x, this.currPos.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.activeTool === 'linear') {
      // Shadow under-stroke for contrast on bright photos
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.lineWidth = 3.5 * inv;
      ctx.beginPath();
      ctx.moveTo(this.startPos.x, this.startPos.y);
      ctx.lineTo(this.currPos.x, this.currPos.y);
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2 * inv;
      ctx.setLineDash([6 * inv, 4 * inv]);
      ctx.beginPath();
      ctx.moveTo(this.startPos.x, this.startPos.y);
      ctx.lineTo(this.currPos.x, this.currPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Perpendicular transition boundary lines at start (100%) and end (0%)
      const dx = this.currPos.x - this.startPos.x;
      const dy = this.currPos.y - this.startPos.y;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        const nx = (-dy / len) * (48 * inv);
        const ny = (dx / len) * (48 * inv);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.25 * inv;
        ctx.beginPath();
        ctx.moveTo(this.startPos.x - nx, this.startPos.y - ny);
        ctx.lineTo(this.startPos.x + nx, this.startPos.y + ny);
        ctx.moveTo(this.currPos.x - nx, this.currPos.y - ny);
        ctx.lineTo(this.currPos.x + nx, this.currPos.y + ny);
        ctx.stroke();
      }

      for (const [idx, pt] of [this.startPos, this.currPos].entries()) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 * inv, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? accent : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.5 * inv;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();
      }
    } else if (this.activeTool === 'rect' || this.activeTool === 'ellipse') {
      const box = computeRotatedBox(
        this.startPos,
        this.currPos,
        this.activeAngle,
        this.activeFromCenter
      );

      ctx.save();
      ctx.translate(box.cx, box.cy);
      ctx.rotate(box.angleRad);

      // Contrast shadow outline
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 3 * inv;
      ctx.beginPath();
      if (this.activeTool === 'rect') {
        ctx.rect(-box.width / 2, -box.height / 2, box.width, box.height);
      } else {
        ctx.ellipse(0, 0, box.rx, box.ry, 0, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Crisp dashed accent outline
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.75 * inv;
      ctx.setLineDash([6 * inv, 4 * inv]);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawHoverCursorGuide(
    ctx: CanvasRenderingContext2D,
    hoverImgPos: Point,
    transform: Transform,
    settings: EditorSettings
  ): void {
    const inv = 1 / transform.scale;
    const isErase = settings.action === 'erase';

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    if (settings.tool === 'brush') {
      const { outerSize, innerSize } = computeStrokeFeatherParams(
        'brush',
        settings.size,
        settings.feather,
        this.origCanvas.width,
        this.origCanvas.height
      );

      // Dark outer halo for visibility over white areas
      ctx.beginPath();
      ctx.arc(hoverImgPos.x, hoverImgPos.y, outerSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.lineWidth = 2.5 * inv;
      ctx.stroke();

      // Main outer ring
      ctx.strokeStyle = isErase
        ? 'rgba(248, 113, 113, 0.92)'
        : 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 1.25 * inv;
      ctx.stroke();

      // Inner solid-core feather ring
      if (settings.feather > 2 && innerSize > 4 * inv) {
        ctx.beginPath();
        ctx.arc(hoverImgPos.x, hoverImgPos.y, innerSize / 2, 0, Math.PI * 2);
        ctx.setLineDash([3 * inv, 3 * inv]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1 * inv;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(hoverImgPos.x, hoverImgPos.y, 1.75 * inv, 0, Math.PI * 2);
      ctx.fillStyle = isErase ? '#f87171' : '#38bdf8';
      ctx.fill();
    } else if (settings.tool === 'rect' || settings.tool === 'ellipse') {
      // Subtle angled crosshair showing active shape rotation angle
      const rad = (settings.angle * Math.PI) / 180;
      const arm = 10 * inv;
      ctx.translate(hoverImgPos.x, hoverImgPos.y);
      ctx.rotate(rad);

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.lineWidth = 2.5 * inv;
      ctx.beginPath();
      ctx.moveTo(-arm, 0);
      ctx.lineTo(arm, 0);
      ctx.moveTo(0, -arm);
      ctx.lineTo(0, arm);
      ctx.stroke();

      ctx.strokeStyle = isErase ? '#f87171' : '#ffffff';
      ctx.lineWidth = 1.25 * inv;
      ctx.stroke();
    }

    ctx.restore();
  }

  async exportBlob(format: ExportFormat, quality = 0.92): Promise<Blob | null> {
    if (!this.hasLoadedImage) return null;
    const w = this.origCanvas.width;
    const h = this.origCanvas.height;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = w;
    finalCanvas.height = h;
    const fCtx = finalCanvas.getContext('2d')!;

    if (format === 'image/jpeg') {
      fCtx.fillStyle = '#ffffff';
      fCtx.fillRect(0, 0, w, h);
    }
    fCtx.drawImage(this.origCanvas, 0, 0);

    const maskedEffect = document.createElement('canvas');
    maskedEffect.width = w;
    maskedEffect.height = h;
    const mCtx = maskedEffect.getContext('2d')!;
    mCtx.drawImage(this.effectCanvas, 0, 0);
    mCtx.globalCompositeOperation = 'destination-in';
    mCtx.drawImage(this.maskCanvas, 0, 0);

    fCtx.drawImage(maskedEffect, 0, 0);

    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => resolve(blob), format, quality);
    });
  }
}
