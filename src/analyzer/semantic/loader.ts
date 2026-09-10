/**
 * 의미 데이터 로더
 *
 * JSON 데이터를 정적 import로 번들에 포함시키고,
 * locale별 접근 인터페이스를 제공한다.
 */

import type {
  CatalogIndexEntry,
  CatalogDetail,
  FormEntry,
  FormText,
  FormVisualizerRef,
} from './types.js';

// 번들 포함 (항상 로드) — 한국어 기본
import koLayer1 from './data/layer1/ko.json' with { type: 'json' };
import koLayer2 from './data/layer2/ko.json' with { type: 'json' };
import koFallback from './data/fallback/ko.json' with { type: 'json' };

// 카탈로그 인덱스 (번들 포함)
import catalogIndex from './data/catalog/index.json' with { type: 'json' };
import formIndex from './data/form/index.json' with { type: 'json' };
import formKo from './data/form/ko.json' with { type: 'json' };

// 카탈로그 상세 (번들 포함 — 25분야)
// 초중등
import koElementaryGeometry from './data/catalog/ko/elementary-geometry.json' with { type: 'json' };
import koSolidGeometry from './data/catalog/ko/solid-geometry.json' with { type: 'json' };
import koLinearFunctions from './data/catalog/ko/linear-functions.json' with { type: 'json' };
import koRatioProportion from './data/catalog/ko/ratio-proportion.json' with { type: 'json' };
import koBasicStatistics from './data/catalog/ko/basic-statistics.json' with { type: 'json' };
import koTrigonometryBasic from './data/catalog/ko/trigonometry-basic.json' with { type: 'json' };
// 수학 기초
import koAlgebra from './data/catalog/ko/algebra.json' with { type: 'json' };
import koCalculus from './data/catalog/ko/calculus.json' with { type: 'json' };
import koGeometry from './data/catalog/ko/geometry.json' with { type: 'json' };
import koNumberTheory from './data/catalog/ko/number-theory.json' with { type: 'json' };
import koLogic from './data/catalog/ko/logic.json' with { type: 'json' };
// 자연과학
import koPhysics from './data/catalog/ko/physics.json' with { type: 'json' };
import koAstronomy from './data/catalog/ko/astronomy.json' with { type: 'json' };
import koChemistry from './data/catalog/ko/chemistry.json' with { type: 'json' };
import koBiology from './data/catalog/ko/biology.json' with { type: 'json' };
// 공학
import koElectrical from './data/catalog/ko/electrical.json' with { type: 'json' };
import koMechanical from './data/catalog/ko/mechanical.json' with { type: 'json' };
import koSignal from './data/catalog/ko/signal.json' with { type: 'json' };
// 경제/금융
import koEconomics from './data/catalog/ko/economics.json' with { type: 'json' };
import koFinance from './data/catalog/ko/finance.json' with { type: 'json' };
// 통계/확률
import koStatistics from './data/catalog/ko/statistics.json' with { type: 'json' };
// 정보/AI
import koCs from './data/catalog/ko/cs.json' with { type: 'json' };
import koMl from './data/catalog/ko/ml.json' with { type: 'json' };
import koInformation from './data/catalog/ko/information.json' with { type: 'json' };
// 사회과학
import koSocialScience from './data/catalog/ko/social-science.json' with { type: 'json' };

// ─── 타입 ───

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

export interface SemanticTexts {
  layer1: Record<string, Layer1TextEntry>;
  layer2: Record<string, Layer2TextEntry>;
  fallback: FallbackTexts;
}

// ─── 캐시 ───

const textCache = new Map<string, SemanticTexts>();

// ─── public API ───

/**
 * 현재 locale의 텍스트 데이터를 반환한다.
 * 번들에 포함된 한국어 데이터는 동기적으로 즉시 반환.
 */
export function getSemanticTexts(locale = 'ko'): SemanticTexts {
  const cached = textCache.get(locale);
  if (cached) return cached;

  if (locale === 'ko') {
    const texts: SemanticTexts = {
      layer1: koLayer1 as Record<string, Layer1TextEntry>,
      layer2: koLayer2 as Record<string, Layer2TextEntry>,
      fallback: koFallback as FallbackTexts,
    };
    textCache.set('ko', texts);
    return texts;
  }

  // 다른 locale은 아직 지원하지 않음 — 한국어 폴백
  return getSemanticTexts('ko');
}

