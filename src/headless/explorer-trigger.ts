/**
 * Explorer 트리거 유틸리티
 *
 * 컨테이너에 수식 탐색 모드 진입 트리거를 부착한다.
 * 더블클릭 또는 호버 시 아이콘 표시 방식을 지원.
 */

import { getUiTexts } from '../locales/ui.js';

export interface ExplorerTriggerOptions {
  /** 더블클릭으로 탐색 진입 (기본 true) */
  dblclick?: boolean;
  /**
   * 탐색 아이콘 표시 정책 (기본 `'none'`).
   *
   * - `'none'` — 아이콘을 만들지 않는다.
   * - `'hover'` — 호버 중에만 띄운다. 본문에 섞이는 인라인 수식용 — 아이콘이
   *   상시 떠 있으면 읽던 글자를 가린다.
   * - `'always'` — 자격이 있으면 상시 띄운다. 쇼케이스·편집기용. 호버가 없는
   *   터치 기기와 키보드 사용자가 도달할 수 있는 유일한 정책이다.
   *
   * 어느 정책이든 자격(`setAvailable`)이 없으면 아이콘은 뜨지 않는다.
   */
  visibility?: 'none' | 'hover' | 'always';
  /** 테마 — 아이콘 스타일에 영향 */
  theme?: 'light' | 'dark';
}

/**
 * 부착된 트리거의 제어 핸들.
 */
export interface ExplorerTriggerHandle {
  /**
   * 탐색 진입 자격을 갱신한다.
   *
   * 자격이 없으면 호버 아이콘을 띄우지 않는다 — 탐색 모드가 이 수식에
   * 대해 내놓을 것이 없는데 본문 위에 아이콘을 얹으면 콘텐츠만 가린다.
   * **더블클릭 진입은 이 값과 무관하게 유지된다**: 광고하지 않는 것과
   * 진입을 막는 것은 다르다.
   */
  setAvailable(available: boolean): void;
  /** 모든 이벤트/DOM 을 제거한다. */
  destroy(): void;
}

/**
 * 컨테이너에 탐색 트리거를 부착한다.
 *
 * 초기 자격은 `false` 다. 호출 측이 렌더 직후 `setAvailable()` 로 현재
 * 판정을 밀어넣어야 아이콘이 뜬다.
 *
 * @param container 이벤트를 부착할 DOM 요소
 * @param openFn    탐색 모드 진입 시 호출할 함수
 * @param options   트리거 옵션
 * @returns 자격 갱신과 정리를 담당하는 핸들
 */
export function attachExplorerTrigger(
  container: HTMLElement,
  openFn: () => void,
  options: ExplorerTriggerOptions = {},
): ExplorerTriggerHandle {
  const { dblclick = true, visibility = 'none', theme = 'light' } = options;
  const cleanups: (() => void)[] = [];

  let available = false;
  let syncIcon: (() => void) | null = null;

  // ── 더블클릭 트리거 ──
  // 자격 게이트를 걸지 않는다. 진입점을 광고하지 않을 뿐, 자격 미달인
  // 수식에서도 요소를 들여다보는 것은 가능해야 한다.
  if (dblclick) {
    const handleDblclick = (e: MouseEvent) => {
      e.preventDefault();
      openFn();
    };
    container.addEventListener('dblclick', handleDblclick);
    cleanups.push(() => container.removeEventListener('dblclick', handleDblclick));
  }

  // ── 아이콘 트리거 ──
  if (visibility !== 'none') {
    const isDark = theme === 'dark';

    // 아이콘 요소 생성
    const icon = document.createElement('button');
    icon.type = 'button';
    icon.textContent = '\uD83D\uDD0D'; // 돋보기
    const exploreLabel = getUiTexts().explorer.explore;
    icon.title = exploreLabel;
    icon.setAttribute('aria-label', exploreLabel);
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

    // 자격이 표시의 필요조건이고, 호버는 'hover' 정책에서만 추가로 요구된다.
    // 두 조건을 한 함수에 모아 두면 자격이 렌더 중에 바뀌어도 — 마우스가
    // 이미 안에 있는 채로 수식이 갈아끼워져도 — 표시가 어긋나지 않는다.
    let hovering = false;
    syncIcon = () => {
      const visible = available && (visibility === 'always' || hovering);
      icon.style.display = visible ? 'flex' : 'none';
    };

    if (visibility === 'hover') {
      const handleEnter = () => { hovering = true; syncIcon?.(); };
      const handleLeave = () => { hovering = false; syncIcon?.(); };

      container.addEventListener('mouseenter', handleEnter);
      container.addEventListener('mouseleave', handleLeave);
      cleanups.push(() => {
        container.removeEventListener('mouseenter', handleEnter);
        container.removeEventListener('mouseleave', handleLeave);
      });
    }

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openFn();
    });

    cleanups.push(() => {
      icon.remove();
      // position 복원
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = originalPosition || '';
      }
    });
  }

  return {
    setAvailable(next: boolean): void {
      if (next === available) return;
      available = next;
      syncIcon?.();
    },
    destroy(): void {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
