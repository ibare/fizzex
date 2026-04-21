/**
 * Expression Explorer — React thin wrapper
 *
 * 실제 구현은 headless ExplorerOverlay (순수 DOM/Canvas).
 * React 쪽은 isOpen 상태에 따라 생성/파괴만 담당한다.
 */

import { useEffect, useRef } from 'react';
import type { RootNode } from '../types';
import { ExplorerOverlay } from '../headless/explorer-overlay';
import type { VisualizerRegistry } from '../visualizer';

export interface ExpressionExplorerProps {
  /** AST 루트 노드 */
  ast: RootNode;
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 테마 */
  theme?: 'light' | 'dark';
  /**
   * 시각화 패널을 사용하려면 호스트가 주입하는 registry.
   * 미주입 시 탐색 배너의 시각화 버튼은 렌더되지 않는다.
   */
  visualizerRegistry?: VisualizerRegistry;
}

/** 전체화면 수식 탐색 모드 */
export function ExpressionExplorer({
  ast,
  isOpen,
  onClose,
  theme = 'light',
  visualizerRegistry,
}: ExpressionExplorerProps) {
  const overlayRef = useRef<ExplorerOverlay | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || ast.children.length === 0) {
      overlayRef.current?.destroy();
      overlayRef.current = null;
      return;
    }

    overlayRef.current = new ExplorerOverlay({
      ast,
      theme,
      visualizerRegistry,
      onClose: () => onCloseRef.current(),
    });

    return () => {
      overlayRef.current?.destroy();
      overlayRef.current = null;
    };
  }, [isOpen, ast, theme, visualizerRegistry]);

  return null;
}
