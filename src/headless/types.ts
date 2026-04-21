/**
 * Headless adapter types
 *
 * Framework-agnostic configuration and callback types
 * for DOMRendererView and DOMEditorView.
 */

import type { BoxRenderConfig } from '../box/types';
import { NEW_CM_MATH_CONFIG } from '../fonts';
import type { VisualizerRegistry } from '../visualizer';

export interface FizzexConfig {
  baseFontSize?: number;      // default 20
  fontFamily?: string;        // default New CM Math fallback chain
  color?: string;             // default '#1a1a1a'
  theme?: 'light' | 'dark';  // default 'light'
  padding?: number;           // default 8
  displayMode?: 'display' | 'inline';  // default 'display'
  /**
   * 수식 탐색 모드에서 시각화 패널을 켜려면 호스트가 VisualizerRegistry를 주입해야 한다.
   * 미주입 시 탐색 배너의 시각화 버튼이 렌더되지 않는다 (탐색 자체는 정상 동작).
   */
  visualizerRegistry?: VisualizerRegistry;
}

export interface FizzexSize {
  width: number;
  height: number;
  baseline: number;  // distance from top to baseline
}

export type FizzexChangeHandler = (latex: string) => void;

/**
 * Map FizzexConfig to internal BoxRenderConfig.
 *
 * @param config  User-facing configuration
 * @param isEditor  true for editor mode (shows placeholders), false for read-only renderer
 */
export function resolveBoxRenderConfig(
  config: FizzexConfig = {},
  isEditor: boolean,
): BoxRenderConfig {
  const theme = config.theme ?? 'light';
  const isDark = theme === 'dark';

  return {
    baseFontSize: config.baseFontSize ?? 20,
    fontFamily: config.fontFamily ?? NEW_CM_MATH_CONFIG.fallback,
    color: config.color ?? (isDark ? '#e0e0e0' : '#1a1a1a'),
    cursorColor: isDark ? '#60a5fa' : '#3b82f6',
    displayMode: config.displayMode ?? 'display',
    showPlaceholders: isEditor,
    placeholder: isEditor
      ? {
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderColor: 'rgba(0,0,0,0.15)',
          borderWidth: 1,
          borderRadius: 2,
          opacity: 0.8,
        }
      : undefined,
  };
}
