const CANVAS_KO_GLYPHS =
  '홍길동가성명연락처사원번호받는분서울특별시구로동호공동현관메모문앞보관';

/**
 * Explicitly loads the Noto Sans KR unicode-range subsets and companion Latin
 * fonts required by Canvas 2D surfaces (specimen preview & sample test scene).
 */
export async function ensureCanvasFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('500 16px "Noto Sans KR"', CANVAS_KO_GLYPHS),
      document.fonts.load('600 20px "Noto Sans KR"', CANVAS_KO_GLYPHS),
      document.fonts.load('700 24px "Noto Sans KR"', CANVAS_KO_GLYPHS),
      document.fonts.load('600 17px "Plus Jakarta Sans"', 'Hong Gil-dong'),
      document.fonts.load('600 20px "JetBrains Mono"', '010 0000 KOR'),
      document.fonts.ready,
    ]);
  } catch {
    // Ignore network or font-loading errors in offline environments
  }
}

/**
 * Generates a deterministic, crisp 1600x1060 sample studio test scene
 * containing realistic privacy-sensitive elements (vehicle license plate,
 * parcel shipping label, ID pass card, and cafe street backdrop) so users
 * can immediately test brush, angled rectangle, ellipse, and linear blur/mosaic.
 */
export function createSampleCanvas(): HTMLCanvasElement {
  const w = 1600;
  const h = 1060;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Warm dusk urban architectural background gradient
  const skyGrad = ctx.createLinearGradient(0, 0, w, h);
  skyGrad.addColorStop(0, '#1e293b');
  skyGrad.addColorStop(0.48, '#334155');
  skyGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural bokeh & sunlit cafe facade shapes
  const bokeh = [
    { x: 260, y: 210, r: 140, c: 'rgba(251, 191, 36, 0.16)' },
    { x: 520, y: 160, r: 95, c: 'rgba(56, 189, 248, 0.14)' },
    { x: 1290, y: 240, r: 170, c: 'rgba(244, 114, 182, 0.12)' },
    { x: 1080, y: 180, r: 110, c: 'rgba(250, 204, 21, 0.15)' },
  ];
  for (const b of bokeh) {
    const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Desk / street foreground surface
  const deskGrad = ctx.createLinearGradient(0, 560, 0, h);
  deskGrad.addColorStop(0, '#1f242d');
  deskGrad.addColorStop(1, '#13171f');
  ctx.fillStyle = deskGrad;
  ctx.fillRect(0, 560, w, h - 560);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.lineTo(w, 560);
  ctx.stroke();

  // 1. Left Card: Visitor / Staff Pass with portrait silhouette & personal info
  ctx.save();
  ctx.translate(360, 470);
  ctx.rotate((-4 * Math.PI) / 180);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;

  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, -230, -290, 460, 560, 26);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Top header band on ID card
  ctx.fillStyle = '#0f172a';
  roundRectTop(ctx, -230, -290, 460, 96, 26);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('SAMPLE PASS · ID CARD', -192, -233);

  // Portrait frame (ideal for Ellipse / Brush blur test)
  ctx.fillStyle = '#e2e8f0';
  roundRect(ctx, -190, -160, 165, 200, 16);
  ctx.fill();

  // Stylized portrait head & shoulders inside photo frame
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(-107, -85, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-107, 12, 64, 52, 0, Math.PI, 0, false);
  ctx.fill();

  // Personal fields (ideal for Brush / Rect mosaic test)
  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('성명 / NAME', -6, -135);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('홍길동 · Hong Gil-dong', -6, -102);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('연락처 / PHONE', -6, -48);
  ctx.fillStyle = '#0f172a';
  ctx.font = '600 20px "JetBrains Mono", "Noto Sans KR", monospace';
  ctx.fillText('010 0000 0000', -6, -18);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 15px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('사원번호 / ID NO.', -190, 92);
  ctx.fillStyle = '#0f172a';
  ctx.font = '600 23px "JetBrains Mono", "Noto Sans KR", monospace';
  ctx.fillText('ID-0000-000000', -190, 126);

  // Simulated barcode strip
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 44; i++) {
    const bw = (i * 7) % 3 === 0 ? 5 : 2.5;
    ctx.fillRect(-190 + i * 8.6, 168, bw, 58);
  }
  ctx.restore();

  // 2. Top-Right: Delivery / Address Label Card
  ctx.save();
  ctx.translate(1110, 355);
  ctx.rotate((3 * Math.PI) / 180);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#fffbeb';
  roundRect(ctx, -330, -185, 660, 350, 22);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.strokeRect(-302, -157, 604, 294);

  ctx.fillStyle = '#b45309';
  ctx.font = '700 18px "JetBrains Mono", "Noto Sans KR", monospace';
  ctx.fillText('SAMPLE PARCEL · WAYBILL #0000-0000-0000', -276, -114);

  ctx.fillStyle = '#1e293b';
  ctx.font = '700 25px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('받는분: 홍길동  |  010 0000 0000', -276, -54);

  ctx.fillStyle = '#334155';
  ctx.font = '500 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  ctx.fillText('서울특별시 OO구 OO로 00, 000동 0000호', -276, 0);
  ctx.fillText('공동현관 메모: #0000* (문 앞 보관)', -276, 44);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 17px "JetBrains Mono", "Noto Sans KR", monospace';
  ctx.fillText('CARD NO: 0000-0000-0000-0000   EXP 00/00', -276, 104);
  ctx.restore();

  // 3. Bottom-Right: Tilted Korean Vehicle License Plate (ideal for rotated Rect tool!)
  ctx.save();
  ctx.translate(1115, 765);
  ctx.rotate((-8 * Math.PI) / 180);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;

  // Metallic plate rim
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, -320, -88, 640, 176, 22);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // White reflective plate face
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, -306, -74, 612, 148, 14);
  ctx.fill();

  // Left blue hologram strip (EV / modern Korean plate style)
  ctx.fillStyle = '#1d4ed8';
  roundRectLeft(ctx, -306, -74, 68, 148, 14);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px "JetBrains Mono", "Noto Sans KR", monospace';
  ctx.fillText('KOR', -292, 8);

  // Crisp license plate number
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 80px "JetBrains Mono", "Noto Sans KR", monospace';
  ctx.fillText('000가 0000', -208, 28);
  ctx.restore();

  return canvas;
}

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

function roundRectTop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function roundRectLeft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
