/**
 * ExplorerControlsPanel — headless 컨트롤 패널
 *
 * 슬라이더, 프리셋 버튼, 파생값 카드, 인사이트 텍스트를 순수 DOM으로 구성한다.
 * VisualizerBridge를 통해 양방향 동기화한다.
 */

import type {
  ParameterConfig,
  Preset,
  DerivedValue,
  VisualizerBridge,
  ParameterValues,
} from '../visualizer/types';

// ─── 유틸: log 스케일 변환 ───

function linearToLog(pos: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.pow(10, logMin + pos * (logMax - logMin));
}

function logToLinear(value: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return (Math.log10(value) - logMin) / (logMax - logMin);
}

function formatDerivedValue(value: number, format?: string): string {
  switch (format) {
    case 'time': {
      if (value < 60) return `${value.toFixed(1)}초`;
      if (value < 3600) return `${(value / 60).toFixed(1)}분`;
      if (value < 86400) return `${(value / 3600).toFixed(1)}시간`;
      return `${(value / 86400).toFixed(1)}일`;
    }
    case 'distance': {
      if (value < 1) return `${(value * 1000).toFixed(0)}m`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}백만km`;
      return `${Math.round(value).toLocaleString()}km`;
    }
    default:
      return value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(2);
  }
}

// ─── 컨트롤 패널 ───

export class ExplorerControlsPanel {
  private container: HTMLElement;
  private bridge: VisualizerBridge;
  private params: ParameterConfig[];
  private presets: Preset[];
  private derivedDefs: DerivedValue[];
  private isDark: boolean;
  private destroyed = false;

  // DOM 참조
  private sliderInputs = new Map<string, HTMLInputElement>();
  private sliderLabels = new Map<string, HTMLSpanElement>();
  private derivedCards = new Map<string, HTMLSpanElement>();
  private insightEl: HTMLDivElement | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    bridge: VisualizerBridge,
    params: ParameterConfig[],
    presets: Preset[],
    derivedDefs: DerivedValue[],
    theme: 'light' | 'dark',
  ) {
    this.container = container;
    this.bridge = bridge;
    this.params = params;
    this.presets = presets;
    this.derivedDefs = derivedDefs;
    this.isDark = theme === 'dark';

    this.buildDOM();
    this.updateDisplays(bridge.getParams());

    // Bridge 구독
    this.unsubscribe = bridge.subscribe((newParams) => {
      this.updateDisplays(newParams);
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe?.();
    this.container.innerHTML = '';
    this.sliderInputs.clear();
    this.sliderLabels.clear();
    this.derivedCards.clear();
  }

  // ─── DOM 빌드 ───

  private buildDOM(): void {
    const wrap = this.container;
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '12px';
    wrap.style.padding = '16px';
    wrap.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    wrap.style.fontSize = '13px';
    wrap.style.color = this.isDark ? '#e5e5e5' : '#1a1a1a';

    // 1. 슬라이더 영역
    for (const param of this.params) {
      wrap.appendChild(this.buildSlider(param));
    }

    // 2. 프리셋 버튼 영역
    if (this.presets.length > 0) {
      wrap.appendChild(this.buildPresets());
    }

    // 3. 파생값 카드 영역
    if (this.derivedDefs.length > 0) {
      wrap.appendChild(this.buildDerivedCards());
    }

    // 4. 인사이트 영역
    const anyEffects = this.params.some((p) => p.effects && p.effects.length > 0);
    if (anyEffects) {
      this.insightEl = document.createElement('div');
      Object.assign(this.insightEl.style, {
        padding: '8px 12px',
        borderRadius: '8px',
        background: this.isDark ? 'rgba(50,50,70,0.5)' : 'rgba(230,235,245,0.8)',
        fontSize: '12px',
        lineHeight: '1.5',
        color: this.isDark ? '#b0b8cc' : '#4a5568',
      });
      wrap.appendChild(this.insightEl);
    }
  }

  private buildSlider(param: ParameterConfig): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';

    // 라벨
    const label = document.createElement('span');
    label.style.minWidth = '80px';
    label.style.fontWeight = '500';
    label.textContent = param.role;
    row.appendChild(label);

    // 슬라이더
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1000';
    input.style.flex = '1';
    input.style.accentColor = this.isDark ? '#6b8cff' : '#3b6ef6';

    // 초기 위치
    const pos = param.scale === 'log'
      ? logToLinear(param.default, param.min, param.max) * 1000
      : ((param.default - param.min) / (param.max - param.min)) * 1000;
    input.value = String(Math.round(pos));

    input.addEventListener('input', () => {
      const pos01 = parseInt(input.value) / 1000;
      const value = param.scale === 'log'
        ? linearToLog(pos01, param.min, param.max)
        : param.min + pos01 * (param.max - param.min);
      this.bridge.setParam(param.id, value, 'slider');
    });

    row.appendChild(input);
    this.sliderInputs.set(param.id, input);

    // 값 표시
    const valueSpan = document.createElement('span');
    valueSpan.style.minWidth = '90px';
    valueSpan.style.textAlign = 'right';
    valueSpan.style.fontVariantNumeric = 'tabular-nums';
    valueSpan.style.fontSize = '12px';
    valueSpan.style.color = this.isDark ? '#9ca3af' : '#6b7280';
    row.appendChild(valueSpan);
    this.sliderLabels.set(param.id, valueSpan);

    return row;
  }

  private buildPresets(): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.flexWrap = 'wrap';

    for (const preset of this.presets) {
      const btn = document.createElement('button');
      btn.type = 'button';
      Object.assign(btn.style, {
        padding: '6px 12px',
        borderRadius: '6px',
        border: 'none',
        background: this.isDark ? 'rgba(60,70,100,0.6)' : 'rgba(220,228,240,0.8)',
        color: this.isDark ? '#c8d0e0' : '#2a3a5a',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
      });
      btn.textContent = `${preset.emoji ?? ''} ${preset.name}`;
      btn.title = preset.description;

      btn.addEventListener('mouseenter', () => {
        btn.style.background = this.isDark ? 'rgba(80,90,130,0.7)' : 'rgba(200,210,230,0.9)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = this.isDark ? 'rgba(60,70,100,0.6)' : 'rgba(220,228,240,0.8)';
      });

      btn.addEventListener('click', () => {
        for (const [pid, val] of Object.entries(preset.values)) {
          this.bridge.setParam(pid, val, 'preset');
        }
      });

      row.appendChild(btn);
    }

    return row;
  }

  private buildDerivedCards(): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.flexWrap = 'wrap';

    for (const dv of this.derivedDefs) {
      const card = document.createElement('div');
      Object.assign(card.style, {
        padding: '8px 12px',
        borderRadius: '8px',
        background: this.isDark ? 'rgba(40,45,65,0.6)' : 'rgba(240,243,250,0.8)',
        minWidth: '100px',
        textAlign: 'center',
      });

      const labelEl = document.createElement('div');
      labelEl.style.fontSize = '11px';
      labelEl.style.color = this.isDark ? '#8890a4' : '#7a8298';
      labelEl.textContent = dv.label;
      card.appendChild(labelEl);

      const valueEl = document.createElement('span');
      Object.assign(valueEl.style, {
        fontSize: '16px',
        fontWeight: '600',
        fontVariantNumeric: 'tabular-nums',
        display: 'block',
        marginTop: '2px',
      });
      card.appendChild(valueEl);
      this.derivedCards.set(dv.id, valueEl);

      row.appendChild(card);
    }

    return row;
  }

  // ─── 디스플레이 업데이트 ───

  private updateDisplays(params: ParameterValues): void {
    // 슬라이더 위치 + 값 라벨
    for (const param of this.params) {
      const value = params[param.id];
      if (value === undefined) continue;

      const input = this.sliderInputs.get(param.id);
      if (input && document.activeElement !== input) {
        const pos = param.scale === 'log'
          ? logToLinear(value, param.min, param.max) * 1000
          : ((value - param.min) / (param.max - param.min)) * 1000;
        input.value = String(Math.round(Math.max(0, Math.min(1000, pos))));
      }

      const label = this.sliderLabels.get(param.id);
      if (label) {
        const formatted = value >= 1000
          ? Math.round(value).toLocaleString()
          : value.toFixed(1);
        label.textContent = `${formatted} ${param.unit ?? ''}`;
      }
    }

    // 파생값 카드
    const derived = this.bridge.getDerivedValues();
    for (const dv of this.derivedDefs) {
      const el = this.derivedCards.get(dv.id);
      if (el && derived[dv.id] !== undefined) {
        const formatted = formatDerivedValue(derived[dv.id], dv.format);
        el.textContent = `${formatted}${dv.unit ? ' ' + dv.unit : ''}`;
      }
    }

    // 인사이트
    if (this.insightEl) {
      const insights: string[] = [];
      for (const param of this.params) {
        if (!param.effects) continue;
        const value = params[param.id];
        if (value === undefined) continue;
        for (const effect of param.effects) {
          if (value >= effect.range[0] && value <= effect.range[1]) {
            insights.push(effect.description);
          }
        }
      }
      this.insightEl.textContent = insights.join(' ') || '';
      this.insightEl.style.display = insights.length > 0 ? 'block' : 'none';
    }
  }
}
