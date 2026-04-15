/**
 * FunctionGraph - 2D 함수 그래프 컴포넌트
 *
 * Pan/Zoom 지원, 컨테이너 크기에 맞춤
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { GraphConfig, GraphRange } from './types';
import { DEFAULT_GRAPH_CONFIG } from './types';
import { GraphRenderer } from './graph-renderer';
import { calculatePoints, canGraph } from './evaluator';
import { setupHiDPI, CanvasSceneSurface } from '../canvas';

export interface FunctionGraphProps {
  /** 함수 표현식 (LaTeX) */
  expression: string;
  /** 캔버스 너비 (미지정 시 컨테이너에 맞춤) */
  width?: number;
  /** 캔버스 높이 (미지정 시 컨테이너에 맞춤) */
  height?: number;
  /** 초기 그래프 범위 */
  range?: Partial<GraphRange>;
  /** 선 색상 */
  lineColor?: string;
  /** 그리드 표시 */
  showGrid?: boolean;
  /** 축 라벨 표시 */
  showLabels?: boolean;
  /** 추가 클래스명 */
  className?: string;
  /** Pan/Zoom 활성화 */
  interactive?: boolean;
}

/**
 * 2D 함수 그래프 컴포넌트
 */
export function FunctionGraph({
  expression,
  width: propWidth,
  height: propHeight,
  range: initialRange,
  lineColor,
  showGrid = true,
  showLabels = true,
  className,
  interactive = true,
}: FunctionGraphProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 컨테이너 크기
  const [containerSize, setContainerSize] = useState({ width: propWidth || 400, height: propHeight || 300 });

  // 현재 범위 (pan/zoom으로 변경됨)
  const [currentRange, setCurrentRange] = useState<GraphRange>({
    ...DEFAULT_GRAPH_CONFIG.range,
    ...initialRange,
  });

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rangeAtDragStart, setRangeAtDragStart] = useState<GraphRange | null>(null);

  // 실제 사용할 크기
  const width = propWidth || containerSize.width;
  const height = propHeight || containerSize.height;

  // 컨테이너 크기 감지
  useEffect(() => {
    if (propWidth && propHeight) return; // 크기가 고정되어 있으면 감지 안 함

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setContainerSize({ width: w, height: h });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [propWidth, propHeight]);

  // 초기 범위 변경 시 리셋
  useEffect(() => {
    setCurrentRange({
      ...DEFAULT_GRAPH_CONFIG.range,
      ...initialRange,
    });
  }, [initialRange]);

  // 설정 병합
  const config = useMemo<GraphConfig>(() => ({
    ...DEFAULT_GRAPH_CONFIG,
    width,
    height,
    range: currentRange,
    lineColor: lineColor || DEFAULT_GRAPH_CONFIG.lineColor,
    showGrid,
    showLabels,
  }), [width, height, currentRange, lineColor, showGrid, showLabels]);

  // 표현식이 그래프 가능한지 확인
  const isGraphable = useMemo(() => canGraph(expression), [expression]);

  // 점 계산
  const points = useMemo(() => {
    if (!isGraphable) return [];
    return calculatePoints(expression, currentRange);
  }, [expression, currentRange, isGraphable]);

  // 그래프 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ctx } = setupHiDPI(canvas, width, height);
    const surface = new CanvasSceneSurface(ctx);

    const renderer = new GraphRenderer(surface, config);

    if (isGraphable && points.length > 0) {
      renderer.renderSingle(points);
    } else {
      renderer.render([]);
    }
  }, [config, points, isGraphable, width, height]);

  // Pan 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setRangeAtDragStart({ ...currentRange });
  }, [interactive, currentRange]);

  // Pan 중
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !rangeAtDragStart) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // 픽셀 이동량을 수학 좌표로 변환
    const xRange = rangeAtDragStart.xMax - rangeAtDragStart.xMin;
    const yRange = rangeAtDragStart.yMax - rangeAtDragStart.yMin;

    const xShift = -(dx / width) * xRange;
    const yShift = (dy / height) * yRange; // Y축은 반전

    setCurrentRange({
      xMin: rangeAtDragStart.xMin + xShift,
      xMax: rangeAtDragStart.xMax + xShift,
      yMin: rangeAtDragStart.yMin + yShift,
      yMax: rangeAtDragStart.yMax + yShift,
    });
  }, [isDragging, dragStart, rangeAtDragStart, width, height]);

  // Pan 종료
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setRangeAtDragStart(null);
  }, []);

  // Zoom (마우스 휠) - native event로 처리 (passive: false 필요)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 마우스 위치를 수학 좌표로 변환
    const xRange = currentRange.xMax - currentRange.xMin;
    const yRange = currentRange.yMax - currentRange.yMin;
    const mathX = currentRange.xMin + (mouseX / width) * xRange;
    const mathY = currentRange.yMax - (mouseY / height) * yRange;

    // 줌 팩터 (휠 위로 = 줌인, 아래로 = 줌아웃)
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    // 마우스 위치를 중심으로 줌
    const newXRange = xRange * zoomFactor;
    const newYRange = yRange * zoomFactor;

    // 마우스 위치가 같은 비율에 유지되도록 범위 조정
    const xRatio = (mathX - currentRange.xMin) / xRange;
    const yRatio = (currentRange.yMax - mathY) / yRange;

    setCurrentRange({
      xMin: mathX - newXRange * xRatio,
      xMax: mathX + newXRange * (1 - xRatio),
      yMin: mathY - newYRange * (1 - yRatio),
      yMax: mathY + newYRange * yRatio,
    });
  }, [interactive, currentRange, width, height]);

  // 범위 리셋
  const handleDoubleClick = useCallback(() => {
    if (!interactive) return;
    setCurrentRange({
      ...DEFAULT_GRAPH_CONFIG.range,
      ...initialRange,
    });
  }, [interactive, initialRange]);

  // Wheel 이벤트 등록 (passive: false로 등록해야 preventDefault 가능)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, interactive]);

  if (!expression) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: propWidth ? `${propWidth}px` : '100%',
        height: propHeight ? `${propHeight}px` : '100%',
        minHeight: propHeight ? undefined : '200px',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'block',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          cursor: isDragging ? 'grabbing' : (interactive ? 'grab' : 'default'),
          touchAction: 'none',
        }}
      />
      {!isGraphable && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#9ca3af',
            fontSize: '14px',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          그래프를 표시할 수 없습니다
        </div>
      )}
      {interactive && isGraphable && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            fontSize: '10px',
            color: '#9ca3af',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          드래그: 이동 | 휠: 줌 | 더블클릭: 리셋
        </div>
      )}
    </div>
  );
}

export default FunctionGraph;
