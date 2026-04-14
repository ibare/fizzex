/**
 * StreamingMath — 스트리밍 LaTeX 렌더링 React 컴포넌트
 *
 * FizzexStreamRenderer를 React 라이프사이클에 래핑한다.
 * text prop의 변화를 감지하여 delta feed를 수행한다.
 */

import React, { useEffect, useRef } from 'react';
import { FizzexStreamRenderer } from '../headless/stream-renderer';
import type { StreamRendererConfig } from '../headless/stream-renderer';
import type { StreamParserOptions } from '../latex/streaming';

export interface StreamingMathProps {
  /** 누적 텍스트 (증가하는 패턴 — delta만 feed) */
  text?: string;
  /** confidence 오버레이 표시 여부 (기본: true) */
  showConfidence?: boolean;
  /** tooltip 표시 여부 (기본: true) */
  showTooltip?: boolean;
  /** 테마 */
  theme?: 'light' | 'dark';
  /** 기본 폰트 크기 */
  baseFontSize?: number;
  /** StreamParser 옵션 */
  parserOptions?: Partial<StreamParserOptions>;
  /** 스트림 종료 여부 — true로 전환 시 end() 호출 */
  isComplete?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 추가 스타일 */
  style?: React.CSSProperties;
}

/**
 * 스트리밍 LaTeX 렌더링 컴포넌트
 *
 * @example
 * ```tsx
 * // LLM 스트리밍 응답
 * <StreamingMath text={llmText} showConfidence isComplete={isDone} />
 * ```
 */
export function StreamingMath({
  text,
  showConfidence = true,
  showTooltip = true,
  theme = 'light',
  baseFontSize,
  parserOptions,
  isComplete = false,
  className,
  style,
}: StreamingMathProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<FizzexStreamRenderer | null>(null);
  const prevTextLenRef = useRef(0);

  // 렌더러 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const config: StreamRendererConfig = {
      showConfidence,
      showTooltip,
      theme,
      baseFontSize,
      parserOptions,
    };

    rendererRef.current = new FizzexStreamRenderer(containerRef.current, config);
    prevTextLenRef.current = 0;

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 1회

  // text prop 변화 시 delta feed
  useEffect(() => {
    if (!rendererRef.current || text == null) return;

    if (text.length < prevTextLenRef.current) {
      // text가 줄어들었으면 리셋 후 전체 재공급
      rendererRef.current.reset();
      rendererRef.current.feed(text);
      prevTextLenRef.current = text.length;
      return;
    }

    const delta = text.slice(prevTextLenRef.current);
    if (delta.length > 0) {
      rendererRef.current.feed(delta);
      prevTextLenRef.current = text.length;
    }
  }, [text]);

  // isComplete 전환 시 end() 호출
  useEffect(() => {
    if (isComplete && rendererRef.current) {
      rendererRef.current.end();
    }
  }, [isComplete]);

  // config 변경 반영
  useEffect(() => {
    rendererRef.current?.setConfig({ showConfidence, showTooltip, theme, baseFontSize });
  }, [showConfidence, showTooltip, theme, baseFontSize]);

  return <div ref={containerRef} className={className} style={style} />;
}
