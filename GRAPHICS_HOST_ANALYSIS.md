# Graphics Host 추출 · Visualizer 재편 분석 리포트

> Phase 1 산출물 — `tasks/fizzex-graphics-host-prompt.md` 기반. 사용자와의 대화를 통해 확장·확정된 **Phase 2 실행 지침 겸용 문서**.

## 0. 요약

이 작업은 두 축으로 진행된다.

1. **축 A — Graphics Host 추출**: `src/graphics/`에 Canvas/DPR/rAF/리사이즈/destroy·좌표계 라이브러리를 공통 모듈로 분리. Visualizer 8개가 자체 구현하던 보일러플레이트를 Host가 흡수한다.
2. **축 B — Visualizer 구조 재편 ("수식 1 : Visualizer N" 철학 정착)**: 현재 "1 Visualizer + 내부 N개 프리셋(장면)" 구조가 철학에 맞지 않음. 각 프리셋을 **독립 Visualizer**로 펼쳐 32개(현 8개 × 평균 4 프리셋)로 재편한다. 상단 추상 + 하단 장면 이중 구도 폐기. 각 Visualizer는 자기 뷰만.

두 축은 Phase 2 안에서 함께 진행된다. 결과물은 **기존 8개 폴더 제거 + 32개 신규 Visualizer + 프리셋 인프라 제거 + Graphics Host + 좌표계 라이브러리**.

---

## 1. 조사 대상

### 1.1 현 Visualizer 8개

| Visualizer | 형식 | 프리셋 | 분리 후 Visualizer |
|---|---|---|---|
| pythagorean-2d | 신형(abstract+scenes) | explore, ladder, tv, shortcut | 4 |
| compound-interest-2d | 신형 | savings, stock, deposit, inflation | 4 |
| exponential-decay-2d | 신형 | caffeine, carbon14, drug, battery | 4 |
| freefall-2d | 신형 | earth, moon, mars, jupiter | 4 |
| quadratic-2d | 신형 | sandbox, bridge, basketball, fountain | 4 |
| sine-wave-2d | 신형 | speaker, voltmeter, tide, pendulum | 4 |
| kepler-orbit-2d | 구형 | iss, gps, geo, moon | 4 |
| kepler-orbit-3d | 구형 | iss, gps, geo, moon | 4 |
| **합계** | | | **32** |

### 1.2 Visualizer 프레임워크 계약 (현행)

`src/visualizer/types.ts:111-144` `FizzexVisualizer`:

- `mount(container, options)` / `update(context)` / `resize(w,h)` / `unmount()` — 유지
- `presets: Preset[]` — **Phase 2에서 제거**
- `VisualizerUpdate.activePresetId` / `baseline` / `isStandard` 중 `activePresetId` — **제거**
- `VisualizerBridge.applyPreset()` — **제거**
- `Preset` 타입 — **제거**

Graphics Host는 이 4개 라이프사이클 메서드 안에서만 동작해야 한다.

---

## 2. 공통 보일러플레이트 (7개 2D Visualizer 전수 조사)

각 항목: 대표 파일:라인 — Visualizer 1개당 추정 라인 수.

### 2.1 Canvas 생성·마운트 [7/7 동일] — **8~12줄/개**

`src/visualizer/built-in/pythagorean-2d/renderer.ts:90-98`:
```ts
this.canvas = document.createElement('canvas');
this.canvas.style.width = '100%';
this.canvas.style.height = '100%';
this.canvas.style.display = 'block';
container.appendChild(this.canvas);
const ctx = this.canvas.getContext('2d');
if (!ctx) throw new Error('...');
this.ctx = ctx;
```

동일: compound 97~, exponential 86~, freefall 98~, quadratic 92~, sine-wave 90~, kepler-2d 101~ (cursor 추가).

→ **Host로 이관**.

### 2.2 DPR 처리 [7/7 동일] — **9~11줄/개**

`pythagorean-2d/renderer.ts:142-152` 형태로 완전 일치. `canvas.width/height` = 물리픽셀, `style.width/height` = 논리픽셀, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.

→ **Host로 이관**.

### 2.3 rAF 루프 [7/7 유사] — **5~9줄/개**

