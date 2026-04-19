/**
 * 케플러 궤도 3D 공용 Three.js 렌더러.
 *
 * 변형별 Visualizer는 이 클래스를 그대로 재사용한다.
 * 지구/대기/궤도 링/위성/별 + 카메라 드래그·휠 줌, HUD 오버레이, 애니메이션 루프 포함.
 */

import * as THREE from 'three';
import type { VisualizerMountOptions, VisualizerUpdate } from '../../../types';
import { R_EARTH, TIME_ACCELERATION } from './constants';
import { sanitizePositive, formatTime } from './math';

/** 씬 좌표계에서 지구 반지름 = 1 단위 */
const EARTH_UNIT = 1;

/** 궤도 링 세그먼트 수 */
const ORBIT_SEGMENTS = 160;

export class KeplerOrbit3DCoreRenderer {
  private container: HTMLElement;
  private theme: 'light' | 'dark';
  private get isDark(): boolean { return this.theme === 'dark'; }

  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private earth!: THREE.Mesh;
  private atmosphere!: THREE.Mesh;
  private orbitLine!: THREE.Line;
  private satellite!: THREE.Mesh;
  private satelliteGlow!: THREE.Mesh;
  private satelliteBaseline!: THREE.Mesh;
  private stars: THREE.Points | null = null;

  private width = 0;
  private height = 0;

  private animationId = 0;
  private lastTimestamp = 0;
  private destroyed = false;

  private angle = 0;
  private baselineAngle = 0;

  private currentA: number;
  private currentPeriod = 0;
  private currentVelocity = 0;
  private isStandard = true;
  private baselinePeriod = 0;

  private camTheta = Math.PI / 3;
  private camPhi = Math.PI / 3;
  private camDistance = 4;

  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private overlay: HTMLDivElement;

