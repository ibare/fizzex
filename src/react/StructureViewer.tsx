/**
 * 수식 구조 시각화 모달 (Konva 직접 사용)
 *
 * AST를 블록 형태로 시각화하여 수식의 구조를 이해하기 쉽게 표현
 * - 상단: 실제 렌더링된 수식 (선택 시 해당 부분 강조)
 * - 하단: 블록 뷰 (줌/팬/클릭 인터랙션)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Konva from 'konva';
import type { MathNode, RootNode, RowNode } from '../types';
import type { Box, BoxRenderConfig } from '../box/types';
import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox, findBoxBySourceId } from '../box/box-layout';
import { BoxRenderer } from '../box/box-renderer';

export interface StructureViewerProps {
  /** AST 루트 노드 */
  ast: RootNode;
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 테마 */
  theme?: 'light' | 'dark';
}

/** 노드 타입별 색상 */
const NODE_COLORS = {
  light: {
    number: '#22c55e',
    variable: '#3b82f6',
    operator: '#f59e0b',
    frac: '#8b5cf6',
    power: '#ec4899',
    sqrt: '#14b8a6',
    paren: '#6b7280',
    func: '#06b6d4',
    subscript: '#f97316',
    integral: '#8b5cf6',
    sum: '#8b5cf6',
    product: '#8b5cf6',
    limit: '#8b5cf6',
    abs: '#6b7280',
    overline: '#64748b',
    matrix: '#7c3aed',
    text: '#475569',
    row: '#94a3b8',
    root: '#64748b',
  },
  dark: {
    number: '#4ade80',
    variable: '#60a5fa',
    operator: '#fbbf24',
    frac: '#a78bfa',
    power: '#f472b6',
    sqrt: '#2dd4bf',
    paren: '#9ca3af',
    func: '#22d3ee',
    subscript: '#fb923c',
    integral: '#a78bfa',
    sum: '#a78bfa',
    product: '#a78bfa',
    limit: '#a78bfa',
    abs: '#9ca3af',
    overline: '#94a3b8',
    matrix: '#8b5cf6',
    text: '#94a3b8',
    row: '#64748b',
    root: '#94a3b8',
  },
};

/** 노드 타입 한글 라벨 */
const NODE_LABELS: Record<string, string> = {
  number: '숫자',
  variable: '변수',
  operator: '연산자',
  frac: '분수',
  power: '거듭제곱',
  sqrt: '제곱근',
  paren: '괄호',
  func: '함수',
  subscript: '아래첨자',
  integral: '적분',
  sum: '시그마',
  product: '곱',
  limit: '극한',
  abs: '절댓값',
  overline: '윗줄',
  matrix: '행렬',
  text: '텍스트',
  row: '행',
  root: '수식',
  space: '공백',
};

/** 노드의 표시 텍스트 가져오기 */
function getNodeDisplayText(node: MathNode): string {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'variable':
      return node.name;
    case 'operator':
      return node.operator;
    case 'func':
      return node.name + '()';
    case 'frac':
      return '─';
    case 'power':
      return '^';
    case 'subscript':
      return '_';
    case 'sqrt':
      return '√';
    case 'paren':
      return node.parenType === '(' ? '( )' : node.parenType === '[' ? '[ ]' : '{ }';
    case 'abs':
      return '| |';
    case 'integral':
      return '∫';
    case 'sum':
      return 'Σ';
    case 'product':
      return '∏';
    case 'limit':
      return 'lim';
    case 'overline':
      return '‾';
    case 'matrix':
      return '[ ]';
    case 'text':
      return `"${node.content}"`;
    case 'row':
    case 'root':
      return '';
    default:
      return node.type;
  }
}

