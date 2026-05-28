/**
 * ExplorerSceneChips — Scene 전환 칩 버튼 UI
 *
 * Visualizer 컨테이너 위에 가로 칩 나열. 클릭 시 instance.setActiveScene 호출.
 * instance.scene.subscribe로 활성 id를 반영하고, store.subscribeParams로
 * scene.params 프리셋에서 drift 되었는지(사용자 조정 후) 감지해 active 표시를 해제한다.
 */

import type { SceneSpec } from '../visualizer/runtime/types/scene.js';
import { resolveI18n } from '../visualizer/runtime/types/i18n.js';
import type { CreatedVisualizerInstance } from '../visualizer/runtime/public-api.js';

export interface SceneChipsConfig {
  scenes: readonly SceneSpec[];
  instance: CreatedVisualizerInstance;
  theme: 'light' | 'dark';
  locale?: string;
}

const DRIFT_EPSILON = 1e-9;

export class ExplorerSceneChips {
  readonly root: HTMLDivElement;
  private isDark: boolean;
  private locale: string;
  private scenes: readonly SceneSpec[];
  private instance: CreatedVisualizerInstance;
  private buttons = new Map<string, HTMLButtonElement>();
  private sceneUnsub: (() => void) | null = null;
  private paramsUnsub: (() => void) | null = null;
  private destroyed = false;

  constructor(parent: HTMLElement, cfg: SceneChipsConfig) {
    this.isDark = cfg.theme === 'dark';
    this.locale = cfg.locale ?? 'ko';
    this.scenes = cfg.scenes;
    this.instance = cfg.instance;

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

    for (const scene of this.scenes) {
      const btn = this.createButton(scene);
      this.buttons.set(scene.id, btn);
      this.root.appendChild(btn);
    }

    this.sceneUnsub = this.instance.scene.subscribe(() => this.rerender());
    this.paramsUnsub = this.instance.store.subscribeParams(() => this.rerender());
    this.rerender();

    parent.appendChild(this.root);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sceneUnsub?.();
    this.paramsUnsub?.();
    this.sceneUnsub = null;
    this.paramsUnsub = null;
    this.buttons.clear();
    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }

  private createButton(scene: SceneSpec): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    const name = resolveI18n(scene.name, this.locale);
    btn.title = scene.description ? resolveI18n(scene.description, this.locale) : name;

    const icon = scene.style?.icon;
    btn.textContent = icon ? `${icon} ${name}` : name;

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
      this.instance.setActiveScene(scene.id);
    });

    return btn;
  }

  /** scene 활성 id 또는 param drift 상태 변화 시 호출 */
  private rerender(): void {
    if (this.destroyed) return;
    const activeId = this.instance.scene.getActiveId();
    const drifted = this.hasParamDrift();
    const effectiveActive = drifted ? null : activeId;
    for (const [id, btn] of this.buttons) {
      const active = id === effectiveActive;
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

  /** 현재 params가 active scene preset과 tolerance 이상 차이나면 drift */
  private hasParamDrift(): boolean {
    const active = this.instance.scene.getActiveScene();
    const preset = active.params;
    if (!preset) return false;
    const snap = this.instance.store.snapshot();
    for (const [id, preset_v] of Object.entries(preset)) {
      const cur = snap.params[id];
      if (cur === undefined) continue;
      if (Math.abs(cur - preset_v) > DRIFT_EPSILON) return true;
    }
    return false;
  }
}
