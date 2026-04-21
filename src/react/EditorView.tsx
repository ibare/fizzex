/**
 * 수식 캔버스 에디터 컴포넌트
 *
 * Box 모델 기반 레이아웃 시스템 사용
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { EditorState } from '../types';
import type { Box, BoxRenderConfig, HBox } from '../box/types';
import { CanvasFontMetrics } from '../box/font-metrics';
import { astToBox } from '../box/ast-to-box';
import { layoutBox, hitTest, findBoxBySourceId } from '../box/box-layout';
import { Projector } from '../box/projector';
import { MathEditor, createInitialState } from '../editor';
import { getSuggestions, getAllSuggestionsForContext, getAllSuggestions } from '../suggestion';
import type { SuggestionWithAction } from '../suggestion/types';
import { SuggestionChips } from './SuggestionChips';
import { useFizzexLabels, useLocalizedSuggestions } from '../i18n';
import { loadMathFont, NEW_CM_MATH_CONFIG } from '../fonts';
import { ExpressionExplorer } from './ExpressionExplorer';
import type { VisualizerRegistry } from '../visualizer';

/** 커서 위치 정보 */
interface CursorScreenPosition {
  x: number;
  y: number;
  height: number;
}

export interface EditorViewProps {
  /** 초기 상태 */
  initialState?: EditorState;
  /** 상태 변경 콜백 */
  onChange?: (state: EditorState) => void;
  /** 너비 */
  width?: number;
  /** 높이 */
  height?: number;
  /** 읽기 전용 */
  readOnly?: boolean;
  /** 테마 */
  theme?: 'light' | 'dark';
  /** 디버그 토글 표시 여부 */
  showDebugToggle?: boolean;
  /** 자동완성 제안 표시 여부 */
  showSuggestions?: boolean;
  /** 수식 탐색 버튼 표시 여부 */
  showExplorerToggle?: boolean;
  /** 시각화 registry — 호스트가 주입. 없으면 탐색 모드에서 시각화 버튼이 노출되지 않는다. */
  visualizerRegistry?: VisualizerRegistry;
  /** 내용에 맞게 자동 크기 조절 (readOnly 시 기본 true) */
  autoSize?: boolean;
  /** 자동 크기 조절 시 최소 너비 */
  minWidth?: number;
  /** 자동 크기 조절 시 최소 높이 */
  minHeight?: number;
  /** 자동 크기 조절 시 패딩 */
  padding?: number;
  /** 표시 모드 (display: 독립 수식, inline: 본문 내 수식) */
  displayMode?: 'display' | 'inline';
}

/** 기본 폰트 (New CM Math 로드 전 폴백) */
const DEFAULT_FONT_FAMILY = NEW_CM_MATH_CONFIG.fallback;

const createLightConfig = (fontFamily: string): BoxRenderConfig => ({
  baseFontSize: 20,
  fontFamily,
  color: '#1a1a1a',
  cursorColor: '#3b82f6',
  placeholder: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
    borderRadius: 2,
  },
});

const createDarkConfig = (fontFamily: string): BoxRenderConfig => ({
  baseFontSize: 20,
  fontFamily,
  color: '#e5e5e5',
  cursorColor: '#60a5fa',
  placeholder: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderColor: 'rgba(96, 165, 250, 0.35)',
    borderWidth: 1,
    borderRadius: 2,
  },
});

