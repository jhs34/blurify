import React, { useState } from 'react';
import {
  ChevronDown,
  Eraser,
  Paintbrush,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { EditorSettings, EffectType, MaskAction } from '../types/editor';
import { normalizeAngle } from '../engine/math';

interface InspectorPanelProps {
  isDesktop: boolean;
  settings: EditorSettings;
  hasImage: boolean;
  isMaskEmpty: boolean;
  zoomPercent: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onUpdateSettings: (
    patch: Partial<EditorSettings>,
    triggerPreview?: boolean
  ) => void;
  onClearMask: () => void;
  onFillMask: () => void;
  onZoomStep: (factor: number) => void;
  onResetZoom100: () => void;
  onFitToScreen: () => void;
}

const PRESET_OVERLAY_COLORS = ['#e5484d', '#3b82f6', '#4cc38a', '#f59e0b'];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  isDesktop,
  settings,
  hasImage,
  isMaskEmpty,
  zoomPercent,
  mobileOpen,
  onCloseMobile,
  onUpdateSettings,
  onClearMask,
  onFillMask,
  onZoomStep,
  onResetZoom100,
  onFitToScreen,
}) => {
  const [isScrubbingMobile, setIsScrubbingMobile] = useState(false);
  const [selectedMobileTab, setSelectedMobileTab] =
    useState<MobileTabId>('effect');

  const handleScrubStart = () => setIsScrubbingMobile(true);
  const handleScrubEnd = () => setIsScrubbingMobile(false);

  const renderControls = () => (
    <div className="space-y-6">
      {/* Section 1: Effect Mode & Strength */}
      <section aria-labelledby="section-effect-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="section-effect-heading"
            className="text-xs font-medium text-[#a1a1a6]"
          >
            효과 방식 및 강도
          </h2>
          <span className="font-mono-num text-xs font-normal text-[#ededed]">
            {settings.strength}%
          </span>
        </div>

        {/* Nested radius math: outer 10px - 4px padding = 6px inner */}
        <div
          role="group"
          aria-label="모자이크 방식 선택"
          className="grid grid-cols-2 gap-1 p-1 bg-[#141415] border border-[#ededed]/[0.08] rounded-[10px]"
        >
          {(
            [
              { id: 'blur', label: '가우시안 블러' },
              { id: 'pixelate', label: '픽셀 모자이크' },
            ] as { id: EffectType; label: string }[]
          ).map((mode) => {
            const active = settings.effectType === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={!hasImage}
                onClick={() => onUpdateSettings({ effectType: mode.id })}
                aria-pressed={active}
                className={`h-9 px-3 rounded-[6px] text-[13px] font-normal transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
                  active
                    ? 'surface-active text-[#ededed]'
                    : 'text-[#85858b] hover:text-[#ededed]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="strength-slider" className="sr-only">
            효과 강도
          </label>
          <input
            id="strength-slider"
            type="range"
            min={1}
            max={100}
            value={settings.strength}
            disabled={!hasImage}
            onPointerDown={handleScrubStart}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
            onChange={(e) =>
              onUpdateSettings({ strength: Number(e.target.value) })
            }
            className="studio-slider disabled:opacity-30"
          />
        </div>
      </section>

      <div className="h-px bg-[#ededed]/[0.08]" />

      {/* Section 2: Mask Action (Draw vs Erase) — identical 36px inner height */}
      <section aria-labelledby="section-action-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="section-action-heading"
            className="text-xs font-medium text-[#a1a1a6]"
          >
            마스크 동작
          </h2>
          <kbd className="keycap hidden md:inline-flex">X</kbd>
        </div>

        <div
          role="group"
          aria-label="칠하기 또는 지우개 선택"
          className="grid grid-cols-2 gap-1 p-1 bg-[#141415] border border-[#ededed]/[0.08] rounded-[10px]"
        >
          {(
            [
              { id: 'draw', label: '칠하기', icon: Paintbrush },
              { id: 'erase', label: '지우개', icon: Eraser },
            ] as {
              id: MaskAction;
              label: string;
              icon: React.ComponentType<{
                size?: number;
                strokeWidth?: number;
                className?: string;
              }>;
            }[]
          ).map((item) => {
            const Icon = item.icon;
            const active = settings.action === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!hasImage}
                onClick={() => onUpdateSettings({ action: item.id })}
                aria-pressed={active}
                className={`h-9 px-3 rounded-[6px] text-[13px] font-normal flex items-center justify-center gap-2 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
                  active
                    ? item.id === 'erase'
                      ? 'bg-[#e5484d]/15 text-[#ff8b8e] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'surface-active text-[#ededed]'
                    : 'text-[#85858b] hover:text-[#ededed]'
                }`}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-[#ededed]/[0.08]" />

      {/* Section 3: Active Tool Specific Parameters */}
      <section aria-labelledby="section-tool-heading" className="space-y-4">
        <h2
          id="section-tool-heading"
          className="text-xs font-medium text-[#a1a1a6]"
        >
          도구 세부 조절
        </h2>

        {settings.tool === 'move' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                disabled={!hasImage}
                onClick={() => onZoomStep(1 / 1.25)}
                aria-label="축소"
                className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-[#a1a1a6] hover:text-[#ededed] flex items-center justify-center transition-colors duration-150 cursor-pointer disabled:opacity-30"
              >
                <ZoomOut size={16} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={onResetZoom100}
                className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-mono-num text-[#ededed] transition-colors duration-150 cursor-pointer disabled:opacity-30 whitespace-nowrap"
              >
                100%
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={onFitToScreen}
                className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-normal text-[#ededed] transition-colors duration-150 cursor-pointer disabled:opacity-30 whitespace-nowrap"
              >
                맞춤
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={() => onZoomStep(1.25)}
                aria-label="확대"
                className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-[#a1a1a6] hover:text-[#ededed] flex items-center justify-center transition-colors duration-150 cursor-pointer disabled:opacity-30"
              >
                <ZoomIn size={16} strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-xs text-[#85858b] leading-5">
              현재 배율 <span className="font-mono-num text-[#ededed]">{zoomPercent}%</span> · 다른 도구 사용 중에도 Space 드래그나 두 손가락 핀치로 화면을 이동합니다
            </p>
          </div>
        )}

        {settings.tool === 'brush' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <label htmlFor="brush-size-slider" className="text-[#a1a1a6]">
                  브러쉬 크기
                </label>
                <div className="flex items-center gap-2">
                  <kbd className="keycap hidden md:inline-flex">Ctrl+휠</kbd>
                  <span className="font-mono-num text-[#ededed] w-11 text-right">
                    {settings.size}px
                  </span>
                </div>
              </div>
              <input
                id="brush-size-slider"
                type="range"
                min={5}
                max={300}
                value={settings.size}
                disabled={!hasImage}
                onPointerDown={handleScrubStart}
                onPointerUp={handleScrubEnd}
                onPointerCancel={handleScrubEnd}
                onChange={(e) =>
                  onUpdateSettings({ size: Number(e.target.value) }, true)
                }
                className="studio-slider disabled:opacity-30"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <label htmlFor="brush-feather-slider" className="text-[#a1a1a6]">
                  페더 부드러움
                </label>
                <div className="flex items-center gap-2">
                  <kbd className="keycap hidden md:inline-flex">Shift+휠</kbd>
                  <span className="font-mono-num text-[#ededed] w-11 text-right">
                    {settings.feather}%
                  </span>
                </div>
              </div>
              <input
                id="brush-feather-slider"
                type="range"
                min={0}
                max={100}
                value={settings.feather}
                disabled={!hasImage}
                onPointerDown={handleScrubStart}
                onPointerUp={handleScrubEnd}
                onPointerCancel={handleScrubEnd}
                onChange={(e) =>
                  onUpdateSettings({ feather: Number(e.target.value) }, true)
                }
                className="studio-slider disabled:opacity-30"
              />
            </div>

            <p className="text-xs text-[#85858b] leading-5">
              Shift 키를 누른 채 드래그하면 직선으로 칠해집니다
            </p>
          </div>
        )}

        {(settings.tool === 'rect' || settings.tool === 'ellipse') && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <label htmlFor="shape-feather-slider" className="text-[#a1a1a6]">
                  페더 부드러움
                </label>
                <div className="flex items-center gap-2">
                  <kbd className="keycap hidden md:inline-flex">Shift+휠</kbd>
                  <span className="font-mono-num text-[#ededed] w-11 text-right">
                    {settings.feather}%
                  </span>
                </div>
              </div>
              <input
                id="shape-feather-slider"
                type="range"
                min={0}
                max={100}
                value={settings.feather}
                disabled={!hasImage}
                onPointerDown={handleScrubStart}
                onPointerUp={handleScrubEnd}
                onPointerCancel={handleScrubEnd}
                onChange={(e) =>
                  onUpdateSettings({ feather: Number(e.target.value) }, true)
                }
                className="studio-slider disabled:opacity-30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="shape-angle-slider" className="text-[#a1a1a6]">
                  도형 회전
                </label>
                <div className="flex items-center gap-2">
                  <kbd className="keycap hidden md:inline-flex">Alt+휠</kbd>
                  <span className="font-mono-num text-[#ededed] w-11 text-right">
                    {settings.angle}°
                  </span>
                </div>
              </div>
              <input
                id="shape-angle-slider"
                type="range"
                min={0}
                max={359}
                value={settings.angle}
                disabled={!hasImage}
                onPointerDown={handleScrubStart}
                onPointerUp={handleScrubEnd}
                onPointerCancel={handleScrubEnd}
                onChange={(e) =>
                  onUpdateSettings({ angle: Number(e.target.value) }, true)
                }
                className="studio-slider disabled:opacity-30"
              />

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={!hasImage}
                  onClick={() =>
                    onUpdateSettings(
                      { angle: normalizeAngle(settings.angle - 15) },
                      true
                    )
                  }
                  className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-mono-num text-[#a1a1a6] hover:text-[#ededed] transition-colors duration-150 cursor-pointer disabled:opacity-30"
                >
                  -15°
                </button>
                <button
                  type="button"
                  disabled={!hasImage || settings.angle === 0}
                  onClick={() => onUpdateSettings({ angle: 0 }, true)}
                  className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-normal text-[#a1a1a6] hover:text-[#ededed] flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-30"
                >
                  <RotateCcw size={14} strokeWidth={1.5} />
                  <span>0°</span>
                </button>
                <button
                  type="button"
                  disabled={!hasImage}
                  onClick={() =>
                    onUpdateSettings(
                      { angle: normalizeAngle(settings.angle + 15) },
                      true
                    )
                  }
                  className="h-9 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-mono-num text-[#a1a1a6] hover:text-[#ededed] transition-colors duration-150 cursor-pointer disabled:opacity-30"
                >
                  +15°
                </button>
              </div>
            </div>

            <p className="text-xs text-[#85858b] leading-5">
              대각선 모서리로 드래그하여 영역 지정 · Alt 드래그 시 중심 확장
            </p>
          </div>
        )}

        {settings.tool === 'linear' && (
          <p className="text-xs text-[#85858b] leading-5">
            시작 지점(100%)에서 끝 지점(0%)까지 선형 그라디언트 마스크를 적용합니다
          </p>
        )}
      </section>

      <div className="h-px bg-[#ededed]/[0.08]" />

      {/* Section 4: Mask Overlay & Bulk Actions */}
      <section aria-labelledby="section-overlay-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="overlay-toggle"
            id="section-overlay-heading"
            className="text-xs font-medium text-[#a1a1a6] cursor-pointer select-none"
          >
            마스크 영역 색상 표시
          </label>
          <div className="flex items-center gap-2">
            <kbd className="keycap hidden md:inline-flex">O</kbd>
            <input
              id="overlay-toggle"
              type="checkbox"
              checked={settings.overlayEnabled}
              disabled={!hasImage}
              onChange={(e) =>
                onUpdateSettings({ overlayEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded accent-[#ededed] cursor-pointer disabled:opacity-30"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#85858b]">표시 색상</span>
          <div className="flex items-center gap-2">
            {PRESET_OVERLAY_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                disabled={!hasImage}
                onClick={() =>
                  onUpdateSettings({
                    overlayColor: hex,
                    overlayEnabled: true,
                  })
                }
                aria-label={`오버레이 색상 ${hex}`}
                style={{ backgroundColor: hex }}
                className={`w-5 h-5 rounded-full cursor-pointer transition-opacity duration-150 disabled:opacity-30 ${
                  settings.overlayColor.toLowerCase() === hex
                    ? 'ring-2 ring-[#ededed] ring-offset-2 ring-offset-[#0f0f10] opacity-100'
                    : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
            <label className="relative flex items-center cursor-pointer">
              <span className="sr-only">사용자 지정 오버레이 색상</span>
              <input
                type="color"
                value={settings.overlayColor}
                disabled={!hasImage}
                onChange={(e) =>
                  onUpdateSettings({
                    overlayColor: e.target.value,
                    overlayEnabled: true,
                  })
                }
                aria-label="사용자 지정 마스크 색상"
                className="w-6 h-6 rounded border border-[#ededed]/[0.14] bg-transparent p-0 cursor-pointer disabled:opacity-30"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={!hasImage}
            onClick={onFillMask}
            className="h-9 px-3 rounded-lg bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-normal text-[#ededed] transition-colors duration-150 cursor-pointer disabled:opacity-30 whitespace-nowrap"
          >
            전체 영역 채우기
          </button>
          <button
            type="button"
            disabled={!hasImage || isMaskEmpty}
            onClick={onClearMask}
            className="h-9 px-3 rounded-lg bg-[#19191b] hover:bg-[#e5484d]/15 border border-[#ededed]/[0.08] hover:border-[#e5484d]/30 text-xs font-normal text-[#e5484d] flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer disabled:opacity-25 disabled:pointer-events-none whitespace-nowrap"
          >
            <Trash2 size={16} strokeWidth={1.5} />
            <span>전체 지우기</span>
          </button>
        </div>
      </section>

      {/* Desktop Keyboard Shortcuts Reference — aligned columns with keycaps */}
      <details className="hidden md:block pt-3 border-t border-[#ededed]/[0.08] group">
        <summary className="text-xs font-normal text-[#85858b] hover:text-[#ededed] cursor-pointer select-none list-none flex items-center justify-between py-1 transition-colors duration-150">
          <span>단축키 안내</span>
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            className="text-[#85858b] group-open:rotate-180 transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        </summary>
        <div className="mt-3 space-y-2 text-xs text-[#85858b]">
          <div className="flex items-center justify-between">
            <span>화면 이동</span>
            <kbd className="keycap">Space + 드래그</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>브러쉬 크기</span>
            <div className="flex items-center gap-1">
              <kbd className="keycap">[</kbd>
              <kbd className="keycap">]</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>도구 전환</span>
            <div className="flex items-center gap-1">
              <kbd className="keycap">V</kbd>
              <kbd className="keycap">B</kbd>
              <kbd className="keycap">R</kbd>
              <kbd className="keycap">E</kbd>
              <kbd className="keycap">G</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>원본 비교 홀드</span>
            <kbd className="keycap">\</kbd>
          </div>
        </div>
      </details>
    </div>
  );

  if (isDesktop) {
    return (
      <aside
        aria-label="도구 및 효과 설정 패널"
        className="flex flex-col w-[280px] bg-[#0f0f10] border-l border-[#ededed]/[0.08] p-4 overflow-y-auto shrink-0 z-30"
      >
        {renderControls()}
      </aside>
    );
  }

  // Mobile Contextual Slim Bar (~100px height instead of 42dvh sheet covering half the screen)
  const mobileTabs = getMobileTabs(settings.tool);
  const activeTabId = mobileTabs.some((t) => t.id === selectedMobileTab)
    ? selectedMobileTab
    : settings.tool === 'brush'
    ? 'size'
    : settings.tool === 'rect' || settings.tool === 'ellipse'
    ? 'angle'
    : settings.tool === 'move'
    ? 'zoom'
    : 'effect';

  const isErase = settings.action === 'erase';

  return (
    <section
      aria-label="모바일 도구 세부 설정 바"
      aria-hidden={!mobileOpen || !hasImage}
      data-testid="mobile-slim-inspector"
      className={`fixed inset-x-2 bottom-[72px] z-40 rounded-2xl bg-[#141415]/95 backdrop-blur-md border border-[#ededed]/[0.10] p-2 shadow-[0_8px_28px_rgba(0,0,0,0.55)] transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        mobileOpen && hasImage
          ? 'translate-y-0 pointer-events-auto'
          : 'translate-y-[130%] opacity-0 pointer-events-none'
      } ${isScrubbingMobile ? 'opacity-25' : ''}`}
    >
      {/* Row 1: 1-tap Draw/Erase chip + Contextual Parameter Tabs + Close */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!hasImage}
          onClick={() =>
            onUpdateSettings({ action: isErase ? 'draw' : 'erase' })
          }
          aria-label={isErase ? '현재 지우개 모드 (탭하여 칠하기로 전환)' : '현재 칠하기 모드 (탭하여 지우개로 전환)'}
          aria-pressed={isErase}
          className={`h-8 px-2.5 rounded-lg text-xs font-normal flex items-center gap-1.5 shrink-0 transition-colors duration-150 cursor-pointer ${
            isErase
              ? 'bg-[#e5484d]/20 text-[#ff8b8e] border border-[#e5484d]/35'
              : 'bg-[#232325] text-[#ededed] border border-[#ededed]/[0.08]'
          }`}
        >
          {isErase ? (
            <Eraser size={14} strokeWidth={1.5} />
          ) : (
            <Paintbrush size={14} strokeWidth={1.5} />
          )}
          <span>{isErase ? '지우개' : '칠하기'}</span>
        </button>

        <div className="w-px h-4 bg-[#ededed]/[0.10] shrink-0" aria-hidden="true" />

        <div
          role="tablist"
          aria-label="세부 조절 항목"
          className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0"
        >
          {mobileTabs.map((tab) => {
            const active = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={!hasImage}
                onClick={() => setSelectedMobileTab(tab.id)}
                className={`h-8 px-2.5 rounded-lg text-xs font-normal flex items-center justify-center shrink-0 whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'surface-active text-[#ededed] border border-[#ededed]/[0.10]'
                    : 'text-[#85858b] hover:text-[#ededed] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="설정 바 닫기"
          className="h-8 w-8 rounded-lg text-[#85858b] hover:text-[#ededed] hover:bg-[#232325] flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer"
        >
          <ChevronDown size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Hairline separator */}
      <div className="h-px bg-[#ededed]/[0.08] my-1.5" />

      {/* Row 2: Single active parameter row (zero vertical stacking) */}
      <div className="h-10 flex items-center gap-2.5 px-1">
        {activeTabId === 'effect' && (
          <>
            <div
              role="group"
              aria-label="모자이크 방식 선택"
              className="flex items-center gap-0.5 p-0.5 bg-[#0f0f10] border border-[#ededed]/[0.08] rounded-lg shrink-0"
            >
              {(
                [
                  { id: 'blur', label: '블러' },
                  { id: 'pixelate', label: '픽셀' },
                ] as { id: EffectType; label: string }[]
              ).map((mode) => {
                const active = settings.effectType === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={!hasImage}
                    onClick={() => onUpdateSettings({ effectType: mode.id })}
                    aria-pressed={active}
                    className={`h-7 px-2.5 rounded-[6px] text-xs font-normal transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                      active
                        ? 'surface-active text-[#ededed]'
                        : 'text-[#85858b] hover:text-[#ededed]'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <label htmlFor="mobile-strength-slider" className="sr-only">
              효과 강도
            </label>
            <input
              id="mobile-strength-slider"
              type="range"
              min={1}
              max={100}
              value={settings.strength}
              disabled={!hasImage}
              onPointerDown={handleScrubStart}
              onPointerUp={handleScrubEnd}
              onPointerCancel={handleScrubEnd}
              onChange={(e) =>
                onUpdateSettings({ strength: Number(e.target.value) })
              }
              className="studio-slider flex-1 min-w-0"
            />
            <span className="font-mono-num text-xs text-[#ededed] w-9 text-right shrink-0">
              {settings.strength}%
            </span>
          </>
        )}

        {activeTabId === 'size' && (
          <>
            <label
              htmlFor="mobile-size-slider"
              className="text-xs text-[#a1a1a6] whitespace-nowrap shrink-0"
            >
              브러쉬 크기
            </label>
            <input
              id="mobile-size-slider"
              type="range"
              min={5}
              max={300}
              value={settings.size}
              disabled={!hasImage}
              onPointerDown={handleScrubStart}
              onPointerUp={handleScrubEnd}
              onPointerCancel={handleScrubEnd}
              onChange={(e) =>
                onUpdateSettings({ size: Number(e.target.value) }, true)
              }
              className="studio-slider flex-1 min-w-0"
            />
            <span className="font-mono-num text-xs text-[#ededed] w-11 text-right shrink-0">
              {settings.size}px
            </span>
          </>
        )}

        {activeTabId === 'feather' && (
          <>
            <label
              htmlFor="mobile-feather-slider"
              className="text-xs text-[#a1a1a6] whitespace-nowrap shrink-0"
            >
              페더 부드러움
            </label>
            <input
              id="mobile-feather-slider"
              type="range"
              min={0}
              max={100}
              value={settings.feather}
              disabled={!hasImage}
              onPointerDown={handleScrubStart}
              onPointerUp={handleScrubEnd}
              onPointerCancel={handleScrubEnd}
              onChange={(e) =>
                onUpdateSettings({ feather: Number(e.target.value) }, true)
              }
              className="studio-slider flex-1 min-w-0"
            />
            <span className="font-mono-num text-xs text-[#ededed] w-10 text-right shrink-0">
              {settings.feather}%
            </span>
          </>
        )}

        {activeTabId === 'angle' && (
          <>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={!hasImage}
                onClick={() =>
                  onUpdateSettings(
                    { angle: normalizeAngle(settings.angle - 15) },
                    true
                  )
                }
                className="h-8 px-2 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-[11px] font-mono-num text-[#a1a1a6] active:text-[#ededed] cursor-pointer"
              >
                -15°
              </button>
              <button
                type="button"
                disabled={!hasImage || settings.angle === 0}
                onClick={() => onUpdateSettings({ angle: 0 }, true)}
                aria-label="회전 0도 초기화"
                className="h-8 px-2 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-[11px] font-mono-num text-[#a1a1a6] disabled:opacity-30 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} strokeWidth={1.5} />
                <span>0°</span>
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={() =>
                  onUpdateSettings(
                    { angle: normalizeAngle(settings.angle + 15) },
                    true
                  )
                }
                className="h-8 px-2 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-[11px] font-mono-num text-[#a1a1a6] active:text-[#ededed] cursor-pointer"
              >
                +15°
              </button>
            </div>
            <label htmlFor="mobile-angle-slider" className="sr-only">
              도형 회전
            </label>
            <input
              id="mobile-angle-slider"
              type="range"
              min={0}
              max={359}
              value={settings.angle}
              disabled={!hasImage}
              onPointerDown={handleScrubStart}
              onPointerUp={handleScrubEnd}
              onPointerCancel={handleScrubEnd}
              onChange={(e) =>
                onUpdateSettings({ angle: Number(e.target.value) }, true)
              }
              className="studio-slider flex-1 min-w-0"
            />
            <span className="font-mono-num text-xs text-[#ededed] w-9 text-right shrink-0">
              {settings.angle}°
            </span>
          </>
        )}

        {activeTabId === 'zoom' && (
          <div className="grid grid-cols-4 gap-1.5 w-full">
            <button
              type="button"
              disabled={!hasImage}
              onClick={() => onZoomStep(1 / 1.25)}
              aria-label="축소"
              className="h-8 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-[#a1a1a6] flex items-center justify-center cursor-pointer"
            >
              <ZoomOut size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              disabled={!hasImage}
              onClick={onResetZoom100}
              className="h-8 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-xs font-mono-num text-[#ededed] cursor-pointer"
            >
              100%
            </button>
            <button
              type="button"
              disabled={!hasImage}
              onClick={onFitToScreen}
              className="h-8 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-xs font-normal text-[#ededed] cursor-pointer"
            >
              맞춤
            </button>
            <button
              type="button"
              disabled={!hasImage}
              onClick={() => onZoomStep(1.25)}
              aria-label="확대"
              className="h-8 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-[#a1a1a6] flex items-center justify-center cursor-pointer"
            >
              <ZoomIn size={15} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {activeTabId === 'mask' && (
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!hasImage}
                onClick={() =>
                  onUpdateSettings({ overlayEnabled: !settings.overlayEnabled })
                }
                aria-pressed={settings.overlayEnabled}
                className={`h-8 px-2.5 rounded-lg text-xs font-normal flex items-center gap-1.5 border transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                  settings.overlayEnabled
                    ? 'surface-active text-[#ededed] border-[#ededed]/[0.14]'
                    : 'bg-[#19191b] text-[#85858b] border-[#ededed]/[0.08]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: settings.overlayColor }}
                />
                <span>영역 표시</span>
              </button>

              {PRESET_OVERLAY_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  disabled={!hasImage}
                  onClick={() =>
                    onUpdateSettings({
                      overlayColor: hex,
                      overlayEnabled: true,
                    })
                  }
                  aria-label={`오버레이 색상 ${hex}`}
                  style={{ backgroundColor: hex }}
                  className={`w-5 h-5 rounded-full shrink-0 cursor-pointer transition-opacity duration-150 ${
                    settings.overlayColor.toLowerCase() === hex
                      ? 'ring-2 ring-[#ededed] ring-offset-1 ring-offset-[#141415] opacity-100'
                      : 'opacity-65'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!hasImage}
                onClick={onFillMask}
                className="h-8 px-2.5 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-xs font-normal text-[#ededed] whitespace-nowrap cursor-pointer"
              >
                채우기
              </button>
              <button
                type="button"
                disabled={!hasImage || isMaskEmpty}
                onClick={onClearMask}
                aria-label="전체 마스크 지우기"
                className="h-8 px-2.5 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-xs font-normal text-[#e5484d] flex items-center gap-1 whitespace-nowrap disabled:opacity-30 cursor-pointer"
              >
                <Trash2 size={13} strokeWidth={1.5} />
                <span>초기화</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

type MobileTabId = 'effect' | 'size' | 'feather' | 'angle' | 'zoom' | 'mask';

interface MobileTabItem {
  id: MobileTabId;
  label: string;
}

function getMobileTabs(tool: EditorSettings['tool']): MobileTabItem[] {
  const tabs: MobileTabItem[] = [{ id: 'effect', label: '효과' }];

  if (tool === 'brush') {
    tabs.push({ id: 'size', label: '크기' });
    tabs.push({ id: 'feather', label: '페더' });
  } else if (tool === 'rect' || tool === 'ellipse') {
    tabs.push({ id: 'angle', label: '회전' });
    tabs.push({ id: 'feather', label: '페더' });
  } else if (tool === 'move') {
    tabs.push({ id: 'zoom', label: '배율' });
  }

  tabs.push({ id: 'mask', label: '마스크' });
  return tabs;
}
