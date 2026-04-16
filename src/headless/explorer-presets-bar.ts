/**
 * ExplorerPresetsBar — Visualizer 카드 하단의 프리셋 버튼 바
 *
 * 학습자가 카탈로그 시각화의 대표 시나리오(예: ISS, GPS, 정지궤도)로 빠르게
 * 점프할 수 있는 단축 경로를 제공한다. 슬라이더/파생값/인사이트는 이미
 * 인라인 컨트롤(수식 위 스테퍼/슬라이더)이 담당하므로 여기서는 다루지 않는다.
 */

import type {
  Preset,
  VisualizerBridge,
} from '../visualizer/types';

export class ExplorerPresetsBar {
  private container: HTMLElement;
  private bridge: VisualizerBridge;
  private presets: Preset[];
  private isDark: boolean;
  private destroyed = false;

  constructor(
    container: HTMLElement,
    bridge: VisualizerBridge,
    presets: Preset[],
    theme: 'light' | 'dark',
  ) {
    this.container = container;
    this.bridge = bridge;
    this.presets = presets;
    this.isDark = theme === 'dark';

    this.buildDOM();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.innerHTML = '';
  }

  // ─── DOM 빌드 ───

  private buildDOM(): void {
    if (this.presets.length === 0) return;

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap',
      padding: '8px 10px',
      borderTop: this.isDark
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(0,0,0,0.06)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    });

    for (const preset of this.presets) {
      row.appendChild(this.buildButton(preset));
    }

    this.container.appendChild(row);
  }

  private buildButton(preset: Preset): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    Object.assign(btn.style, {
      padding: '5px 10px',
      borderRadius: '6px',
      border: 'none',
      background: this.isDark ? 'rgba(60,70,100,0.6)' : 'rgba(220,228,240,0.8)',
      color: this.isDark ? '#c8d0e0' : '#2a3a5a',
      cursor: 'pointer',
      fontSize: '11px',
      fontFamily: 'inherit',
      transition: 'background 0.15s',
      whiteSpace: 'nowrap',
    });
    btn.textContent = `${preset.emoji ?? ''} ${preset.name}`.trim();
    btn.title = preset.description;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = this.isDark ? 'rgba(80,90,130,0.7)' : 'rgba(200,210,230,0.9)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = this.isDark ? 'rgba(60,70,100,0.6)' : 'rgba(220,228,240,0.8)';
    });

    btn.addEventListener('click', () => {
      this.bridge.applyPreset(preset);
    });

    return btn;
  }
}
