/**
 * Expression Explorer — 전체화면 수식 탐색 모드
 *
 * 수식을 화면 중앙에 크게 렌더링하고,
 * 마우스를 올리면 해당 요소를 하이라이트한다.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { RootNode } from '../types';
import type { Box, BoxRenderConfig } from '../box/types';
import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox } from '../box/box-layout';
import { Projector } from '../box/projector';
import { loadMathFont } from '../fonts';
import {
  buildExplorerMap,
  explorerHitTest,
} from '../box/explorer-map';
import type { ExplorerBoxInfo } from '../box/explorer-map';
import { buildSemanticMap } from '../analyzer/semantic-roles';
import type { SemanticResult } from '../analyzer/semantic-roles';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<Box | null>(null);
  const explorerInfosRef = useRef<ExplorerBoxInfo[]>([]);
  const semanticMapRef = useRef<Map<string, SemanticResult>>(new Map());

  // Viewport 변환 파라미터 (렌더링 + 히트 테스트 공유)
  const viewportRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });

  // 호버 상태 (ref + state 이중 트래킹 — ref는 콜백 안정성, state는 리렌더 트리거)
  const hoveredInfoRef = useRef<ExplorerBoxInfo | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<ExplorerBoxInfo | null>(null);
  const [ancestors, setAncestors] = useState<ExplorerBoxInfo[]>([]);

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [fontReady, setFontReady] = useState(false);

  // Box 계산 버전 — 렌더링 effect 트리거용
  const [boxVersion, setBoxVersion] = useState(0);

  const isDark = theme === 'dark';

  // ── 렌더링 Config (메모이제이션) ──

  const config = useMemo<BoxRenderConfig>(() => ({
    baseFontSize: 24,
    fontFamily: '"NewCMMath", "New Computer Modern Math", "Times New Roman", serif',
    color: isDark ? '#e5e5e5' : '#1a1a1a',
    cursorColor: 'transparent',
  }), [isDark]);

  // ── 폰트 로딩 ──

  useEffect(() => {
    if (!isOpen) return;
    loadMathFont().then((result) => {
      if (result.status === 'loaded') {
        setFontReady(true);
      }
    });
  }, [isOpen]);

  // ── Window resize 대응 ──

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // ── ESC 닫기 ──

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Effect 1: Box 계산 (AST/config/font 변경 시만) ──

  useEffect(() => {
    if (!isOpen || ast.children.length === 0) {
      boxRef.current = null;
      explorerInfosRef.current = [];
      semanticMapRef.current = new Map();
      setBoxVersion((v) => v + 1);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Metrics 생성 (measureText는 Canvas transform에 무관)
    const metrics = new CanvasFontMetrics(ctx, config);
    const box = astToBox(ast, metrics, 1.0, true);
    layoutBox(box, 0, 0);
    boxRef.current = box;
    explorerInfosRef.current = buildExplorerMap(box, ast);
    semanticMapRef.current = buildSemanticMap(ast);
    setBoxVersion((v) => v + 1);
  }, [isOpen, ast, config, fontReady]);

  // ── Effect 2: Canvas 렌더링 ──

  useEffect(() => {
    if (!isOpen || windowSize.width === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = windowSize;

    // HiDPI 지원 (C4 규칙)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 배경 클리어
    ctx.clearRect(0, 0, width, height);

    const box = boxRef.current;

    if (!box) {
      ctx.font = `italic 20px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('수식을 입력하세요', width / 2, height / 2);
      return;
    }

    // C4: Canvas 크기 변경 후 Metrics/Renderer 재생성
    const metrics = new CanvasFontMetrics(ctx, config);
    const renderer = new Projector(ctx, config, metrics);

    // ── Viewport 계산 (FormulaPreview 패턴) ──
    const padding = 80;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const boxTotalHeight = box.height + box.depth;

    const scaleX = availableWidth / box.width;
    const scaleY = availableHeight / boxTotalHeight;
    const scale = Math.min(scaleX, scaleY, 5); // 최대 5배 확대

    const scaledWidth = box.width * scale;
    const startX = (width - scaledWidth) / 2;
    const startY = height / 2 + (box.height - box.depth) * scale / 2;

    viewportRef.current = { offsetX: startX, offsetY: startY, scale };

    // ── 렌더링 ──
    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(scale, scale);

    if (hoveredInfo) {
      const pad = 4 / scale;

      // Pass 1: 전체 dim 렌더링
      ctx.save();
      ctx.globalAlpha = 0.25;
      renderer.render(box);
      ctx.restore();

      // Pass 2: 호버된 요소만 정상 렌더링
      const bounds = hoveredInfo.bounds;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2);
      ctx.clip();
      ctx.clearRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2);
      ctx.globalAlpha = 1.0;
      renderer.render(box);
      ctx.restore();

      // 강조 배경
      ctx.save();
      ctx.fillStyle = isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)';
      ctx.beginPath();
      ctx.roundRect(
        bounds.x - pad,
        bounds.y - pad,
        bounds.width + pad * 2,
        bounds.height + pad * 2,
        4 / scale,
      );
      ctx.fill();
      ctx.restore();

      // 조상 체인 점선 테두리
      for (const ancestor of ancestors) {
        const aBounds = ancestor.bounds;
        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 1 / scale;
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.strokeRect(
          aBounds.x - pad * 2,
          aBounds.y - pad * 2,
          aBounds.width + pad * 4,
          aBounds.height + pad * 4,
        );
        ctx.restore();
      }
    } else {
      renderer.render(box);
    }

    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, windowSize, boxVersion, config, isDark, hoveredInfo, ancestors]);

  // ── mousemove 히트 테스트 ──

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { offsetX, offsetY, scale } = viewportRef.current;

    // 화면 좌표 → Box 좌표 변환
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const boxX = (screenX - offsetX) / scale;
    const boxY = (screenY - offsetY) / scale;

    const result = explorerHitTest(boxX, boxY, explorerInfosRef.current);

    if (result) {
      // 동일한 요소면 상태 변경하지 않음 (불필요한 리렌더 방지)
      if (hoveredInfoRef.current && result.hit.box === hoveredInfoRef.current.box) return;
      hoveredInfoRef.current = result.hit;
      setHoveredInfo(result.hit);
      setAncestors(result.ancestors);
    } else {
      if (hoveredInfoRef.current) {
        hoveredInfoRef.current = null;
        setHoveredInfo(null);
        setAncestors([]);
      }
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredInfoRef.current = null;
    setHoveredInfo(null);
    setAncestors([]);
  }, []);

  // ── 렌더링 ──

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: hoveredInfo ? 'pointer' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: isDark ? '#333' : '#e5e5e5',
          color: isDark ? '#ccc' : '#333',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="닫기 (ESC)"
      >
        ✕
      </button>

      {/* 호버 정보 표시 — 구조적 의미 */}
      {hoveredInfo && hoveredInfo.astNode && (() => {
        const semantic = semanticMapRef.current.get(hoveredInfo.astNode!.id);
        if (!semantic) return null;
        return (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              maxWidth: 360,
              padding: '10px 14px',
              borderRadius: 8,
              background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
              color: isDark ? '#e5e5e5' : '#1a1a1a',
              fontSize: 14,
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              border: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {semantic.role}
            </div>
            <div style={{
              fontSize: 13,
              color: isDark ? '#a0a0a0' : '#555',
              lineHeight: 1.45,
            }}>
              {semantic.description}
            </div>
          </div>
        );
      })()}

      {/* 조작 힌트 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          padding: '8px 16px',
          borderRadius: 8,
          background: isDark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 13,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <span>호버: 요소 탐색</span>
        <span>ESC: 닫기</span>
      </div>
    </div>
  );
}
