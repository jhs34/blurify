import type { Point, ToolType, Transform } from '../types/editor';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeAngle(deg: number): number {
  return ((Math.round(deg) % 360) + 360) % 360;
}

export function screenToImage(screenPos: Point, transform: Transform): Point {
  return {
    x: (screenPos.x - transform.x) / transform.scale,
    y: (screenPos.y - transform.y) / transform.scale,
  };
}

export function imageToScreen(imgPos: Point, transform: Transform): Point {
  return {
    x: imgPos.x * transform.scale + transform.x,
    y: imgPos.y * transform.scale + transform.y,
  };
}

export function computeFitTransform(
  viewportW: number,
  viewportH: number,
  imgW: number,
  imgH: number,
  padding = 28
): Transform {
  if (imgW <= 0 || imgH <= 0 || viewportW <= 0 || viewportH <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }
  const availW = Math.max(40, viewportW - padding * 2);
  const availH = Math.max(40, viewportH - padding * 2);
  const scale = clamp(Math.min(availW / imgW, availH / imgH), 0.05, 16);
  return {
    scale,
    x: (viewportW - imgW * scale) / 2,
    y: (viewportH - imgH * scale) / 2,
  };
}

export function computeZoomTransform(
  current: Transform,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  minScale = 0.08,
  maxScale = 16
): Transform {
  const nextScale = clamp(current.scale * scaleFactor, minScale, maxScale);
  const actualFactor = nextScale / current.scale;
  return {
    scale: nextScale,
    x: anchorX - (anchorX - current.x) * actualFactor,
    y: anchorY - (anchorY - current.y) * actualFactor,
  };
}

export interface RotatedBoxGeometry {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
  angleRad: number;
}

/**
 * Computes rotated rectangle / ellipse geometry in image space.
 * By default (`fromCenter = false`), `start` and `current` form opposite corners
 * along the rotated local axes. When `fromCenter = true` (e.g. Alt held),
 * `start` acts as the center and expands symmetrically toward `current`.
 */
export function computeRotatedBox(
  start: Point,
  current: Point,
  angleDeg: number,
  fromCenter = false
): RotatedBoxGeometry {
  const angleRad = (angleDeg * Math.PI) / 180;
  const dx = current.x - start.x;
  const dy = current.y - start.y;

  const cosNeg = Math.cos(-angleRad);
  const sinNeg = Math.sin(-angleRad);
  const localDx = dx * cosNeg - dy * sinNeg;
  const localDy = dx * sinNeg + dy * cosNeg;

  if (fromCenter) {
    const width = Math.abs(localDx) * 2;
    const height = Math.abs(localDy) * 2;
    return {
      cx: start.x,
      cy: start.y,
      width,
      height,
      rx: width / 2,
      ry: height / 2,
      angleRad,
    };
  }

  const width = Math.abs(localDx);
  const height = Math.abs(localDy);
  return {
    cx: (start.x + current.x) / 2,
    cy: (start.y + current.y) / 2,
    width,
    height,
    rx: width / 2,
    ry: height / 2,
    angleRad,
  };
}

export function computeBrushImageSize(
  sizeSetting: number,
  imgW: number,
  imgH: number
): number {
  if (imgW <= 0 || imgH <= 0) return Math.max(2, sizeSetting);
  const baseFactor = Math.max(imgW, imgH) / 1000;
  return Math.max(2, sizeSetting * baseFactor);
}

export interface StrokeFeatherParams {
  outerSize: number;
  innerSize: number;
  drawWidth: number;
  blurRadius: number;
}

