import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyWorkspaceProps {
  isDraggingOver: boolean;
  onOpenFileClick: () => void;
  onLoadSample: () => void;
}

const SPECIMEN_W = 420;
const SPECIMEN_H = 300;

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  isDraggingOver,
  onOpenFileClick,
  onLoadSample,
}) => {
  const specimenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sharpBufRef = useRef<HTMLCanvasElement | null>(null);
  const redactedBufRef = useRef<HTMLCanvasElement | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.46);
  const splitRef = useRef(0.46);

  const drawSplitFrame = useCallback((ratio: number) => {
    const canvas = specimenCanvasRef.current;
    const sharp = sharpBufRef.current;
    const redacted = redactedBufRef.current;
    if (!canvas || !sharp || !redacted) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tw = Math.round(SPECIMEN_W * dpr);
    const th = Math.round(SPECIMEN_H * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SPECIMEN_W, SPECIMEN_H);

    const splitX = Math.round(SPECIMEN_W * ratio);

    // Left: sharp original specimen
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, SPECIMEN_H);
    ctx.clip();
    ctx.drawImage(sharp, 0, 0, SPECIMEN_W, SPECIMEN_H);
    ctx.restore();

    // Right: redacted blur + pixelate specimen
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, SPECIMEN_W - splitX, SPECIMEN_H);
    ctx.clip();
    ctx.drawImage(redacted, 0, 0, SPECIMEN_W, SPECIMEN_H);
    ctx.restore();

    // Optical split divider hairline + grip reticle (Signature detail)
    ctx.strokeStyle = 'rgba(237, 237, 237, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(splitX + 0.5, 0);
    ctx.lineTo(splitX + 0.5, SPECIMEN_H);
    ctx.stroke();

    const handleY = SPECIMEN_H / 2;
    ctx.fillStyle = '#141415';
    ctx.strokeStyle = 'rgba(237, 237, 237, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(splitX, handleY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left/right chevrons inside optical reticle
    ctx.strokeStyle = '#ededed';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(splitX - 2.5, handleY - 3.5);
    ctx.lineTo(splitX - 5.5, handleY);
    ctx.lineTo(splitX - 2.5, handleY + 3.5);
    ctx.moveTo(splitX + 2.5, handleY - 3.5);
    ctx.lineTo(splitX + 5.5, handleY);
    ctx.lineTo(splitX + 2.5, handleY + 3.5);
    ctx.stroke();

    ctx.restore();
  }, []);

  // Pre-bake sharp & redacted specimen buffers ONCE on mount (0 per-frame allocations)
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(SPECIMEN_W * dpr);
    const bh = Math.round(SPECIMEN_H * dpr);

    const sharp = document.createElement('canvas');
    sharp.width = bw;
    sharp.height = bh;
    const sCtx = sharp.getContext('2d')!;
    sCtx.scale(dpr, dpr);

    // Warm darkroom surface
    sCtx.fillStyle = '#19191b';
    sCtx.fillRect(0, 0, SPECIMEN_W, SPECIMEN_H);

    // Top specimen: Staff ID / Contact Card (demonstrates Gaussian feather blur)
    sCtx.save();
    sCtx.translate(28, 24);
    sCtx.fillStyle = '#f4f4f5';
    roundRect(sCtx, 0, 0, 364, 116, 10);
    sCtx.fill();

    // Avatar silhouette
    sCtx.fillStyle = '#d4d4d8';
    roundRect(sCtx, 16, 18, 72, 80, 6);
    sCtx.fill();
    sCtx.fillStyle = '#52525b';
    sCtx.beginPath();
    sCtx.arc(52, 46, 15, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.beginPath();
    sCtx.ellipse(52, 88, 26, 20, 0, Math.PI, 0, false);
    sCtx.fill();

    sCtx.fillStyle = '#71717a';
    sCtx.font = '400 11px "JetBrains Mono", monospace';
    sCtx.fillText('SAMPLE PASS · 0000', 104, 34);

    sCtx.fillStyle = '#18181b';
    sCtx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    sCtx.fillText('홍길동 · Hong Gil-dong', 104, 62);

    sCtx.fillStyle = '#3f3f46';
    sCtx.font = '500 14px "JetBrains Mono", monospace';
    sCtx.fillText('010 0000 0000', 104, 88);
    sCtx.restore();

    // Bottom specimen: Korean Vehicle License Plate (demonstrates crisp Pixel Mosaic)
    sCtx.save();
    sCtx.translate(28, 164);
    sCtx.fillStyle = '#27272a';
    roundRect(sCtx, 0, 0, 364, 108, 12);
    sCtx.fill();

    sCtx.fillStyle = '#fafafa';
    roundRect(sCtx, 6, 6, 352, 96, 8);
    sCtx.fill();

    sCtx.fillStyle = '#1d4ed8';
    sCtx.fillRect(6, 6, 42, 96);
    sCtx.fillStyle = '#ffffff';
    sCtx.font = '600 11px "JetBrains Mono", monospace';
    sCtx.fillText('KOR', 15, 58);

    sCtx.fillStyle = '#18181b';
    sCtx.font = '600 44px "JetBrains Mono", monospace';
    sCtx.fillText('000가 0000', 74, 70);
    sCtx.restore();

    // Build redacted counterpart: top half Gaussian blur, bottom half Pixelate
    const redacted = document.createElement('canvas');
    redacted.width = bw;
    redacted.height = bh;
    const rCtx = redacted.getContext('2d')!;
    rCtx.drawImage(sharp, 0, 0);

    // Gaussian blur on upper card
    const blurTmp = document.createElement('canvas');
    blurTmp.width = bw;
    blurTmp.height = bh;
    const bCtx = blurTmp.getContext('2d')!;
    bCtx.filter = `blur(${9 * dpr}px)`;
    bCtx.drawImage(sharp, 0, 0);
    bCtx.filter = 'none';

    rCtx.save();
    rCtx.beginPath();
    rCtx.rect(28 * dpr, 24 * dpr, 364 * dpr, 116 * dpr);
    rCtx.clip();
    rCtx.drawImage(blurTmp, 0, 0);
    rCtx.restore();

    // Crisp pixel mosaic on lower license plate
    const blockPx = Math.max(4, Math.round(12 * dpr));
    const cols = Math.max(1, Math.round(bw / blockPx));
    const rows = Math.max(1, Math.round(bh / blockPx));
    const pixTmp = document.createElement('canvas');
    pixTmp.width = cols;
    pixTmp.height = rows;
    const pCtx = pixTmp.getContext('2d')!;
    pCtx.drawImage(sharp, 0, 0, cols, rows);

    rCtx.save();
    rCtx.beginPath();
    rCtx.rect(34 * dpr, 170 * dpr, 352 * dpr, 96 * dpr);
    rCtx.clip();
    rCtx.imageSmoothingEnabled = false;
    rCtx.drawImage(pixTmp, 0, 0, cols, rows, 0, 0, bw, bh);
    rCtx.restore();

    sharpBufRef.current = sharp;
    redactedBufRef.current = redacted;
    drawSplitFrame(splitRef.current);
  }, [drawSplitFrame]);

  const handleSpecimenMove = (clientX: number) => {
    const el = specimenCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = Math.min(
      0.88,
      Math.max(0.12, (clientX - rect.left) / Math.max(1, rect.width))
    );
    splitRef.current = next;
    setSplitRatio(next);
    drawSplitFrame(next);
  };

  return (
    <div
      data-testid="empty-workspace-scroll"
      className="absolute inset-0 z-20 overflow-y-auto overscroll-contain touch-pan-y @container"
    >
      <div className="min-h-full w-full flex flex-col px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
        <div
          className={`my-auto mx-auto w-full max-w-[900px] grid grid-cols-1 @[800px]:grid-cols-[minmax(0,1fr)_420px] gap-8 @[800px]:gap-12 items-center rounded-2xl p-4 sm:p-6 md:p-8 transition-colors duration-150 ${
            isDraggingOver
              ? 'bg-[#19191b] border border-[#3b82f6]'
              : 'bg-transparent border border-transparent'
          }`}
        >
          {/* Left: Calm, specific product copy + 1 primary & 1 secondary action */}
          <div className="space-y-6 text-left">
            <div className="space-y-3">
              <p className="text-xs font-mono-num text-[#85858b]">
                100% 로컬 브라우저 처리 · 무전송 편집기
              </p>
              <h1 className="text-[28px] md:text-[34px] font-medium leading-[1.18] tracking-[-0.02em] text-[#ededed]">
                얼굴, 차량 번호판, 문서 개인정보를 사진 위에서 바로 가리세요
              </h1>
              <p className="text-sm text-[#a1a1a6] leading-6 max-w-[44ch]">
                원본 이미지는 외부 서버로 업로드되지 않고 브라우저 안에서만 합성됩니다. 파일을 이 화면에 끌어다 놓거나 바로 열어 편집을 시작하세요.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={onOpenFileClick}
                className="h-11 px-5 rounded-lg bg-[#ededed] hover:bg-white active:scale-[0.98] text-[#141415] text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
              >
                <FolderOpen size={16} strokeWidth={1.5} />
                <span>내 기기에서 사진 열기</span>
              </button>

              <button
                type="button"
                onClick={onLoadSample}
                className="h-11 px-5 rounded-lg bg-[#232325] hover:bg-[#2a2a2d] active:scale-[0.98] border border-[#ededed]/[0.08] text-[#ededed] text-sm font-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
              >
                <span>샘플 이미지 불러오기</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#85858b]">
              <kbd className="keycap">Ctrl</kbd>
              <kbd className="keycap">V</kbd>
              <span>클립보드 캡처 이미지 바로 붙여넣기</span>
            </div>
          </div>

          {/* Right: "The Moment" — Live Interactive Split Redaction Specimen */}
          <div className="w-full max-w-[420px] mx-auto @[800px]:mx-0">
            {/* Nested radius math: outer 16px - 8px padding = 8px inner */}
            <div className="rounded-2xl bg-[#0f0f10] border border-[#ededed]/[0.08] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
              <canvas
                ref={specimenCanvasRef}
                onMouseMove={(e) => handleSpecimenMove(e.clientX)}
                onTouchMove={(e) => {
                  if (e.touches[0]) handleSpecimenMove(e.touches[0].clientX);
                }}
                aria-label="블러 및 픽셀 모자이크 전후 비교 미리보기"
                className="w-full aspect-[420/300] rounded-lg block cursor-ew-resize touch-pan-y"
              />
              <div className="flex items-center justify-between px-2 pt-2 pb-1 text-xs text-[#85858b]">
                <span>원본</span>
                <span className="font-mono-num">
                  분할 비교 {Math.round(splitRatio * 100)}%
                </span>
                <span>블러 · 픽셀 모자이크</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
