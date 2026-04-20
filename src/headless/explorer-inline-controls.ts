/**
 * ExplorerInlineControls — 수식 위 인라인 컨트롤
 *
 * Canvas 위에 absolute positioned HTML 요소로 슬라이더/스테퍼/readonly 컨트롤을 렌더링한다.
 * Explorer 전체화면 모드에서 수식 요소를 클릭했을 때 의미 설명 아래에 나타난다.
 */

import type { InlineControlConfig } from './inline-control-types';

// ─── 콜백 타입 ───

export interface InlineControlCallbacks {
  /** 값이 변경되었을 때 (paramId 또는 nodeId, 새 값) */
  onValueChange: (id: string, value: number) => void;
  /** 리셋 버튼 클릭 시 (nodeId) */
  onReset: (nodeId: string) => void;
}

// ─── ExplorerInlineControls ───

export class ExplorerInlineControls {
  private container: HTMLDivElement;
  private config: InlineControlConfig;
  private callbacks: InlineControlCallbacks;
  private isDark: boolean;
  private destroyed = false;

  // 컨트롤별 참조
  private sliderInput: HTMLInputElement | null = null;
  private valueLabel: HTMLSpanElement | null = null;
  private stepperInput: HTMLInputElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;

  // 슬라이더 throttle
  private rafId: number | null = null;

  constructor(
    parent: HTMLElement,
    config: InlineControlConfig,
    callbacks: InlineControlCallbacks,
    isDark: boolean,
    showReset: boolean,
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.isDark = isDark;

    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      zIndex: '1001',
      pointerEvents: 'auto',
      padding: '8px 12px',
      borderRadius: '8px',
      background: isDark ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(8px)',
      boxShadow: isDark
        ? '0 2px 12px rgba(0,0,0,0.4)'
        : '0 2px 12px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '13px',
      color: isDark ? '#e5e5e5' : '#1a1a1a',
      minWidth: '120px',
    });

    // 컨트롤 DOM에서 이벤트 전파 차단 (선택 해제 방지)
    this.container.addEventListener('mousedown', (e) => e.stopPropagation());
    this.container.addEventListener('touchstart', (e) => e.stopPropagation());

    this.buildControl(showReset);
    parent.appendChild(this.container);
  }

  /** 루트 DOM 요소 참조 (mouseleave 체크용) */
  getElement(): HTMLDivElement {
    return this.container;
  }

  /** 컨트롤 위치 업데이트 (스크린 좌표) */
  updatePosition(x: number, y: number): void {
    if (this.destroyed) return;
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
  }

  /** 외부에서 값 업데이트 (Visualizer store 동기화 등) */
  updateValue(value: number): void {
    if (this.destroyed) return;

    if (this.config.controlType === 'slider' && this.sliderInput && this.valueLabel) {
      this.sliderInput.value = String(valueToSliderPos(value, this.config));
      this.valueLabel.textContent = formatValue(value, this.config.unit);
    } else if (this.config.controlType === 'stepper' && this.stepperInput) {
      this.stepperInput.value = formatNumber(value);
    }
  }

  /** 리셋 버튼 표시/숨기기 */
  setResetVisible(visible: boolean): void {
    if (this.resetBtn) {
      this.resetBtn.style.display = visible ? 'inline-block' : 'none';
    }
  }

  /** 정리 */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.container.remove();
  }

  // ─── 컨트롤 빌드 ───

  private buildControl(showReset: boolean): void {
    switch (this.config.controlType) {
      case 'slider':
        this.buildSlider();
        break;
      case 'stepper':
        this.buildStepper();
        break;
      case 'readonly':
        this.buildReadonly();
        break;
    }

    // 리셋 버튼 (stepper만 — slider는 파라미터 값이므로 리셋 불필요)
    if (this.config.controlType === 'stepper') {
      this.resetBtn = document.createElement('button');
      this.resetBtn.textContent = '원래대로';
      Object.assign(this.resetBtn.style, {
        display: showReset ? 'inline-block' : 'none',
        marginTop: '6px',
        padding: '2px 8px',
        border: 'none',
        borderRadius: '4px',
        background: this.isDark ? '#444' : '#e5e5e5',
        color: this.isDark ? '#ccc' : '#555',
        cursor: 'pointer',
        fontSize: '11px',
      });
      this.resetBtn.addEventListener('click', () => {
        this.callbacks.onReset(this.config.nodeId);
      });
      this.container.appendChild(this.resetBtn);
    }
  }

  private buildSlider(): void {
    const { min = -10, max = 10, currentValue = 0, unit, scale } = this.config;

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    // 슬라이더 (0~1000 정규화)
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1000';
    slider.value = String(valueToSliderPos(currentValue, this.config));
    Object.assign(slider.style, {
      flex: '1',
      minWidth: '100px',
      accentColor: this.isDark ? '#60a5fa' : '#3b82f6',
    });
    this.sliderInput = slider;

    // 값 라벨
    const label = document.createElement('span');
    label.textContent = formatValue(currentValue, unit);
    Object.assign(label.style, {
      minWidth: '60px',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
      fontSize: '12px',
      color: this.isDark ? '#9ca3af' : '#6b7280',
    });
    this.valueLabel = label;

    // 슬라이더 이벤트 (requestAnimationFrame throttle)
    slider.addEventListener('input', () => {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        const pos01 = parseInt(slider.value) / 1000;
        const value = scale === 'log'
          ? linearToLog(pos01, min, max)
          : min + pos01 * (max - min);
        label.textContent = formatValue(value, unit);
        this.callbacks.onValueChange(this.config.paramId ?? this.config.nodeId, value);
      });
    });

    row.appendChild(slider);
    row.appendChild(label);
    this.container.appendChild(row);
  }

  private buildStepper(): void {
    const { currentValue = 0, integerOnly } = this.config;
    const step = integerOnly ? 1 : 0.1;

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      justifyContent: 'center',
    });

    // ◄ 버튼
    const decBtn = this.createStepButton('\u25C4', () => {
      const cur = parseFloat(input.value) || 0;
      const newVal = roundStep(cur - step, step);
      input.value = formatNumber(newVal);
      this.callbacks.onValueChange(this.config.nodeId, newVal);
    });

    // 값 입력
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = formatNumber(currentValue);
    Object.assign(input.style, {
      width: '50px',
      textAlign: 'center',
      border: `1px solid ${this.isDark ? '#555' : '#d1d5db'}`,
      borderRadius: '4px',
      background: this.isDark ? '#2a2a2a' : '#fff',
      color: this.isDark ? '#e5e5e5' : '#1a1a1a',
      padding: '4px',
      fontSize: '14px',
      fontVariantNumeric: 'tabular-nums',
    });
    this.stepperInput = input;

    // 입력 확정
    input.addEventListener('change', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        input.value = formatNumber(val);
        this.callbacks.onValueChange(this.config.nodeId, val);
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        input.value = formatNumber(currentValue);
        input.blur();
      }
    });

    // ► 버튼
    const incBtn = this.createStepButton('\u25BA', () => {
      const cur = parseFloat(input.value) || 0;
      const newVal = roundStep(cur + step, step);
      input.value = formatNumber(newVal);
      this.callbacks.onValueChange(this.config.nodeId, newVal);
    });

    row.appendChild(decBtn);
    row.appendChild(input);
    row.appendChild(incBtn);
    this.container.appendChild(row);
  }

  private buildReadonly(): void {
    const { displayValue } = this.config;
    if (!displayValue) return;

    const span = document.createElement('span');
    span.textContent = displayValue;
    Object.assign(span.style, {
      color: this.isDark ? '#9ca3af' : '#6b7280',
      fontSize: '12px',
      fontStyle: 'italic',
    });
    this.container.appendChild(span);
  }

  private createStepButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      width: '28px',
      height: '28px',
      border: `1px solid ${this.isDark ? '#555' : '#d1d5db'}`,
      borderRadius: '4px',
      background: this.isDark ? '#333' : '#f3f4f6',
      color: this.isDark ? '#ccc' : '#374151',
      cursor: 'pointer',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    btn.addEventListener('click', onClick);
    return btn;
  }
}

