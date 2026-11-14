import React from 'react';
import {
  Download,
  Eye,
  FolderOpen,
  Maximize2,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import type { ExportFormat, ImageMeta } from '../types/editor';

interface HeaderBarProps {
  imageMeta: ImageMeta | null;
  zoomPercent: number;
  canUndo: boolean;
  canRedo: boolean;
  isComparing: boolean;
  isSaving: boolean;
  exportFormat: ExportFormat;
  isMobileSheetOpen: boolean;
  onOpenFileClick: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFitToScreen: () => void;
  onCompareChange: (comparing: boolean) => void;
  onExportFormatChange: (fmt: ExportFormat) => void;
  onSave: () => void;
  onToggleMobileSheet: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  imageMeta,
  zoomPercent,
  canUndo,
  canRedo,
  isComparing,
  isSaving,
  exportFormat,
  isMobileSheetOpen,
  onOpenFileClick,
  onUndo,
  onRedo,
  onFitToScreen,
  onCompareChange,
  onExportFormatChange,
  onSave,
  onToggleMobileSheet,
}) => {
  const hasImage = Boolean(imageMeta);

  return (
    <header className="h-12 md:h-13 bg-[#11151E]/95 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-2 md:gap-6 px-3 md:px-5 shrink-0 z-40">
      {/* Zone 1: Brand wordmark + unboxed image metadata */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          Blurify
        </span>
        {imageMeta && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 truncate">
            <span aria-hidden="true" className="text-slate-700">
              /
            </span>
            <span className="truncate max-w-[160px] text-slate-300">
              {imageMeta.name}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num whitespace-nowrap">
              {imageMeta.width} × {imageMeta.height}
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Studio workspace actions */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenFileClick}
          className="h-9 min-w-[36px] sm:min-h-[40px] px-2 sm:px-3 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
          aria-label="이미지 열기"
          title="새 이미지 열기"
        >
          <FolderOpen className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">이미지 열기</span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5 hidden sm:block" />

        <button
          type="button"
          onClick={onUndo}
          disabled={!hasImage || !canUndo}
          className="h-9 w-9 sm:min-h-[40px] sm:min-w-[40px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 disabled:opacity-25 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
          aria-label="실행 취소"
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!hasImage || !canRedo}
          className="h-9 w-9 sm:min-h-[40px] sm:min-w-[40px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 disabled:opacity-25 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
          aria-label="다시 실행"
          title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {hasImage && (
          <>
            <div className="w-px h-4 bg-slate-800 mx-0.5 hidden sm:block" />

            <button
              type="button"
              onPointerDown={() => onCompareChange(true)}
              onPointerUp={() => onCompareChange(false)}
              onPointerLeave={() => onCompareChange(false)}
              onPointerCancel={() => onCompareChange(false)}
              className={`h-9 min-w-[36px] sm:min-h-[40px] px-2 sm:px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
                isComparing
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              aria-label="원본 비교 (누르고 있기)"
              title="누르고 있는 동안 원본 보기 (단축키: \)"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden lg:inline">원본 비교</span>
            </button>

            <button
              type="button"
              onClick={onFitToScreen}
              className="hidden sm:flex min-h-[40px] px-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              aria-label="화면에 맞추기"
              title="화면에 맞추기 (단축키: 0)"
            >
              <Maximize2 className="w-4 h-4 text-slate-400" />
              <span className="font-mono-num">{zoomPercent}%</span>
            </button>

            {/* Mobile-only inspector sheet toggle */}
            <button
              type="button"
              onClick={onToggleMobileSheet}
              aria-expanded={isMobileSheetOpen}
              aria-label="세부 설정 열기"
              className={`md:hidden h-9 w-9 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
                isMobileSheetOpen
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Zone 3: Format selector + Primary Save CTA */}
      <div className="flex items-center gap-2 shrink-0">
        {hasImage && (
          <label className="hidden sm:flex items-center">
            <span className="sr-only">저장 파일 형식</span>
            <select
              value={exportFormat}
              onChange={(e) =>
                onExportFormatChange(e.target.value as ExportFormat)
              }
              aria-label="저장 파일 형식"
              className="h-9 px-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/60 cursor-pointer"
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WebP</option>
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={!hasImage || isSaving}
          className="h-9 px-3.5 md:px-4 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 text-xs md:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-35 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Download className="w-4 h-4 stroke-[2.25]" />
          <span>{isSaving ? '저장 중...' : '저장'}</span>
        </button>
      </div>
    </header>
  );
};
