/**
 * Confidence Indicator — 진단 기반 시각적 피드백 렌더링
 *
 * RenderBackend만 사용하여 물결선/배경 오버레이를 Canvas에 그린다.
 * src/latex/ 타입에 의존하지 않음 — 호출자가 ConfidenceRegion을 변환하여 전달.
 */

import type { RenderBackend } from './render-backend';

// =========================================================================
// 타입 정의
// =========================================================================

/** 시각 피드백 수준 */
export type ConfidenceLevel = 'clean' | 'normalized' | 'uncertain' | 'failed';

/** 물결선/배경 렌더링 대상 영역 */
export interface ConfidenceRegion {
  level: ConfidenceLevel;
  /** 영역 시작 x 좌표 */
  x: number;
  /** baseline y 좌표 */
  y: number;
  /** 영역 너비 */
  width: number;
  /** baseline 위 높이 */
  height: number;
  /** baseline 아래 깊이 */
  depth: number;
}

/** ConfidenceIndicator 설정 */
export interface ConfidenceIndicatorConfig {
  /** 정규화 복구 물결선 색상 (주황) */
  normalizedColor: string;
  /** 구조 불확실 물결선 색상 (빨강) */
  uncertainColor: string;
  /** 파싱 실패 배경색 */
  failedBgColor: string;
  /** 물결 진폭 (px) */
  amplitude: number;
  /** 물결 파장 (px) */
  wavelength: number;
  /** 선 두께 (px) */
  thickness: number;
  /** baseline으로부터의 오프셋 (px) */
  offsetFromBaseline: number;
}

/** 기본 설정 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceIndicatorConfig = {
  normalizedColor: '#E8870E',
  uncertainColor: '#DC2626',
  failedBgColor: 'rgba(220, 38, 38, 0.08)',
  amplitude: 2,
  wavelength: 6,
  thickness: 1.2,
  offsetFromBaseline: 3,
};

// =========================================================================
// ConfidenceIndicator 클래스
// =========================================================================

/**
 * Canvas 위에 confidence 오버레이를 렌더링한다.
 *
 * 사용 흐름:
 * 1. 호출자가 Diagnostic → ConfidenceRegion 변환 수행
 * 2. renderOverlays(regions)로 모든 영역에 물결선/배경 렌더링
 */
export class ConfidenceIndicator {
  private backend: RenderBackend;
  private config: ConfidenceIndicatorConfig;

  constructor(backend: RenderBackend, config?: Partial<ConfidenceIndicatorConfig>) {
    this.backend = backend;
    this.config = { ...DEFAULT_CONFIDENCE_CONFIG, ...config };
  }

  /** 모든 ConfidenceRegion에 대해 오버레이 렌더링 */
  renderOverlays(regions: ConfidenceRegion[]): void {
    for (const region of regions) {
      if (region.level === 'clean' || region.width <= 0) continue;
      this.renderRegion(region);
    }
  }

  /** 단일 영역에 confidence 시각 피드백 렌더링 */
  private renderRegion(region: ConfidenceRegion): void {
    const { level, x, y, width, height, depth } = region;

    switch (level) {
      case 'normalized':
        // 주황 단일 물결선
        this.drawWavyLine(x, y, width, this.config.normalizedColor, false);
        break;

      case 'uncertain':
        // 빨강 이중 물결선
        this.drawWavyLine(x, y, width, this.config.uncertainColor, true);
        break;

      case 'failed':
        // 빨강 배경 + 이중 물결선
        this.drawBackground(x, y, width, height, depth, this.config.failedBgColor);
        this.drawWavyLine(x, y, width, this.config.uncertainColor, true);
        break;
    }
  }

  /**
   * 물결선을 그린다.
   *
   * baseline + offsetFromBaseline + depth 위치에
   * quadraticCurveTo로 반파장마다 상하 교대하는 사인파를 그린다.
   */
  private drawWavyLine(
    x: number,
    baselineY: number,
    width: number,
    color: string,
    double: boolean,
  ): void {
    const { amplitude, wavelength, thickness, offsetFromBaseline } = this.config;
    const wavyY = baselineY + offsetFromBaseline;

    if (double) {
      // 이중 물결선: 1.5px 간격
      const gap = 1.5;
      this.drawSingleWavyLine(x, wavyY - gap, width, amplitude, wavelength, thickness, color);
      this.drawSingleWavyLine(x, wavyY + gap, width, amplitude, wavelength, thickness, color);
    } else {
      this.drawSingleWavyLine(x, wavyY, width, amplitude, wavelength, thickness, color);
    }
  }

  /** 단일 물결선 경로 그리기 */
  private drawSingleWavyLine(
    x: number,
    y: number,
    width: number,
    amplitude: number,
    wavelength: number,
    thickness: number,
    color: string,
  ): void {
    const halfWave = wavelength / 2;
    const numHalfWaves = Math.ceil(width / halfWave);

    this.backend.save();
    this.backend.setStrokeStyle(color);
    this.backend.setLineWidth(thickness);
    this.backend.setLineCap('round');
    this.backend.setLineJoin('round');

    this.backend.beginPath();
    this.backend.moveTo(x, y);

    let currentX = x;
    for (let i = 0; i < numHalfWaves; i++) {
      const cpX = currentX + halfWave / 2;
      const cpY = i % 2 === 0 ? y - amplitude : y + amplitude;
      const endX = Math.min(currentX + halfWave, x + width);
      this.backend.quadraticCurveTo(cpX, cpY, endX, y);
      currentX = endX;
    }

    this.backend.stroke();
    this.backend.restore();
  }

  /** 배경 하이라이트 그리기 (failed 상태) */
  private drawBackground(
    x: number,
    baselineY: number,
    width: number,
    height: number,
    depth: number,
    color: string,
  ): void {
    this.backend.save();
    this.backend.setFillStyle(color);
    // y는 baseline 위치. 배경 영역: [y - height, y + depth]
    this.backend.fillRect(x, baselineY - height, width, height + depth);
    this.backend.restore();
  }
}
