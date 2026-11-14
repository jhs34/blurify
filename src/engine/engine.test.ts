import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBlurPipelineParams,
  computeFitTransform,
  computePixelateParams,
  computeRotatedBox,
  computeStrokeFeatherParams,
  computeZoomTransform,
  imageToScreen,
  normalizeAngle,
  screenToImage,
} from './math';
import { HistoryManager } from './history';

test('screenToImage and imageToScreen are exact inverses', () => {
  const transform = { x: 145.5, y: -32.25, scale: 1.75 };
  const original = { x: 420, y: 315 };
  const onScreen = imageToScreen(original, transform);
  const roundTrip = screenToImage(onScreen, transform);

  assert.ok(Math.abs(roundTrip.x - original.x) < 1e-9);
  assert.ok(Math.abs(roundTrip.y - original.y) < 1e-9);
});

test('computeZoomTransform preserves anchor point in image coordinates', () => {
  const initial = computeFitTransform(1200, 800, 1600, 1000, 30);
  const anchor = { x: 480, y: 290 };
  const beforeImg = screenToImage(anchor, initial);

  const zoomed = computeZoomTransform(initial, 2.4, anchor.x, anchor.y);
  const afterImg = screenToImage(anchor, zoomed);

  assert.ok(Math.abs(afterImg.x - beforeImg.x) < 1e-9);
  assert.ok(Math.abs(afterImg.y - beforeImg.y) < 1e-9);
});

test('computeZoomTransform clamps scale to bounds cleanly', () => {
  const initial = { x: 0, y: 0, scale: 1 };
  const maxZoomed = computeZoomTransform(initial, 100, 200, 200, 0.1, 12);
  assert.equal(maxZoomed.scale, 12);

  const minZoomed = computeZoomTransform(initial, 0.001, 200, 200, 0.1, 12);
  assert.equal(minZoomed.scale, 0.1);
});

test('computeRotatedBox places start and current on opposite corners for any angle', () => {
  const start = { x: 120, y: 200 };
  const current = { x: 380, y: 340 };
  const box = computeRotatedBox(start, current, 37, false);

  // Rotate local (+width/2, +height/2) or (-width/2, -height/2) back to world space
  // and verify start & current match two opposite corners.
  const cos = Math.cos(box.angleRad);
  const sin = Math.sin(box.angleRad);

  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const localDx = dx * Math.cos(-box.angleRad) - dy * Math.sin(-box.angleRad);
  const localDy = dx * Math.sin(-box.angleRad) + dy * Math.cos(-box.angleRad);

  const worldCornerX = box.cx + (localDx / 2) * cos - (localDy / 2) * sin;
  const worldCornerY = box.cy + (localDx / 2) * sin + (localDy / 2) * cos;

  assert.ok(Math.abs(worldCornerX - current.x) < 1e-9);
  assert.ok(Math.abs(worldCornerY - current.y) < 1e-9);
});

test('computeRotatedBox center-out mode doubles dimensions around start', () => {
  const start = { x: 200, y: 200 };
  const current = { x: 260, y: 240 };
  const box = computeRotatedBox(start, current, 0, true);

  assert.equal(box.cx, 200);
  assert.equal(box.cy, 200);
  assert.equal(box.width, 120);
  assert.equal(box.height, 80);
});

test('computeStrokeFeatherParams matches outer and inner brush rings', () => {
  const zeroFeather = computeStrokeFeatherParams('brush', 100, 0, 2000, 1500);
  assert.equal(zeroFeather.outerSize, 200);
  assert.equal(zeroFeather.innerSize, 200);
  assert.equal(zeroFeather.blurRadius, 0);
  assert.equal(zeroFeather.drawWidth, 200);

  const halfFeather = computeStrokeFeatherParams('brush', 100, 50, 2000, 1500);
  assert.equal(halfFeather.outerSize, 200);
  assert.equal(halfFeather.innerSize, 100);
  assert.equal(halfFeather.drawWidth + 2 * halfFeather.blurRadius, 200);
});

test('computeBlurPipelineParams scales smoothly without abrupt downscale jump at low strength', () => {
  const zero = computeBlurPipelineParams(0, 1600, 1200);
  assert.equal(zero.blurRadius, 0);
  assert.equal(zero.scaleDown, 1);

  const subtle = computeBlurPipelineParams(3, 1600, 1200);
  assert.equal(subtle.scaleDown, 1); // stays full-res when radius <= 4px
  assert.ok(subtle.blurRadius > 0 && subtle.blurRadius <= 4);

  const strong = computeBlurPipelineParams(80, 1600, 1200);
  assert.ok(strong.scaleDown < 1 && strong.scaleDown >= 0.125);
  assert.ok(strong.padPx >= 10);
});

test('computePixelateParams produces valid grid counts for extreme strengths and tiny images', () => {
  const p0 = computePixelateParams(0, 1600, 1200);
  assert.equal(p0.blockSize, 1);

  const p50 = computePixelateParams(50, 1600, 1200);
  assert.ok(p50.blockSize >= 10);
  assert.ok(p50.cols >= 1 && p50.rows >= 1);

  const tiny = computePixelateParams(100, 3, 2);
  assert.ok(tiny.cols >= 1 && tiny.rows >= 1);
});

test('normalizeAngle wraps negative and >360 angles cleanly', () => {
  assert.equal(normalizeAngle(-5), 355);
  assert.equal(normalizeAngle(360), 0);
  assert.equal(normalizeAngle(375), 15);
});

test('HistoryManager handles undo, redo, branching, and max capacity', () => {
  const history = new HistoryManager<string>(4);
  history.reset('s0');
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  history.push('s1');
  history.push('s2');
  assert.equal(history.current, 's2');
  assert.equal(history.canUndo, true);

  assert.equal(history.undo(), 's1');
  assert.equal(history.canRedo, true);

  // Branching after undo drops 's2'
  history.push('s3');
  assert.equal(history.canRedo, false);
  assert.equal(history.current, 's3');

  // Exceeding max capacity (4) drops oldest 's0'
  history.push('s4');
  history.push('s5');
  assert.equal(history.length, 4);
  assert.equal(history.undo(), 's4');
  assert.equal(history.undo(), 's3');
  assert.equal(history.undo(), 's1');
  assert.equal(history.canUndo, false);
  assert.equal(history.redo(), 's3');
});
