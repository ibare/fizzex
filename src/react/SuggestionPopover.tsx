/**
 * 자동완성 팝오버 컴포넌트
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SuggestionWithAction, SuggestionCategory } from '../suggestion/types';
import { useFizzexLabels } from '../i18n';

export interface SuggestionPopoverProps {
  /** 제안 목록 */
  suggestions: SuggestionWithAction[];
  /** 팝오버 위치 */
  position: { x: number; y: number };
  /** 표시 여부 */
  visible: boolean;
  /** 선택 콜백 */
  onSelect: (suggestion: SuggestionWithAction) => void;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 테마 */
  theme?: 'light' | 'dark';
}

/** 카테고리 순서 */
const CATEGORY_ORDER: SuggestionCategory[] = [
  'operator',
  'structure',
  'calculus',
  'function',
  'symbol',
];

export function SuggestionPopover({
  suggestions,
  position,
  visible,
  onSelect,
  onClose,
  theme = 'light',
}: SuggestionPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // i18n 라벨
  const labels = useFizzexLabels();

  // 제안 목록이 변경되면 선택 인덱스 초기화
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // 선택된 항목 스크롤
  useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, suggestions, selectedIndex, onSelect, onClose]);

  // 외부 클릭 감지
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 약간의 딜레이를 두고 이벤트 등록 (팝오버 열릴 때 바로 닫히는 것 방지)
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // 카테고리별 그룹화
  const groupedSuggestions = useCallback(() => {
    const groups: Record<SuggestionCategory, SuggestionWithAction[]> = {
      operator: [],
      structure: [],
      function: [],
      symbol: [],
      calculus: [],
    };

    suggestions.forEach(s => {
      groups[s.category].push(s);
    });

    return CATEGORY_ORDER
      .filter(cat => groups[cat].length > 0)
      .map(cat => ({
        category: cat,
        label: labels.categories[cat],
        items: groups[cat],
      }));
  }, [suggestions, labels.categories]);

  if (!visible || suggestions.length === 0) return null;

  const isDark = theme === 'dark';
  const groups = groupedSuggestions();

  // 평탄화된 인덱스 계산용
  let flatIndex = 0;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        minWidth: 200,
        maxWidth: 280,
        maxHeight: 300,
        overflowY: 'auto',
        backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
        border: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
        borderRadius: 8,
        boxShadow: isDark
          ? '0 4px 12px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
      }}
    >
      {groups.map(group => (
        <div key={group.category}>
          {/* 카테고리 헤더 */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: isDark ? '#888' : '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              backgroundColor: isDark ? '#252525' : '#f8f8f8',
              borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
              position: 'sticky',
              top: 0,
            }}
          >
            {group.label}
          </div>

          {/* 항목 목록 */}
          {group.items.map(suggestion => {
            const currentIndex = flatIndex++;
            const isSelected = currentIndex === selectedIndex;

            return (
              <button
                key={suggestion.id}
                ref={el => { itemRefs.current[currentIndex] = el; }}
                type="button"
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(currentIndex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: isSelected
                    ? (isDark ? '#3b82f6' : '#e8f0fe')
                    : 'transparent',
                  color: isSelected
                    ? (isDark ? '#fff' : '#1a73e8')
                    : (isDark ? '#e5e5e5' : '#333'),
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.1s',
                }}
              >
                {/* 아이콘 */}
                <span
                  style={{
                    width: 32,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '"Times New Roman", serif',
                    fontSize: 16,
                    marginRight: 8,
                    color: isSelected
                      ? (isDark ? '#fff' : '#1a73e8')
                      : (isDark ? '#aaa' : '#666'),
                  }}
                >
                  {suggestion.icon}
                </span>

                {/* 레이블 */}
                <span style={{ flex: 1 }}>
                  {suggestion.label}
                </span>

                {/* 단축키 */}
                {suggestion.shortcut && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: isDark ? '#404040' : '#f0f0f0',
                      color: isDark ? '#999' : '#666',
                      fontFamily: 'monospace',
                    }}
                  >
                    {suggestion.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* 하단 힌트 */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: 11,
          color: isDark ? '#666' : '#999',
          borderTop: `1px solid ${isDark ? '#333' : '#eee'}`,
          display: 'flex',
          gap: 12,
        }}
      >
        <span>{labels.keyboard.move}</span>
        <span>{labels.keyboard.select}</span>
        <span>{labels.keyboard.close}</span>
      </div>
    </div>
  );
}

export default SuggestionPopover;