공통 패턴: 생성자에서 시작, `destroyed` 플래그, `destroy()`에서 `cancelAnimationFrame`. pythagorean만 `dt` 미사용(`renderer.ts:103-108`), kepler-2d만 `animate()` 메서드 분리(`127-128`).

→ **Host로 이관**. 콜백 시그니처 `onFrame(ctx, { dt, now })`. 필요 없으면 무시.

### 2.4 destroy [7/7 동일] — **4~8줄/개**

`cancelAnimationFrame → canvas.parentNode 확인 후 removeChild`.

→ **Host로 이관**.

### 2.5 ResizeObserver — **외부 주입 모델 유지**

7개 모두 외부(프레임워크)가 `resize(w,h)` 호출. Host도 동일. Host에 내장하지 않음.

### 2.6 이벤트 리스너 [1/7만 사용]

kepler-orbit-2d만 드래그 이벤트(`renderer.ts:115-121, 176-178`). Host는 이벤트 시스템을 일반화하지 않음. Visualizer가 `instance.canvas`에 직접 등록하고 `unmount`에서 정리.

### 2.7 테마 기본값 [7/7 유사]

`isDark = theme === 'dark'` + 배경/격자/축 3색 분기. 팔레트는 거의 동일(`#0b1220`/`#f8fafc` 배경 등).

→ Host가 `theme.background/gridLine/axis/text/divider` 5개 기본 팔레트 함수 제공. 도메인 강조색은 Visualizer 몫.

### 2.8 좌표 변환 — **Host가 라이브러리로 제공, Visualizer가 선택** ✅ 확정

현 7개 사용 패턴을 3종으로 분류:

| 종류 | 사용 Visualizer | 형태 |
|---|---|---|
| `TimeValueViewport` | compound, exponential, freefall, quadratic, sine-wave (5개) | `(xMin, xMax, yMin, yMax, yUp, padding)` + `toScreen(wx, wy)` |
| `BBoxViewport` | pythagorean | `(bbox, padding)` → bbox 중심 정렬 + 자동 스케일 팩터 |
| `PolarViewport` | kepler-orbit-2d | `(cx, cy, scale)` + `toScreen(radius, angle)` |

3D는 Three.js 카메라가 이 역할을 수행하므로 별도 `Viewport3D` 없음.

### 2.9 기본 도형 헬퍼 — **Host 미제공**

`roundRect`, `arc`, `fillText` 직접 사용이 주. 공통 헬퍼 후보 부족. 필요 시 각 Visualizer의 `renderer.ts` 내 함수로 유지.

---

## 3. 불일치 — 통일 방식

| 항목 | 현황 | 통일안 |
|---|---|---|
| rAF dt 유무 | pythagorean 미사용, 5개 사용, kepler-2d는 메서드 분리 | Host가 `{ dt, now }` 제공, 무시 가능 |
| 자동 재생 로직 | freefall의 `tickAutoPlay`, sine-wave의 내부 t 진행 | Host 미관여. Visualizer 내부 상태. |
| destroy 순서 | 7개 동일 / 3D는 dispose 루프 추가 | Host 기본 순서 제공. Visualizer 추가 dispose는 `unmount` 훅. |
| theme 전환 | 재마운트 의존 | 동일 유지. `setTheme()` 미제공. |
| DPR 변경 감지 | `resize()` 호출 시 재읽기 | 동일 유지. |

---

## 4. Host / Visualizer 경계선

### 4.1 Host 책임

- Canvas 생성 + DPR + rAF + destroy
- `onFrame(ctx, { dt, now })` 콜백
- `theme` 팔레트 함수
- 좌표계 라이브러리(`TimeValueViewport`, `BBoxViewport`, `PolarViewport`)
- Three.js Scene/Camera/Renderer 라이프사이클(3D)
- `ctx` / `{scene, camera, renderer, THREE}` 직접 노출

### 4.2 Visualizer 책임

- `render()` 드로잉 내용
- 좌표계 **선택 + 구성 파라미터** (Host에서 import해 생성)
- 자체 이벤트 리스너 (kepler 드래그 등)
- `unmount`에서 본인이 등록한 자원 정리

### 4.3 원칙

**Host는 `ctx` 위에 얹는 유틸리티**. 감추거나 가두지 않음. Visualizer가 `ctx.beginPath()` 직접 호출 가능해야 함.

