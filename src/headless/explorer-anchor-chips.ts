/**
 * ExplorerAnchorChips — 현실 비유 앵커 칩 버튼 UI
 *
 * Visualizer 컨테이너 위에 가로 칩 나열. 클릭 시 bridge.setActiveAnchor 호출.
 * bridge.subscribeAnchor로 활성 상태를 동기화해 수동 파라미터 조정 후의 해제 상태도 반영한다.
 */

import type { AnchorConfig } from '../visualizer/types';
import type { VisualizerBridgeImpl } from '../visualizer/bridge';

export interface AnchorChipsConfig {
  anchors: AnchorConfig[];
  bridge: VisualizerBridgeImpl;
  theme: 'light' | 'dark';
}

export class ExplorerAnchorChips {
  readonly root: HTMLDivElement;
  private isDark: boolean;
  private buttons = new Map<string, HTMLButtonElement>();
  private unsubscribe: (() => void) | null = null;
  private destroyed = false;

  constructor(parent: HTMLElement, cfg: AnchorChipsConfig) {
    this.isDark = cfg.theme === 'dark';

    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      padding: '6px 8px',
      borderBottom: this.isDark
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid rgba(0,0,0,0.05)',
      background: this.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    });
    this.root.addEventListener('mousedown', (e) => e.stopPropagation());
    this.root.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

    for (const anchor of cfg.anchors) {
      const btn = this.createButton(anchor, cfg.bridge);
      this.buttons.set(anchor.id, btn);
      this.root.appendChild(btn);
    }

    this.unsubscribe = cfg.bridge.subscribeAnchor((id) => this.renderActive(id));
    this.renderActive(cfg.bridge.getActiveAnchorId());

    parent.appendChild(this.root);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.buttons.clear();
    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }

  private createButton(anchor: AnchorConfig, bridge: VisualizerBridgeImpl): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = anchor.description ?? anchor.name;

    const label = anchor.icon ? `${anchor.icon} ${anchor.name}` : anchor.name;
    btn.textContent = label;

    Object.assign(btn.style, {
      padding: '3px 8px',
      fontSize: '11px',
      lineHeight: '16px',
      borderRadius: '999px',
      border: this.isDark
        ? '1px solid rgba(255,255,255,0.12)'
        : '1px solid rgba(0,0,0,0.12)',
      background: 'transparent',
      color: this.isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.7)',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      whiteSpace: 'nowrap',
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      bridge.setActiveAnchor(anchor.id);
    });

    return btn;
  }

  private renderActive(activeId: string | null): void {
    for (const [id, btn] of this.buttons) {
      const active = id === activeId;
      btn.style.background = active
        ? (this.isDark ? 'rgba(96,165,250,0.22)' : 'rgba(59,130,246,0.15)')
        : 'transparent';
      btn.style.borderColor = active
        ? (this.isDark ? 'rgba(96,165,250,0.6)' : 'rgba(59,130,246,0.5)')
        : (this.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');
      btn.style.color = active
        ? (this.isDark ? '#bfdbfe' : '#1d4ed8')
        : (this.isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.7)');
      btn.style.fontWeight = active ? '600' : '400';
    }
  }
}
