/**
 * NumberLine - 수직선 시각화 컴포넌트
 *
 * 부등식, 절댓값, 구간 등을 직관적으로 표현
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupHiDPI, CanvasSceneSurface } from '../canvas';
import type { SceneSurface } from '../canvas';

export interface NumberLinePoint {
  /** 값 */
  value: number;
  /** 라벨 (선택) */
  label?: string;
  /** 색상 */
  color?: string;
  /** 포함 여부 (채워진 점 vs 빈 점) */
  included?: boolean;
}

export interface NumberLineInterval {
  /** 시작값 */
  start: number;
  /** 끝값 */
  end: number;
  /** 시작점 포함 여부 */
  startIncluded?: boolean;
  /** 끝점 포함 여부 */
  endIncluded?: boolean;
  /** 색상 */
  color?: string;
  /** 라벨 */
  label?: string;
}

export interface NumberLineProps {
  /** 표시할 점들 */
  points?: NumberLinePoint[];
  /** 표시할 구간들 */
  intervals?: NumberLineInterval[];
  /** 수직선 범위 [min, max] */
  range?: [number, number];
  /** 눈금 간격 */
  tickInterval?: number;
  /** 캔버스 너비 (미지정 시 컨테이너에 맞춤) */
  width?: number;
  /** 캔버스 높이 */
  height?: number;
  /** 추가 클래스명 */
  className?: string;
  /** 인터랙티브 모드 */
  interactive?: boolean;
  /** 값 변경 콜백 (인터랙티브 모드) */
  onValueChange?: (value: number) => void;
}

/**
 * 수직선 시각화 컴포넌트
 */
