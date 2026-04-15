/**
 * UnitCircle - 단위원 시각화 컴포넌트
 *
 * 삼각함수 sin, cos를 직관적으로 이해할 수 있는 단위원 시각화
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupHiDPI, CanvasSceneSurface } from '../canvas';

export interface UnitCircleProps {
  /** 초기 각도 (라디안) */
  initialAngle?: number;
  /** 캔버스 크기 */
  size?: number;
  /** 선 색상 */
  lineColor?: string;
  /** 추가 클래스명 */
  className?: string;
  /** 각도 변경 콜백 */
  onAngleChange?: (angle: number, sin: number, cos: number) => void;
}

/**
 * 단위원 시각화 컴포넌트
 */
export function UnitCircle({
  initialAngle = Math.PI / 4,
  size: propSize,
  lineColor = '#3b82f6',
  className,
  onAngleChange,
}: UnitCircleProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [containerSize, setContainerSize] = useState(propSize || 300);
  const [angle, setAngle] = useState(initialAngle);
  const [isDragging, setIsDragging] = useState(false);

  const size = propSize || containerSize;
  const padding = 40;
  const radius = (size - padding * 2) / 2;
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

  // 각도 변경 시 콜백
  useEffect(() => {
    if (onAngleChange) {
      onAngleChange(angle, Math.sin(angle), Math.cos(angle));
    }
  }, [angle, onAngleChange]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ctx } = setupHiDPI(canvas, size, size);
    const s = new CanvasSceneSurface(ctx);

    // 배경
    s.setFillStyle('#ffffff');
    s.fillRect(0, 0, size, size);

    // 그리드
    s.setStrokeStyle('#e5e7eb');
    s.setLineWidth(0.5);

    // 세로선
    for (let i = -1; i <= 1; i += 0.5) {
      const x = centerX + i * radius;
      s.beginPath();
      s.moveTo(x, padding);
      s.lineTo(x, size - padding);
      s.stroke();
    }

    // 가로선
    for (let i = -1; i <= 1; i += 0.5) {
      const y = centerY - i * radius;
      s.beginPath();
      s.moveTo(padding, y);
      s.lineTo(size - padding, y);
      s.stroke();
    }

    // 축
    s.setStrokeStyle('#374151');
    s.setLineWidth(1.5);

    // X축
    s.beginPath();
    s.moveTo(padding - 10, centerY);
    s.lineTo(size - padding + 10, centerY);
    s.stroke();

    // Y축
    s.beginPath();
    s.moveTo(centerX, size - padding + 10);
    s.lineTo(centerX, padding - 10);
    s.stroke();

    // 축 화살표
    s.beginPath();
    s.moveTo(size - padding + 5, centerY - 5);
    s.lineTo(size - padding + 10, centerY);
    s.lineTo(size - padding + 5, centerY + 5);
    s.stroke();

    s.beginPath();
    s.moveTo(centerX - 5, padding - 5);
    s.lineTo(centerX, padding - 10);
    s.lineTo(centerX + 5, padding - 5);
    s.stroke();

    // 축 라벨
    s.setFillStyle('#374151');
    s.setFont('12px sans-serif');
    s.setTextAlign('center');
    s.fillText('1', centerX + radius, centerY + 15);
    s.fillText('-1', centerX - radius, centerY + 15);
    s.setTextAlign('right');
    s.fillText('1', centerX - 5, centerY - radius + 4);
    s.fillText('-1', centerX - 5, centerY + radius + 4);

    // 단위원
    s.setStrokeStyle('#9ca3af');
    s.setLineWidth(2);
    s.beginPath();
    s.arc(centerX, centerY, radius, 0, Math.PI * 2);
    s.stroke();

    // 현재 각도에서의 점
    const pointX = centerX + Math.cos(angle) * radius;
    const pointY = centerY - Math.sin(angle) * radius;

    // 각도 호
    s.setStrokeStyle(lineColor);
    s.setLineWidth(2);
    s.beginPath();
    s.arc(centerX, centerY, radius * 0.2, 0, -angle, angle > 0);
    s.stroke();

    // 반지름 선
    s.setStrokeStyle(lineColor);
    s.setLineWidth(2);
    s.beginPath();
    s.moveTo(centerX, centerY);
    s.lineTo(pointX, pointY);
    s.stroke();

    // cos 선 (x축 투영)
    s.setStrokeStyle('#ef4444');
    s.setLineWidth(2);
    s.setLineDash([5, 3]);
    s.beginPath();
    s.moveTo(pointX, pointY);
    s.lineTo(pointX, centerY);
    s.stroke();
    s.setLineDash([]);

    // sin 선 (y축 투영)
    s.setStrokeStyle('#22c55e');
    s.setLineWidth(2);
    s.setLineDash([5, 3]);
    s.beginPath();
    s.moveTo(pointX, pointY);
    s.lineTo(centerX, pointY);
    s.stroke();
    s.setLineDash([]);

    // cos 값 표시 (x축)
    s.setFillStyle('#ef4444');
    s.setStrokeStyle('#ef4444');
    s.setLineWidth(3);
    s.beginPath();
    s.moveTo(centerX, centerY + 3);
    s.lineTo(pointX, centerY + 3);
    s.stroke();

    // sin 값 표시 (y축)
    s.setFillStyle('#22c55e');
    s.setStrokeStyle('#22c55e');
    s.setLineWidth(3);
    s.beginPath();
    s.moveTo(centerX - 3, centerY);
    s.lineTo(centerX - 3, pointY);
    s.stroke();

    // 점
    s.setFillStyle(lineColor);
    s.beginPath();
    s.arc(pointX, pointY, 6, 0, Math.PI * 2);
    s.fill();

    // 좌표 라벨
    s.setFillStyle('#1f2937');
    s.setFont('bold 11px sans-serif');
    s.setTextAlign('left');
    const coordText = `(${Math.cos(angle).toFixed(2)}, ${Math.sin(angle).toFixed(2)})`;
    const labelX = pointX + 10;
    const labelY = pointY - 10;
    s.fillText(coordText, labelX, labelY);

    // 범례
    s.setFont('11px sans-serif');
    s.setFillStyle('#ef4444');
    s.setTextAlign('left');
    s.fillText(`cos(θ) = ${Math.cos(angle).toFixed(3)}`, 10, size - 25);
    s.setFillStyle('#22c55e');
    s.fillText(`sin(θ) = ${Math.sin(angle).toFixed(3)}`, 10, size - 10);

    // 각도 표시
    s.setFillStyle(lineColor);
    s.setTextAlign('right');
    s.fillText(`θ = ${(angle * 180 / Math.PI).toFixed(1)}°`, size - 10, size - 25);
    s.fillText(`  = ${angle.toFixed(3)} rad`, size - 10, size - 10);

  }, [size, angle, lineColor, centerX, centerY, radius]);

  // 마우스/터치로 각도 조절
  const updateAngle = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - centerX;
    const y = -(clientY - rect.top - centerY);

    let newAngle = Math.atan2(y, x);
    if (newAngle < 0) newAngle += Math.PI * 2;

    setAngle(newAngle);
  }, [centerX, centerY]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    updateAngle(e.clientX, e.clientY);
  }, [updateAngle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    updateAngle(e.clientX, e.clientY);
  }, [isDragging, updateAngle]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 슬라이더로 각도 조절
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAngle(parseFloat(e.target.value));
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: propSize ? `${propSize}px` : '100%',
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
          cursor: 'crosshair',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
        }}
      />
      <div style={{ width: '100%', maxWidth: `${size}px`, padding: '0 8px' }}>
        <input
          type="range"
          min="0"
          max={Math.PI * 2}
          step="0.01"
          value={angle}
          onChange={handleSliderChange}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
          <span>0°</span>
          <span>90°</span>
          <span>180°</span>
          <span>270°</span>
          <span>360°</span>
        </div>
      </div>
    </div>
  );
}

export default UnitCircle;
