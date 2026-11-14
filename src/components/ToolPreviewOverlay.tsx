import React from 'react';
import type { EditorSettings } from '../types/editor';
import { computeBrushImageSize } from '../engine/math';

interface ToolPreviewOverlayProps {
  visible: boolean;
  settings: EditorSettings;
  scale: number;
  imgWidth: number;
  imgHeight: number;
}

export const ToolPreviewOverlay: React.FC<ToolPreviewOverlayProps> = ({
  visible,
  settings,
  scale,
  imgWidth,
  imgHeight,
}) => {
  if (
    settings.tool === 'move' ||
    settings.tool === 'linear' ||
    imgWidth <= 0 ||
    imgHeight <= 0
  ) {
    return null;
  }

  const f = settings.feather / 100;
  let outerW = 0;
  let outerH = 0;
  let borderRadius = '50%';
  let rotation = 0;

  if (settings.tool === 'brush') {
    const brushScreenSize = computeBrushImageSize(
      settings.size,
      imgWidth,
      imgHeight
    ) * scale;
    outerW = Math.max(8, Math.min(brushScreenSize, 480));
    outerH = outerW;
    borderRadius = '50%';
  } else if (settings.tool === 'ellipse') {
    outerW = 210;
    outerH = 126;
    borderRadius = '50%';
    rotation = settings.angle;
  } else if (settings.tool === 'rect') {
    outerW = 190;
    outerH = 126;
    borderRadius = '6px';
    rotation = settings.angle;
  }

  const innerW = Math.max(0, outerW * (1 - f));
  const innerH = Math.max(0, outerH * (1 - f));

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center z-30 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="relative flex items-center justify-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div
          className="border border-white/90 bg-sky-400/10"
          style={{
            width: `${outerW}px`,
            height: `${outerH}px`,
            borderRadius,
          }}
        />
        {settings.feather > 0 && (
          <div
            className="absolute border border-dashed border-white/80"
            style={{
              width: `${innerW}px`,
              height: `${innerH}px`,
              borderRadius,
            }}
          />
        )}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-sky-400" />
      </div>
    </div>
  );
};