---

## 5. 3D Host 범위 (kepler-orbit-3d 기준)

### 5.1 Host로 이관

- `WebGLRenderer`(antialias=true, alpha=false, preserveDrawingBuffer=**true**)
- `Scene`, `PerspectiveCamera(fov=50, near=0.05, far=2000)` 기본 생성(오버라이드 가능)
- renderer.domElement 컨테이너 마운트
- rAF 루프 + `onFrame(g, { dt, now })`
- `resize(w,h)` = `setSize(w,h,false)` + aspect 갱신 + `updateProjectionMatrix`
- destroy 순서: `cancelAnimationFrame` → `onDispose(g)` 훅 → `renderer.dispose()` → DOM 제거

### 5.2 Visualizer 책임

- Scene 콘텐츠 (Mesh/Light/Line/Points)
- 카메라 제어 (kepler는 자체 spherical orbit 유지, OrbitControls 도입 유보)
- 이벤트 핸들링 (pointer/wheel)
- Mesh/Geometry/Material **생성**(Host는 **dispose 훅만 제공**)

### 5.3 Three.js import 격리

- `src/graphics/Graphics3D.ts`만 `import * as THREE from 'three'`
- `src/graphics/Graphics2D.ts`는 절대 import 금지
- `src/graphics/index.ts` 배럴은 2D/3D 분리 경로 노출
- 2D 전용 Visualizer는 직접 경로(`from '../../graphics/Graphics2D'`)로 import해 트리셰이킹 보장

---

## 6. 제안 인터페이스 (초안)

### 6.1 `src/graphics/types.ts`

```ts
export type Theme = 'light' | 'dark';
export interface FrameInfo { dt: number; now: number; }
```

### 6.2 `src/graphics/theme.ts`

```ts
export function background(isDark: boolean): string;
export function gridLine(isDark: boolean): string;
export function axis(isDark: boolean): string;
export function text(isDark: boolean): string;
export function divider(isDark: boolean): string;
```

### 6.3 `src/graphics/Graphics2D.ts`

```ts
export interface Graphics2DOptions {
  width: number;
  height: number;
  theme: Theme;
  onFrame: (ctx: CanvasRenderingContext2D, frame: FrameInfo) => void;
}

export class Graphics2D {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  theme: Theme;
  constructor(container: HTMLElement, opts: Graphics2DOptions);
  resize(width: number, height: number): void;
  destroy(): void;
}
```

### 6.4 `src/graphics/viewport/` (좌표계 라이브러리)

공통 인터페이스:
```ts
export interface Viewport2D {
  toScreen(wx: number, wy: number): { x: number; y: number };
  toWorld(sx: number, sy: number): { x: number; y: number };
}
```

구체 구현 3종:
```ts
// time-value.ts
export interface TimeValueViewportOptions {
  rect: { x: number; y: number; w: number; h: number };
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  yUp?: boolean;       // 기본 true(수학 좌표계). false면 y-down 화면 좌표계와 일치.
  padding?: { top: number; right: number; bottom: number; left: number };
}
export function createTimeValueViewport(opts: TimeValueViewportOptions): Viewport2D & {
  rect: { x: number; y: number; w: number; h: number };
  tToX(t: number): number;
  valueToY(v: number): number;
};

// bbox.ts
export interface BBoxViewportOptions {
  rect: { x: number; y: number; w: number; h: number };
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  padding?: number;
  yUp?: boolean;
}
export function createBBoxViewport(opts: BBoxViewportOptions): Viewport2D & {
  cx: number; cy: number; scale: number;
};

// polar.ts
export interface PolarViewportOptions {
  center: { x: number; y: number };
  scale: number; // 월드 단위 → 스크린 픽셀
}
export function createPolarViewport(opts: PolarViewportOptions): {
  toScreen(radius: number, angle: number): { x: number; y: number };
};
```

함수형으로 결과 객체를 반환(클래스 오버헤드 없음). 각 Visualizer의 `renderer.ts`에서 프레임마다 또는 resize마다 재구성.

### 6.5 `src/graphics/Graphics3D.ts`