  private paramChangeCallback: ((paramId: string, value: number) => void) | null = null;

  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor(container: HTMLElement, options: VisualizerMountOptions, initialA: number) {
    this.container = container;
    this.theme = options.theme;
    this.currentA = initialA;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(this.getBackgroundColor(), 1);
    this.canvas = this.renderer.domElement;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'grab';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);

    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '12px';
    this.overlay.style.right = '16px';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.fontFamily = '-apple-system, sans-serif';
    this.overlay.style.fontSize = '12px';
    this.overlay.style.lineHeight = '1.6';
    this.overlay.style.textAlign = 'right';
    this.overlay.style.color = this.isDark ? 'rgba(200,210,230,0.8)' : 'rgba(60,70,90,0.8)';
    this.overlay.style.textShadow = this.isDark
      ? '0 1px 2px rgba(0,0,0,0.8)'
      : '0 1px 2px rgba(255,255,255,0.8)';
    // container는 position: relative여야 overlay가 제 위치에 뜬다.
    const prevPosition = getComputedStyle(container).position;
    if (prevPosition === 'static' || !prevPosition) {
      container.style.position = 'relative';
    }
    container.appendChild(this.overlay);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 2000);

    this.buildLights();
    this.buildEarth();
    this.buildAtmosphere();
    this.buildOrbitLine();
    this.buildSatellite();
    this.buildStars();

    this.resize(options.width, options.height);
    this.fitCameraDistance();

    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });

    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  // ─── 씬 구성 ───

  private getBackgroundColor(): number {
    return this.isDark ? 0x060818 : 0xe8eef8;
  }

  private buildLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, this.isDark ? 0.35 : 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, this.isDark ? 1.1 : 0.9);
    sun.position.set(5, 2, 5);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4466aa, 0.25);
    fill.position.set(-4, -1, -3);
    this.scene.add(fill);
  }

  private buildEarth(): void {
    const geom = new THREE.SphereGeometry(EARTH_UNIT, 64, 64);
    const isDark = this.isDark;
    const mat = new THREE.MeshPhongMaterial({
      color: isDark ? 0x2a5f9e : 0x4a90d9,
      emissive: isDark ? 0x081830 : 0x0a1a35,
      specular: 0x223355,
      shininess: 18,
    });
    this.earth = new THREE.Mesh(geom, mat);
    this.scene.add(this.earth);
  }

  private buildAtmosphere(): void {
    const geom = new THREE.SphereGeometry(EARTH_UNIT * 1.08, 64, 64);
    const isDark = this.isDark;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(isDark ? 0x5a90ff : 0x7aaaff) },
        uIntensity: { value: isDark ? 0.75 : 0.45 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        uniform vec3 uColor;
        uniform float uIntensity;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vView), 0.0);
          float glow = pow(rim, 2.2) * uIntensity;
          gl_FragColor = vec4(uColor, glow);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.atmosphere = new THREE.Mesh(geom, mat);
    this.scene.add(this.atmosphere);
  }

  private buildOrbitLine(): void {
    const positions = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const isDark = this.isDark;
    const mat = new THREE.LineBasicMaterial({
      color: isDark ? 0x82b4ff : 0x3c78dc,
      transparent: true,
      opacity: isDark ? 0.5 : 0.45,
    });
    this.orbitLine = new THREE.Line(geom, mat);
    this.scene.add(this.orbitLine);
    this.refreshOrbitGeometry();
  }

  private refreshOrbitGeometry(): void {
    const r = this.getOrbitRadius();
    const attr = this.orbitLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    attr.needsUpdate = true;
    this.orbitLine.geometry.computeBoundingSphere();
  }

  private buildSatellite(): void {
    const isDark = this.isDark;
    const satGeom = new THREE.SphereGeometry(0.04, 24, 24);

    const satMat = new THREE.MeshBasicMaterial({ color: isDark ? 0xffd466 : 0xe8a030 });
    this.satellite = new THREE.Mesh(satGeom, satMat);
    this.scene.add(this.satellite);

    const glowGeom = new THREE.SphereGeometry(0.09, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xffdc88 : 0xdcaa44,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.satelliteGlow = new THREE.Mesh(glowGeom, glowMat);
    this.scene.add(this.satelliteGlow);

    const ghostMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xfff0a0 : 0xccaa55,
      transparent: true,
      opacity: 0.55,
    });
    this.satelliteBaseline = new THREE.Mesh(satGeom, ghostMat);
    this.satelliteBaseline.visible = false;
    this.scene.add(this.satelliteBaseline);
  }

  private buildStars(): void {
    if (!this.isDark) return;
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 400;
      positions[i * 3] = Math.cos(t) * s * r;
      positions[i * 3 + 1] = u * r;
      positions[i * 3 + 2] = Math.sin(t) * s * r;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.7,
    });
    this.stars = new THREE.Points(geom, mat);
    this.scene.add(this.stars);
  }

  // ─── 좌표 유틸 ───

  private kmToUnits(km: number): number {
    return (km / R_EARTH) * EARTH_UNIT;
  }

  private getOrbitRadius(): number {
    return this.kmToUnits(this.currentA);
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.camPhi);
    this.camera.position.set(
      this.camDistance * sinPhi * Math.cos(this.camTheta),
      this.camDistance * Math.cos(this.camPhi),
      this.camDistance * sinPhi * Math.sin(this.camTheta),
    );
    this.camera.lookAt(0, 0, 0);
  }

  private fitCameraDistance(): void {
    const r = this.getOrbitRadius();
    this.camDistance = Math.max(r * 1.8, 2.5);
    this.updateCameraPosition();
  }

  // ─── 프레임워크 → 렌더러 ───

  update(context: VisualizerUpdate): void {
    if (this.destroyed) return;
    const { params, derived, baseline } = context;

    const prevA = this.currentA;
    if (params.a !== undefined && params.a !== this.currentA) {
      this.currentA = params.a;
    }

    this.currentPeriod = sanitizePositive(derived.period);
    this.currentVelocity = sanitizePositive(derived.velocity);

    this.isStandard = context.isStandard;
    if (baseline) {
      this.baselinePeriod = sanitizePositive(baseline.derived.period);
    } else {
      this.baselinePeriod = 0;
      this.baselineAngle = 0;
    }

    this.satelliteBaseline.visible = !this.isStandard && this.baselinePeriod > 0;

    if (prevA !== this.currentA) {
      this.refreshOrbitGeometry();
      this.fitCameraDistance();
    }

    this.renderHUD();
  }

  resize(width: number, height: number): void {
    if (this.destroyed) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  setParameterChangeCallback(cb: (paramId: string, value: number) => void): void {
    this.paramChangeCallback = cb;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);

    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.canvas.removeEventListener('wheel', this.boundWheel);

    const disposeMesh = (m: THREE.Mesh | THREE.Line | THREE.Points) => {
      m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) mat.dispose();
    };
    disposeMesh(this.earth);
    disposeMesh(this.atmosphere);
    disposeMesh(this.orbitLine);
    disposeMesh(this.satellite);
    disposeMesh(this.satelliteGlow);
    disposeMesh(this.satelliteBaseline);
    if (this.stars) disposeMesh(this.stars);

    this.renderer.dispose();

    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
  }

  // ─── 인터랙션 ───

  private handlePointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.canvas.style.cursor = 'grabbing';
    this.canvas.setPointerCapture?.(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const sensitivity = 0.006;
    this.camTheta -= dx * sensitivity;
    this.camPhi -= dy * sensitivity;
    const eps = 0.05;
    this.camPhi = Math.max(eps, Math.min(Math.PI - eps, this.camPhi));
    this.updateCameraPosition();
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
    this.canvas.releasePointerCapture?.(e.pointerId);
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.001);
    this.camDistance = Math.max(1.4, Math.min(400, this.camDistance * factor));
    this.updateCameraPosition();
  }

  // ─── 애니메이션 ───

  private animate = (timestamp: number): void => {
    if (this.destroyed) return;
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.currentPeriod > 0) {
      const accelerated = this.currentPeriod / TIME_ACCELERATION;
      this.angle += ((2 * Math.PI) / Math.max(accelerated, 0.001)) * dt;
      if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    }
    if (!this.isStandard && this.baselinePeriod > 0) {
      const accelerated = this.baselinePeriod / TIME_ACCELERATION;
      this.baselineAngle += ((2 * Math.PI) / Math.max(accelerated, 0.001)) * dt;
      if (this.baselineAngle > Math.PI * 2) this.baselineAngle -= Math.PI * 2;
    }

    const r = this.getOrbitRadius();
    this.satellite.position.set(Math.cos(this.angle) * r, 0, Math.sin(this.angle) * r);
    this.satelliteGlow.position.copy(this.satellite.position);
    if (this.satelliteBaseline.visible) {
      this.satelliteBaseline.position.set(
        Math.cos(this.baselineAngle) * r,
        0,
        Math.sin(this.baselineAngle) * r,
      );
    }

    this.earth.rotation.y += dt * 0.06;

    const satMat = this.satellite.material as THREE.MeshBasicMaterial;
    const glowMat = this.satelliteGlow.material as THREE.MeshBasicMaterial;
    if (this.isStandard) {
      satMat.color.setHex(this.isDark ? 0xffd466 : 0xe8a030);
      glowMat.color.setHex(this.isDark ? 0xffdc88 : 0xdcaa44);
    } else {
      satMat.color.setHex(this.isDark ? 0xf87171 : 0xdc2626);
      glowMat.color.setHex(this.isDark ? 0xf87171 : 0xdc2626);
    }

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate);
  };

  // ─── HUD ───

  private renderHUD(): void {
    const lines: string[] = [];
    if (this.currentPeriod > 0) {
      lines.push(`주기: ${formatTime(this.currentPeriod)}`);
    }
    if (this.currentVelocity > 0) {
      lines.push(`속도: ${this.currentVelocity.toFixed(2)} km/s`);
    }
    lines.push(`반지름: ${Math.round(this.currentA).toLocaleString()} km`);

    let html = lines.map((l) => `<div>${l}</div>`).join('');

    if (!this.isStandard) {
      if (this.currentPeriod === 0) {
        html += `<div style="color:${this.isDark ? 'rgba(200,200,210,0.9)' : 'rgba(100,100,110,0.9)'};margin-top:4px;">이 우주에서 존재할 수 없음</div>`;
      } else if (this.baselinePeriod > 0) {
        const ratio = (this.currentPeriod / this.baselinePeriod) * 100;
        const label = ratio > 100 ? '느림' : ratio < 100 ? '빠름' : '동일';
        const color = this.isDark ? 'rgba(248,113,113,0.9)' : 'rgba(220,38,38,0.85)';
        html += `<div style="color:${color};margin-top:4px;">표준 대비 주기 ${ratio.toFixed(1)}% (${label})</div>`;
      }
    }
    this.overlay.innerHTML = html;
  }
}
