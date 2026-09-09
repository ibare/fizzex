/**
 * SvgSurface 계약 테스트.
 *
 * Projector 는 Canvas 의 상태 기계 시맨틱을 전제로 그린다 — transform 은 누적이고,
 * save/restore 는 그 사이의 변경을 되돌린다. 여기서 어긋나면 적분 기호의 기울임과
 * 확장 구분자의 위치가 조용히 틀어진다.
 */

import { describe, it, expect } from 'vitest';
import { SvgSurface } from './svg-surface.js';
import type { MathFont } from './types.js';

const stubFont: MathFont = {
  unitsPerEm: 1000,
  charToGlyph: () => ({
    advanceWidth: 500,
    getPath: () => ({ toPathData: () => 'M0 0L10 10Z' }),
  }),
};

const surface = (): SvgSurface => new SvgSurface(stubFont);

describe('SvgSurface — 변환', () => {
  it('transform 은 누적된다', () => {
    const s = surface();
    s.transform(2, 0, 0, 2, 0, 0);
    s.transform(1, 0, 0, 1, 5, 5);
    s.fillRect(0, 0, 1, 1);

    // 스케일 2 가 이동에도 적용돼야 한다: translate(5,5) 가 (10,10) 으로 확대된다
    expect(s.toElements()[0]).toContain('matrix(2 0 0 2 10 10)');
  });

  it('항등 변환에는 transform 속성을 붙이지 않는다', () => {
    const s = surface();
    s.fillRect(0, 0, 1, 1);
    expect(s.toElements()[0]).not.toContain('transform');
  });

  it('restore 가 transform 을 되돌린다', () => {
    const s = surface();
    s.save();
    s.transform(1, 0, -0.21, 1, 0, 0); // 적분 기호 skew
    s.restore();
    s.fillRect(0, 0, 1, 1);
    expect(s.toElements()[0]).not.toContain('transform');
  });

  it('save 는 행렬 복사본을 쌓는다 — 이후 transform 이 스택 아래를 오염시키지 않는다', () => {
    const s = surface();
    s.transform(2, 0, 0, 2, 0, 0);
    s.save();
    s.transform(3, 0, 0, 3, 0, 0);
    s.restore();
    s.fillRect(0, 0, 1, 1);
    // 참조를 공유했다면 여기서 6 이 된다
    expect(s.toElements()[0]).toContain('matrix(2 0 0 2 0 0)');
  });
});

describe('SvgSurface — 요소 출력', () => {
  it('fillText 가 글리프 윤곽선을 path 로 낸다', () => {
    const s = surface();
    s.setFont('20px serif');
    s.setFillStyle('#123456');
    s.fillText('ab', 0, 0);

    const els = s.toElements();
    expect(els).toHaveLength(2); // 글자마다 하나
    expect(els[0]).toBe('<path d="M0 0L10 10Z" fill="#123456"/>');
    expect(els.every((e) => e.startsWith('<path'))).toBe(true);
    // <text> 로 내보내면 폰트 임베딩에 의존하게 된다
    expect(els.some((e) => e.includes('<text'))).toBe(false);
  });

  it('italic 폰트에는 baseline 을 축으로 한 합성 기울임을 붙인다', () => {
    // toMathItalic 이 매핑하지 못하는 문자(ℏ 등)는 italic 인 채로 내려온다.
    // Canvas 는 이때 폰트 합성 기울임으로 그리므로 SVG 도 같아야 한다.
    const s = surface();
    s.setFont('italic 20px serif');
    s.fillText('x', 0, 10);

    const el = s.toElements()[0];
    expect(el).toContain('matrix(1 0 -0.21 1 2.1 0)'); // 0.21 * y = 2.1
  });

  it('기울임은 그 요소에만 붙고 다음 요소로 새지 않는다', () => {
    const s = surface();
    s.setFont('italic 20px serif');
    s.fillText('x', 0, 10);
    s.setFont('20px serif');
    s.fillText('y', 0, 10);

    expect(s.toElements()[0]).toContain('matrix');
    expect(s.toElements()[1]).not.toContain('matrix');
  });

  it('기울임이 기존 변환 위에 곱해진다', () => {
    const s = surface();
    s.transform(2, 0, 0, 2, 0, 0);
    s.setFont('italic 20px serif');
    s.fillText('x', 0, 0);

    // 스케일 2 가 기울기에도 적용된다
    expect(s.toElements()[0]).toContain('matrix(2 0 -0.42 2 0 0)');
  });

  it('setFont 없이 부른 fillText 는 아무것도 내지 않는다', () => {
    const s = surface();
    s.fillText('x', 0, 0);
    expect(s.toElements()).toEqual([]);
  });

  it('경로 커맨드를 d 문자열로 직렬화한다', () => {
    const s = surface();
    s.beginPath();
    s.moveTo(1, 2);
    s.lineTo(3, 4);
    s.quadraticCurveTo(5, 6, 7, 8);
    s.bezierCurveTo(9, 10, 11, 12, 13, 14);
    s.closePath();
    s.fill();

    expect(s.toElements()[0]).toContain('d="M1 2L3 4Q5 6 7 8C9 10 11 12 13 14Z"');
  });

  it('stroke 는 fill 을 비우고 선 속성을 붙인다', () => {
    const s = surface();
    s.setStrokeStyle('#f00');
    s.setLineWidth(2);
    s.setLineDash([3, 1]);
    s.beginPath();
    s.moveTo(0, 0);
    s.lineTo(1, 1);
    s.stroke();

    const el = s.toElements()[0];
    expect(el).toContain('fill="none"');
    expect(el).toContain('stroke="#f00"');
    expect(el).toContain('stroke-width="2"');
    expect(el).toContain('stroke-dasharray="3 1"');
  });

  it('빈 경로는 요소를 내지 않는다', () => {
    const s = surface();
    s.beginPath();
    s.fill();
    s.stroke();
    expect(s.toElements()).toEqual([]);
  });

  it('globalAlpha 를 opacity 로 옮기고, 1 이면 생략한다', () => {
    const s = surface();
    s.setGlobalAlpha(0.5);
    s.fillRect(0, 0, 1, 1);
    s.setGlobalAlpha(1);
    s.fillRect(0, 0, 1, 1);

    expect(s.toElements()[0]).toContain('opacity="0.5"');
    expect(s.toElements()[1]).not.toContain('opacity');
    expect(s.getGlobalAlpha()).toBe(1);
  });

  it('색상 문자열을 이스케이프한다', () => {
    const s = surface();
    s.setFillStyle('"><script>x</script>');
    s.fillRect(0, 0, 1, 1);
    const el = s.toElements()[0];
    expect(el).not.toContain('<script>');
    expect(el).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('좌표를 고정 소수로 줄인다 — 지수 표기가 섞이지 않는다', () => {
    const s = surface();
    s.beginPath();
    s.moveTo(0.000001, 1.23456);
    s.lineTo(1, 1);
    s.fill();
    const el = s.toElements()[0];
    expect(el).toContain('M0 1.23');
    expect(el).not.toMatch(/e-\d/);
  });

  it('toElements 는 복사본을 준다', () => {
    const s = surface();
    s.fillRect(0, 0, 1, 1);
    s.toElements().push('<injected/>');
    expect(s.toElements()).toHaveLength(1);
  });
});