```ts
import * as THREE from 'three';

export interface Graphics3DContext {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly THREE: typeof THREE;
}

export interface Graphics3DOptions {
  width: number; height: number; theme: Theme;
  camera?: { fov?: number; near?: number; far?: number };
  renderer?: { antialias?: boolean; alpha?: boolean; preserveDrawingBuffer?: boolean };
  setup: (g: Graphics3DContext) => void;
  onFrame: (g: Graphics3DContext, frame: FrameInfo) => void;
  onDispose?: (g: Graphics3DContext) => void;
}

export class Graphics3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  constructor(container: HTMLElement, opts: Graphics3DOptions);
  resize(width: number, height: number): void;
  destroy(): void;
}
```

### 6.6 `src/graphics/index.ts`

```ts
export { Graphics2D } from './Graphics2D';
export type { Graphics2DOptions } from './Graphics2D';
export { Graphics3D } from './Graphics3D';
export type { Graphics3DOptions, Graphics3DContext } from './Graphics3D';
export * as theme from './theme';
export * from './viewport';
export type { Theme, FrameInfo } from './types';
```

---

## 7. Visualizer 재편 — 파일 구조 스펙 (형식 스펙 (a)) ✅ 확정

### 7.1 분리 Visualizer의 표준 파일 구성

```
src/visualizer/built-in/<id>/
  index.ts     # FizzexVisualizer 메타(parameters/derivedValues/lifecycle) — presets 필드 없음
  renderer.ts  # Graphics2D/3D 사용. 단일 뷰만 그림. 프리셋/장면 전환 코드 없음.
```

추가 파일은 해당 Visualizer에 꼭 필요할 때만 둔다(예: `utils.ts`). 공유 추상 드로어 디렉터리는 **만들지 않음** (B 결정: 각 Visualizer는 자기 뷰만).

### 7.2 Visualizer ID 명명 규칙

`<수식키>-<관점키>-<차원>` 플랫 구조. 계층 디렉터리 쓰지 않음.

| 수식 | 관점 | ID |
|---|---|---|
| pythagorean | explore | `pythagorean-explore-2d` |
| pythagorean | ladder | `pythagorean-ladder-2d` |
| pythagorean | tv | `pythagorean-tv-2d` |
| pythagorean | shortcut | `pythagorean-shortcut-2d` |
| compound-interest | savings | `compound-interest-savings-2d` |
| compound-interest | stock | `compound-interest-stock-2d` |
| … | | (같은 규칙으로 28개) |
| kepler-orbit | iss | `kepler-orbit-iss-2d` / `kepler-orbit-iss-3d` |
| … | | … |

### 7.3 메타 필드 예시

```ts
// pythagorean-ladder-2d/index.ts
const visualizer: FizzexVisualizer = {
  id: 'pythagorean-ladder-2d',
  name: '사다리 — 피타고라스',
  // parameters / derivedValues / constants — 해당 관점에 맞는 기본값으로 세팅
  // presets 필드 없음
  mount(container, options) { ... },
  update(context) { ... },
  resize(w, h) { ... },
  unmount() { ... },
};
```

기존 프리셋의 `values`는 각 분리 Visualizer의 `parameters[].default`로 이관된다(프리셋 진입 상태가 곧 기본 상태).

### 7.4 explore·sandbox 계열 처리

- `pythagorean-explore-2d`: 현 상단 추상(abstract.ts) 드로어를 **캔버스 전체**에 배치. 격자 + 직각삼각형 + 세 정사각형.
- `quadratic-sandbox-2d`: 유사 방식. 수식 그래프만.

다른 Visualizer(compound/exponential/freefall/sine-wave/kepler)는 자유 탐색 프리셋이 현재 없음 → 자유 탐색 타입 Visualizer도 만들지 않는다(사용자 결정 A: "현재 있는 것 유지").

### 7.5 장면 Visualizer는 자기 뷰만 (B 결정)

상단 추상(수식 그래프)은 장면 Visualizer에 포함하지 않는다. 예: `pythagorean-ladder-2d`는 사다리 장면만. 수식 정보는 카탈로그/UI가 다른 레이어(수식 표시, 변수 패널 등)에서 담당.

기존 scenes 드로어는 하단 58% 영역 기준 상대 좌표(x, y, w, h)로 그리고 있으므로 **전체 캔버스 영역으로 호출**하면 자연 확장된다. 드로어 코드 수정 최소.

