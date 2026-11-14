import React from 'react';
import { ImagePlus, Sparkles, Upload } from 'lucide-react';

interface EmptyWorkspaceProps {
  isDraggingOver: boolean;
  onOpenFileClick: () => void;
  onLoadSample: () => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  isDraggingOver,
  onOpenFileClick,
  onLoadSample,
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-20">
      <div
        className={`w-full max-w-lg rounded-2xl border transition-all duration-150 p-8 md:p-10 text-center ${
          isDraggingOver
            ? 'bg-sky-500/10 border-sky-400 scale-[1.01]'
            : 'bg-[#11151E]/90 border-slate-800/90'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-5 text-sky-400">
          <ImagePlus className="w-7 h-7" />
        </div>

        <h1
          className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight mb-2"
          style={{ textWrap: 'balance' }}
        >
          사진을 불러와 민감한 정보를 안전하게 가리세요
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-7">
          모든 이미지 처리는 서버 전송 없이 브라우저 내부에서만 이루어집니다.
          파일을 끌어다 놓거나 클립보드 이미지를 붙여넣으세요 (Ctrl+V).
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenFileClick}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Upload className="w-4 h-4 stroke-[2.25]" />
            <span>내 기기에서 사진 열기</span>
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-100 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>샘플 이미지 불러오기</span>
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
          <span>가우시안 블러 · 픽셀 모자이크</span>
          <span aria-hidden="true">·</span>
          <span>실시간 페더 브러쉬</span>
          <span aria-hidden="true">·</span>
          <span>회전 도형 및 그라디언트</span>
        </div>
      </div>
    </div>
  );
};