/** 노드의 자식들 가져오기 */
function getNodeChildren(node: MathNode): { label?: string; nodes: MathNode[] }[] {
  switch (node.type) {
    case 'root':
    case 'row':
      return [{ nodes: node.children }];
    case 'frac':
      return [
        { label: '분자', nodes: node.numerator },
        { label: '분모', nodes: node.denominator },
      ];
    case 'power':
      return [
        { label: '밑', nodes: node.base },
        { label: '지수', nodes: node.exponent },
      ];
    case 'subscript':
      return [
        { label: '밑', nodes: node.base },
        { label: '첨자', nodes: node.subscript },
      ];
    case 'sqrt':
      return [
        { label: '내용', nodes: node.content },
        ...(node.index ? [{ label: '차수', nodes: node.index }] : []),
      ];
    case 'paren':
    case 'abs':
    case 'overline':
      return [{ label: '내용', nodes: node.content }];
    case 'func':
      return [{ label: '인자', nodes: node.argument }];
    case 'integral':
      return [
        ...(node.lower ? [{ label: '하한', nodes: node.lower }] : []),
        ...(node.upper ? [{ label: '상한', nodes: node.upper }] : []),
        { label: '피적분', nodes: node.integrand },
      ];
    case 'sum':
    case 'product':
      return [
        { label: '하한', nodes: node.lower },
        { label: '상한', nodes: node.upper },
        { label: '본문', nodes: node.body },
      ];
    case 'limit':
      return [
        { label: '접근값', nodes: node.approach },
        { label: '본문', nodes: node.body },
      ];
    case 'matrix':
      return node.rows.map((row, i) => ({ label: `행 ${i + 1}`, nodes: row }));
    default:
      return [];
  }
}

// ============================================
// 블록 타입
// ============================================

interface BlockData {
  id: string;
  node: MathNode;
  x: number;
  y: number;
  width: number;
  height: number;
  slots: { label: string; items: BlockData[] }[];
}

// ============================================
// Konva 렌더러 클래스
// ============================================

class StructureRenderer {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private contentGroup: Konva.Group;
  private colors: typeof NODE_COLORS.light;
  private theme: 'light' | 'dark';
  private onNodeHover: (id: string | null) => void;
  private onNodeClick: (nodeId: string | undefined, node: MathNode) => void;
  private nodeMap: Map<string, { group: Konva.Group; node: MathNode }> = new Map();

  constructor(
    container: HTMLDivElement,
    width: number,
    height: number,
    theme: 'light' | 'dark',
    onNodeHover: (id: string | null) => void,
    onNodeClick: (nodeId: string | undefined, node: MathNode) => void
  ) {
    this.theme = theme;
    this.colors = NODE_COLORS[theme];
    this.onNodeHover = onNodeHover;
    this.onNodeClick = onNodeClick;

    this.stage = new Konva.Stage({
      container,
      width,
      height,
      draggable: true,
    });

    this.layer = new Konva.Layer();
    this.contentGroup = new Konva.Group();
    this.layer.add(this.contentGroup);
    this.stage.add(this.layer);

    // 줌/패닝 이벤트
    this.stage.on('wheel', this.handleWheel.bind(this));
  }

  private handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();

