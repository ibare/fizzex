/**
 * PolarGraph - 극좌표 그래프 컴포넌트
 *
 * r = f(θ) 형태의 극좌표 함수 시각화
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { latexToEvaluable } from './evaluator';
import { setupHiDPI, CanvasSceneSurface, drawPolarGrid } from '../canvas';

export interface PolarGraphProps {
  /** 극좌표 함수 표현식 r = f(theta) */
  expression: string;
  /** 캔버스 크기 (정사각형) */
  size?: number;
  /** 선 색상 */
  lineColor?: string;
  /** 그리드 표시 */
  showGrid?: boolean;
  /** 추가 클래스명 */
  className?: string;
  /** theta 범위 [min, max] (기본: [0, 2π]) */
  thetaRange?: [number, number];
  /** r 범위 (자동 계산되지만 고정 가능) */
  rRange?: [number, number];
  /** 애니메이션 활성화 */
  animated?: boolean;
}

/**
 * 극좌표 그래프 컴포넌트
 */
export function PolarGraph({
  expression,
  size: propSize,
  lineColor = '#3b82f6',
  showGrid = true,
  className,
  thetaRange = [0, Math.PI * 2],
  rRange: propRRange,
  animated = false,
}: PolarGraphProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [containerSize, setContainerSize] = useState(propSize || 300);
  const [animationTheta, setAnimationTheta] = useState(thetaRange[0]);

  const size = propSize || containerSize;
  const padding = 40;
  const centerX = size / 2;
  const centerY = size / 2;

  // 컨테이너 크기 감지
  useEffect(() => {
    if (propSize) return;

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const minSize = Math.min(width, height);
        if (minSize > 0) {
          setContainerSize(minSize);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [propSize]);

  // 표현식을 평가 가능한 함수로 변환
  const evaluator = useMemo(() => {
    if (!expression) return null;
    try {
      // theta를 t로 치환 (evaluator가 x 대신 t 사용하도록)
      const normalized = expression
        .replace(/\\theta/g, 't')
        .replace(/θ/g, 't');
      return latexToEvaluable(normalized);
    } catch {
      return null;
    }
  }, [expression]);

  // 점들 계산
  const { points, rMax } = useMemo(() => {
    if (!evaluator) return { points: [], rMax: 1 };

    const pts: Array<{ r: number; theta: number; x: number; y: number }> = [];
    const numPoints = 360;
    const [thetaMin, thetaMax] = thetaRange;
    const step = (thetaMax - thetaMin) / numPoints;
    let maxR = 0;

    for (let i = 0; i <= numPoints; i++) {
      const theta = thetaMin + i * step;
      try {
        // t 변수로 평가
        const evalFunc = new Function('t', `return ${evaluator}`);
        const r = evalFunc(theta);

        if (typeof r === 'number' && isFinite(r)) {
          // 극좌표 → 직교좌표 변환
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          pts.push({ r, theta, x, y });
          maxR = Math.max(maxR, Math.abs(r));
        }
      } catch {
        // 평가 오류 무시
      }
    }

    return { points: pts, rMax: maxR || 1 };
  }, [evaluator, thetaRange]);

  // r 범위 결정
  const [rMin, rMaxFinal] = propRRange || [-rMax, rMax];
  const rSpan = rMaxFinal - rMin;
  const graphRadius = (size - padding * 2) / 2;

  // 극좌표 값을 캔버스 좌표로 변환
  const toCanvasCoords = useCallback((x: number, y: number): { cx: number; cy: number } => {
    const scale = graphRadius / (rSpan / 2);
    return {
      cx: centerX + x * scale,
      cy: centerY - y * scale, // Y축 반전
    };
  }, [centerX, centerY, graphRadius, rSpan]);

  // 애니메이션
  useEffect(() => {
    if (!animated) {
      setAnimationTheta(thetaRange[1]);
      return;
    }

    const startTime = Date.now();
    const duration = 3000; // 3초

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const theta = thetaRange[0] + (thetaRange[1] - thetaRange[0]) * progress;
      setAnimationTheta(theta);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animated, thetaRange]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ctx } = setupHiDPI(canvas, size, size);
    const s = new CanvasSceneSurface(ctx);

    // 배경
    s.setFillStyle('#ffffff');
    s.fillRect(0, 0, size, size);

    if (showGrid) {
      const numCircles = 5;
      const circleStep = graphRadius / numCircles;

      // 극좌표 그리드 (동심원 + 방사형 선)
      drawPolarGrid(s, centerX, centerY, graphRadius, numCircles, 12);

      // 반지름 라벨 (프리미티브에 포함되지 않는 도메인 라벨)
      s.setFillStyle('#9ca3af');
      s.setFont('10px sans-serif');
      s.setTextAlign('left');
      for (let i = 1; i <= numCircles; i++) {
        const labelValue = (rSpan / 2 / numCircles) * i;
        s.fillText(labelValue.toFixed(1), centerX + i * circleStep + 3, centerY - 3);
      }

      // 각도 라벨
      const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      s.setFillStyle('#9ca3af');
      s.setFont('10px sans-serif');
      s.setTextAlign('center');
      s.setTextBaseline('middle');

      angles.forEach((deg) => {
        const rad = (deg * Math.PI) / 180;
        const labelX = centerX + Math.cos(rad) * (graphRadius + 15);
        const labelY = centerY - Math.sin(rad) * (graphRadius + 15);
        s.fillText(`${deg}°`, labelX, labelY);
      });
    }

    // 축
    s.setStrokeStyle('#374151');
    s.setLineWidth(1.5);

    // X축
    s.beginPath();
    s.moveTo(padding - 5, centerY);
    s.lineTo(size - padding + 5, centerY);
    s.stroke();

    // Y축
    s.beginPath();
    s.moveTo(centerX, size - padding + 5);
    s.lineTo(centerX, padding - 5);
    s.stroke();

    // 그래프 렌더링
    if (points.length > 0) {
      s.setStrokeStyle(lineColor);
      s.setLineWidth(2);
      s.beginPath();

      const visiblePoints = animated
        ? points.filter((p) => p.theta <= animationTheta)
        : points;

      visiblePoints.forEach((point, index) => {
        const { cx, cy } = toCanvasCoords(point.x, point.y);

        if (index === 0) {
          s.moveTo(cx, cy);
        } else {
          s.lineTo(cx, cy);
        }
      });

      s.stroke();

      // 애니메이션 중일 때 현재 점 표시
      if (animated && visiblePoints.length > 0) {
        const lastPoint = visiblePoints[visiblePoints.length - 1];
        const { cx, cy } = toCanvasCoords(lastPoint.x, lastPoint.y);

        s.setFillStyle(lineColor);
        s.beginPath();
        s.arc(cx, cy, 5, 0, Math.PI * 2);
        s.fill();

        // 원점에서 현재 점까지 선
        s.setStrokeStyle(hexToRgba(lineColor, 0.5));
        s.setLineWidth(1);
        s.setLineDash([4, 2]);
        s.beginPath();
        s.moveTo(centerX, centerY);
        s.lineTo(cx, cy);
        s.stroke();
        s.setLineDash([]);

        // 현재 값 표시
        s.setFillStyle('#1f2937');
        s.setFont('11px sans-serif');
        s.setTextAlign('left');
        s.fillText(
          `θ = ${((lastPoint.theta * 180) / Math.PI).toFixed(0)}° (${lastPoint.theta.toFixed(2)} rad)`,
          10,
          size - 25
        );
        s.fillText(`r = ${lastPoint.r.toFixed(3)}`, 10, size - 10);
      }
    }

    // 표현식이 없거나 유효하지 않을 때
    if (!evaluator || points.length === 0) {
      s.setFillStyle('#9ca3af');
      s.setFont('14px sans-serif');
      s.setTextAlign('center');
      s.fillText('r = f(θ) 형태의 극좌표 함수를 입력하세요', centerX, centerY);
    }

  }, [
    size,
    points,
    lineColor,
    showGrid,
    centerX,
    centerY,
    graphRadius,
    rSpan,
    toCanvasCoords,
    evaluator,
    animated,
    animationTheta,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: propSize ? `${propSize}px` : '100%',
        minWidth: '200px',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
        }}
      />
      {expression && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          r = {expression}
        </div>
      )}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(59, 130, 246, ${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default PolarGraph;