---

## 8. 프리셋 인프라 제거 범위 ✅ 확정

| 파일 | 제거 대상 |
|---|---|
| `src/visualizer/types.ts` | `Preset` 인터페이스 전체, `FizzexVisualizer.presets` 필드, `VisualizerUpdate.activePresetId` |
| `src/visualizer/bridge.ts` | `applyPreset()` 메서드 및 구현부 |
| 카탈로그 UI (해당 시) | 프리셋 칩/셀렉터 |
| Visualizer registry (해당 시) | 프리셋 관련 조회 로직 |
| 테스트 | `activePresetId`/`applyPreset` 관련 케이스 |

순서 주의: **32개 분리 Visualizer가 완성된 이후**에 제거한다. 먼저 제거하면 현 8개 Visualizer가 빌드 실패.

---

## 9. Phase 2 실행 순서

```
1. Graphics Host 코어 구현
   src/graphics/{types,theme,Graphics2D,Graphics3D,index}.ts
   + src/graphics/viewport/{index,time-value,bbox,polar}.ts

2. 신규 Visualizer 분리/마이그레이션 (1개씩 × 32개)
   순서: 단순 → 복잡
   2-a. pythagorean 4개 (explore → ladder → tv → shortcut) — 2D Host 검증
   2-b. quadratic 4개 (sandbox → bridge → basketball → fountain)
   2-c. freefall 4개
   2-d. sine-wave 4개
   2-e. compound-interest 4개
   2-f. exponential-decay 4개
   2-g. kepler-orbit-2d 4개 — 이벤트 리스너 케이스 검증
   2-h. kepler-orbit-3d 4개 — 3D Host 검증
   
   각 Visualizer 완성 후 카탈로그 등록 + 데모 확인.

3. 기존 8개 폴더 제거
   src/visualizer/built-in/{pythagorean-2d, compound-interest-2d, ...}
   삭제 전 grep으로 내부 import 참조가 남지 않았는지 확인.

4. 프리셋 인프라 제거
   types.ts / bridge.ts / registry.ts / 카탈로그 UI / 테스트 정비.

5. Examples/Docs 정비
   website/app/examples 등에서 기존 ID 참조를 새 ID로 교체. 없어진 ID는 삭제.

6. 최종 리포트
   - 각 Visualizer 제거된 보일러플레이트 라인 수 집계
   - 분리 전/후 Visualizer 수 비교
   - 스크린샷: 각 "기존 프리셋 N" vs "분리 Visualizer N"의 시각 동등성 확인
```

각 단계마다 Rule Guard 사전·사후 검증. 각 분리 Visualizer는 **단일 커밋** 단위(문제 발생 시 개별 revert 가능).

---

## 10. 마이그레이션 금지 사항 (지침 엄수)

- ❌ **각 장면의 시각 결과물**은 기존과 동일해야 한다. (**상단 추상이 사라지는 것은 의도된 재편**이므로 시각 변경 아님. 각 장면 **내부** 드로잉은 100% 동일.)
- ❌ Host 인터페이스를 "미래에 필요할 것 같아서" 확장하지 않는다. 실제 사용된 것만.
- ❌ Three.js를 `Graphics2D`에서 import 금지.
- ❌ `ctx`/`{scene, camera, renderer, THREE}`를 감추거나 프록시하지 않는다.
- ❌ 이벤트 시스템을 과도하게 설계하지 않는다.

---

## 11. 예상 효과

- 보일러플레이트 제거: 현 8개에서 **약 330줄** (2D 7개 × ~40 + 3D 1개 × ~58).
- Visualizer 수: 8 → 32 (사용자 관점에서 카탈로그가 확장).
- 프리셋 인프라 제거로 프레임워크 단순화: `Preset`/`activePresetId`/`applyPreset` 경로 폐기.
- 페이드 전환·`PRESET_COLORS`·`SCENE_DRAWERS`·`findActivePreset` 등 장면 관리 코드 전면 삭제.
- 향후 "150개 이상 대량 생산" 시 각 Visualizer가 "수식 1관점 1파일세트" 단위라 추가가 쉬움. Graphics Host + Viewport 라이브러리가 기반.
