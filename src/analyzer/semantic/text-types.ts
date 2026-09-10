/**
 * 의미 텍스트의 타입
 *
 * **데이터를 물지 않는다.** 로케일 번들(`src/locales/`)이 이 타입을 참조하는데,
 * 타입이 JSON 을 정적 import 하는 파일 안에 있으면 번들 모듈이 한국어 데이터를
 * 통째로 끌고 온다 — `import type` 도 import 그래프에 잡히기 때문이다.
 * 그래서 타입만 여기 따로 둔다.
 */

export interface Layer1TextEntry {
  role: string;
  description: string;
  refinements?: Record<string, string>;
}

export interface Layer2TextEntry {
  role: string | null;
  description: string;
}

/**
 * 화학식 어휘 키.
 *
 * 화학식 안에서만 쓰는 말이다. 같은 노드라도 화학식 밖에서는 다른 뜻이므로
 * (위첨자 = 지수 vs 전하) `roles` 와 섞지 않고 별도 섹션으로 둔다.
 */
export type ChemTextKey =
  | 'formula' // 화학식 전체
  | 'equation' // 반응 화살표가 있는 반응식
  | 'species' // 화학종 한 덩어리
  | 'element' // 원소 기호
  | 'group' // 괄호로 묶인 원자단
  | 'coefficient' // 반응식의 계수
  | 'count' // 원자 수 (아래첨자)
  | 'charge' // 전하 크기 (위첨자)
  | 'chargeSign' // 전하 부호
  | 'massNumber' // 질량수 (왼쪽 위첨자)
  | 'atomicNumber' // 원자 번호 (왼쪽 아래첨자)
  | 'arrow' // 반응 화살표
  | 'equilibriumArrow' // 가역 반응 화살표
  | 'condition' // 촉매·온도 등 반응 조건
  | 'plus' // 화학종 구분
  | 'hydrate' // 수화물 결합점
  | 'state' // 상태 표기
  | 'gas' // 기체 발생
  | 'precipitate'; // 침전

export interface FallbackTexts {
  roles: Record<string, string>;
  descriptions: Record<string, string>;
  specialVariables: Record<string, string>;
  operators: Record<string, string>;
  functions: Record<string, string>;
  accents: Record<string, { role: string; description: string }>;
  defaultAccent: { role: string; description: string };
  /** 첨자는 슬롯 조합에 따라 의미가 다르다 — node.type 만으로 구분할 수 없다 */
  scripts: Record<
    'superscriptOnly' | 'subscriptOnly' | 'both' | 'withLeft',
    { role: string; description: string }
  >;
  /** 화학식 안에서만 쓰는 어휘 — chem-semantics.ts 가 소비한다 */
  chem: Record<ChemTextKey, { role: string; description: string }>;
  defaultOperator: string;
  defaultFunction: string;
}

/** 화학 원소 하나의 설명 */
export interface ChemicalElement {
  /** 원소 이름 (대한화학회 표기) */
  name: string;
  /** 원자 번호 */
  z: number;
  /** 한 줄 설명 */
  desc: string;
}

/** 화학 원소 이름표 */
export interface ChemicalElementTexts {
  /** 설명 문장 형식 — `{z}` 와 `{desc}` 를 치환한다 */
  descriptionFormat: string;
  /** 원소 기호 → 설명 */
  bySymbol: Record<string, ChemicalElement>;
}

export interface SemanticTexts {
  layer1: Record<string, Layer1TextEntry>;
  layer2: Record<string, Layer2TextEntry>;
  fallback: FallbackTexts;
  chemicalElements: ChemicalElementTexts;
}
