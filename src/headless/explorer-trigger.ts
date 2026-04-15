/**
 * Explorer 트리거 유틸리티
 *
 * 컨테이너에 수식 탐색 모드 진입 트리거를 부착한다.
 * 더블클릭 또는 호버 시 아이콘 표시 방식을 지원.
 */

export interface ExplorerTriggerOptions {
  /** 더블클릭으로 탐색 진입 (기본 true) */
  dblclick?: boolean;
  /** 호버 시 탐색 아이콘 표시 (기본 false) */
  hoverIcon?: boolean;
  /** 테마 — 아이콘 스타일에 영향 */
  theme?: 'light' | 'dark';
}

/**
 * 컨테이너에 탐색 트리거를 부착한다.
 *
 * @param container 이벤트를 부착할 DOM 요소
 * @param openFn    탐색 모드 진입 시 호출할 함수
 * @param options   트리거 옵션
 * @returns cleanup 함수 — 호출하면 모든 이벤트/DOM을 제거한다
 */
export function attachExplorerTrigger(
  container: HTMLElement,
  openFn: () => void,
  options: ExplorerTriggerOptions = {},
): () => void {
  const { dblclick = true, hoverIcon = false, theme = 'light' } = options;
  const cleanups: (() => void)[] = [];

  // ── 더블클릭 트리거 ──
  if (dblclick) {
    const handleDblclick = (e: MouseEvent) => {
      e.preventDefault();
      openFn();
    };
    container.addEventListener('dblclick', handleDblclick);
    cleanups.push(() => container.removeEventListener('dblclick', handleDblclick));
  }

  // ── 호버 아이콘 트리거 ──
  if (hoverIcon) {
    const isDark = theme === 'dark';

    // 아이콘 요소 생성
    const icon = document.createElement('button');
    icon.type = 'button';
    icon.textContent = '\uD83D\uDD0D'; // 돋보기
    icon.title = '수식 탐색';
    Object.assign(icon.style, {
      position: 'absolute',
      top: '4px',
      right: '4px',
      width: '24px',
      height: '24px',
      borderRadius: '4px',
      border: 'none',
      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      color: isDark ? '#9ca3af' : '#6b7280',
      cursor: 'pointer',
      fontSize: '12px',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      zIndex: '1',
      lineHeight: '1',
    });

    // 컨테이너에 position 설정 (아이콘 absolute 배치용)
    const originalPosition = container.style.position;
    if (!originalPosition || originalPosition === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(icon);

    // 호버 시 아이콘 표시
    const showIcon = () => { icon.style.display = 'flex'; };
    const hideIcon = () => { icon.style.display = 'none'; };

    container.addEventListener('mouseenter', showIcon);
    container.addEventListener('mouseleave', hideIcon);
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openFn();
    });

    cleanups.push(() => {
      container.removeEventListener('mouseenter', showIcon);
      container.removeEventListener('mouseleave', hideIcon);
      icon.remove();
      // position 복원
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = originalPosition || '';
      }
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
