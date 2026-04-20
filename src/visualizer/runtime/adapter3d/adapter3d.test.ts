import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { ElementNode } from '../types/element';
import { rootContext } from '../expr/context';
import { createRenderContext3D, renderRoot3d, disposeChildren, parseColorSpec } from './index';
import { syncCamera } from './camera-sync';
import { createStateStore } from '../state';

function mkRc(locals: Record<string, unknown> = {}): ReturnType<typeof createRenderContext3D> {
  return createRenderContext3D({
    THREE,
    exprCtx: rootContext(locals),
    frame: { dt: 0.016, now: 0, elapsed: 0, width: 300, height: 300, isDark: false },
  });
}

describe('parseColorSpec', () => {
  it('#RRGGBB → opaque Color (hex 동치)', () => {
    const { color, opacity } = parseColorSpec('#ff0080');
    expect(opacity).toBe(1);
    expect(color.getHexString()).toBe('ff0080');
  });

  it('rgba(r,g,b,a) → 색+opacity 분리', () => {
    const { color, opacity } = parseColorSpec('rgba(255,128,0,0.5)');
    expect(opacity).toBeCloseTo(0.5, 5);
    expect(color.r).toBeCloseTo(1, 5);
    expect(color.g).toBeCloseTo(128 / 255, 5);
    expect(color.b).toBeCloseTo(0, 5);
  });

  it('숫자 hex → Color', () => {
    const { color, opacity } = parseColorSpec(0x00ff00);
    expect(opacity).toBe(1);
    expect(color.getHexString()).toBe('00ff00');
  });
});

describe('renderRoot3d — leaf kinds', () => {
  it('sphere → Mesh with SphereGeometry at position', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'sphere',
      cx: '1', cy: '2', cz: '-3',
      r: 0.5,
      style: { fill: '"#ff0000"' },
    };
    renderRoot3d(parent, el, mkRc());
    expect(parent.children.length).toBe(1);
    const mesh = parent.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(mesh.position.toArray()).toEqual([1, 2, -3]);
  });

  it('bufferLine → Line with position attribute', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'bufferLine',
      points: '[[0,0,0],[1,0,0],[1,1,0]]',
      style: { stroke: '"#00ff00"' },
    };
    renderRoot3d(parent, el, mkRc());
    const line = parent.children[0] as THREE.Line;
    expect(line).toBeInstanceOf(THREE.Line);
    const pos = line.geometry.getAttribute('position');
    expect(pos.count).toBe(3);
    expect(pos.itemSize).toBe(3);
  });

  it('points → Points', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'points',
      positions: '[[0,0,0],[10,10,10]]',
      size: 2,
    };
    renderRoot3d(parent, el, mkRc());
    const pts = parent.children[0] as THREE.Points;
    expect(pts).toBeInstanceOf(THREE.Points);
    expect(pts.geometry.getAttribute('position').count).toBe(2);
  });

  it('light directional with position', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'light',
      lightType: 'directional',
      intensity: '0.8',
      position: ['3', '4', '5'],
    };
    renderRoot3d(parent, el, mkRc());
    const l = parent.children[0] as THREE.DirectionalLight;
    expect(l).toBeInstanceOf(THREE.DirectionalLight);
    expect(l.intensity).toBeCloseTo(0.8, 5);
    expect(l.position.toArray()).toEqual([3, 4, 5]);
  });

  it('visible=false → 스킵', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'sphere',
      cx: '0', cy: '0', cz: '0',
      r: 1,
      visible: 'false',
    };
    renderRoot3d(parent, el, mkRc());
    expect(parent.children.length).toBe(0);
  });
});

describe('renderRoot3d — containers', () => {
  it('group → 자식 재귀', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'group',
      children: [
        { kind: 'sphere', cx: '0', cy: '0', cz: '0', r: 1 },
        { kind: 'sphere', cx: '2', cy: '0', cz: '0', r: 0.5 },
      ],
    };
    renderRoot3d(parent, el, mkRc());
    const group = parent.children[0] as THREE.Group;
    expect(group.children.length).toBe(2);
  });

  it('if cond=true → then 브랜치', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'if',
      cond: '1 > 0',
      then: { kind: 'sphere', cx: '0', cy: '0', cz: '0', r: 1 },
      else: { kind: 'sphere', cx: '5', cy: '0', cz: '0', r: 2 },
    };
    renderRoot3d(parent, el, mkRc());
    const group = parent.children[0] as THREE.Group;
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.position.x).toBe(0);
  });

  it('match cases → active 분기', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'match',
      on: '"a"',
      cases: {
        a: { kind: 'sphere', cx: '1', cy: '0', cz: '0', r: 1 },
        b: { kind: 'sphere', cx: '9', cy: '0', cz: '0', r: 1 },
      },
    };
    renderRoot3d(parent, el, mkRc());
    const group = parent.children[0] as THREE.Group;
    expect((group.children[0] as THREE.Mesh).position.x).toBe(1);
  });

  it('repeat range → N 자식', () => {
    const parent = new THREE.Group();
    const el: ElementNode = {
      kind: 'repeat',
      of: { range: [0, 3] },
      as: 'i',
      children: [{ kind: 'sphere', cx: 'i', cy: '0', cz: '0', r: 0.1 }],
    };
    renderRoot3d(parent, el, mkRc());
    const group = parent.children[0] as THREE.Group;
    expect(group.children.length).toBe(3);
    expect((group.children[0] as THREE.Mesh).position.x).toBe(0);
    expect((group.children[2] as THREE.Mesh).position.x).toBe(2);
  });

  it('2D kind는 3D에서 throw', () => {
    const parent = new THREE.Group();
    expect(() =>
      renderRoot3d(parent, { kind: 'rect', x: '0', y: '0', w: '1', h: '1' }, mkRc()),
    ).toThrow(/cannot be rendered/);
  });
});