export function NumberLine({
  points = [],
  intervals = [],
  range: propRange,
  tickInterval: propTickInterval,
  width: propWidth,
  height: propHeight = 80,
  className,
  interactive = false,
  onValueChange,
}: NumberLineProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [containerWidth, setContainerWidth] = useState(propWidth || 400);
  const [isDragging, setIsDragging] = useState(false);
  const [interactiveValue, setInteractiveValue] = useState(0);

  const width = propWidth || containerWidth;

  // 범위 자동 계산
  const range = propRange || calculateRange(points, intervals);
  const [rangeMin, rangeMax] = range;
  const rangeSpan = rangeMax - rangeMin;

  // 눈금 간격 자동 계산
  const tickInterval = propTickInterval || calculateTickInterval(rangeSpan);

  const padding = 30;
  const lineY = propHeight / 2;
  const usableWidth = width - padding * 2;

  // 컨테이너 크기 감지
  useEffect(() => {
    if (propWidth) return;

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w } = entry.contentRect;
        if (w > 0) {
          setContainerWidth(w);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [propWidth]);

  // 값을 x 좌표로 변환
  const valueToX = useCallback((value: number): number => {
    return padding + ((value - rangeMin) / rangeSpan) * usableWidth;
  }, [rangeMin, rangeSpan, usableWidth]);

  // x 좌표를 값으로 변환
  const xToValue = useCallback((x: number): number => {
    const normalized = (x - padding) / usableWidth;
    return rangeMin + normalized * rangeSpan;
  }, [rangeMin, rangeSpan, usableWidth]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ctx } = setupHiDPI(canvas, width, propHeight);
    const s = new CanvasSceneSurface(ctx);

    // 배경
    s.setFillStyle('#ffffff');
    s.fillRect(0, 0, width, propHeight);

    // 구간 렌더링
    intervals.forEach((interval) => {
      const startX = valueToX(interval.start);
      const endX = valueToX(interval.end);
      const color = interval.color || '#3b82f6';

      // 구간 배경
      s.setFillStyle(hexToRgba(color, 0.2));
      s.fillRect(startX, lineY - 15, endX - startX, 30);

      // 구간 선
      s.setStrokeStyle(color);
      s.setLineWidth(3);
      s.beginPath();
      s.moveTo(startX, lineY);
      s.lineTo(endX, lineY);
      s.stroke();

      // 끝점 표시
      drawEndpoint(s, startX, lineY, interval.startIncluded !== false, color);
      drawEndpoint(s, endX, lineY, interval.endIncluded !== false, color);

      // 라벨
      if (interval.label) {
        s.setFillStyle(color);
        s.setFont('11px sans-serif');
        s.setTextAlign('center');
        s.fillText(interval.label, (startX + endX) / 2, lineY - 20);
      }
    });

    // 수직선 (축)
    s.setStrokeStyle('#374151');
    s.setLineWidth(2);
    s.beginPath();
    s.moveTo(padding - 10, lineY);
    s.lineTo(width - padding + 10, lineY);
    s.stroke();

    // 화살표
    s.beginPath();
    s.moveTo(width - padding + 5, lineY - 5);
    s.lineTo(width - padding + 10, lineY);
    s.lineTo(width - padding + 5, lineY + 5);
    s.stroke();

    s.beginPath();
    s.moveTo(padding - 5, lineY - 5);
    s.lineTo(padding - 10, lineY);
    s.lineTo(padding - 5, lineY + 5);
    s.stroke();

    // 눈금
    s.setStrokeStyle('#9ca3af');
    s.setLineWidth(1);
    s.setFillStyle('#374151');
    s.setFont('11px sans-serif');
    s.setTextAlign('center');

    const startTick = Math.ceil(rangeMin / tickInterval) * tickInterval;
    for (let tick = startTick; tick <= rangeMax; tick += tickInterval) {
      const x = valueToX(tick);

      // 눈금 선
      s.beginPath();
      s.moveTo(x, lineY - 5);
      s.lineTo(x, lineY + 5);
      s.stroke();

      // 눈금 라벨
      const label = Number.isInteger(tick) ? tick.toString() : tick.toFixed(1);
      s.fillText(label, x, lineY + 20);
    }

    // 0 강조 (범위 내에 있으면)
    if (rangeMin <= 0 && rangeMax >= 0) {
      const zeroX = valueToX(0);
      s.setStrokeStyle('#374151');
      s.setLineWidth(2);
      s.beginPath();
      s.moveTo(zeroX, lineY - 8);
      s.lineTo(zeroX, lineY + 8);
      s.stroke();
    }

    // 점 렌더링
    points.forEach((point) => {
      const x = valueToX(point.value);
      const color = point.color || '#ef4444';
      const included = point.included !== false;

      drawEndpoint(s, x, lineY, included, color, 6);

      // 라벨
      if (point.label) {
        s.setFillStyle(color);
        s.setFont('bold 11px sans-serif');
        s.setTextAlign('center');
        s.fillText(point.label, x, lineY - 15);
      }
    });

    // 인터랙티브 포인터
    if (interactive) {
      const x = valueToX(interactiveValue);

      // 수직선
      s.setStrokeStyle('#8b5cf6');
      s.setLineWidth(1);
      s.setLineDash([4, 2]);
      s.beginPath();
      s.moveTo(x, lineY - 25);
      s.lineTo(x, lineY + 25);
      s.stroke();
      s.setLineDash([]);

      // 점
      s.setFillStyle('#8b5cf6');
      s.beginPath();
      s.arc(x, lineY, 8, 0, Math.PI * 2);
      s.fill();

      // 값 표시
      s.setFillStyle('#8b5cf6');
      s.setFont('bold 12px sans-serif');
      s.setTextAlign('center');
      s.fillText(interactiveValue.toFixed(2), x, lineY - 30);
    }

  }, [width, propHeight, points, intervals, valueToX, rangeMin, rangeMax, tickInterval, interactive, interactiveValue]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const value = xToValue(e.clientX - rect.left);
      const clampedValue = Math.max(rangeMin, Math.min(rangeMax, value));
      setInteractiveValue(clampedValue);
      onValueChange?.(clampedValue);
    }
  }, [interactive, xToValue, rangeMin, rangeMax, onValueChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const value = xToValue(e.clientX - rect.left);
      const clampedValue = Math.max(rangeMin, Math.min(rangeMax, value));
      setInteractiveValue(clampedValue);
      onValueChange?.(clampedValue);
    }
  }, [isDragging, xToValue, rangeMin, rangeMax, onValueChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: propWidth ? `${propWidth}px` : '100%',
        minWidth: '200px',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: 'block',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          cursor: interactive ? 'pointer' : 'default',
        }}
      />
    </div>
  );
}

// 유틸리티 함수들

function calculateRange(points: NumberLinePoint[], intervals: NumberLineInterval[]): [number, number] {
  const values: number[] = [];

  points.forEach((p) => values.push(p.value));
  intervals.forEach((i) => {
    values.push(i.start);
    values.push(i.end);
  });

  if (values.length === 0) {
    return [-10, 10];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = span * 0.2;

  return [
    Math.floor((min - pad) * 2) / 2,
    Math.ceil((max + pad) * 2) / 2,
  ];
}

function calculateTickInterval(rangeSpan: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rangeSpan)));
  const normalized = rangeSpan / magnitude;

  if (normalized <= 2) return magnitude / 2;
  if (normalized <= 5) return magnitude;
  return magnitude * 2;
}

function drawEndpoint(
  s: SceneSurface,
  x: number,
  y: number,
  filled: boolean,
  color: string,
  radius: number = 5
): void {
  s.beginPath();
  s.arc(x, y, radius, 0, Math.PI * 2);

  if (filled) {
    s.setFillStyle(color);
    s.fill();
  } else {
    s.setFillStyle('#ffffff');
    s.fill();
    s.setStrokeStyle(color);
    s.setLineWidth(2);
    s.stroke();
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(59, 130, 246, ${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default NumberLine;
