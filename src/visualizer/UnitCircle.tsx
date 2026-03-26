/**
 * UnitCircle - 단위원 시각화 컴포넌트
 *
 * 삼각함수 sin, cos를 직관적으로 이해할 수 있는 단위원 시각화
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

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

    // 그리드
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;

    // 세로선
    for (let i = -1; i <= 1; i += 0.5) {
      const x = centerX + i * radius;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, size - padding);
      ctx.stroke();
    }

    // 가로선
    for (let i = -1; i <= 1; i += 0.5) {
      const y = centerY - i * radius;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(size - padding, y);
      ctx.stroke();
    }

    // 축
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;

    // X축
    ctx.beginPath();
    ctx.moveTo(padding - 10, centerY);
    ctx.lineTo(size - padding + 10, centerY);
    ctx.stroke();

    // Y축
    ctx.beginPath();
    ctx.moveTo(centerX, size - padding + 10);
    ctx.lineTo(centerX, padding - 10);
    ctx.stroke();

    // 축 화살표
    ctx.beginPath();
    ctx.moveTo(size - padding + 5, centerY - 5);
    ctx.lineTo(size - padding + 10, centerY);
    ctx.lineTo(size - padding + 5, centerY + 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - 5, padding - 5);
    ctx.lineTo(centerX, padding - 10);
    ctx.lineTo(centerX + 5, padding - 5);
    ctx.stroke();

    // 축 라벨
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1', centerX + radius, centerY + 15);
    ctx.fillText('-1', centerX - radius, centerY + 15);
    ctx.textAlign = 'right';
    ctx.fillText('1', centerX - 5, centerY - radius + 4);
    ctx.fillText('-1', centerX - 5, centerY + radius + 4);

    // 단위원
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 현재 각도에서의 점
    const pointX = centerX + Math.cos(angle) * radius;
    const pointY = centerY - Math.sin(angle) * radius;

    // 각도 호
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.2, 0, -angle, angle > 0);
    ctx.stroke();

    // 반지름 선
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pointX, pointY);
    ctx.stroke();

    // cos 선 (x축 투영)
    ctx.strokeStyle = '#ef4444'; // 빨간색
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(pointX, pointY);
    ctx.lineTo(pointX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // sin 선 (y축 투영)
    ctx.strokeStyle = '#22c55e'; // 초록색
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(pointX, pointY);
    ctx.lineTo(centerX, pointY);
    ctx.stroke();
    ctx.setLineDash([]);

    // cos 값 표시 (x축)
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 3);
    ctx.lineTo(pointX, centerY + 3);
    ctx.stroke();

    // sin 값 표시 (y축)
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 3, centerY);
    ctx.lineTo(centerX - 3, pointY);
    ctx.stroke();

    // 점
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
    ctx.fill();

    // 좌표 라벨
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    const coordText = `(${Math.cos(angle).toFixed(2)}, ${Math.sin(angle).toFixed(2)})`;
    const labelX = pointX + 10;
    const labelY = pointY - 10;
    ctx.fillText(coordText, labelX, labelY);

    // 범례
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'left';
    ctx.fillText(`cos(θ) = ${Math.cos(angle).toFixed(3)}`, 10, size - 25);
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`sin(θ) = ${Math.sin(angle).toFixed(3)}`, 10, size - 10);

    // 각도 표시
    ctx.fillStyle = lineColor;
    ctx.textAlign = 'right';
    ctx.fillText(`θ = ${(angle * 180 / Math.PI).toFixed(1)}°`, size - 10, size - 25);
    ctx.fillText(`  = ${angle.toFixed(3)} rad`, size - 10, size - 10);

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
