import React, { useState } from 'react';
import {
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

const PRESET_OVERLAY_COLORS = ['#ef4444', '#38bdf8', '#22c55e', '#f59e0b'];

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

  const handleScrubStart = () => setIsScrubbingMobile(true);
  const handleScrubEnd = () => setIsScrubbingMobile(false);

  const renderControls = () => (
    <div className="space-y-5">
      {/* Section 1: Effect Mode & Strength */}
      <section aria-labelledby="section-effect-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="section-effect-heading"
            className="text-xs font-semibold text-slate-300"
          >
            효과 방식 및 강도
          </h2>
          <span className="font-mono-num text-xs font-medium text-sky-400">
            {settings.strength}%
          </span>
        </div>

        {/* Segmented Control: Blur vs Pixel Mosaic */}
        <div
          role="group"
          aria-label="모자이크 방식 선택"
          className="grid grid-cols-2 gap-1 p-1 bg-slate-950/90 border border-slate-800/80 rounded-xl"
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
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
                  active
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
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
            min={0}
            max={100}
            value={settings.strength}
            disabled={!hasImage}
            onPointerDown={handleScrubStart}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
            onChange={(e) =>
              onUpdateSettings({ strength: Number(e.target.value) })
            }
            className="studio-slider disabled:opacity-35"
          />
        </div>
      </section>

      <div className="h-px bg-slate-800/80" />

      {/* Section 2: Mask Action (Draw vs Erase) */}
      <section aria-labelledby="section-action-heading" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2
            id="section-action-heading"
            className="text-xs font-semibold text-slate-300"
          >
            마스크 동작
          </h2>
          <span className="text-[11px] text-slate-500">단축키 X</span>
        </div>

        <div
          role="group"
          aria-label="칠하기 또는 지우개 선택"
          className="grid grid-cols-2 gap-1 p-1 bg-slate-950/90 border border-slate-800/80 rounded-xl"
        >
          {(
            [
              { id: 'draw', label: '칠하기', icon: Paintbrush },
              { id: 'erase', label: '지우개', icon: Eraser },
            ] as {
              id: MaskAction;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
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
                className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
                  active
                    ? item.id === 'erase'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-slate-800/80" />

      {/* Section 3: Active Tool Specific Parameters */}
      <section aria-labelledby="section-tool-heading" className="space-y-4">
        <h2
          id="section-tool-heading"
          className="text-xs font-semibold text-slate-300"
        >
          도구 세부 조절
        </h2>

        {settings.tool === 'move' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                disabled={!hasImage}
                onClick={() => onZoomStep(1 / 1.25)}
                aria-label="축소"
                className="min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={onResetZoom100}
                className="min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono-num text-slate-200 transition-colors cursor-pointer disabled:opacity-35 whitespace-nowrap"
              >
                100%
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={onFitToScreen}
                className="min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-35 whitespace-nowrap"
              >
                맞춤
              </button>
              <button
                type="button"
                disabled={!hasImage}
                onClick={() => onZoomStep(1.25)}
                aria-label="확대"
                className="min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              현재 배율 <span className="font-mono-num text-slate-200">{zoomPercent}%</span> · 다른 도구를 쓰는 중에도{' '}
              <span className="text-slate-200 font-medium">스페이스바 + 드래그</span> 또는 두 손가락 핀치로 이동/확대할 수 있습니다.
            </p>
          </div>
        )}

        {settings.tool === 'brush' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <label htmlFor="brush-size-slider" className="text-slate-400">
                  브러쉬 크기 <span className="text-slate-500">(Ctrl+휠)</span>
                </label>
                <span className="font-mono-num text-slate-200">
                  {settings.size}px
                </span>
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
                className="studio-slider disabled:opacity-35"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <label htmlFor="brush-feather-slider" className="text-slate-400">
                  페더 부드러움 <span className="text-slate-500">(Shift+휠)</span>
                </label>
                <span className="font-mono-num text-slate-200">
                  {settings.feather}%
                </span>
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
                className="studio-slider disabled:opacity-35"
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Shift 키를 누른 채 드래그하면 반듯한 직선 형태로 칠해집니다.
            </p>
          </div>
        )}

        {(settings.tool === 'rect' || settings.tool === 'ellipse') && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <label htmlFor="shape-feather-slider" className="text-slate-400">
                  페더 부드러움 <span className="text-slate-500">(Shift+휠)</span>
                </label>
                <span className="font-mono-num text-slate-200">
                  {settings.feather}%
                </span>
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
                className="studio-slider disabled:opacity-35"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="shape-angle-slider" className="text-slate-400">
                  도형 회전 <span className="text-slate-500">(Alt+휠)</span>
                </label>
                <span className="font-mono-num text-slate-200">
                  {settings.angle}°
                </span>
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
                className="studio-slider disabled:opacity-35"
              />

              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  disabled={!hasImage}
                  onClick={() =>
                    onUpdateSettings(
                      { angle: normalizeAngle(settings.angle - 15) },
                      true
                    )
                  }
                  className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono-num text-slate-300 cursor-pointer disabled:opacity-35"
                >
                  -15°
                </button>
                <button
                  type="button"
                  disabled={!hasImage || settings.angle === 0}
                  onClick={() => onUpdateSettings({ angle: 0 }, true)}
                  className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-35"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>0° 초기화</span>
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
                  className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono-num text-slate-300 cursor-pointer disabled:opacity-35"
                >
                  +15°
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              모서리에서 반대편 모서리로 드래그하여 영역을 지정하세요. (Alt를 누른 채 드래그하면 중심에서 확장됩니다.)
            </p>
          </div>
        )}

        {settings.tool === 'linear' && (
          <p className="text-xs text-slate-400 leading-relaxed">
            드래그 시작 지점(100% 강도)에서 끝 지점(0%)까지 부드럽게 이어지는 선형 그라디언트 마스크를 적용합니다.
          </p>
        )}
      </section>

      <div className="h-px bg-slate-800/80" />

      {/* Section 4: Mask Overlay & Bulk Actions */}
      <section aria-labelledby="section-overlay-heading" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="overlay-toggle"
            id="section-overlay-heading"
            className="text-xs font-semibold text-slate-300 cursor-pointer select-none"
          >
            마스크 영역 색상 표시{' '}
            <span className="font-normal text-slate-500">(O)</span>
          </label>
          <input
            id="overlay-toggle"
            type="checkbox"
            checked={settings.overlayEnabled}
            disabled={!hasImage}
            onChange={(e) =>
              onUpdateSettings({ overlayEnabled: e.target.checked })
            }
            className="w-4 h-4 rounded accent-sky-500 cursor-pointer disabled:opacity-35"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">표시 색상</span>
          <div className="flex items-center gap-1.5">
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
                className={`w-5 h-5 rounded-full cursor-pointer transition-transform disabled:opacity-35 ${
                  settings.overlayColor.toLowerCase() === hex
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#11151E] scale-105'
                    : 'opacity-75 hover:opacity-100'
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
                className="w-6 h-6 rounded border border-slate-700 bg-transparent p-0 cursor-pointer disabled:opacity-35"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={!hasImage}
            onClick={onFillMask}
            className="min-h-[38px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-35 whitespace-nowrap"
          >
            전체 영역 채우기
          </button>
          <button
            type="button"
            disabled={!hasImage || isMaskEmpty}
            onClick={onClearMask}
            className="min-h-[38px] px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>전체 지우기</span>
          </button>
        </div>
      </section>

      {/* Desktop Keyboard Shortcuts Reference */}
      <details className="hidden md:block pt-2 border-t border-slate-800/80 group">
        <summary className="text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer select-none list-none flex items-center justify-between py-1">
          <span>키보드 및 마우스 단축키</span>
          <span className="text-slate-600 group-open:rotate-180 transition-transform">
            ▾
          </span>
        </summary>
        <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-400">
          <div className="flex justify-between">
            <span>화면 이동</span>
            <span className="font-mono-num text-slate-300">Space + 드래그</span>
          </div>
          <div className="flex justify-between">
            <span>브러쉬 크기</span>
            <span className="font-mono-num text-slate-300">[ / ] · Ctrl+휠</span>
          </div>
          <div className="flex justify-between">
            <span>페더 조절</span>
            <span className="font-mono-num text-slate-300">Shift + 휠</span>
          </div>
          <div className="flex justify-between">
            <span>도형 회전</span>
            <span className="font-mono-num text-slate-300">Alt + 휠</span>
          </div>
          <div className="flex justify-between">
            <span>칠하기 / 지우개 전환</span>
            <span className="font-mono-num text-slate-300">X</span>
          </div>
          <div className="flex justify-between">
            <span>원본 비교 (누르고 있기)</span>
            <span className="font-mono-num text-slate-300">\</span>
          </div>
        </div>
      </details>
    </div>
  );

  if (isDesktop) {
    return (
      <aside
        aria-label="도구 및 효과 설정 패널"
        className="flex flex-col w-[296px] bg-[#11151E] border-l border-slate-800/80 p-5 overflow-y-auto shrink-0 z-30"
      >
        {renderControls()}
      </aside>
    );
  }

  return (
    <div
      aria-hidden={!mobileOpen}
      className={`fixed inset-x-0 bottom-16 z-40 bg-[#151A26]/95 backdrop-blur-lg border-t border-slate-700/70 rounded-t-3xl shadow-2xl transition-all duration-200 ${
        mobileOpen
          ? 'translate-y-0 pointer-events-auto'
          : 'translate-y-[115%] pointer-events-none'
      } ${isScrubbingMobile ? 'opacity-20' : 'opacity-100'}`}
    >
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label="설정 패널 닫기"
        className="w-full py-2.5 flex items-center justify-center cursor-pointer"
      >
        <span className="w-11 h-1.5 rounded-full bg-slate-600" />
      </button>
      <div className="px-5 pb-4 max-h-[42dvh] overflow-y-auto">
        {renderControls()}
      </div>
    </div>
  );
};
