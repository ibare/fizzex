/**
 * Box 레이아웃 계산
 *
 * Box 트리의 각 노드에 x, y 좌표를 할당
 * y는 baseline 위치
 */

import type { Box, HBox, VBox, SurdBox } from './types';
import { MathConstants } from './font-metrics';

/**
 * Box 트리 레이아웃 계산
 * @param box 루트 Box
 * @param startX 시작 x 좌표
 * @param startY 시작 y 좌표 (baseline 위치)
 */
export function layoutBox(box: Box, startX: number, startY: number): void {
  box.x = startX;
  box.y = startY;

  switch (box.type) {
    case 'hbox':
      layoutHBox(box);
      break;
    case 'vbox':
      layoutVBox(box);
      break;
    case 'surd':
      layoutSurd(box);
      break;
    // glyph, rule, kern, path는 자식이 없으므로 x, y만 설정하면 됨
  }
}

/**
 * HBox 레이아웃
 * 자식들을 가로로 나열, baseline 정렬
 */
function layoutHBox(hbox: HBox): void {
  let currentX = hbox.x;

  for (const child of hbox.children) {
    // 자식의 baseline을 HBox의 baseline에 맞춤
    // shift가 있으면 baseline을 이동 (음수 = 위로)
    const childY = hbox.y + (child.shift ?? 0);
    layoutBox(child, currentX, childY);
    currentX += child.width;
  }
}

/**
 * VBox 레이아웃
 * 자식들을 세로로 나열
 * shift가 있는 경우 절대 위치 지정 (baseline 기준)
 */
function layoutVBox(vbox: VBox): void {
  // 각 자식의 위치 계산
  // y는 baseline 위치이므로, 첫 번째 자식은 vbox.y - vbox.height + child.height에서 시작

  let currentY = vbox.y - vbox.height;

  for (let i = 0; i < vbox.children.length; i++) {
    const child = vbox.children[i];

    // 가로 중앙 정렬
    const childX = vbox.x + (vbox.width - child.width) / 2;

    // shift가 있으면 VBox baseline 기준으로 절대 위치 지정
    if (child.shift !== undefined) {
      const childBaselineY = vbox.y + child.shift;
      layoutBox(child, childX, childBaselineY);
    } else {
      // 자식의 baseline = currentY + child.height
      const childBaselineY = currentY + child.height;
      layoutBox(child, childX, childBaselineY);
      currentY += child.height + child.depth;
    }
  }
}

/**
 * Surd 레이아웃
 * √ 기호 오른쪽에 content 배치
 */
function layoutSurd(surd: SurdBox): void {
  // content는 surd 오른쪽 끝에 배치
  const contentX = surd.x + surd.width - surd.content.width;
  layoutBox(surd.content, contentX, surd.y);

  // index를 TeX Rule 11 기준으로 배치
  if (surd.index) {
    const em = surd.actualFontSize;
    const totalHeight = surd.height + surd.depth;

    // 수직: degree의 하단(bottom)이 radical bottom에서 60% 올라간 위치
    const radicalBottom = surd.y + surd.depth;
    const degreeBottom = radicalBottom - MathConstants.radicalDegreeBottomRaisePercent * totalHeight;
    const indexY = degreeBottom - surd.index.depth;

    // 수평: kernBefore만큼 우측 이동
    const indexX = surd.x + em * MathConstants.radicalKernBeforeDegree;

    layoutBox(surd.index, indexX, indexY);
  }
}

/**
 * Box와 그 자손들의 좌표 정보를 맵으로 반환
 * sourceId가 있는 Box들만 포함
 */
export function collectBoxPositions(box: Box): Map<string, { x: number; y: number; width: number; height: number; depth: number }> {
  const positions = new Map<string, { x: number; y: number; width: number; height: number; depth: number }>();

  function collect(b: Box): void {
    if (b.sourceId) {
      positions.set(b.sourceId, {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        depth: b.depth,
      });
    }

    if (b.type === 'hbox' || b.type === 'vbox') {
      for (const child of b.children) {
        collect(child);
      }
    } else if (b.type === 'surd') {
      collect(b.content);
      if (b.index) collect(b.index);
    }
  }

  collect(box);
  return positions;
}

/**
 * 주어진 좌표에 해당하는 Box 찾기 (히트 테스트)
 */
export function hitTest(box: Box, x: number, y: number): Box | null {
  // Box의 경계 확인
  const top = box.y - box.height;
  const bottom = box.y + box.depth;
  const left = box.x;
  const right = box.x + box.width;

  if (x < left || x > right || y < top || y > bottom) {
    return null;
  }

  // 자식 중에서 찾기 (더 깊은 것 우선)
  if (box.type === 'hbox' || box.type === 'vbox') {
    for (const child of box.children) {
      const hit = hitTest(child, x, y);
      if (hit && hit.sourceId) {
        return hit;
      }
    }
  } else if (box.type === 'surd') {
    const hit = hitTest(box.content, x, y);
    if (hit && hit.sourceId) {
      return hit;
    }
    if (box.index) {
      const indexHit = hitTest(box.index, x, y);
      if (indexHit && indexHit.sourceId) return indexHit;
    }
  }

  // 자식에서 못 찾았으면 자신 반환 (sourceId가 있는 경우)
  return box.sourceId ? box : null;
}

/**
 * 특정 sourceId를 가진 Box 찾기
 */
export function findBoxBySourceId(box: Box, sourceId: string): Box | null {
  if (box.sourceId === sourceId) {
    return box;
  }

  if (box.type === 'hbox' || box.type === 'vbox') {
    for (const child of box.children) {
      const found = findBoxBySourceId(child, sourceId);
      if (found) return found;
    }
  } else if (box.type === 'surd') {
    const found = findBoxBySourceId(box.content, sourceId);
    if (found) return found;
    if (box.index) {
      const indexFound = findBoxBySourceId(box.index, sourceId);
      if (indexFound) return indexFound;
    }
  }

  return null;
}

/**
 * Box 내에서 커서 위치 계산
 * offset에 해당하는 x 좌표 반환
 */
export function getCursorXPosition(hbox: HBox, offset: number): number {
  if (offset === 0) {
    return hbox.x;
  }

  let x = hbox.x;
  const maxOffset = Math.min(offset, hbox.children.length);

  for (let i = 0; i < maxOffset; i++) {
    x += hbox.children[i].width;
  }

  return x;
}