    const oldScale = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.2, Math.min(3, newScale));

    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };

    this.stage.scale({ x: clampedScale, y: clampedScale });
    this.stage.position({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
    this.layer.batchDraw();
  }

  getScale(): number {
    return this.stage.scaleX();
  }

  resetView() {
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.layer.batchDraw();
  }

  resize(width: number, height: number) {
    this.stage.width(width);
    this.stage.height(height);
    this.layer.batchDraw();
  }

  destroy() {
    this.stage.destroy();
  }

  clear() {
    this.contentGroup.destroyChildren();
    this.nodeMap.clear();
  }

  // ============================================
  // 블록 뷰 렌더링
  // ============================================

  render(ast: RootNode, containerWidth: number, containerHeight: number) {
    this.clear();

    if (ast.children.length === 0) {
      this.renderEmptyMessage(containerWidth, containerHeight);
      return;
    }

    const blockHeight = 40;
    const slotHeight = 32;
    const padding = 8;
    const notchSize = 8;
    const minWidth = 60;

    // 블록 구조 계산
    const buildBlock = (node: MathNode, idPrefix: string): BlockData => {
      const childGroups = getNodeChildren(node);
      const slots: { label: string; items: BlockData[] }[] = [];

      let slotIndex = 0;
      for (const group of childGroups) {
        const items: BlockData[] = [];
        let itemIndex = 0;

        for (const child of group.nodes) {
          if (child.type === 'row' && (child as RowNode).children) {
            // row 노드는 건너뛰고 자식들을 직접 처리
            for (const grandChild of (child as RowNode).children) {
              items.push(buildBlock(grandChild, `${idPrefix}_s${slotIndex}_${itemIndex++}`));
            }
          } else {
            items.push(buildBlock(child, `${idPrefix}_s${slotIndex}_${itemIndex++}`));
          }
        }
        if (items.length > 0 || group.label) {
          slots.push({ label: group.label || '', items });
        }
        slotIndex++;
      }

      return {
        id: idPrefix,
        node,
        x: 0,
        y: 0,
        width: minWidth,
        height: blockHeight,
        slots,
      };
    };

    // 크기 계산
    const calculateBlockSize = (block: BlockData): { width: number; height: number } => {
      const displayText = getNodeDisplayText(block.node);
      const label = NODE_LABELS[block.node.type] || block.node.type;
      const headerText = displayText ? `${label}: ${displayText}` : label;

      let maxWidth = Math.max(minWidth, headerText.length * 8 + padding * 4);
      let totalHeight = blockHeight;

      for (const slot of block.slots) {
        let slotWidth = padding * 2;
        let slotMaxHeight = slotHeight;

        for (const item of slot.items) {
          const size = calculateBlockSize(item);
          slotWidth += size.width + padding;
          slotMaxHeight = Math.max(slotMaxHeight, size.height);
        }

        maxWidth = Math.max(maxWidth, slotWidth + padding * 2);
        totalHeight += slotMaxHeight + padding;
      }

      block.width = maxWidth;
      block.height = totalHeight;
      return { width: maxWidth, height: totalHeight };
    };

    // 위치 계산
    const calculateBlockPositions = (block: BlockData, x: number, y: number) => {
      block.x = x;
      block.y = y;

      let slotY = y + blockHeight;
      for (const slot of block.slots) {
        let itemX = x + padding * 2;
        let maxItemHeight = slotHeight;

        for (const item of slot.items) {
          calculateBlockPositions(item, itemX, slotY + padding);
          itemX += item.width + padding;
          maxItemHeight = Math.max(maxItemHeight, item.height);
        }

        slotY += maxItemHeight + padding;
      }
    };

    // 렌더링
    const renderBlock = (block: BlockData) => {
      const { id, node, x, y, width: w, height: h, slots } = block;
      const color = this.colors[node.type as keyof typeof this.colors] || this.colors.root;
      const displayText = getNodeDisplayText(node);
      const label = NODE_LABELS[node.type] || node.type;
      const headerText = displayText ? `${label}: ${displayText}` : label;

      const blockGroup = new Konva.Group({ x, y });

      // 블록 본체 (Scratch 스타일 노치)
      const points = [
        0, 0,
        15, 0,
        15 + notchSize, notchSize,
        30 + notchSize, notchSize,
        30 + notchSize * 2, 0,
        w, 0,
        w, h,
        ...(slots.length === 0 ? [
          30 + notchSize * 2, h,
          30 + notchSize, h - notchSize,
          15 + notchSize, h - notchSize,
          15, h,
        ] : []),
        0, h,
      ];

      const blockShape = new Konva.Line({
        points,
        closed: true,
        fill: color,
        stroke: this.theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
        strokeWidth: 1,
      });

      const headerTextShape = new Konva.Text({
        x: padding,
        y: blockHeight / 2 - 6,
        text: headerText,
        fill: '#ffffff',
        fontSize: 12,
        fontStyle: 'bold',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      });

      blockGroup.add(blockShape, headerTextShape);

      // 이벤트 핸들러
      blockGroup.on('mouseenter', () => {
        blockShape.stroke('#ffffff');
        blockShape.strokeWidth(2);
        blockShape.shadowColor(color);
        blockShape.shadowBlur(12);
        blockShape.shadowOpacity(0.5);
        this.layer.batchDraw();
        this.onNodeHover(id);
      });

      blockGroup.on('mouseleave', () => {
        blockShape.stroke(this.theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
        blockShape.strokeWidth(1);
        blockShape.shadowBlur(0);
        this.layer.batchDraw();
        this.onNodeHover(null);
      });

      blockGroup.on('click tap', () => {
        this.onNodeClick(node.id, node);
      });

      // 슬롯들
      let slotY = blockHeight;
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slot = slots[slotIndex];
        const slotItemsHeight = slot.items.reduce(
          (max, item) => Math.max(max, item.height),
          slotHeight
        );

        // 슬롯 배경
        const slotRect = new Konva.Rect({
          x: padding,
          y: slotY,
          width: w - padding * 2,
          height: slotItemsHeight + padding,
          fill: this.theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
          cornerRadius: 4,
        });
        blockGroup.add(slotRect);

        // 슬롯 라벨
        if (slot.label) {
          const slotLabel = new Konva.Text({
            x: padding + 4,
            y: slotY + 4,
            text: slot.label,
            fill: 'rgba(255,255,255,0.7)',
            fontSize: 10,
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          });
          blockGroup.add(slotLabel);
        }

        slotY += slotItemsHeight + padding;
      }

      this.contentGroup.add(blockGroup);
      this.nodeMap.set(id, { group: blockGroup, node });

      // 슬롯 아이템들
      for (const slot of slots) {
        for (const item of slot.items) {
          renderBlock(item);
        }
      }
    };

    const block = buildBlock(ast, 'root');
    calculateBlockSize(block);

    const scale = Math.min(1, (containerWidth - 40) / block.width, (containerHeight - 40) / block.height);
    const startX = (containerWidth - block.width * scale) / 2;
    const startY = (containerHeight - block.height * scale) / 2;

    calculateBlockPositions(block, 0, 0);

    this.contentGroup.scale({ x: scale, y: scale });
    this.contentGroup.position({ x: startX, y: startY });

    renderBlock(block);
    this.layer.batchDraw();
  }

  // ============================================
  // 빈 메시지 렌더링
  // ============================================

  private renderEmptyMessage(containerWidth: number, containerHeight: number) {
    const text = new Konva.Text({
      x: containerWidth / 2 - 70,
      y: containerHeight / 2,
      text: '수식을 입력하세요',
      fill: this.theme === 'dark' ? '#6b7280' : '#9ca3af',
      fontSize: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    });
    this.contentGroup.add(text);
    this.layer.batchDraw();
  }
}