// ─── 카탈로그 ───

/** 카탈로그 상세 데이터 캐시 (카테고리별) */
const catalogDetailCache = new Map<string, Record<string, CatalogDetail>>();

/** 전체 카탈로그 상세 (25분야 통합) */
const allKoCatalogDetails: Record<string, Record<string, CatalogDetail>> = {
  // 초중등
  'elementary-geometry': koElementaryGeometry as Record<string, CatalogDetail>,
  'solid-geometry': koSolidGeometry as Record<string, CatalogDetail>,
  'linear-functions': koLinearFunctions as Record<string, CatalogDetail>,
  'ratio-proportion': koRatioProportion as Record<string, CatalogDetail>,
  'basic-statistics': koBasicStatistics as Record<string, CatalogDetail>,
  'trigonometry-basic': koTrigonometryBasic as Record<string, CatalogDetail>,
  // 수학 기초
  algebra: koAlgebra as Record<string, CatalogDetail>,
  calculus: koCalculus as Record<string, CatalogDetail>,
  geometry: koGeometry as Record<string, CatalogDetail>,
  'number-theory': koNumberTheory as Record<string, CatalogDetail>,
  logic: koLogic as Record<string, CatalogDetail>,
  // 자연과학
  physics: koPhysics as Record<string, CatalogDetail>,
  astronomy: koAstronomy as Record<string, CatalogDetail>,
  chemistry: koChemistry as Record<string, CatalogDetail>,
  biology: koBiology as Record<string, CatalogDetail>,
  // 공학
  electrical: koElectrical as Record<string, CatalogDetail>,
  mechanical: koMechanical as Record<string, CatalogDetail>,
  signal: koSignal as Record<string, CatalogDetail>,
  // 경제/금융
  economics: koEconomics as Record<string, CatalogDetail>,
  finance: koFinance as Record<string, CatalogDetail>,
  // 통계/확률
  statistics: koStatistics as Record<string, CatalogDetail>,
  // 정보/AI
  cs: koCs as Record<string, CatalogDetail>,
  ml: koMl as Record<string, CatalogDetail>,
  information: koInformation as Record<string, CatalogDetail>,
  // 사회과학
  'social-science': koSocialScience as Record<string, CatalogDetail>,
};

/**
 * 카탈로그 인덱스를 반환한다 (번들에 포함, 동기).
 */
export function getCatalogIndex(): CatalogIndexEntry[] {
  return catalogIndex.entries as CatalogIndexEntry[];
}

/**
 * 카탈로그 ID에서 연결된 Visualizer 참조 목록을 조회한다.
 * 동일 수식에 여러 시각화 관점이 붙을 수 있으므로 항상 배열로 반환한다.
 * 등록이 없으면 빈 배열.
 */
/**
 * 형식 목록. 번들에 정적으로 박히며 런타임 검증은 하지 않는다
 * (`validator/` 는 빌드·테스트 시점 전용).
 */
export function getFormIndex(): FormEntry[] {
  return formIndex.forms as FormEntry[];
}

/** 형식 텍스트 (로케일별). */
export function getFormText(locale = 'ko'): Record<string, FormText> {
  void locale;
  return formKo as Record<string, FormText>;
}

/**
 * 형식이 소유한 시각화 참조.
 * 카탈로그 항목이 아니라 **형식**이 시각화의 앵커다 — 이름 없는 사례도
 * 형식 사례이면 같은 시각화를 받는다.
 */
export function getVisualizersForForm(formId: string): FormVisualizerRef[] {
  return getFormIndex().find((f) => f.id === formId)?.visualizers ?? [];
}

/** 형식 텍스트 한 건. */
export function getFormEntry(formId: string): FormEntry | null {
  return getFormIndex().find((f) => f.id === formId) ?? null;
}

/**
 * 카탈로그 상세 데이터를 반환한다 (동기, 번들 포함).
 */
export function getCatalogDetail(
  catalogId: string,
  category: string,
  _locale = 'ko',
): CatalogDetail | null {
  const cacheKey = `${_locale}:${category}`;
  let categoryData = catalogDetailCache.get(cacheKey);

  if (!categoryData) {
    categoryData = allKoCatalogDetails[category];
    if (categoryData) {
      catalogDetailCache.set(cacheKey, categoryData);
    }
  }

  return categoryData?.[catalogId] ?? null;
}
