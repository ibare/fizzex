/**
 * 화학식 의미 해석 테스트
 *
 * 화학식 안의 기호가 수학 어휘로 설명되던 것이 이 계층의 존재 이유다.
 * 회귀하면 전하가 "거듭제곱에서 곱하는 횟수" 로 돌아간다.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseLatex } from '../../latex/latex-parser.js';
import { buildSemanticMap } from './engine.js';
import { loadLocale, setLocale } from '../../locales/registry.js';

// 이 파일은 한국어 설명을 기대한다. 기본 언어는 영어이므로 명시적으로 받아 둔다 —
// 덤으로 로케일 로딩이 실제로 동작하는지도 함께 검증된다.
beforeAll(async () => {
  await loadLocale('ko');
  setLocale('ko');
});


/** 수식 안의 모든 역할 이름 */
function roles(latex: string): string[] {
  const { ast } = parseLatex(latex);
  return [...buildSemanticMap(ast).values()].map((r) => r.role);
}

/** 특정 역할의 설명 */
function describeRole(latex: string, role: string): string | undefined {
  const { ast } = parseLatex(latex);
  return [...buildSemanticMap(ast).values()].find((r) => r.role === role)?.description;
}

describe('화학식 의미 해석', () => {
  it('수식 전체와 화학식 노드가 화학식으로 설명된다', () => {
    expect(roles('\\ce{H2O}')).toContain('화학식');
    expect(roles('\\ce{2H2 + O2 -> 2H2O}')).toContain('화학 반응식');
  });

  it('위첨자는 지수가 아니라 전하다', () => {
    const r = roles('\\ce{SO4^2-}');

    expect(r).toContain('전하');
    expect(r).toContain('전하 부호');
    expect(r).not.toContain('지수');
    expect(describeRole('\\ce{SO4^2-}', '전하')).not.toContain('거듭제곱');
  });

  it('아래첨자는 인덱스가 아니라 원자 수다', () => {
    const r = roles('\\ce{H2O}');

    expect(r).toContain('원자 수');
    expect(r).toContain('수소');
    expect(r).not.toContain('인덱스');
    expect(r).not.toContain('인덱싱 대상');
  });

  it('앞첨자는 질량수와 원자 번호다', () => {
    const r = roles('\\ce{^{227}_{90}Th}');

    expect(r).toContain('질량수');
    expect(r).toContain('원자 번호');
    // 밑이 "거듭제곱에서 반복 곱해지는 대상" 이던 자리
    expect(r).toContain('토륨');
    expect(r).not.toContain('밑');
  });

  it('본문의 + 는 덧셈이 아니고 앞의 숫자는 계수다', () => {
    const r = roles('\\ce{2H2 + O2 -> 2H2O}');

    expect(r).toContain('화학종 구분');
    expect(r).toContain('계수');
    expect(r).toContain('반응 화살표');
    expect(r).not.toContain('연산자');
  });

  it('평형 화살표와 반응 조건을 구분한다', () => {
    const r = roles('\\ce{N2 + 3H2 <=>[Fe] 2NH3}');

    expect(r).toContain('가역 반응');
    expect(r).toContain('반응 조건');
  });

  it('상태·침전·기체·수화물을 읽는다', () => {
    expect(roles('\\ce{NaCl (aq)}')).toContain('상태');
    expect(roles('\\ce{BaSO4 v}')).toContain('침전');
    expect(roles('\\ce{H2 ^}')).toContain('기체 발생');
    expect(roles('\\ce{CuSO4 * 5H2O}')).toContain('수화물 결합');
  });

  it('괄호로 묶인 원자단을 원소와 구분한다', () => {
    expect(roles('\\ce{Ca(OH)2}')).toContain('원자단');
  });

  it('괄호 안에 수학 어휘가 새지 않는다', () => {
    // 괄호를 감싼 row 가 layer1 의 paren.content 로 흘러 "묶음" 을 받던 자리
    expect(roles('\\ce{Ca(OH)2}')).not.toContain('묶음');
    expect(roles('\\ce{NaCl (aq)}')).not.toContain('묶음');
  });

  it('화학식 밖의 수식은 평소의 수학 어휘로 설명한다', () => {
    const r = roles('x^2');

    expect(r).toContain('지수');
    expect(r).not.toContain('전하');
  });

  it('화학식 안에 끼워 넣은 수식 조각은 수학으로 흘려보낸다', () => {
    // 화학 어휘로 설명할 수 없는 노드는 null 을 내 아래 레이어로 간다
    const r = roles('\\ce{$\\frac{a}{b}$ -> B}');

    expect(r).toContain('분자');
    expect(r).toContain('분모');
  });
});

describe('원소 이름', () => {
  it('원소 기호가 실제 이름으로 설명된다', () => {
    const r = roles('\\ce{H2O}');

    expect(r).toContain('수소');
    expect(r).toContain('산소');
    // "원소" 라고만 나오던 자리다
    expect(r).not.toContain('원소');
  });

  it('설명에 원자 번호가 들어간다', () => {
    expect(describeRole('\\ce{H2O}', '수소')).toMatch(/^원자번호 1\./);
    expect(describeRole('\\ce{CuSO4}', '구리')).toMatch(/^원자번호 29\./);
  });

  it('두 글자 기호도 찾는다', () => {
    expect(roles('\\ce{Ca(OH)2}')).toContain('칼슘');
    expect(roles('\\ce{^{227}_{90}Th}')).toContain('토륨');
  });

  it('괄호 안의 원소도 이름이 나온다', () => {
    // 본문·첨자의 밑·괄호 안 셋이 모두 같은 자리로 수렴한다
    const r = roles('\\ce{Ca(OH)2}');

    expect(r).toContain('산소');
    expect(r).toContain('수소');
  });

  it('주기율표에 없는 기호는 일반 설명으로 돌아간다', () => {
    // 파서는 주기율표 없이 [A-Z][a-z]* 형태로만 자른다
    const r = roles('\\ce{Xy2}');

    expect(r).toContain('원소');
  });

  it('화학식 밖의 글자는 원소로 읽지 않는다', () => {
    expect(roles('\\text{H}')).not.toContain('수소');
  });
});