// ============================================
// 수식 미리보기 컴포넌트
// ============================================

interface FormulaPreviewProps {
  ast: RootNode;
  selectedSourceId: string | null;
  theme: 'light' | 'dark';
  width: number;
  height: number;
}

function FormulaPreview({ ast, selectedSourceId, theme, width, height }: FormulaPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsRef = useRef<CanvasFontMetrics | null>(null);
  const rendererRef = useRef<BoxRenderer | null>(null);

  const config: BoxRenderConfig = {
    baseFontSize: 24,
    fontFamily: '"STIX Two Math", "Times New Roman", Times, serif',
    color: theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
    cursorColor: '#3b82f6',
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI 지원
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 배경 클리어
    ctx.clearRect(0, 0, width, height);

    if (ast.children.length === 0) {
      ctx.font = `italic 16px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = theme === 'dark' ? '#6b7280' : '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText('수식을 입력하세요', width / 2, height / 2 + 6);
      return;
    }

    // 메트릭스 초기화
    if (!metricsRef.current) {
      metricsRef.current = new CanvasFontMetrics(ctx, config);
    } else {
      metricsRef.current.updateConfig(config);
    }

    // 렌더러 초기화
    if (!rendererRef.current) {
      rendererRef.current = new BoxRenderer(ctx, config, metricsRef.current);
    } else {
      rendererRef.current.updateConfig(config);
    }

    // AST → Box 변환
    const box = astToBox(ast, metricsRef.current, 1.0);

    // 수식 크기에 맞춰 스케일 조정
    const padding = 20;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const boxTotalHeight = box.height + box.depth;

    // 스케일 계산 (수식이 컨테이너보다 크면 축소)
    const scaleX = box.width > availableWidth ? availableWidth / box.width : 1;
    const scaleY = boxTotalHeight > availableHeight ? availableHeight / boxTotalHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1); // 최대 1배 (확대 안 함)

    // 레이아웃 계산 (중앙 정렬)
    const scaledWidth = box.width * scale;
    const scaledHeight = boxTotalHeight * scale;
    const startX = (width - scaledWidth) / 2;
    const startY = height / 2 + (box.height - box.depth) * scale / 2;
    layoutBox(box, 0, 0); // 원점에서 레이아웃

    // 선택된 노드가 있으면 해당 Box 찾기
    let selectedBox: Box | null = null;
    if (selectedSourceId) {
      selectedBox = findBoxBySourceId(box, selectedSourceId);
    }

    // 스케일 및 위치 변환 적용
    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(scale, scale);

    // 렌더링
    if (selectedSourceId && selectedBox) {
      // 1단계: 전체를 흐리게 렌더링
      ctx.save();
      ctx.globalAlpha = 0.25;
      rendererRef.current.render(box);
      ctx.restore();

      // 2단계: 선택된 영역만 정상 렌더링
      // Box의 bounds 계산
      const bounds = getBoxBounds(selectedBox);

      ctx.save();
      // 선택된 영역 클리핑
      ctx.beginPath();
      ctx.rect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
      ctx.clip();

      // 배경 지우기 (흐린 부분 제거)
      ctx.clearRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);

      // 선택된 부분만 정상 렌더링
      ctx.globalAlpha = 1.0;
      rendererRef.current.render(box);
      ctx.restore();

      // 선택 영역 강조 배경
      ctx.save();
      ctx.fillStyle = theme === 'dark' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)';
      ctx.beginPath();
      ctx.roundRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8, 4);
      ctx.fill();
      ctx.restore();
    } else {
      // 선택된 노드 없으면 전체 정상 렌더링
      rendererRef.current.render(box);
    }

    ctx.restore();
  }, [ast, selectedSourceId, theme, width, height, config]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        borderRadius: 8,
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        border: `1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'}`,
      }}
    />
  );
}

