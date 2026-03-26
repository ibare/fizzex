/**
 * PolarGraph - 극좌표 그래프 컴포넌트
 *
 * r = f(θ) 형태의 극좌표 함수 시각화
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { latexToEvaluable, evaluateAt } from './evaluator';

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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // 배경
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    if (showGrid) {
      // 동심원 그리드
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;

      const numCircles = 5;
      const circleStep = graphRadius / numCircles;

      for (let i = 1; i <= numCircles; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, i * circleStep, 0, Math.PI * 2);
        ctx.stroke();

        // 반지름 라벨
        const labelValue = (rSpan / 2 / numCircles) * i;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(labelValue.toFixed(1), centerX + i * circleStep + 3, centerY - 3);
      }

      // 방사형 선 (각도)
      const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;

      angles.forEach((deg) => {
        const rad = (deg * Math.PI) / 180;
        const endX = centerX + Math.cos(rad) * graphRadius;
        const endY = centerY - Math.sin(rad) * graphRadius;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 각도 라벨
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelX = centerX + Math.cos(rad) * (graphRadius + 15);
        const labelY = centerY - Math.sin(rad) * (graphRadius + 15);
        ctx.fillText(`${deg}°`, labelX, labelY);
      });
    }

    // 축
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;

    // X축
    ctx.beginPath();
    ctx.moveTo(padding - 5, centerY);
    ctx.lineTo(size - padding + 5, centerY);
    ctx.stroke();

    // Y축
    ctx.beginPath();
    ctx.moveTo(centerX, size - padding + 5);
    ctx.lineTo(centerX, padding - 5);
    ctx.stroke();

    // 그래프 렌더링
    if (points.length > 0) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const visiblePoints = animated
        ? points.filter((p) => p.theta <= animationTheta)
        : points;

      visiblePoints.forEach((point, index) => {
        const { cx, cy } = toCanvasCoords(point.x, point.y);

        if (index === 0) {
          ctx.moveTo(cx, cy);
        } else {
          ctx.lineTo(cx, cy);
        }
      });

      ctx.stroke();

      // 애니메이션 중일 때 현재 점 표시
      if (animated && visiblePoints.length > 0) {
        const lastPoint = visiblePoints[visiblePoints.length - 1];
        const { cx, cy } = toCanvasCoords(lastPoint.x, lastPoint.y);

        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        // 원점에서 현재 점까지 선
        ctx.strokeStyle = hexToRgba(lineColor, 0.5);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // 현재 값 표시
        ctx.fillStyle = '#1f2937';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `θ = ${((lastPoint.theta * 180) / Math.PI).toFixed(0)}° (${lastPoint.theta.toFixed(2)} rad)`,
          10,
          size - 25
        );
        ctx.fillText(`r = ${lastPoint.r.toFixed(3)}`, 10, size - 10);
      }
    }

    // 표현식이 없거나 유효하지 않을 때
    if (!evaluator || points.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('r = f(θ) 형태의 극좌표 함수를 입력하세요', centerX, centerY);
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
