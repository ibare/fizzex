/**
 * 인라인 컨트롤 타입 정의 및 노드 유형 판별
 *
 * Explorer 전체화면 모드에서 수식 요소를 클릭했을 때
 * 어떤 컨트롤을 표시할지 결정하는 로직.
 */

import type { MathNode } from '../types';
import type { CatalogDetail } from '../analyzer/semantic/types';
import type { SemanticResult } from '../analyzer/semantic-roles';
import type { VisualizerBridge, ParameterValues } from '../visualizer/types';

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

// ─── 잘 알려진 상수 ───

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
 * - variable + 수학 상수(π, e, i) → readonly
 * - variable (일반) → slider
 * - number → stepper
 * - operator, func, row, root, text, space → none
 * - 그 외 구조 노드 → readonly
 */
export function getControlType(
  node: MathNode,
  catalogDetail?: CatalogDetail | null,
): ControlType {
  switch (node.type) {
    case 'variable': {
      const name = (node as { name: string }).name;

      // 수학 상수
      if (KNOWN_MATH_CONSTANTS.has(name)) return 'readonly';

      // 카탈로그에서 물리 상수로 명시된 경우 (elementMeanings의 description에 "상수" 포함)
      if (catalogDetail?.elementMeanings?.[name]) {
        const meaning = catalogDetail.elementMeanings[name];
        if (meaning.description.includes('상수') && !hasParameterConfig(name, catalogDetail)) {
          return 'readonly';
        }
      }

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
  bridge?: VisualizerBridge | null,
  paramValues?: ParameterValues,
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

      // 현재 값: bridge > paramValues > default
      if (bridge) {
        const params = bridge.getParams();
        config.currentValue = params[varName] ?? paramCfg?.default ?? 1;
      } else if (paramValues && varName in paramValues) {
        config.currentValue = paramValues[varName];
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
      if (name && KNOWN_CONSTANT_VALUES[name]) {
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

function hasParameterConfig(varName: string, detail: CatalogDetail): boolean {
  return !!detail.parameterConfig?.some(
    (p) => p.id === varName || p.name === varName,
  );
}
