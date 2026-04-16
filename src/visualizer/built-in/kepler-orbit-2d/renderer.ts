/**
 * 케플러 궤도 Canvas 렌더러
 *
 * 별 배경 + 지구 + 궤도 원 + 위성 애니메이션.
 * 궤도 드래그로 a 값 변경 가능.
 */

import type { Preset, VisualizerMountOptions, VisualizerUpdate } from '../../types';

// ─── 시각화 상수 ───
// 물리 계산은 AST에서 일어난다. 여기는 렌더링/시각화에 필요한 값만 둔다.

/** 지구 반지름 (km) — 시각적 크기 산정에만 사용 */
const R_EARTH = 6371;

/**
 * 시간 가속 계수.
 * 실제 공전 주기는 시각적으로 너무 길어 1 공전을 1/600의 시간으로 표시한다.
 * 예: ISS(90분 주기) → 9초, 정지궤도(24시간) → 144초.
 */
const TIME_ACCELERATION = 600;

function formatTime(seconds: number): string {
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}분`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}시간`;
  return `${(seconds / 86400).toFixed(1)}일`;
}

/** 유한 양수만 통과시키고 그 외(NaN, Infinity, 0, 음수)는 0 으로 반환 */
function sanitizePositive(value: unknown): number {
  return (typeof value === 'number' && Number.isFinite(value) && value > 0) ? value : 0;
}

// ─── 별 배경 ───

interface Star { x: number; y: number; size: number; brightness: number; }

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.5 + 0.5,
    });
  }
  return stars;
}

// ─── 렌더러 ───

