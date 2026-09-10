/**
 * `ja` 로케일 번들 — 배선만 하는 파일이다.
 *
 * 이 모듈은 **동적 import 로만 닿아야 한다** (`loadLocale('ja')`).
 * 어디선가 정적으로 import 하면 이 언어가 통째로 번들에 실린다.
 *
 * 각 JSON 에 타입을 붙이는 이유: JSON import 는 리터럴 타입을 좁히지 않아
 * `kind: "constant"` 가 `string` 으로 추론된다. 여기서 한 번 좁혀 준다.
 */

import type { LocaleBundle, UiTexts } from '../types.js';
import type { CatalogDetail, FormText } from '../../analyzer/semantic/types.js';
import type {
  Layer1TextEntry,
  Layer2TextEntry,
  FallbackTexts,
  ChemicalElementTexts,
} from '../../analyzer/semantic/text-types.js';

import ui from '../data/ui/ja.json' with { type: 'json' };
import layer1 from '../../analyzer/semantic/data/layer1/ja.json' with { type: 'json' };
import layer2 from '../../analyzer/semantic/data/layer2/ja.json' with { type: 'json' };
import fallback from '../../analyzer/semantic/data/fallback/ja.json' with { type: 'json' };
import chemicalElements from '../../analyzer/semantic/data/elements/ja.json' with { type: 'json' };
import form from '../../analyzer/semantic/data/form/ja.json' with { type: 'json' };
import ElementaryGeometry from '../../analyzer/semantic/data/catalog/ja/elementary-geometry.json' with { type: 'json' };
import SolidGeometry from '../../analyzer/semantic/data/catalog/ja/solid-geometry.json' with { type: 'json' };
import LinearFunctions from '../../analyzer/semantic/data/catalog/ja/linear-functions.json' with { type: 'json' };
import RatioProportion from '../../analyzer/semantic/data/catalog/ja/ratio-proportion.json' with { type: 'json' };
import BasicStatistics from '../../analyzer/semantic/data/catalog/ja/basic-statistics.json' with { type: 'json' };
import TrigonometryBasic from '../../analyzer/semantic/data/catalog/ja/trigonometry-basic.json' with { type: 'json' };
import Algebra from '../../analyzer/semantic/data/catalog/ja/algebra.json' with { type: 'json' };
import Calculus from '../../analyzer/semantic/data/catalog/ja/calculus.json' with { type: 'json' };
import Geometry from '../../analyzer/semantic/data/catalog/ja/geometry.json' with { type: 'json' };
import NumberTheory from '../../analyzer/semantic/data/catalog/ja/number-theory.json' with { type: 'json' };
import Logic from '../../analyzer/semantic/data/catalog/ja/logic.json' with { type: 'json' };
import Physics from '../../analyzer/semantic/data/catalog/ja/physics.json' with { type: 'json' };
import Astronomy from '../../analyzer/semantic/data/catalog/ja/astronomy.json' with { type: 'json' };
import Chemistry from '../../analyzer/semantic/data/catalog/ja/chemistry.json' with { type: 'json' };
import Biology from '../../analyzer/semantic/data/catalog/ja/biology.json' with { type: 'json' };
import Electrical from '../../analyzer/semantic/data/catalog/ja/electrical.json' with { type: 'json' };
import Mechanical from '../../analyzer/semantic/data/catalog/ja/mechanical.json' with { type: 'json' };
import Signal from '../../analyzer/semantic/data/catalog/ja/signal.json' with { type: 'json' };
import Economics from '../../analyzer/semantic/data/catalog/ja/economics.json' with { type: 'json' };
import Finance from '../../analyzer/semantic/data/catalog/ja/finance.json' with { type: 'json' };
import Statistics from '../../analyzer/semantic/data/catalog/ja/statistics.json' with { type: 'json' };
import Cs from '../../analyzer/semantic/data/catalog/ja/cs.json' with { type: 'json' };
import Ml from '../../analyzer/semantic/data/catalog/ja/ml.json' with { type: 'json' };
import Information from '../../analyzer/semantic/data/catalog/ja/information.json' with { type: 'json' };
import SocialScience from '../../analyzer/semantic/data/catalog/ja/social-science.json' with { type: 'json' };

const bundle: LocaleBundle = {
  locale: 'ja',
  ui: ui as UiTexts,
  semantic: {
    layer1: layer1 as Record<string, Layer1TextEntry>,
    layer2: layer2 as Record<string, Layer2TextEntry>,
    fallback: fallback as FallbackTexts,
    chemicalElements: chemicalElements as ChemicalElementTexts,
    form: form as Record<string, FormText>,
    catalog: {
      'elementary-geometry': ElementaryGeometry as Record<string, CatalogDetail>,
      'solid-geometry': SolidGeometry as Record<string, CatalogDetail>,
      'linear-functions': LinearFunctions as Record<string, CatalogDetail>,
      'ratio-proportion': RatioProportion as Record<string, CatalogDetail>,
      'basic-statistics': BasicStatistics as Record<string, CatalogDetail>,
      'trigonometry-basic': TrigonometryBasic as Record<string, CatalogDetail>,
      algebra: Algebra as Record<string, CatalogDetail>,
      calculus: Calculus as Record<string, CatalogDetail>,
      geometry: Geometry as Record<string, CatalogDetail>,
      'number-theory': NumberTheory as Record<string, CatalogDetail>,
      logic: Logic as Record<string, CatalogDetail>,
      physics: Physics as Record<string, CatalogDetail>,
      astronomy: Astronomy as Record<string, CatalogDetail>,
      chemistry: Chemistry as Record<string, CatalogDetail>,
      biology: Biology as Record<string, CatalogDetail>,
      electrical: Electrical as Record<string, CatalogDetail>,
      mechanical: Mechanical as Record<string, CatalogDetail>,
      signal: Signal as Record<string, CatalogDetail>,
      economics: Economics as Record<string, CatalogDetail>,
      finance: Finance as Record<string, CatalogDetail>,
      statistics: Statistics as Record<string, CatalogDetail>,
      cs: Cs as Record<string, CatalogDetail>,
      ml: Ml as Record<string, CatalogDetail>,
      information: Information as Record<string, CatalogDetail>,
      'social-science': SocialScience as Record<string, CatalogDetail>,
    },
  },
};

export default bundle;
