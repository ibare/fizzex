/**
 * 자동완성 Chip 컴포넌트
 *
 * 커서를 따라다니는 말풍선 형태의 컨테이너 안에 Chip 표시
 * Portal을 사용하여 부모 컨테이너의 overflow 영향을 받지 않음
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SuggestionWithAction } from '../suggestion/types.js';
import { useFizzexLabels } from '../i18n/index.js';

export interface SuggestionChipsProps {
  /** 제안 목록 (우선순위 필터링된) */
  suggestions: SuggestionWithAction[];
  /** 모든 제안 목록 (더보기용, 컨텍스트별) */
  allSuggestions?: SuggestionWithAction[];
  /** 전체 가능한 제안 목록 (모든 수식 보기용, 컨텍스트 무관) */
  allAvailableSuggestions?: SuggestionWithAction[];
  /** 표시 여부 */
  visible: boolean;
  /** 툴팁 위치 */
  position: { x: number; y: number };
  /** 선택 콜백 */
  onSelect: (suggestion: SuggestionWithAction) => void;
  /** 테마 */
  theme?: 'light' | 'dark';
  /** 최대 너비 */
  maxWidth?: number;
}

export function SuggestionChips({
  suggestions,
  allSuggestions,
  allAvailableSuggestions,
  visible,
  position,
  onSelect,
  theme = 'light',
  maxWidth = 360,
}: SuggestionChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const [showingAll, setShowingAll] = useState(false);
  const labels = useFizzexLabels();

  // SSR 안전성 및 표시 조건 체크
  if (typeof document === 'undefined' || !visible || suggestions.length === 0) return null;

  const isDark = theme === 'dark';

  // 표시할 제안 목록
  // 1. showingAll: 컨텍스트 무관 전체 제안
  // 2. expanded: 컨텍스트별 모든 제안 (priority 0 포함)
  // 3. 기본: 컨텍스트별 필터링된 제안
  const displaySuggestions = showingAll && allAvailableSuggestions
    ? allAvailableSuggestions
    : expanded && allSuggestions
      ? allSuggestions
      : suggestions;

  // 더보기 버튼 표시 여부 (숨겨진 제안이 있을 때만)
  const hasMore = !showingAll && allSuggestions && allSuggestions.length > suggestions.length;

  // 말풍선 꼬리 크기
  const arrowSize = 8;

  // Portal을 사용하여 document.body에 렌더링
  // 부모 컨테이너의 overflow, transform, z-index 영향을 받지 않음
  const content = (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y + arrowSize,
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
    >
      {/* 말풍선 꼬리 (위쪽 화살표) */}
      <div
        style={{
          position: 'absolute',
          top: -arrowSize,
          left: 12,
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid ${isDark ? '#404040' : '#d0d0d0'}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -arrowSize + 1,
          left: 12,
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid ${isDark ? '#2d2d2d' : '#ffffff'}`,
        }}
      />

      {/* 말풍선 본체 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '10px 12px',
          maxWidth,
          backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
          border: `1px solid ${isDark ? '#404040' : '#d0d0d0'}`,
          borderRadius: 10,
          boxShadow: isDark
            ? '0 4px 16px rgba(0, 0, 0, 0.4)'
            : '0 4px 16px rgba(0, 0, 0, 0.12)',
        }}
      >
      {displaySuggestions.map(suggestion => (
        <button
          key={suggestion.id}
          type="button"
          onMouseDown={e => {
            // 포커스 손실 방지 (blur가 먼저 발생하는 것을 막음)
            e.preventDefault();
          }}
          onClick={() => onSelect(suggestion)}
          title={suggestion.description || suggestion.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            border: `1px solid ${isDark ? '#404040' : '#d0d0d0'}`,
            borderRadius: 16,
            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
            color: isDark ? '#e5e5e5' : '#333',
            cursor: 'pointer',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 13,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            const btn = e.currentTarget;
            btn.style.backgroundColor = isDark ? '#3b82f6' : '#e8f0fe';
            btn.style.borderColor = isDark ? '#3b82f6' : '#1a73e8';
            btn.style.color = isDark ? '#fff' : '#1a73e8';
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget;
            btn.style.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
            btn.style.borderColor = isDark ? '#404040' : '#d0d0d0';
            btn.style.color = isDark ? '#e5e5e5' : '#333';
          }}
        >
          {/* 아이콘 */}
          <span
            style={{
              fontFamily: '"NewCMMath", "New Computer Modern Math", "Times New Roman", serif',
              fontSize: 14,
            }}
          >
            {suggestion.icon}
          </span>

          {/* 레이블 */}
          <span>{suggestion.label}</span>

          {/* 단축키 (있으면 표시) */}
          {suggestion.shortcut && (
            <span
              style={{
                fontSize: 10,
                padding: '1px 4px',
                borderRadius: 3,
                backgroundColor: isDark ? '#404040' : '#f0f0f0',
                color: isDark ? '#888' : '#666',
                fontFamily: 'monospace',
                marginLeft: 2,
              }}
            >
              {suggestion.shortcut}
            </span>
          )}
        </button>
      ))}

      {/* 더보기/접기 버튼 */}
      {hasMore && (
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            border: `1px dashed ${isDark ? '#505050' : '#c0c0c0'}`,
            borderRadius: 16,
            backgroundColor: 'transparent',
            color: isDark ? '#888' : '#666',
            cursor: 'pointer',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 12,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            const btn = e.currentTarget;
            btn.style.borderColor = isDark ? '#666' : '#999';
            btn.style.color = isDark ? '#aaa' : '#444';
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget;
            btn.style.borderColor = isDark ? '#505050' : '#c0c0c0';
            btn.style.color = isDark ? '#888' : '#666';
          }}
        >
          {expanded ? labels.showLess : labels.showMore}
        </button>
      )}

      {/* 모든 수식 보기 버튼 */}
      {allAvailableSuggestions && allAvailableSuggestions.length > 0 && (
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            setShowingAll(!showingAll);
            if (!showingAll) setExpanded(false); // 모든 수식 보기 시 더보기 상태 초기화
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            border: showingAll
              ? `1px solid ${isDark ? '#3b82f6' : '#1a73e8'}`
              : `1px dashed ${isDark ? '#505050' : '#c0c0c0'}`,
            borderRadius: 16,
            backgroundColor: showingAll
              ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(26, 115, 232, 0.1)')
              : 'transparent',
            color: showingAll
              ? (isDark ? '#60a5fa' : '#1a73e8')
              : (isDark ? '#888' : '#666'),
            cursor: 'pointer',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 12,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (showingAll) return;
            const btn = e.currentTarget;
            btn.style.borderColor = isDark ? '#666' : '#999';
            btn.style.color = isDark ? '#aaa' : '#444';
          }}
          onMouseLeave={e => {
            if (showingAll) return;
            const btn = e.currentTarget;
            btn.style.borderColor = isDark ? '#505050' : '#c0c0c0';
            btn.style.color = isDark ? '#888' : '#666';
          }}
        >
          {/* 아이콘 */}
          <span style={{ fontSize: 10 }}>
            {showingAll ? '✕' : '⊞'}
          </span>
          {showingAll ? labels.showLess : labels.showAll}
        </button>
      )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default SuggestionChips;
