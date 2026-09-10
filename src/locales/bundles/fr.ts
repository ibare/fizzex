/**
 * `fr` 로케일 번들 — 배선만 하는 파일이다.
 *
 * 이 모듈은 **동적 import 로만 닿아야 한다** (`loadLocale('fr')`).
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

import ui from '../data/ui/fr.json' with { type: 'json' };
import layer1 from '../../analyzer/semantic/data/layer1/fr.json' with { type: 'json' };
import layer2 from '../../analyzer/semantic/data/layer2/fr.json' with { type: 'json' };
import fallback from '../../analyzer/semantic/data/fallback/fr.json' with { type: 'json' };
import chemicalElements from '../../analyzer/semantic/data/elements/fr.json' with { type: 'json' };
import form from '../../analyzer/semantic/data/form/fr.json' with { type: 'json' };
import ElementaryGeometry from '../../analyzer/semantic/data/catalog/fr/elementary-geometry.json' with { type: 'json' };
import SolidGeometry from '../../analyzer/semantic/data/catalog/fr/solid-geometry.json' with { type: 'json' };
import LinearFunctions from '../../analyzer/semantic/data/catalog/fr/linear-functions.json' with { type: 'json' };
import RatioProportion from '../../analyzer/semantic/data/catalog/fr/ratio-proportion.json' with { type: 'json' };
import BasicStatistics from '../../analyzer/semantic/data/catalog/fr/basic-statistics.json' with { type: 'json' };
import TrigonometryBasic from '../../analyzer/semantic/data/catalog/fr/trigonometry-basic.json' with { type: 'json' };
import Algebra from '../../analyzer/semantic/data/catalog/fr/algebra.json' with { type: 'json' };
import Calculus from '../../analyzer/semantic/data/catalog/fr/calculus.json' with { type: 'json' };
import Geometry from '../../analyzer/semantic/data/catalog/fr/geometry.json' with { type: 'json' };
import NumberTheory from '../../analyzer/semantic/data/catalog/fr/number-theory.json' with { type: 'json' };
import Logic from '../../analyzer/semantic/data/catalog/fr/logic.json' with { type: 'json' };
import Physics from '../../analyzer/semantic/data/catalog/fr/physics.json' with { type: 'json' };
import Astronomy from '../../analyzer/semantic/data/catalog/fr/astronomy.json' with { type: 'json' };
import Chemistry from '../../analyzer/semantic/data/catalog/fr/chemistry.json' with { type: 'json' };
import Biology from '../../analyzer/semantic/data/catalog/fr/biology.json' with { type: 'json' };
import Electrical from '../../analyzer/semantic/data/catalog/fr/electrical.json' with { type: 'json' };
import Mechanical from '../../analyzer/semantic/data/catalog/fr/mechanical.json' with { type: 'json' };
import Signal from '../../analyzer/semantic/data/catalog/fr/signal.json' with { type: 'json' };
import Economics from '../../analyzer/semantic/data/catalog/fr/economics.json' with { type: 'json' };
import Finance from '../../analyzer/semantic/data/catalog/fr/finance.json' with { type: 'json' };
import Statistics from '../../analyzer/semantic/data/catalog/fr/statistics.json' with { type: 'json' };
import Cs from '../../analyzer/semantic/data/catalog/fr/cs.json' with { type: 'json' };
import Ml from '../../analyzer/semantic/data/catalog/fr/ml.json' with { type: 'json' };
import Information from '../../analyzer/semantic/data/catalog/fr/information.json' with { type: 'json' };
import SocialScience from '../../analyzer/semantic/data/catalog/fr/social-science.json' with { type: 'json' };

const bundle: LocaleBundle = {
  locale: 'fr',
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