export function EditorView({
  initialState,
  onChange,
  width: propWidth = 400,
  height: propHeight = 80,
  readOnly = false,
  theme = 'light',
  showDebugToggle = false,
  showSuggestions = false,
  showExplorerToggle = false,
  visualizerRegistry,
  autoSize,
  minWidth = 40,
  minHeight = 40,
  padding = 20,
  displayMode = 'display',
}: EditorViewProps) {
  // autoSize 기본값: readOnly일 때 true
  const shouldAutoSize = autoSize ?? readOnly;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MathEditor | null>(null);
  const metricsRef = useRef<CanvasFontMetrics | null>(null);
  const rendererRef = useRef<Projector | null>(null);
  const boxRef = useRef<Box | null>(null);
  const isComposingRef = useRef(false);
  const onChangeRef = useRef(onChange);

  const [state, setState] = useState<EditorState>(initialState || createInitialState());
  const [isFocused, setIsFocused] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [debug, setDebug] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [cursorScreenPos, setCursorScreenPos] = useState<CursorScreenPosition | null>(null);
  const [placeholderOpacity, setPlaceholderOpacity] = useState(1.0);
  const [computedSize, setComputedSize] = useState<{ width: number; height: number } | null>(null);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [showExplorer, setShowExplorer] = useState(false);

  // 실제 사용할 크기 계산
  const width = shouldAutoSize && computedSize ? computedSize.width : propWidth;
  const height = shouldAutoSize && computedSize ? computedSize.height : propHeight;

  // i18n 라벨
  const labels = useFizzexLabels();

  // New Computer Modern Math 폰트 로드
  useEffect(() => {
    loadMathFont().then(result => {
      setFontFamily(result.fontFamily);
    });
  }, []);

  // 현재 상태에서 제안 목록 계산
  const rawSuggestions = useMemo(() => {
    if (!showSuggestions || readOnly) return [];
    return getSuggestions(state);
  }, [state, showSuggestions, readOnly]);

  // 모든 제안 (더보기용, priority 0 포함)
  const rawAllSuggestions = useMemo(() => {
    if (!showSuggestions || readOnly) return [];
    return getAllSuggestionsForContext(state);
  }, [state, showSuggestions, readOnly]);

  // 전체 가능한 제안 (모든 수식 보기용, 컨텍스트 무관)
  const rawAllAvailableSuggestions = useMemo(() => {
    if (!showSuggestions || readOnly) return [];
    return getAllSuggestions();
  }, [showSuggestions, readOnly]);

  // i18n 라벨 적용
  const suggestions = useLocalizedSuggestions(rawSuggestions);
  const allSuggestions = useLocalizedSuggestions(rawAllSuggestions);
  const allAvailableSuggestions = useLocalizedSuggestions(rawAllAvailableSuggestions);

  // 테마 기본 설정에 placeholder 투명도 애니메이션 적용
  const config = useMemo<BoxRenderConfig>(() => {
    const baseConfig = theme === 'dark'
      ? createDarkConfig(fontFamily)
      : createLightConfig(fontFamily);
    return {
      ...baseConfig,
      placeholder: {
        ...baseConfig.placeholder!,
        opacity: placeholderOpacity,
      },
      // 편집 모드에서만 빈 영역 placeholder 표시
      showPlaceholders: !readOnly,
    };
  }, [theme, placeholderOpacity, readOnly, fontFamily]);

  // SuggestionChips 위치 계산 (화면 절대 좌표)
  // Portal을 사용하므로 canvas의 화면 위치를 반영해야 함
  const suggestionPosition = useMemo(() => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    return {
      x: (canvasRect?.left ?? 0) + Math.max(0, (cursorScreenPos?.x ?? 20) - 20),
      y: (canvasRect?.top ?? 0) + (cursorScreenPos?.y ?? 0) + (cursorScreenPos?.height ?? 0) + 4,
    };
  }, [cursorScreenPos]);

  // onChange ref 동기화
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // initialState 변경 시 동기화 (readOnly 또는 외부에서 상태 변경 시)
  useEffect(() => {
    if (initialState) {
      setState(initialState);
      if (editorRef.current) {
        editorRef.current.setState(initialState);
      }
    }
  }, [initialState]);

  // 에디터 초기화
  useEffect(() => {
    if (readOnly) return;

    editorRef.current = new MathEditor((newState) => {
      setState(newState);
      onChangeRef.current?.(newState);
    });

    if (initialState) {
      editorRef.current.setState(initialState);
    }
  }, [readOnly]);

  // 커서 깜빡임
  useEffect(() => {
    if (!isFocused || readOnly) return;

    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [isFocused, readOnly]);

  // Placeholder 투명도 애니메이션 (800ms 주기, 0.3~1.0)
  // readOnly이거나 포커스 상태면 placeholder가 보이지 않으므로 애니메이션 불필요
  useEffect(() => {
    if (readOnly || isFocused) {
      setPlaceholderOpacity(1.0);
      return;
    }

    let animationId: number;
    let startTime: number | null = null;
    const duration = 800; // 한 방향 애니메이션 시간 (ms)
    const minOpacity = 0.3;
    const maxOpacity = 1.0;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // sin 함수로 부드러운 왕복 애니메이션 (0~2π를 duration*2 동안)
      const progress = (elapsed % (duration * 2)) / (duration * 2);
      const sinValue = Math.sin(progress * Math.PI * 2);
      // sinValue: -1~1 → opacity: 0.3~1.0
      const opacity = minOpacity + ((sinValue + 1) / 2) * (maxOpacity - minOpacity);

      setPlaceholderOpacity(opacity);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [readOnly, isFocused]);

  // 자동 크기 계산 (shouldAutoSize일 때만)
  useEffect(() => {
    if (!shouldAutoSize) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 임시로 충분히 큰 캔버스로 설정
    const tempWidth = 2000;
    const tempHeight = 500;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = tempWidth * dpr;
    canvas.height = tempHeight * dpr;
    ctx.scale(dpr, dpr);

    // 메트릭스 초기화
    if (!metricsRef.current) {
      metricsRef.current = new CanvasFontMetrics(ctx, config);
    } else {
      metricsRef.current.updateConfig(config);
    }

    // AST → Box 변환
    const displayStyle = displayMode === 'display';
    const box = astToBox(state.ast, metricsRef.current, 1.0, displayStyle);

    // 임시 레이아웃 (크기 계산용)
    layoutBox(box, padding, tempHeight / 2);

    // Box 경계 계산
    const contentWidth = box.width;
    const contentHeight = box.height + box.depth;

    // 필요한 크기 계산
    const requiredWidth = Math.max(minWidth, contentWidth + padding * 2);
    const requiredHeight = Math.max(minHeight, contentHeight + padding * 2);

    // 크기가 변경되었으면 업데이트
    if (!computedSize ||
        Math.abs(computedSize.width - requiredWidth) > 1 ||
        Math.abs(computedSize.height - requiredHeight) > 1) {
      setComputedSize({ width: requiredWidth, height: requiredHeight });
    }
  }, [state.ast, config, shouldAutoSize, minWidth, minHeight, padding, computedSize, displayMode]);

  // 렌더링
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

    // 배경 클리어 (투명)
    ctx.clearRect(0, 0, width, height);

    // 메트릭스 초기화
    if (!metricsRef.current) {
      metricsRef.current = new CanvasFontMetrics(ctx, config);
    } else {
      metricsRef.current.updateConfig(config);
    }

    // 렌더러 초기화
    if (!rendererRef.current) {
      rendererRef.current = new Projector(ctx, config, metricsRef.current);
    } else {
      rendererRef.current.updateConfig(config);
    }

    // AST → Box 변환
    const displayStyle = displayMode === 'display';
    const box = astToBox(state.ast, metricsRef.current, 1.0, displayStyle);
    boxRef.current = box;

    // 레이아웃 계산
    // autoSize 모드에서는 padding 기준, 아니면 중앙 정렬
    const startX = shouldAutoSize ? padding : 20;
    const startY = shouldAutoSize
      ? padding + box.height  // 상단 패딩 + 수식 높이 (baseline 기준)
      : height / 2 + config.baseFontSize * 0.25;
    layoutBox(box, startX, startY);

    // 렌더링
    rendererRef.current.render(box);

    // 디버그 모드
    if (debug) {
      rendererRef.current.renderDebugBounds(box);
    }

    // 커서 렌더링 및 위치 계산
    if (isFocused && !readOnly) {
      // 커서 위치 계산
      const cursorPos = rendererRef.current.getCursorPosition(box, state.cursor);
      if (cursorPos) {
        setCursorScreenPos({
          x: cursorPos.x,
          y: cursorPos.y - cursorPos.height,
          height: cursorPos.height,
        });
      }

      // 조합 중이 아닐 때만 커서 렌더링
      if (cursorVisible && !isComposing) {
        rendererRef.current.renderCursor(box, state.cursor);
      }
    }

    // 빈 상태 플레이스홀더
    if (state.ast.children.length === 0) {
      ctx.font = `italic ${config.baseFontSize * 0.8}px ${config.fontFamily}`;
      ctx.fillStyle = theme === 'dark' ? '#666' : '#999';
      ctx.fillText(labels.placeholder, startX, height / 2 + 6);
    }
  }, [state, config, width, height, isFocused, cursorVisible, theme, debug, isComposing, labels.placeholder, shouldAutoSize, padding, displayMode]);

  // 숨겨진 input 키보드 이벤트
  const handleHiddenInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly || !editorRef.current) return;

    // IME 조합 중에는 기본 동작 허용
    if (isComposingRef.current) return;

    const { key } = e;

    // 특수 키 처리 (화살표, 백스페이스, 분수, 거듭제곱, 괄호 등)
    const specialKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', '/', '^', '(', ')', '[', ']', '{', '}'];

    if (specialKeys.includes(key)) {
      e.preventDefault();
      editorRef.current.handleKeyDown(e.nativeEvent);
      setCursorVisible(true);
      return;
    }

    // 연산자
    if (['+', '-', '*', '='].includes(key)) {
      e.preventDefault();
      editorRef.current.handleKeyDown(e.nativeEvent);
      setCursorVisible(true);
      return;
    }

    // 일반 문자는 input의 기본 동작으로 처리 (IME 지원)
  }, [readOnly]);

  // 숨겨진 input 입력 이벤트 (일반 문자 입력)
  const handleHiddenInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !editorRef.current || isComposingRef.current) return;

    const value = e.target.value;
    if (value) {
      // 입력된 문자들을 처리
      for (const char of value) {
        if (/[0-9.]/.test(char)) {
          editorRef.current.insertNumber(char);
        } else if (!/[\s]/.test(char)) {
          editorRef.current.insertVariable(char);
        }
      }
      // input 초기화
      e.target.value = '';
      setCursorVisible(true);
    }
  }, [readOnly]);

  // IME 조합 시작
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    setIsComposing(true);
  }, []);

  // IME 조합 완료 (한글 등)
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    setIsComposing(false);

    if (readOnly || !editorRef.current) return;

    const data = e.data;
    if (data) {
      // 조합 완료된 문자를 변수로 삽입
      for (const char of data) {
        editorRef.current.insertVariable(char);
      }
      // input 초기화
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = '';
      }
      setCursorVisible(true);
    }
  }, [readOnly]);

  // 포커스
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setCursorVisible(true);
    // 숨겨진 input에 포커스
    hiddenInputRef.current?.focus();
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // 숨겨진 input 포커스/블러
  const handleHiddenInputFocus = useCallback(() => {
    setIsFocused(true);
    setCursorVisible(true);
  }, []);

  const handleHiddenInputBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // 제안 선택 핸들러
  const handleSuggestionSelect = useCallback((suggestion: SuggestionWithAction) => {
    if (!editorRef.current) return;

    const { action } = suggestion;

    switch (action.type) {
      case 'insert_operator':
        editorRef.current.insertOperator(action.operator);
        break;
      case 'insert_number':
        editorRef.current.insertNumber(action.value);
        break;
      case 'insert_variable':
        editorRef.current.insertVariable(action.name);
        break;
      case 'insert_frac':
        editorRef.current.insertFraction();
        break;
      case 'insert_power':
        editorRef.current.insertPower();
        break;
      case 'insert_subscript':
        editorRef.current.insertSubscript();
        break;
      case 'insert_sqrt':
        editorRef.current.insertSqrt();
        break;
      case 'insert_paren':
        editorRef.current.insertParen(action.parenType);
        break;
      case 'insert_abs':
        editorRef.current.insertAbs();
        break;
      case 'insert_integral':
        editorRef.current.insertIntegral();
        break;
      case 'insert_sum':
        editorRef.current.insertSum();
        break;
      case 'insert_limit':
        editorRef.current.insertLimit();
        break;
      case 'insert_product':
        editorRef.current.insertProduct();
        break;
      case 'insert_func':
        editorRef.current.insertFunc(action.name);
        break;
    }

    setCursorVisible(true);
    // 입력 후에도 포커스 유지
    hiddenInputRef.current?.focus();
  }, []);

  // 클릭 시 커서 이동 및 포커스
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 숨겨진 input에 포커스
    hiddenInputRef.current?.focus();

    if (readOnly || !editorRef.current || !boxRef.current) return;

    // 클릭 좌표 계산 (캔버스 내 좌표)
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 히트 테스트로 클릭한 Box 찾기
    const hitBox = hitTest(boxRef.current, x, y);

    if (hitBox && hitBox.sourceId) {
      // Box 내에서 offset 계산
      const offset = calculateOffsetFromClick(hitBox, x);

      // 커서 이동
      setState((prev) => ({
        ...prev,
        cursor: { nodeId: hitBox.sourceId!, offset },
      }));
      editorRef.current.setState({
        ...editorRef.current.getState(),
        cursor: { nodeId: hitBox.sourceId!, offset },
      });
      setCursorVisible(true);
    }
  }, [readOnly]);

  // 클릭 위치에서 offset 계산
  const calculateOffsetFromClick = (box: Box, clickX: number): number => {
    if (box.type !== 'hbox') {
      // HBox가 아니면 끝에 커서
      return 0;
    }

    const hbox = box as HBox;
    let x = hbox.x;

    for (let i = 0; i < hbox.children.length; i++) {
      const child = hbox.children[i];
      const childCenter = x + child.width / 2;

      if (clickX < childCenter) {
        return i;
      }
      x += child.width;
    }

    return hbox.children.length;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* IME 입력용 input (조합 중일 때만 보임) */}
      {!readOnly && (
        <input
          ref={hiddenInputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            position: 'absolute',
            left: isComposing && cursorScreenPos ? cursorScreenPos.x : 0,
            top: isComposing && cursorScreenPos ? cursorScreenPos.y : 0,
            width: isComposing ? 'auto' : 1,
            minWidth: isComposing ? 20 : 1,
            height: isComposing && cursorScreenPos ? cursorScreenPos.height : 1,
            opacity: isComposing ? 1 : 0,
            padding: 0,
            margin: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: config.color,
            font: `${config.baseFontSize}px ${config.fontFamily}`,
            caretColor: isComposing ? config.cursorColor : 'transparent',
            zIndex: isComposing ? 10 : -1,
            pointerEvents: isComposing ? 'auto' : 'none',
          }}
          onKeyDown={handleHiddenInputKeyDown}
          onChange={handleHiddenInputChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={handleHiddenInputFocus}
          onBlur={handleHiddenInputBlur}
        />
      )}
      <canvas
        ref={canvasRef}
        tabIndex={-1}
        style={{
          width,
          height,
          outline: 'none',
          cursor: readOnly ? 'default' : 'text',
        }}
        onClick={handleClick}
      />
      {showDebugToggle && (
        <button
          type="button"
          onClick={() => setDebug((d) => !d)}
          style={{
            position: 'absolute',
            top: 4,
            right: 4 + (showExplorerToggle ? 28 : 0),
            width: 24,
            height: 24,
            borderRadius: 4,
            border: 'none',
            background: debug
              ? (theme === 'dark' ? '#3b82f6' : '#2563eb')
              : (theme === 'dark' ? '#404040' : '#e5e5e5'),
            color: debug ? '#fff' : (theme === 'dark' ? '#999' : '#666'),
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={labels.debugToggle}
        >
          {debug ? '◼' : '◻'}
        </button>
      )}

      {/* 수식 탐색 버튼 */}
      {showExplorerToggle && (
        <button
          type="button"
          onClick={() => setShowExplorer(true)}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 24,
            height: 24,
            borderRadius: 4,
            border: 'none',
            background: theme === 'dark' ? '#404040' : '#e5e5e5',
            color: theme === 'dark' ? '#999' : '#666',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="수식 탐색"
        >
          🔍
        </button>
      )}

      {/* 수식 탐색 모달 */}
      {showExplorerToggle && showExplorer && (
        <ExpressionExplorer
          ast={state.ast}
          isOpen={showExplorer}
          onClose={() => setShowExplorer(false)}
          theme={theme}
          visualizerRegistry={visualizerRegistry}
        />
      )}

      {/* 자동완성 Chips (커서 따라다니는 말풍선) - Portal로 렌더링됨 */}
      {showSuggestions && (
        <SuggestionChips
          suggestions={suggestions}
          allSuggestions={allSuggestions}
          allAvailableSuggestions={allAvailableSuggestions}
          visible={isFocused && suggestions.length > 0}
          position={suggestionPosition}
          onSelect={handleSuggestionSelect}
          theme={theme}
          maxWidth={width - 20}
        />
      )}
    </div>
  );
}

export default EditorView;