export function computeStrokeFeatherParams(
  tool: ToolType,
  sizeSetting: number,
  featherPercent: number,
  imgW: number,
  imgH: number
): StrokeFeatherParams {
  const f = clamp(featherPercent, 0, 100) / 100;
  const outerSize = computeBrushImageSize(sizeSetting, imgW, imgH);
  const innerSize = outerSize * (1 - f);

  if (tool === 'brush') {
    const blurRadius = (outerSize * f) / 4;
    const drawWidth = Math.max(1, outerSize * (1 - f * 0.5));
    return { outerSize, innerSize, drawWidth, blurRadius };
  }

  if (tool === 'rect' || tool === 'ellipse') {
    const baseFactor = Math.max(1, Math.max(imgW, imgH)) / 1000;
    const blurRadius = clamp(featherPercent, 0, 100) * baseFactor * 0.45;
    return { outerSize, innerSize, drawWidth: 0, blurRadius };
  }

  return { outerSize, innerSize, drawWidth: 0, blurRadius: 0 };
}

export interface BlurPipelineParams {
  blurRadius: number;
  scaleDown: number;
  scaledBlurRadius: number;
  padPx: number;
}

export function computeBlurPipelineParams(
  strength: number,
  imgW: number,
  imgH: number
): BlurPipelineParams {
  const s = clamp(strength, 0, 100);
  if (s === 0 || imgW <= 0 || imgH <= 0) {
    return { blurRadius: 0, scaleDown: 1, scaledBlurRadius: 0, padPx: 0 };
  }

  const minSide = Math.max(1, Math.min(imgW, imgH));
  const blurRadius = (s / 100) * (minSide * 0.055);
  const scaleDown =
    blurRadius <= 4 ? 1 : clamp(4 / blurRadius, 0.125, 1);
  const scaledBlurRadius = blurRadius * scaleDown;
  const padPx = Math.max(2, Math.ceil(scaledBlurRadius * 3));

  return {
    blurRadius,
    scaleDown,
    scaledBlurRadius,
    padPx,
  };
}

export interface PixelateParams {
  blockSize: number;
  cols: number;
  rows: number;
}

export function computePixelateParams(
  strength: number,
  imgW: number,
  imgH: number
): PixelateParams {
  const s = clamp(strength, 0, 100);
  if (s === 0 || imgW <= 0 || imgH <= 0) {
    return { blockSize: 1, cols: Math.max(1, imgW), rows: Math.max(1, imgH) };
  }

  const minSide = Math.max(1, Math.min(imgW, imgH));
  const maxBlock = Math.max(12, minSide * 0.075);
  const blockSize = Math.max(
    2,
    Math.round(2 + ((s - 1) / 99) * (maxBlock - 2))
  );

  return {
    blockSize,
    cols: Math.max(1, Math.round(imgW / blockSize)),
    rows: Math.max(1, Math.round(imgH / blockSize)),
  };
}

export interface RgbaPixel {
  r: number;
  g: number;
  b: number;
  a: number; // 0..1
}

/**
 * Pure Porter-Duff per-pixel redaction compositing model matching `redactedCanvas`:
 * - `draw`: `source-over` of `(effectRgb, strokeAlpha)` onto `prevRedacted`
 * - `erase`: `destination-out` of `strokeAlpha` from `prevRedacted`
 */
export function compositeRedactionPixel(
  prevRedacted: RgbaPixel,
  effectRgb: { r: number; g: number; b: number },
  strokeAlpha: number,
  action: 'draw' | 'erase'
): RgbaPixel {
  const sa = clamp(strokeAlpha, 0, 1);
  if (sa === 0) {
    return { ...prevRedacted };
  }

  if (action === 'erase') {
    const outA = prevRedacted.a * (1 - sa);
    if (outA <= 1e-9) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    return {
      r: prevRedacted.r,
      g: prevRedacted.g,
      b: prevRedacted.b,
      a: outA,
    };
  }

  const outA = sa + prevRedacted.a * (1 - sa);
  if (outA <= 1e-9) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: (effectRgb.r * sa + prevRedacted.r * prevRedacted.a * (1 - sa)) / outA,
    g: (effectRgb.g * sa + prevRedacted.g * prevRedacted.a * (1 - sa)) / outA,
    b: (effectRgb.b * sa + prevRedacted.b * prevRedacted.a * (1 - sa)) / outA,
    a: outA,
  };
}
