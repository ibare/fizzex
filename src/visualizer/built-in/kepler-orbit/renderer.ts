/**
 * 케플러 궤도 Canvas 렌더러
 *
 * 별 배경 + 지구 + 궤도 원 + 위성 애니메이션.
 * 궤도 드래그로 a 값 변경 가능.
 */

import type { ParameterValues, Preset, VisualizerMountOptions } from '../../types';

// ─── 물리 상수 ───

const G = 6.674e-11;
const M_EARTH = 5.972e24;
const R_EARTH = 6371; // km
const GM = G * M_EARTH;

function calcPeriod(a_km: number): number {
  const a_m = a_km * 1000;
  return 2 * Math.PI * Math.sqrt((a_m * a_m * a_m) / GM);
}

function calcVelocity(a_km: number): number {
  const period = calcPeriod(a_km);
  return (2 * Math.PI * a_km * 1000) / period;
}

function formatTime(seconds: number): string {
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}분`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}시간`;
  return `${(seconds / 86400).toFixed(1)}일`;
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
  private angle = 0; // 현재 위성 각도 (rad)
  private lastTimestamp = 0;
  private animationId = 0;
  private destroyed = false;

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

  update(params: ParameterValues): void {
    if (this.destroyed) return;
    if (params.a !== undefined && params.a !== this.currentA) {
      this.currentA = params.a;
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

    // 실제 주기 대비 가속: 1 공전 = 10초로 매핑 (시각적으로 적절)
    const period = calcPeriod(this.currentA);
    const angularSpeed = (2 * Math.PI) / Math.max(period, 1) * (period / 10);
    this.angle += angularSpeed * dt;
    if (this.angle > 2 * Math.PI) this.angle -= 2 * Math.PI;

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

    // 궤도 원 (점선)
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

    // 위성
    const satX = cx + orbitPx * Math.cos(this.angle);
    const satY = cy + orbitPx * Math.sin(this.angle);

    // 위성 글로우
    ctx.beginPath();
    ctx.arc(satX, satY, 8, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(255,220,100,0.2)' : 'rgba(220,170,50,0.15)';
    ctx.fill();

    // 위성 본체
    ctx.beginPath();
    ctx.arc(satX, satY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#ffd466' : '#e8a030';
    ctx.fill();

    // 우상단 정보
    const period = calcPeriod(this.currentA);
    const velocity = calcVelocity(this.currentA) / 1000; // km/s

    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = isDark ? 'rgba(200,210,230,0.7)' : 'rgba(60,70,90,0.7)';

    const infoX = width - 16;
    let infoY = 24;
    ctx.fillText(`주기: ${formatTime(period)}`, infoX, infoY);
    infoY += 18;
    ctx.fillText(`속도: ${velocity.toFixed(2)} km/s`, infoX, infoY);
    infoY += 18;
    ctx.fillText(`반지름: ${Math.round(this.currentA).toLocaleString()} km`, infoX, infoY);
  }
}
