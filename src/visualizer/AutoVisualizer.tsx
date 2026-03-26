/**
 * AutoVisualizer - 자동 시각화 선택 컴포넌트
 *
 * 수식 분석 결과를 바탕으로 적절한 시각화를 자동으로 선택하여 렌더링
 */

import React, { useMemo, useState } from 'react';
import type { ExpressionAnalysis, VisualizationType } from '../analyzer/types';
import { FunctionGraph } from './FunctionGraph';
import { UnitCircle } from './UnitCircle';
import { NumberLine } from './NumberLine';
import { PolarGraph } from './PolarGraph';

export interface AutoVisualizerProps {
  /** 수식 분석 결과 */
  analysis: ExpressionAnalysis;
  /** LaTeX 표현식 (FunctionGraph용) */
  latex?: string;
  /** 컨테이너 너비 */
  width?: number;
  /** 컨테이너 높이 */
  height?: number;
  /** 시각화 유형 수동 선택 (자동 선택 override) */
  forceType?: VisualizationType;
  /** 선 색상 */
  lineColor?: string;
  /** 추가 클래스명 */
  className?: string;
  /** 시각화 선택 UI 표시 */
  showSelector?: boolean;
  /** 계수 값들 (인터랙티브 그래프용) */
  coefficientValues?: Record<string, number>;
}

/**
 * 시각화 유형 라벨
 */
const visualizationLabels: Record<VisualizationType, string> = {
  'function-graph-2d': '2D 그래프',
  'function-graph-3d': '3D 그래프',
  'number-line': '수직선',
  'coordinate-plane': '좌표평면',
  'geometric-shape': '도형',
  'unit-circle': '단위원',
  'polar-graph': '극좌표',
  table: '값 표',
};

/**
 * 시각화 유형 아이콘
 */
const visualizationIcons: Record<VisualizationType, string> = {
  'function-graph-2d': '📈',
  'function-graph-3d': '📊',
  'number-line': '📏',
  'coordinate-plane': '📐',
  'geometric-shape': '🔷',
  'unit-circle': '🔵',
  'polar-graph': '🌀',
  table: '📋',
};

/**
 * 자동 시각화 선택 컴포넌트
 */
export function AutoVisualizer({
  analysis,
  latex = '',
  width,
  height = 300,
  forceType,
  lineColor = '#3b82f6',
  className,
  showSelector = true,
  coefficientValues = {},
}: AutoVisualizerProps): React.ReactElement | null {
  const { visualization } = analysis;
  const { recommended, bestFit, params } = visualization;

  // 현재 선택된 시각화 유형
  const [selectedType, setSelectedType] = useState<VisualizationType | undefined>(forceType);
  const activeType = selectedType || bestFit || recommended[0] || 'table';

  // 계수 치환된 표현식 (FunctionGraph용)
  const substitutedExpression = useMemo(() => {
    if (!latex) return '';

    let expr = latex;
    const coefficients = analysis.variableClassification?.coefficients || [];
    const mainVariable = analysis.variableClassification?.mainVariables[0] || 'x';
    const mainVarEscaped = mainVariable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    coefficients.forEach((coef) => {
      const value = coefficientValues[coef] ?? 1;
      const regex = new RegExp(
        `(?<![a-zA-Z])${coef}(?=${mainVarEscaped}|[^a-zA-Z]|$)`,
        'g'
      );
      expr = expr.replace(regex, `(${value})`);
    });

    // y = f(x) 형태이면 우변만 사용
    const parts = expr.split('=');
    if (parts.length === 2) {
      const left = parts[0].trim();
      if (left === 'y' || left.match(/^f\s*\(/)) {
        expr = parts[1].trim();
      }
    }

    return expr;
  }, [latex, coefficientValues, analysis.variableClassification]);

  // 시각화 렌더링
  const renderVisualization = () => {
    switch (activeType) {
      case 'number-line':
        if (params?.numberLine) {
          return (
            <NumberLine
              points={params.numberLine.points.map((p) => ({
                value: p.value,
                label: p.label,
                color: lineColor,
                included: p.included,
              }))}
              intervals={params.numberLine.intervals.map((i) => ({
                start: i.start,
                end: i.end,
                startIncluded: i.startIncluded,
                endIncluded: i.endIncluded,
                color: lineColor,
                label: i.label,
              }))}
              range={params.numberLine.range}
              width={width}
              height={height > 120 ? 100 : height}
            />
          );
        }
        return <NoParamsMessage type="number-line" />;

      case 'unit-circle':
        if (params?.unitCircle) {
          return (
            <UnitCircle
              initialAngle={params.unitCircle.initialAngle}
              size={Math.min(width || 300, height)}
              lineColor={lineColor}
            />
          );
        }
        // 기본 단위원
        return (
          <UnitCircle
            size={Math.min(width || 300, height)}
            lineColor={lineColor}
          />
        );

      case 'polar-graph':
        if (params?.polar) {
          return (
            <PolarGraph
              expression={params.polar.expression}
              size={Math.min(width || 300, height)}
              lineColor={lineColor}
              thetaRange={params.polar.thetaRange}
              animated={params.polar.animated}
            />
          );
        }
        return <NoParamsMessage type="polar-graph" />;

      case 'function-graph-2d':
        if (substitutedExpression) {
          return (
            <FunctionGraph
              expression={substitutedExpression}
              width={width}
              height={height}
              lineColor={lineColor}
              showGrid
              showLabels
            />
          );
        }
        return <NoParamsMessage type="function-graph-2d" />;

      case 'table':
      default:
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: height,
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            이 수식에 적합한 시각화를 찾지 못했습니다
          </div>
        );
    }
  };

  if (!analysis) return null;

  return (
    <div className={className} style={{ width: width || '100%' }}>
      {/* 시각화 선택 UI */}
      {showSelector && recommended.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}
        >
          {recommended.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeType === type ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                background: activeType === type ? '#eff6ff' : '#ffffff',
                color: activeType === type ? '#1d4ed8' : '#374151',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s',
              }}
            >
              <span>{visualizationIcons[type]}</span>
              <span>{visualizationLabels[type]}</span>
              {type === bestFit && (
                <span
                  style={{
                    fontSize: '10px',
                    background: '#dbeafe',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    color: '#1e40af',
                  }}
                >
                  추천
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 현재 시각화 타입 표시 (단일 옵션인 경우) */}
      {showSelector && recommended.length === 1 && (
        <div
          style={{
            marginBottom: '8px',
            fontSize: '12px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{visualizationIcons[activeType]}</span>
          <span>{visualizationLabels[activeType]}</span>
        </div>
      )}

      {/* 시각화 렌더링 */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {renderVisualization()}
      </div>
    </div>
  );
}

/**
 * 파라미터 없음 메시지
 */
function NoParamsMessage({ type }: { type: VisualizationType }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: '#9ca3af',
        fontSize: '14px',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '24px' }}>{visualizationIcons[type]}</span>
      <span>{visualizationLabels[type]} 시각화 준비 중...</span>
      <span style={{ fontSize: '12px' }}>
        수식을 더 구체적으로 입력해주세요
      </span>
    </div>
  );
}

export default AutoVisualizer;