describe('shaderMaterial attachTo', () => {
  it('attachTo로 지정된 Mesh의 material 교체 + 이전 material dispose', () => {
    const parent = new THREE.Group();
    const rc = mkRc();
    renderRoot3d(parent, {
      kind: 'group',
      children: [
        { kind: 'sphere', id: 'earth', cx: '0', cy: '0', cz: '0', r: 1 },
        {
          kind: 'shaderMaterial',
          attachTo: 'earth',
          vertex: 'void main(){gl_Position=vec4(position,1.0);}',
          fragment: 'void main(){gl_FragColor=vec4(1.0);}',
          uniforms: { uIntensity: '0.7' },
        },
      ],
    }, rc);
    const group = parent.children[0] as THREE.Group;
    const earth = group.children[0] as THREE.Mesh;
    expect(earth.material).toBeInstanceOf(THREE.ShaderMaterial);
    const mat = earth.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uIntensity.value).toBeCloseTo(0.7, 5);
  });

  it('존재하지 않는 attachTo → throw', () => {
    const parent = new THREE.Group();
    expect(() =>
      renderRoot3d(parent, {
        kind: 'shaderMaterial',
        attachTo: 'nope',
        vertex: 'v', fragment: 'f',
      }, mkRc()),
    ).toThrow(/not found/);
  });
});

describe('disposeChildren', () => {
  it('모든 자식 제거 + geometry·material dispose 호출', () => {
    const parent = new THREE.Group();
    renderRoot3d(parent, {
      kind: 'group',
      children: [
        { kind: 'sphere', cx: '0', cy: '0', cz: '0', r: 1 },
        { kind: 'sphere', cx: '1', cy: '0', cz: '0', r: 1 },
      ],
    }, mkRc());
    const group = parent.children[0] as THREE.Group;
    let disposeCalls = 0;
    for (const c of group.children) {
      const mesh = c as THREE.Mesh;
      const origGeom = mesh.geometry.dispose.bind(mesh.geometry);
      mesh.geometry.dispose = () => { disposeCalls += 1; origGeom(); };
    }
    disposeChildren(parent);
    expect(parent.children.length).toBe(0);
    expect(disposeCalls).toBe(2);
  });
});

describe('syncCamera — 구면좌표', () => {
  it('theta/phi/distance 상태에서 position과 lookAt 계산', () => {
    const store = createStateStore({
      stateDecls: [
        { id: 'camTheta', type: 'number', default: 0 },
        { id: 'camPhi', type: 'number', default: Math.PI / 2 },
        { id: 'camDistance', type: 'number', default: 5 },
      ],
      initialParams: {},
    });
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const rc = mkRc({ state: store.snapshot().state });
    syncCamera(camera, {
      kind: 'perspective',
      state: { theta: 'camTheta', phi: 'camPhi', distance: 'camDistance' },
    }, store, rc);
    expect(camera.position.x).toBeCloseTo(5, 4);
    expect(camera.position.y).toBeCloseTo(0, 4);
    expect(camera.position.z).toBeCloseTo(0, 4);
  });

  it('target 좌표 적용', () => {
    const store = createStateStore({
      stateDecls: [
        { id: 'camTheta', type: 'number', default: 0 },
        { id: 'camPhi', type: 'number', default: Math.PI / 2 },
        { id: 'camDistance', type: 'number', default: 2 },
      ],
      initialParams: {},
    });
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const rc = mkRc({ state: store.snapshot().state });
    syncCamera(camera, {
      kind: 'perspective',
      state: {
        theta: 'camTheta',
        phi: 'camPhi',
        distance: 'camDistance',
        target: [10, 0, 0],
      },
    }, store, rc);
    expect(camera.position.x).toBeCloseTo(12, 4);
  });
});
