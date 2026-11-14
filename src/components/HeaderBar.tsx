import React from 'react';
import {
  Download,
  Eye,
  FolderOpen,
  Maximize2,
  Redo2,
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
  onOpenFileClick: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFitToScreen: () => void;
  onCompareChange: (comparing: boolean) => void;
  onExportFormatChange: (fmt: ExportFormat) => void;
  onSave: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  imageMeta,
  zoomPercent,
  canUndo,
  canRedo,
  isComparing,
  isSaving,
  exportFormat,
  onOpenFileClick,
  onUndo,
  onRedo,
  onFitToScreen,
  onCompareChange,
  onExportFormatChange,
  onSave,
}) => {
  const hasImage = Boolean(imageMeta);

  return (
    <header className="h-12 md:h-14 bg-[#0f0f10] border-b border-[#ededed]/[0.08] flex items-center justify-between gap-2 md:gap-6 px-3 md:px-4 shrink-0 z-40">
      {/* Zone 1: Wordmark + quiet file metadata */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <span className="text-base font-semibold tracking-tight text-[#ededed] whitespace-nowrap shrink-0">
          Blurify
        </span>
        {imageMeta && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#85858b] truncate">
            <span aria-hidden="true" className="text-[#ededed]/15">
              /
            </span>
            <span className="truncate max-w-[160px] text-[#a1a1a6]">
              {imageMeta.name}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num whitespace-nowrap">
              {imageMeta.width} × {imageMeta.height}
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Studio workspace controls (uniform 36px height, 16px / 1.5-stroke icons) */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenFileClick}
          className="h-9 min-w-[36px] px-2 sm:px-3 rounded-lg text-[13px] font-normal text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#232325] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-label="이미지 열기"
          title="새 이미지 열기"
        >
          <FolderOpen size={16} strokeWidth={1.5} className="text-[#85858b]" />
          <span className="hidden sm:inline">이미지 열기</span>
        </button>

        <div className="w-px h-4 bg-[#ededed]/[0.08] mx-1 hidden sm:block" />

        <button
          type="button"
          onClick={onUndo}
          disabled={!hasImage || !canUndo}
          className="h-9 w-9 rounded-lg text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#232325] disabled:opacity-25 disabled:pointer-events-none transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-label="실행 취소"
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo2 size={16} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!hasImage || !canRedo}
          className="h-9 w-9 rounded-lg text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#232325] disabled:opacity-25 disabled:pointer-events-none transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-label="다시 실행"
          title="다시 실행 (Ctrl+Y)"
        >
          <Redo2 size={16} strokeWidth={1.5} />
        </button>

        {hasImage && (
          <>
            <div className="w-px h-4 bg-[#ededed]/[0.08] mx-1 hidden sm:block" />

            <button
              type="button"
              onPointerDown={() => onCompareChange(true)}
              onPointerUp={() => onCompareChange(false)}
              onPointerLeave={() => onCompareChange(false)}
              onPointerCancel={() => onCompareChange(false)}
              className={`h-9 min-w-[36px] px-2 sm:px-3 rounded-lg text-[13px] font-normal transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
                isComparing
                  ? 'surface-active text-[#ededed] border border-[#ededed]/[0.12]'
                  : 'text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#232325]'
              }`}
              aria-label="원본 비교"
              title="누르고 있는 동안 원본 보기 (\)"
            >
              <Eye size={16} strokeWidth={1.5} className="text-[#85858b]" />
              <span className="hidden lg:inline">원본 비교</span>
            </button>

            <button
              type="button"
              onClick={onFitToScreen}
              className="hidden sm:flex h-9 px-3 rounded-lg text-[13px] font-normal text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#232325] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
              aria-label="화면에 맞추기"
              title="화면에 맞추기 (0)"
            >
              <Maximize2 size={16} strokeWidth={1.5} className="text-[#85858b]" />
              <span className="font-mono-num text-xs">{zoomPercent}%</span>
            </button>
          </>
        )}
      </div>

      {/* Zone 3: Format selector + Off-white primary action */}
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
              className="h-9 px-3 rounded-lg bg-[#19191b] border border-[#ededed]/[0.08] text-xs font-mono-num text-[#a1a1a6] hover:text-[#ededed] hover:border-[#ededed]/[0.16] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] cursor-pointer"
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
          className="h-9 px-4 rounded-lg bg-[#ededed] hover:bg-white active:scale-[0.98] text-[#141415] text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-[background-color,transform,opacity] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-30 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
        >
          <Download size={16} strokeWidth={1.5} />
          <span>{isSaving ? '저장 중' : '저장'}</span>
        </button>
      </div>
    </header>
  );
};
