/**
 * 인라인 컨트롤 타입 정의 및 노드 유형 판별
 *
 * Explorer 전체화면 모드에서 수식 요소를 클릭했을 때
 * 어떤 컨트롤을 표시할지 결정하는 로직.
 */

import type { MathNode } from '../types.js';
import type { CatalogDetail } from '../analyzer/semantic/types.js';
import type { SemanticResult } from '../analyzer/semantic/index.js';
import type { CreatedVisualizerInstance } from '../visualizer/runtime/public-api.js';
import { normalizeVarName } from '../evaluator/normalize.js';

// ─── 타입 ───

/** 인라인 컨트롤 유형 */
export type ControlType = 'slider' | 'stepper' | 'readonly' | 'none';

/** 인라인 컨트롤 설정 */
export interface InlineControlConfig {
  controlType: ControlType;
  nodeId: string;
  role?: string;
  description?: string;

  // slider 전용
  min?: number;
  max?: number;
  step?: number;
  scale?: 'linear' | 'log';
  unit?: string;
  paramId?: string;
  currentValue?: number;

  // stepper 전용
  integerOnly?: boolean;

  // readonly 전용
  displayValue?: string;
}

// ─── 함수 ───

/**
 * AST 노드의 유형에 따라 인라인 컨트롤 종류를 결정한다.
 *
 * 카탈로그 kind 필드 우선:
 * - constant → readonly (값 표시)
 * - output → readonly (결과값)
 * - input → slider
 * - structural → none
 *
 * 카탈로그가 말이 없으면 조절 가능한 값으로 본다. 이름이 수학 상수와 겹친다는
 * 이유만으로 편집을 막지 않는다 — `∞` 만 예외다.
 */
export function getControlType(
  node: MathNode,
  catalogDetail?: CatalogDetail | null,
): ControlType {
  switch (node.type) {
    case 'variable': {
      const name = (node as { name: string }).name;

      // 카탈로그 kind 기반 판별 (우선)
      const meaning = catalogDetail?.elementMeanings?.[name];
      if (meaning && 'kind' in meaning) {
        switch (meaning.kind) {
          case 'constant': return 'readonly';
          case 'output': return 'readonly';
          case 'structural': return 'none';
          case 'input':
          default:
            return 'slider';
        }
      }

      // 이름만 보고 상수라 단정해 편집을 막지 않는다. `φ` 는 황금비이기도 하고
      // 각도이기도 하며, `γ` 는 로런츠 인자로 쓰인다. 어느 쪽인지는 카탈로그
      // 저작자가 `kind: 'constant'` 로 말해줄 때만 안다. 말이 없으면 조절 가능한
      // 값으로 둔다 — π 를 3 으로 바꿔 보는 것이 이 편집기의 목적이다.
      //
      // `∞` 만 예외다. 슬라이더로 무한대를 조절한다는 것이 성립하지 않는다.
      if (normalizeVarName(name) === '∞') return 'readonly';

      return 'slider';
    }

    case 'number':
      return 'stepper';

    case 'operator':
    case 'func':
    case 'row':
    case 'root':
    case 'text':
    case 'space':
      return 'none';

    default:
      return 'readonly';
  }
}

/**
 * 노드, 의미 정보, 카탈로그에서 완전한 InlineControlConfig를 생성한다.
 */
export function buildInlineControlConfig(
  node: MathNode,
  semantic: SemanticResult | undefined,
  catalogDetail?: CatalogDetail | null,
  instance?: CreatedVisualizerInstance | null,
): InlineControlConfig {
  const controlType = getControlType(node, catalogDetail);
  const config: InlineControlConfig = {
    controlType,
    nodeId: node.id,
    role: semantic?.role,
    description: semantic?.description,
  };

  switch (controlType) {
    case 'slider': {
      const rawName = (node as { name: string }).name;
      const varName = normalizeVarName(rawName);
      config.paramId = varName;

      // 카탈로그 parameterConfig에서 매칭 파라미터 검색
      const paramCfg = catalogDetail?.parameterConfig?.find(
        (p) => p.id === varName || p.name === varName,
      );

      if (paramCfg) {
        config.min = paramCfg.min;
        config.max = paramCfg.max;
        config.step = paramCfg.step;
        config.unit = paramCfg.unit;
        config.scale = paramCfg.scale === 'log' ? 'log' : 'linear';
      } else {
        config.min = -10;
        config.max = 10;
        config.step = 0.1;
        config.scale = 'linear';
      }

      // 현재 값: instance.store > 카탈로그 default > 1
      //
      // 이름으로 상수 표준값을 시드하지 않는다. 바로 위 getControlType 이
      // "φ 는 각도일 수도 있다" 며 이름 단정을 거부해 놓고 여기서 값을 단정하면
      // 앞뒤가 맞지 않고, 실제로 틀린다 — γ 를 로런츠 인자로 쓴 사용자에게
      // 0.577 을 보여주게 된다(로런츠 인자는 정의상 1 이상이다).
      // `evaluator/constants.ts` 가 이 사용법을 직접 금지한다.
      //
      // π·e 는 fallback 의 `specialVariables` 가 "원주율 파이 (약 3.14159)입니다"
      // 처럼 원래 값을 설명에 실어 준다. γ·τ·φ·ϕ 는 그 목록에 없어 일반 변수
      // 설명으로 떨어진다 — 값을 알려주려면 카탈로그가 말해야 한다.
      if (instance) {
        const snap = instance.store.snapshot();
        config.currentValue = snap.params[varName] ?? paramCfg?.default ?? 1;
      } else {
        config.currentValue = paramCfg?.default ?? 1;
      }
      break;
    }

    case 'stepper': {
      const value = (node as { value: string }).value;
      const numValue = parseFloat(value);
      config.currentValue = numValue;
      config.integerOnly = !value.includes('.');
      break;
    }

    case 'readonly': {
      const rawName = node.type === 'variable'
        ? (node as { name: string }).name
        : undefined;
      // 카탈로그 kind/value 우선 (카탈로그 키는 raw name 기준)
      const em = rawName ? catalogDetail?.elementMeanings?.[rawName] : undefined;
      if (em && 'kind' in em && em.kind === 'constant' && em.value != null) {
        const formatted = formatConstantValue(em.value);
        const unit = em.unit ? ` ${em.unit}` : '';
        config.displayValue = `${em.role} ${rawName} = ${formatted}${unit}`;
      } else if (em && 'kind' in em && em.kind === 'output') {
        config.displayValue = em.role;
      } else if (semantic) {
        config.displayValue = semantic.description;
      }
      break;
    }
  }

  return config;
}

// ─── 내부 헬퍼 ───

/** 상수 값을 읽기 좋은 문자열로 포맷 (과학적 표기법 지원) */
function formatConstantValue(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 0.01 && abs < 1e6) {
    return value.toLocaleString('ko-KR', { maximumSignificantDigits: 6 });
  }
  // 과학적 표기법
  return value.toExponential(3);
}