/** Box의 bounds 계산 */
function getBoxBounds(box: Box): { x: number; y: number; width: number; height: number } {
  return {
    x: box.x,
    y: box.y - box.height,
    width: box.width,
    height: box.height + box.depth,
  };
}

// ============================================
// 메인 StructureViewer 컴포넌트
// ============================================

export function StructureViewer({
  ast,
  isOpen,
  onClose,
  theme = 'light',
}: StructureViewerProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StructureRenderer | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });

  const colors = NODE_COLORS[theme];

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  // 블록 클릭 핸들러
  const handleBlockClick = useCallback((nodeId: string | undefined, _node: MathNode) => {
    // 같은 블록 클릭하면 선택 해제
    setSelectedSourceId(prev => prev === nodeId ? null : (nodeId ?? null));
  }, []);

  // 렌더러 초기화 및 업데이트
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current) return;

    // 렌더러가 없으면 생성
    if (!rendererRef.current) {
      rendererRef.current = new StructureRenderer(
        canvasContainerRef.current,
        containerSize.width - 40,
        containerSize.height - 40,
        theme,
        setHoveredNodeId,
        handleBlockClick
      );
    } else {
      rendererRef.current.resize(containerSize.width - 40, containerSize.height - 40);
    }

    // 렌더링
    rendererRef.current.render(ast, containerSize.width - 40, containerSize.height - 40);

    // 스케일 업데이트
    setScale(rendererRef.current.getScale());
  }, [isOpen, ast, containerSize, theme, handleBlockClick]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // 선택 해제
  const handleClearSelection = useCallback(() => {
    setSelectedSourceId(null);
  }, []);

  // 리셋
  const handleReset = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.resetView();
      setScale(1);
    }
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedSourceId) {
          setSelectedSourceId(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedSourceId]);

  if (!isOpen) return null;

  // 수식 미리보기 영역 높이
  const previewHeight = 80;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: 900,
          height: '80vh',
          maxHeight: 700,
          backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
            }}
          >
            수식 구조
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 선택 해제 버튼 */}
            {selectedSourceId && (
              <button
                type="button"
                onClick={handleClearSelection}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                선택 해제
              </button>
            )}
            {/* 줌 표시 */}
            <span
              style={{
                fontSize: 12,
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                marginRight: 8,
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            {/* 리셋 버튼 */}
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: 6,
                backgroundColor: theme === 'dark' ? '#404040' : '#f3f4f6',
                color: theme === 'dark' ? '#e5e5e5' : '#374151',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              리셋
            </button>
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 6,
                backgroundColor: theme === 'dark' ? '#404040' : '#f3f4f6',
                color: theme === 'dark' ? '#e5e5e5' : '#374151',
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 수식 미리보기 */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FormulaPreview
            ast={ast}
            selectedSourceId={selectedSourceId}
            theme={theme}
            width={Math.min(containerSize.width - 80, 600)}
            height={previewHeight}
          />
        </div>

        {/* 조작 힌트 */}
        <div
          style={{
            padding: '8px 20px',
            borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'}`,
            fontSize: 12,
            color: theme === 'dark' ? '#6b7280' : '#9ca3af',
            display: 'flex',
            gap: 12,
          }}
        >
          <span>블록 클릭: 수식에서 해당 부분 강조</span>
          <span>드래그: 이동</span>
          <span>스크롤: 확대/축소</span>
        </div>

        {/* Konva Stage 컨테이너 */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            padding: 20,
            overflow: 'hidden',
          }}
        >
          <div
            ref={canvasContainerRef}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 8,
              border: `1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'}`,
              overflow: 'hidden',
              backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
            }}
          />
        </div>

        {/* 범례 */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${theme === 'dark' ? '#404040' : '#e5e5e5'}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: 12,
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            }}
          >
            {['number', 'variable', 'operator', 'frac', 'power', 'func'].map((type) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: colors[type as keyof typeof colors],
                  }}
                />
                <span>{NODE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StructureViewer;
