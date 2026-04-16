/**
 * 상단 공통 추상 시각화 — 직각삼각형 + 세 변 위의 정사각형 + 넓이/변 라벨
 *
 * 피타고라스 정리의 고전적 기하학적 증명 다이어그램.
 * 모든 프리셋에서 동일 구조로 표시하며 색상만 프리셋에 따라 달라진다.
 */

import { formatN, hexAlpha, type SceneDrawArgs } from './utils';

/**
 * 추상 시각화를 그린다.
 *
 * 삼각형 좌표계(수식 좌표):
 *   직각: (0, 0)
 *   A: (a, 0) — x축 위
 *   B: (0, b) — y축 위
 *   빗변: A→B
 *
 * 세 정사각형(직각 바깥 방향):
 *   a² — 아래쪽: (0,0)(a,0)(a,-a)(0,-a)
 *   b² — 왼쪽:   (0,0)(0,b)(-b,b)(-b,0)
 *   c² — 빗변 바깥: (a,0)(0,b)(b,a+b)(a+b,a)
 *
 * Bounding box: x∈[-b, a+b], y∈[-a, b+a]. margin 포함 fit-scale 적용.
 */
export function drawAbstract(args: SceneDrawArgs): void {
  const { ctx, x, y, w, h, a, b, c, color, isDark, alpha = 1 } = args;

  if (!(a > 0) || !(b > 0) || !(c > 0)) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── fit-scale 계산 ──
  const margin = 22;
  const bboxW = a + 2 * b;
  const bboxH = a + b + a; // (b+a) - (-a) = b + 2a
  const innerW = Math.max(1, w - margin * 2);
  const innerH = Math.max(1, h - margin * 2);
  const scale = Math.min(innerW / bboxW, innerH / bboxH);

  // 수식 좌표 (mx, my) → 화면 좌표 (sx, sy)
  // bbox 중심이 viewport 중심에 오도록 매핑
  const bboxMidX = (-b + (a + b)) / 2; // = a/2
  const bboxMidY = (-a + (b + a)) / 2; // = b/2
  const viewCx = x + w / 2;
  const viewCy = y + h / 2;
  const toX = (mx: number) => viewCx + (mx - bboxMidX) * scale;
  const toY = (my: number) => viewCy - (my - bboxMidY) * scale; // y 반전

  // ── 세 정사각형 ──
  drawSquare(
    ctx,
    [[0, 0], [a, 0], [a, -a], [0, -a]],
    toX,
    toY,
    color,
    isDark,
  );
  drawSquare(
    ctx,
    [[0, 0], [0, b], [-b, b], [-b, 0]],
    toX,
    toY,
    color,
    isDark,
  );
  drawSquare(
    ctx,
    [[a, 0], [0, b], [b, a + b], [a + b, a]],
    toX,
    toY,
    color,
    isDark,
  );

  // ── 정사각형 내부 넓이 라벨 ──
  ctx.font = '600 11px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark ? 'rgba(235,240,250,0.9)' : 'rgba(30,40,55,0.92)';

  // a² 정사각형 중심: (a/2, -a/2)
  ctx.fillText(`a² = ${formatN(a * a)}`, toX(a / 2), toY(-a / 2));
  // b² 정사각형 중심: (-b/2, b/2)
  ctx.fillText(`b² = ${formatN(b * b)}`, toX(-b / 2), toY(b / 2));
  // c² 정사각형 중심: 네 꼭짓점 평균 → ((a+0+b+a+b)/4, (0+b+a+b+a)/4) = ((2a+2b)/4, (2a+2b)/4) = ((a+b)/2, (a+b)/2)
  ctx.fillText(`c² = ${formatN(c * c)}`, toX((a + b) / 2), toY((a + b) / 2));

  // ── 삼각형 변 ──
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(0));
  ctx.lineTo(toX(a), toY(0));
  ctx.lineTo(toX(0), toY(b));
  ctx.closePath();
  ctx.stroke();

  // ── 직각 인디케이터 (작은 네모) ──
  const tickSize = Math.min(a, b) * 0.08;
  if (tickSize > 0) {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = isDark ? 'rgba(235,240,250,0.7)' : 'rgba(30,40,55,0.7)';
    ctx.beginPath();
    ctx.moveTo(toX(tickSize), toY(0));
    ctx.lineTo(toX(tickSize), toY(tickSize));
    ctx.lineTo(toX(0), toY(tickSize));
    ctx.stroke();
  }

  // ── 변 옆 길이 라벨 ──
  ctx.font = '500 11px -apple-system, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // a: (a/2, 0) 바로 위 (정사각형 밖으로 밀지 않고 삼각형 안쪽)
  ctx.fillText(`a = ${formatN(a)}`, toX(a / 2), toY(0) - 10);
  // b: (0, b/2) 오른쪽 (삼각형 안쪽)
  ctx.textAlign = 'left';
  ctx.fillText(`b = ${formatN(b)}`, toX(0) + 6, toY(b / 2));
  // c: 빗변 중점 (a/2, b/2) — 빗변 안쪽 방향으로 약간 오프셋
  ctx.textAlign = 'center';
  ctx.fillText(`c = ${formatN(c)}`, toX(a / 2) - 8, toY(b / 2) - 6);

  ctx.restore();
}

/**
 * 정사각형을 그린다 (가는 외곽선 + 반투명 채우기).
 */
function drawSquare(
  ctx: CanvasRenderingContext2D,
  verts: Array<[number, number]>,
  toX: (mx: number) => number,
  toY: (my: number) => number,
  color: string,
  isDark: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(toX(verts[0][0]), toY(verts[0][1]));
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(toX(verts[i][0]), toY(verts[i][1]));
  }
  ctx.closePath();
  ctx.fillStyle = hexAlpha(color, isDark ? 0.18 : 0.12);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.75);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
