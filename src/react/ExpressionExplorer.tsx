/**
 * Expression Explorer — React thin wrapper
 *
 * 실제 구현은 headless ExplorerOverlay (순수 DOM/Canvas).
 * React 쪽은 isOpen 상태에 따라 생성/파괴만 담당한다.
 */

import { useEffect, useRef } from 'react';
import type { RootNode } from '../types';
import { ExplorerOverlay } from '../headless/explorer-overlay';

export interface ExpressionExplorerProps {
  /** AST 루트 노드 */
  ast: RootNode;
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 테마 */
  theme?: 'light' | 'dark';
}

/** 전체화면 수식 탐색 모드 */
export function ExpressionExplorer({
  ast,
  isOpen,
  onClose,
  theme = 'light',
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
      onClose: () => onCloseRef.current(),
    });

    return () => {
      overlayRef.current?.destroy();
      overlayRef.current = null;
    };
  }, [isOpen, ast, theme]);

  return null;
}
