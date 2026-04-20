/**
 * 인라인 컨트롤 타입 정의 및 노드 유형 판별
 *
 * Explorer 전체화면 모드에서 수식 요소를 클릭했을 때
 * 어떤 컨트롤을 표시할지 결정하는 로직.
 */

import type { MathNode } from '../types';
import type { CatalogDetail } from '../analyzer/semantic/types';
import type { SemanticResult } from '../analyzer/semantic-roles';
import type { CreatedVisualizerInstance } from '../visualizer/runtime/public-api';

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

// ─── 잘 알려진 상수 (카탈로그 미매칭 시 fallback) ───

const KNOWN_MATH_CONSTANTS = new Set(['π', 'pi', 'e', 'i']);

const KNOWN_CONSTANT_VALUES: Record<string, { value: string; label: string }> = {
  'π': { value: '3.14159…', label: '원주율' },
  'pi': { value: '3.14159…', label: '원주율' },
  'e': { value: '2.71828…', label: '자연 상수' },
  'i': { value: '√(−1)', label: '허수 단위' },
};

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
 * 카탈로그 미매칭 시 fallback: KNOWN_MATH_CONSTANTS
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

      // fallback: 잘 알려진 수학 상수
      if (KNOWN_MATH_CONSTANTS.has(name)) return 'readonly';

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
      const varName = (node as { name: string }).name;
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

      // 현재 값: instance.store > default
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
      const name = node.type === 'variable'
        ? (node as { name: string }).name
        : undefined;

      // 카탈로그 kind/value 우선
      const em = name ? catalogDetail?.elementMeanings?.[name] : undefined;
      if (em && 'kind' in em && em.kind === 'constant' && em.value != null) {
        const formatted = formatConstantValue(em.value);
        const unit = em.unit ? ` ${em.unit}` : '';
        config.displayValue = `${em.role} ${name} = ${formatted}${unit}`;
      } else if (em && 'kind' in em && em.kind === 'output') {
        config.displayValue = em.role;
      } else if (name && KNOWN_CONSTANT_VALUES[name]) {
        // fallback: 잘 알려진 수학 상수
        const info = KNOWN_CONSTANT_VALUES[name];
        config.displayValue = `${info.label} ${name} ≈ ${info.value}`;
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