export class KeplerOrbitRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private presets: Preset[];

  private width = 0;
  private height = 0;
  private dpr = 1;

  private currentA = 6771; // km
  /** AST에서 파생된 공전 주기 (초). 애니메이션 회전 속도의 원천. */
  private currentPeriod = 0;
  /** AST에서 파생된 궤도 속도 (km/s). 우상단 정보 표시용. */
  private currentVelocity = 0;
  private angle = 0; // 현재 위성 각도 (rad)
  private lastTimestamp = 0;
  private animationId = 0;
  private destroyed = false;

  // ─── 발견적 학습: baseline 비교 모드 ───
  /** 현재 식이 카탈로그 원본과 구조적으로 같은가 (true 면 baseline 표시 없음) */
  private isStandard = true;
  /** 카탈로그 원본 식의 주기 (초). isStandard=false 때만 의미 있음 */
  private baselinePeriod = 0;
  /** 카탈로그 원본 식의 속도 (km/s) */
  private baselineVelocity = 0;
  /** baseline 위성 ghost 의 각도 — current 와 독립적으로 누적 */
  private baselineAngle = 0;

  private stars: Star[] = [];
  private paramChangeCallback: ((paramId: string, value: number) => void) | null = null;

  // 드래그 상태
  private isDragging = false;

  // Bound handlers
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;

  constructor(container: HTMLElement, options: VisualizerMountOptions, presets: Preset[]) {
    this.container = container;
    this.theme = options.theme;
    this.presets = presets;

    // Canvas 생성
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'grab';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('KeplerOrbitRenderer: 2d context 획득 실패');
    this.ctx = ctx;

    this.stars = generateStars(120);

    // 이벤트
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);

    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);

    // 초기 크기
    this.resize(options.width, options.height);

    // 애니메이션 시작
    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  update(context: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, derived, baseline } = context;
    if (params.a !== undefined && params.a !== this.currentA) {
      this.currentA = params.a;
    }

    // AST에서 파생된 값을 그대로 받는다 — 자체 물리 계산 없음.
    // 발견적 학습: 학습자가 식을 깨뜨려 NaN/0/음수가 나오면 그대로 0 으로 반영하여
    // 위성 정지 + "이 우주에서 존재할 수 없음" 신호로 사용한다.
    this.currentPeriod = sanitizePositive(derived.period);
    this.currentVelocity = sanitizePositive(derived.velocity);

    // baseline (구조 변경 시에만 들어옴)
    this.isStandard = context.isStandard;
    if (baseline) {
      this.baselinePeriod = sanitizePositive(baseline.derived.period);
      this.baselineVelocity = sanitizePositive(baseline.derived.velocity);
    } else {
      this.baselinePeriod = 0;
      this.baselineVelocity = 0;
      this.baselineAngle = 0;
    }
  }

  resize(width: number, height: number): void {
    if (this.destroyed) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setParameterChangeCallback(cb: (paramId: string, value: number) => void): void {
    this.paramChangeCallback = cb;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.container.removeChild(this.canvas);
  }

  // ─── 좌표 변환 ───

  /** km → 화면 px. 궤도를 캔버스에 맞추기 위한 스케일 */
  private getScale(): number {
    const padding = 40;
    const maxOrbit = Math.max(this.currentA, R_EARTH * 2);
    return Math.min(this.width, this.height) / (2 * maxOrbit) * (1 - padding / Math.min(this.width, this.height));
  }

  private get cx(): number { return this.width / 2; }
  private get cy(): number { return this.height / 2; }

  // ─── 드래그 ───

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dist = Math.sqrt((mx - this.cx) ** 2 + (my - this.cy) ** 2);
    const orbitPx = this.currentA * this.getScale();
    // 궤도 근처 클릭 시 드래그 시작
    if (Math.abs(dist - orbitPx) < 20) {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dist = Math.sqrt((mx - this.cx) ** 2 + (my - this.cy) ** 2);
    const scale = this.getScale();
    if (scale > 0) {
      const newA = Math.max(6500, Math.min(400000, dist / scale));
      this.currentA = newA;
      this.paramChangeCallback?.('a', newA);
    }
  }

  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
  }

  // ─── 애니메이션 ───

  private animate(timestamp: number): void {
    if (this.destroyed) return;

    const dt = (timestamp - this.lastTimestamp) / 1000; // 초
    this.lastTimestamp = timestamp;

    // AST에서 파생된 실제 주기를 TIME_ACCELERATION 배 가속하여 회전
    // — 궤도 반지름이 커지면 주기가 길어져 시각적으로도 느려진다
    // currentPeriod 가 0(NaN/Infinity/음수도 sanitize 결과 0) 이면 위성 정지
    if (this.currentPeriod > 0) {
      const acceleratedPeriod = this.currentPeriod / TIME_ACCELERATION;
      const angularSpeed = (2 * Math.PI) / Math.max(acceleratedPeriod, 0.001);
      this.angle += angularSpeed * dt;
      if (this.angle > 2 * Math.PI) this.angle -= 2 * Math.PI;
    }

    // baseline 위성 ghost 는 별도 누적 — 같은 a, 다른 주기로 회전 차이를 보인다
    if (!this.isStandard && this.baselinePeriod > 0) {
      const acc = this.baselinePeriod / TIME_ACCELERATION;
      const w = (2 * Math.PI) / Math.max(acc, 0.001);
      this.baselineAngle += w * dt;
      if (this.baselineAngle > 2 * Math.PI) this.baselineAngle -= 2 * Math.PI;
    }

    this.render();
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  // ─── 렌더링 ───

  private render(): void {
    const { ctx, width, height } = this;
    const isDark = this.theme === 'dark';
    const scale = this.getScale();

    // 배경
    ctx.fillStyle = isDark ? '#0a0a1a' : '#f0f4f8';
    ctx.fillRect(0, 0, width, height);

    // 별 (다크 테마만)
    if (isDark) {
      for (const star of this.stars) {
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.brightness * 0.6})`;
        ctx.fill();
      }
    }

    const cx = this.cx;
    const cy = this.cy;
    const earthPx = R_EARTH * scale;
    const orbitPx = this.currentA * scale;

    // 프리셋 궤도 (반투명 링)
    for (const preset of this.presets) {
      const presetA = preset.values.a;
      if (presetA === this.currentA) continue;
      const r = presetA * scale;
      if (r > 2 && r < Math.max(width, height)) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? 'rgba(100,150,255,0.15)' : 'rgba(60,100,200,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 프리셋 라벨
        const labelAngle = -Math.PI / 4;
        const lx = cx + r * Math.cos(labelAngle);
        const ly = cy + r * Math.sin(labelAngle);
        ctx.font = '10px -apple-system, sans-serif';
        ctx.fillStyle = isDark ? 'rgba(150,180,255,0.4)' : 'rgba(60,100,200,0.35)';
        ctx.textAlign = 'left';
        ctx.fillText(`${preset.emoji ?? ''} ${preset.name}`, lx + 4, ly - 4);
      }
    }

    // 궤도 원 (점선) — 궤도 위치/크기는 input parameter `a` 로만 결정되므로
    // 식 구조 변형과 무관하게 항상 동일하다. baseline/current 색상 구분 없음.
    ctx.beginPath();
    ctx.arc(cx, cy, orbitPx, 0, Math.PI * 2);
    ctx.strokeStyle = isDark ? 'rgba(130,180,255,0.5)' : 'rgba(60,120,220,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 지구
    const earthGrad = ctx.createRadialGradient(cx - earthPx * 0.3, cy - earthPx * 0.3, 0, cx, cy, earthPx);
    if (isDark) {
      earthGrad.addColorStop(0, '#4a90d9');
      earthGrad.addColorStop(0.7, '#2a5f9e');
      earthGrad.addColorStop(1, '#1a3a6e');
    } else {
      earthGrad.addColorStop(0, '#6bb5ff');
      earthGrad.addColorStop(0.7, '#4a90d9');
      earthGrad.addColorStop(1, '#2a6fc0');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, earthPx, 0, Math.PI * 2);
    ctx.fillStyle = earthGrad;
    ctx.fill();

    // 지구 글로우
    ctx.beginPath();
    ctx.arc(cx, cy, earthPx + 3, 0, Math.PI * 2);
    ctx.strokeStyle = isDark ? 'rgba(100,160,255,0.25)' : 'rgba(70,130,220,0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 고도 표시선 (지구 표면 → 궤도)
    const altAngle = Math.PI / 2; // 아래쪽
    const surfX = cx + earthPx * Math.cos(altAngle);
    const surfY = cy + earthPx * Math.sin(altAngle);
    const orbitX = cx + orbitPx * Math.cos(altAngle);
    const orbitY = cy + orbitPx * Math.sin(altAngle);

    if (orbitPx - earthPx > 15) {
      ctx.beginPath();
      ctx.moveTo(surfX, surfY);
      ctx.lineTo(orbitX, orbitY);
      ctx.strokeStyle = isDark ? 'rgba(255,200,100,0.4)' : 'rgba(200,150,50,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 고도 라벨
      const midY = (surfY + orbitY) / 2;
      const altitude = this.currentA - R_EARTH;
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(255,220,140,0.7)' : 'rgba(180,130,50,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(altitude).toLocaleString()} km`, surfX + 8, midY);
    }

    // 위성 궤적 (잔상)
    const trailCount = 12;
    for (let i = trailCount; i > 0; i--) {
      const trailAngle = this.angle - (i * 0.08);
      const tx = cx + orbitPx * Math.cos(trailAngle);
      const ty = cy + orbitPx * Math.sin(trailAngle);
      const alpha = (1 - i / trailCount) * 0.3;
      const trailSize = 2 * (1 - i / trailCount);
      ctx.beginPath();
      ctx.arc(tx, ty, trailSize, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(255,200,100,${alpha})`
        : `rgba(220,150,50,${alpha})`;
      ctx.fill();
    }

    // baseline 위성 ghost — 카탈로그 원본 식의 회전 (회색 작은 점)
    if (!this.isStandard && this.baselinePeriod > 0) {
      const bx = cx + orbitPx * Math.cos(this.baselineAngle);
      const by = cy + orbitPx * Math.sin(this.baselineAngle);
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(255,220,100,0.55)' : 'rgba(200,160,40,0.5)';
      ctx.fill();
    }

    // 위성 (current)
    const satX = cx + orbitPx * Math.cos(this.angle);
    const satY = cy + orbitPx * Math.sin(this.angle);

    // standard: 노란색 / non-standard: 빨간색
    const satFill = this.isStandard
      ? (isDark ? '#ffd466' : '#e8a030')
      : (isDark ? '#f87171' : '#dc2626');
    const satGlow = this.isStandard
      ? (isDark ? 'rgba(255,220,100,0.2)' : 'rgba(220,170,50,0.15)')
      : (isDark ? 'rgba(248,113,113,0.25)' : 'rgba(220,38,38,0.18)');

    // 위성 글로우
    ctx.beginPath();
    ctx.arc(satX, satY, 8, 0, Math.PI * 2);
    ctx.fillStyle = satGlow;
    ctx.fill();

    // 위성 본체
    ctx.beginPath();
    ctx.arc(satX, satY, 4, 0, Math.PI * 2);
    ctx.fillStyle = satFill;
    ctx.fill();

    // 우상단 정보 — AST 파생값 그대로 표시
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const defaultColor = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.7)';
    ctx.fillStyle = defaultColor;

    const infoX = width - 16;
    let infoY = 24;
    if (this.currentPeriod > 0) {
      ctx.fillText(`주기: ${formatTime(this.currentPeriod)}`, infoX, infoY);
      infoY += 18;
    }
    if (this.currentVelocity > 0) {
      ctx.fillText(`속도: ${this.currentVelocity.toFixed(2)} km/s`, infoX, infoY);
      infoY += 18;
    }
    ctx.fillText(`반지름: ${Math.round(this.currentA).toLocaleString()} km`, infoX, infoY);
    infoY += 18;

    // 발견적 학습: baseline 비교 정보
    if (!this.isStandard) {
      if (this.currentPeriod === 0) {
        // 변형된 식이 깨졌을 때 — 회색 강조
        ctx.fillStyle = isDark ? 'rgba(180,180,190,0.85)' : 'rgba(100,100,110,0.85)';
        ctx.fillText('이 우주에서 존재할 수 없음', infoX, infoY);
        infoY += 18;
      } else if (this.baselinePeriod > 0) {
        // 표준 대비 비율
        const ratio = (this.currentPeriod / this.baselinePeriod) * 100;
        const label = ratio > 100 ? '느림' : ratio < 100 ? '빠름' : '동일';
        ctx.fillStyle = isDark ? 'rgba(248,113,113,0.85)' : 'rgba(220,38,38,0.8)';
        ctx.fillText(`표준 대비 주기 ${ratio.toFixed(1)}% (${label})`, infoX, infoY);
        infoY += 18;
      }
    }
  }
}