// ─── 유틸리티 ───

/** 실제 값 → 슬라이더 위치 (0~1000) */
function valueToSliderPos(value: number, config: InlineControlConfig): number {
  const { min = -10, max = 10, scale } = config;
  if (scale === 'log') {
    return logToLinear(value, min, max) * 1000;
  }
  return ((value - min) / (max - min)) * 1000;
}

/** log 스케일: 선형 위치(0~1) → 실제 값 */
function linearToLog(pos01: number, min: number, max: number): number {
  const logMin = Math.log10(Math.max(min, 1e-10));
  const logMax = Math.log10(max);
  return Math.pow(10, logMin + pos01 * (logMax - logMin));
}

/** log 스케일: 실제 값 → 선형 위치(0~1) */
function logToLinear(value: number, min: number, max: number): number {
  const logMin = Math.log10(Math.max(min, 1e-10));
  const logMax = Math.log10(max);
  const logVal = Math.log10(Math.max(value, 1e-10));
  return (logVal - logMin) / (logMax - logMin);
}

/** 값을 단위와 함께 표시 */
function formatValue(value: number, unit?: string): string {
  const formatted = value >= 1000
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

/** 숫자를 깔끔한 문자열로 포맷 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return parseFloat(value.toFixed(4)).toString();
}

/** step 단위로 반올림 */
function roundStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}
