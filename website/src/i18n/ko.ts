import type { Dictionary } from './types';

export const ko: Dictionary = {
  nav: {
    home: '홈',
    docs: '문서',
    demo: '데모',
    github: 'GitHub',
  },
  hero: {
    headline: '웹에서 수식은\n쉬워야 합니다.',
    sub: 'Canvas 기반 수식 표현 플랫폼. 편집, 파싱, 분석, 연산, 시각화까지 — 수학 학습의 허들을 낮추기 위해 만든 하나의 경량 패키지.',
    install: 'npm install fizzex',
    cta_start: '시작하기',
    cta_github: 'GitHub',
  },
  problem: {
    title: '왜 Fizzex인가?',
    sub: '기존 도구들은 문제의 일부만 해결합니다. Fizzex는 전체를 해결합니다.',
    current_title: '현재의 풍경',
    current_items: [
      'KaTeX와 MathJax는 렌더링만 할 뿐, 수식을 이해하지 못합니다',
      'MathLive는 편집을 지원하지만, 분석이나 연산은 없습니다',
      '시각화를 위해서는 또 다른 라이브러리가 필요합니다',
      '하나의 수학 경험을 위해 4~5개 라이브러리를 조합해야 합니다',
      'DOM 기반 렌더링은 인터랙션의 가능성을 제한합니다',
    ],
    fizzex_title: 'Fizzex와 함께라면',
    fizzex_items: [
      '편집부터 시각화까지, 하나의 import로 완전한 파이프라인',
      'TeX 품질의 Box 모델 레이아웃으로 Canvas 렌더링',
      '수식을 이해하는 내장 분석 엔진',
      '통합 CAS: 간소화, 풀이, 미분, 적분',
      '수식 분석 기반 자동 시각화 추천',
    ],
  },
  pipeline: {
    title: '하나의 라이브러리, 완전한 파이프라인',
    sub: 'LaTeX 입력부터 인터랙티브 시각화까지 — 깔끔하고 테스트 가능한 파이프라인.',
    steps: {
      input: { label: '입력', desc: 'LaTeX 문자열 또는 키보드 기반 에디터' },
      parse: { label: '파싱', desc: 'LaTeX-AST 양방향 변환, 400개+ 명령어' },
      analyze: { label: '분석', desc: '도메인 감지, 변수 분류, 특성 추출' },
      compute: { label: '연산', desc: '간소화, 전개, 인수분해, 풀이, 미분, 적분' },
      visualize: { label: '시각화', desc: '함수 그래프, 단위원, 수직선, 극좌표 그래프' },
    },
  },
  features: {
    title: '웹 수식에 필요한 모든 것',
    sub: '입력부터 시각화까지, 하나의 패키지가 전체 파이프라인을 지원합니다.',
    editor: {
      title: 'Canvas 에디터',
      desc: 'TeX의 8단계 MathStyle과 baseline 좌표계를 정밀 구현한 Box 모델 레이아웃. HiDPI 자동 지원, IME 입력 호환.',
    },
    latex: {
      title: 'LaTeX 파서',
      desc: '불완전한 입력도 최대한 렌더링하는 관대한 파서. 400개+ 명령어, LaTeX-AST 양방향 변환, 실시간 파싱에 최적화.',
    },
    analysis: {
      title: '수식 분석기',
      desc: '수학적 도메인 감지, 변수 분류, 특성 추출, 시각화 자동 추천.',
    },
    cas: {
      title: '컴퓨터 대수 시스템',
      desc: '간소화, 전개, 인수분해, 방정식 풀이, 미분, 적분 — Nerdamer 기반.',
    },
    visualization: {
      title: '자동 시각화',
      desc: '함수 그래프, 단위원, 수직선, 극좌표. 분석 기반으로 최적의 차트를 자동 선택.',
    },
    autocomplete: {
      title: '스마트 자동완성',
      desc: '커서 위치 기반 컨텍스트 인식 제안. 미적분, 기호, 구조를 적재적소에 추천.',
    },
  },
  underTheHood: {
    title: 'TeX의 기반 위에 구축',
    sub: '겉모습뿐 아니라 구조부터 TeX을 따릅니다.',
    tolerantParser: {
      title: '관대한 파서',
      desc: '잘못된 LaTeX도 깨지지 않습니다. 에러를 수집하면서 최대한 AST를 생성하고, 부분 결과를 렌더링합니다. 실시간 입력에 최적화.',
    },
    texLayout: {
      title: 'TeX 레이아웃 엔진',
      desc: 'Display/Text/Script/ScriptScript 8단계 스타일 전환, baseline 좌표계, TeX 표준 파라미터를 매직넘버 없이 준수합니다.',
    },
    modular: {
      title: '모듈형 아키텍처',
      desc: 'fizzex/headless로 프레임워크 없이, fizzex/react로 React에서, fizzex/tiptap으로 리치 에디터에서. 필요한 것만 가져오세요.',
    },
    hiFidelity: {
      title: '고품질 출력',
      desc: '수학 전용 폰트에서 추출한 베지어 곡선 글리프 렌더링. PNG 내보내기(300 DPI), HiDPI 디스플레이 자동 대응.',
    },
  },
  quickStart: {
    title: '몇 초면 시작할 수 있습니다',
    sub: '설치하고, 가져오고, 렌더링. 그게 전부입니다.',
    tabs: {
      install: '설치',
      editor: 'React 에디터',
      latex: 'LaTeX',
      analysis: '분석',
      cas: 'CAS',
      visualization: '시각화',
    },
  },
  footerCta: {
    title: '지금 Fizzex로 시작하세요',
    cta_start: '시작하기',
    cta_github: 'GitHub',
    cta_npm: 'npm',
  },
  footer: {
    tagline: '거품처럼 가볍고 쉬운 수식 입력.',
  },
  playground: {
    title: '플레이그라운드',
    sub: 'LaTeX를 입력하면 실시간으로 렌더링, 분석, 이해합니다.',
    input_label: 'LaTeX 입력',
    input_placeholder: 'LaTeX를 입력하세요... 예: x^2 + 2x - 3 = 0',
    presets_label: '프리셋',
    analyze_btn: '분석',
    analysis_empty: '수식을 입력하면 분석 결과가 표시됩니다.',
    analysis_error: '이 수식은 분석할 수 없습니다.',
    ast_btn: 'AST 보기',
    analysis: {
      domain: '도메인',
      variables: '변수',
      features: '특성',
      visualization: '시각화 가능',
      complexity: '복잡도',
      form: '형태',
    },
  },
  pipelineExplorer: {
    title: '파이프라인 탐색기',
    sub: '하나의 수식이 Fizzex 파이프라인 5단계를 거치는 과정을 따라가 보세요.',
    select_label: '수식 선택',
    steps: {
      input: { title: '입력', desc: '원본 LaTeX 문자열과 Canvas 렌더링' },
      parse: { title: '파싱', desc: '파서가 생성한 AST 구조' },
      analyze: { title: '분석', desc: 'AST에서 추출한 수학적 특성' },
      compute: { title: '연산', desc: '수식에 적용된 CAS 연산' },
      visualize: { title: '시각화', desc: '수식에 맞게 자동 선택된 시각화' },
    },
    click_to_expand: '클릭하여 펼치기',
    no_cas: '이 수식에 적용 가능한 CAS 연산이 없습니다.',
    no_viz: '이 수식에 사용 가능한 시각화가 없습니다.',
    loading: '계산 중...',
  },
  examples: {
    title: '예제 갤러리',
    sub: '수학 도메인별 수식을 탐색하세요. 렌더링을 클릭하면 Fizzex가 작동합니다.',
    render_btn: '렌더링',
    collapse_btn: '접기',
    analysis_label: '분석',
    visualization_label: '시각화',
    no_variables: '없음',
    categories: {
      polynomial: '다항식',
      trigonometric: '삼각함수',
      calculus: '미적분',
      inequality: '부등식',
      polar: '극좌표',
      structures: '행렬 & 구조',
      algebra: '대수학',
      geometry: '기하학',
      physics: '물리학',
      analysis: '해석학',
      statistics: '통계학',
      astronomy: '천문학',
      biology: '생명과학',
      finance: '금융',
      complex: '복잡한 수식',
    },
    items: {
      // polynomial
      quadratic_eq: '이차방정식',
      quadratic_function: '이차함수',
      cubic_poly: '삼차다항식',
      binomial_expansion: '이항 전개',
      vieta: '비에타의 공식',
      // trigonometric
      pythagorean_identity: '피타고라스 항등식',
      double_angle: '배각 공식',
      euler_formula: '오일러 공식',
      tangent: '탄젠트',
      // calculus
      definite_integral: '정적분',
      derivative: '도함수',
      taylor_series_basic: '테일러 급수',
      fundamental_theorem_basic: '미적분학의 기본정리',
      // inequality
      abs_value_ineq: '절댓값 부등식',
      quadratic_ineq: '이차부등식',
      triangle_ineq: '삼각부등식',
      // polar
      cardioid: '심장형 곡선',
      rose_curve: '장미 곡선',
      lemniscate: '연주형 곡선',
      // structures
      matrix_2x2: '2x2 행렬',
      determinant: '행렬식',
      piecewise: '조각 함수',
      system_of_equations: '연립방정식',
      // algebra
      euler_identity: '오일러 항등식',
      quadratic_formula: '근의 공식',
      binomial_theorem: '이항정리',
      geometric_series: '등비급수',
      diff_of_squares: '제곱의 차',
      // geometry
      pythagorean_theorem: '피타고라스 정리',
      heron_formula: '헤론의 공식',
      circle_area: '원의 넓이',
      law_of_cosines: '코사인 법칙',
      sphere_volume: '구의 부피',
      // physics
      mass_energy: '질량-에너지 등가 원리',
      newton_second: '뉴턴의 제2법칙',
      universal_gravitation: '만유인력 법칙',
      coulomb: '쿨롱 법칙',
      kinetic_energy: '운동 에너지',
      projectile_motion: '포물체 운동',
      simple_harmonic: '단순 조화 운동',
      // astronomy
      kepler_third: '케플러 제3법칙',
      // biology
      exponential_decay: '지수 감소 (반감기)',
      // finance
      compound_interest: '복리',
      // analysis
      fundamental_theorem_full: '미적분학의 기본정리',
      taylor_series_full: '테일러 급수',
      gaussian_integral: '가우스 적분',
      derivative_def: '도함수의 정의',
      chain_rule: '연쇄 법칙',
      // statistics
      bayes_theorem: '베이즈 정리',
      normal_distribution: '정규분포',
      standard_deviation: '표준편차',
      correlation_coefficient: '상관계수',
      law_of_large_numbers: '큰 수의 법칙',
      // complex
      nested_integrals_series: '중첩 적분 + 급수',
      matrix_eigenvalue: '행렬 + 지수 + 고윳값',
      variational_problem: '변분 문제',
      probability_info_theory: '확률 + 정보이론',
      renderer_stress: '렌더러 부하 테스트',
    },
  },
  comparisonPage: {
    title: '렌더링 비교',
    sub: '동일한 LaTeX를 나란히 렌더링: Fizzex (Canvas) vs KaTeX (DOM) vs MathJax (SVG).',
    render_btn: '전체 렌더링',
    fizzex_label: 'Fizzex',
    katex_label: 'KaTeX',
    mathjax_label: 'MathJax',
    latex_source: 'LaTeX',
    display_mode_display: 'Display',
    display_mode_inline: 'Inline',
    sections: {
      rendering: '렌더링',
      symbols: '심볼',
    },
    categories: {
      fractions: '분수',
      powers: '거듭제곱 & 근호',
      trig: '삼각함수',
      hyperbolic: '쌍곡선함수',
      log: '로그 & 지수',
      integrals: '적분',
      sigma: '합 & 극한',
      algebra: '대수 함수',
      sets: '집합 & 논리',
      operators: '연산자',
      complex: '복잡한 수식',
      'sym-greek': '그리스 문자',
      'sym-binary': '이항 연산자',
      'sym-relations': '관계 연산자',
      'sym-negated': '부정 관계',
      'sym-arrows': '화살표',
      'sym-delimiters': '구분 기호',
      'sym-bigops': '큰 연산자',
      'sym-accents': '수학 악센트',
      'sym-functions': '수학 함수',
      'sym-structures': '구조 명령어',
      'sym-environments': '환경',
      'sym-fonts': '글꼴 & 스타일',
      'sym-spacing': '공백 & 기타',
    },
  },
  symbolPage: {
    title: '심볼 비교',
    sub: '개별 LaTeX 심볼과 명령어를 나란히 렌더링: Fizzex vs KaTeX vs MathJax.',
    command_label: '명령어',
    fizzex_label: 'Fizzex',
    katex_label: 'KaTeX',
    mathjax_label: 'MathJax',
    items_label: '개',
    display_mode_display: 'Display',
    display_mode_inline: 'Inline',
    categories: {
      greek: '그리스 문자',
      binary: '이항 연산자',
      relations: '관계 연산자',
      negated: '부정 관계',
      arrows: '화살표',
      delimiters: '구분 기호',
      bigops: '큰 연산자',
      accents: '수학 악센트',
      functions: '수학 함수',
      structures: '구조 명령어',
      environments: '환경',
      fonts: '글꼴 & 스타일',
      spacing: '공백 & 기타',
    },
  },
  pluginSection: {
    title: '어떤 에디터에든 연결하세요',
    sub: 'Headless adapter 레이어로 최소한의 코드만으로 Fizzex를 어떤 호스트 에디터에든 통합할 수 있습니다.',
    layer_core: {
      title: '코어',
      desc: '파서, 렌더러, 분석, CAS — 완전한 수식 엔진',
    },
    layer_headless: {
      title: 'Headless Adapter',
      desc: 'DOMRendererView & DOMEditorView — 어떤 DOM 요소에든 마운트',
    },
    layer_plugins: {
      title: '호스트 플러그인',
      desc: 'Tiptap, Slate, ProseMirror — headless 위의 얇은 래퍼',
    },
    cta: '플러그인 자세히 보기',
  },
  pluginsPage: {
    title: '플러그인',
    sub: 'Headless adapter 레이어로 Fizzex를 어떤 에디터에든 통합하세요.',
    arch: {
      title: '아키텍처',
      sub: '세 개의 레이어, 명확한 관심사 분리.',
      core_title: 'fizzex (코어)',
      core_desc: 'LaTeX 파서, TeX 박스 모델 렌더러, 수식 분석기, CAS 엔진, 시각화 컴포넌트. 프레임워크 무관, DOM 의존성 없음.',
      headless_title: 'fizzex/headless',
      headless_desc: 'DOMRendererView(읽기 전용)와 DOMEditorView(편집 가능). DOM 요소를 넘기면 Canvas 설정, HiDPI 스케일링, 폰트 로딩, 렌더링 파이프라인을 모두 처리합니다.',
      plugins_title: 'fizzex/tiptap, fizzex/slate, ...',
      plugins_desc: 'Headless adapter를 특정 호스트 에디터에 연결하는 얇은 래퍼. 각 플러그인은 보통 20~30줄의 코드입니다.',
      philosophy: 'Headless 레이어가 무거운 작업을 처리하므로 플러그인 개발자는 호스트 전용 연결 코드만 작성하면 됩니다.',
    },
    api: {
      title: 'Headless API',
      sub: '두 개의 클래스로 모든 통합 요구를 충족합니다.',
      renderer_title: 'DOMRendererView',
      renderer_desc: '읽기 전용 수식 렌더링. 컨테이너 요소와 LaTeX 문자열을 전달하면 됩니다.',
      editor_title: 'DOMEditorView',
      editor_desc: '키보드 입력, 커서, IME 지원, 자동완성이 내장된 인터랙티브 수식 에디터.',
      config_title: 'FizzexConfig',
    },
    guide: {
      title: '나만의 플러그인 만들기',
      sub: '세 단계로 Fizzex를 어떤 에디터에든 통합할 수 있습니다.',
      step1_title: '1. 컨테이너 얻기',
      step1_desc: '호스트 에디터가 커스텀 노드 렌더링을 위한 DOM 요소를 제공합니다 (NodeView, Element 등).',
      step2_title: '2. 렌더러 생성',
      step2_desc: 'DOMRendererView 또는 DOMEditorView를 컨테이너와 설정으로 인스턴스화합니다.',
      step3_title: '3. 라이프사이클 관리',
      step3_desc: '데이터가 변경되면 render(), 노드가 제거되면 destroy()를 호출합니다.',
      tiptap_example: 'Tiptap 플러그인 — 전체 구현',
      outro: '이 패턴은 Slate, ProseMirror, Quill, CodeMirror 등 커스텀 노드 렌더링을 지원하는 모든 에디터에서 동일하게 작동합니다.',
    },
    demo: {
      title: 'Tiptap 라이브 데모',
      sub: 'Fizzex가 구동하는 MathInline과 MathBlock 확장이 포함된 실제 Tiptap 에디터입니다.',
      instructions: '실제 Tiptap 에디터입니다. 텍스트를 자유롭게 편집할 수 있습니다. 블록 수식을 더블클릭하면 편집할 수 있습니다.',
      tabs: { euler: '오일러 항등식', pythagorean: '피타고라스 정리' },
      contents: {
        euler: `
        <h2>오일러 항등식 — 가장 아름다운 방정식</h2>
        <p>1748년, 레온하르트 오일러는 수학에서 가장 근본적인 다섯 개의 상수 사이의 깊은 연결을 발견했습니다. 그 결과물이 바로 <strong>오일러 항등식</strong>입니다:</p>
        <div data-math-block data-latex="e^{i\\pi} + 1 = 0">e^{i\\pi} + 1 = 0</div>
        <p>이 하나의 방정식은 덧셈의 항등원 <span data-math-inline data-latex="0">0</span>, 곱셈의 항등원 <span data-math-inline data-latex="1">1</span>, 자연로그의 밑 <span data-math-inline data-latex="e">e</span>, 허수 단위 <span data-math-inline data-latex="i">i</span>, 그리고 원주율 <span data-math-inline data-latex="\\pi">\\pi</span>를 하나로 연결합니다. 수학자 벤저민 퍼스는 이 식을 "수학에서 가장 주목할 만한 공식"이라 불렀고, 물리학자 리처드 파인만은 "우리의 보석"이라 칭했습니다.</p>

        <h3>다섯 상수의 의미</h3>
        <p>이 항등식이 왜 특별한지 이해하려면, 등장하는 다섯 상수 각각이 수학의 전혀 다른 분야에서 독립적으로 태어났다는 사실을 떠올려야 합니다. <span data-math-inline data-latex="0">0</span>과 <span data-math-inline data-latex="1">1</span>은 산술의 기본 단위입니다. <span data-math-inline data-latex="\\pi">\\pi</span>는 기하학에서 — 원의 둘레와 지름의 비율로 — 등장합니다. <span data-math-inline data-latex="e">e</span>는 미적분학에서 자연스럽게 나타나는 수로, 연속 복리 성장의 극한값이기도 합니다. 마지막으로 <span data-math-inline data-latex="i">i</span>는 <span data-math-inline data-latex="i^2 = -1">i^2 = -1</span>을 만족하는 허수 단위로, 대수학의 영역을 복소수로 확장합니다.</p>
        <p>이 다섯 가지가 하나의 간결한 등식에 모인다는 사실은, 수학의 서로 다른 분야들이 깊은 곳에서 하나로 연결되어 있음을 상징합니다.</p>

        <h3>어디서 왔을까?</h3>
        <p>오일러 항등식은 복소 지수함수와 삼각함수를 연결하는 <strong>오일러 공식</strong>의 특수한 경우입니다:</p>
        <div data-math-block data-latex="e^{i\\theta} = \\cos\\theta + i\\sin\\theta">e^{i\\theta} = \\cos\\theta + i\\sin\\theta</div>
        <p>이 공식은 복소 평면 위의 단위원을 매개변수화합니다. 각도 <span data-math-inline data-latex="\\theta">\\theta</span>가 변하면 <span data-math-inline data-latex="e^{i\\theta}">e^{i\\theta}</span>는 단위원 위를 움직이며, 실수부가 <span data-math-inline data-latex="\\cos\\theta">\\cos\\theta</span>, 허수부가 <span data-math-inline data-latex="\\sin\\theta">\\sin\\theta</span>가 됩니다.</p>
        <p>여기에 <span data-math-inline data-latex="\\theta = \\pi">\\theta = \\pi</span>를 대입하면 <span data-math-inline data-latex="\\cos\\pi = -1">\\cos\\pi = -1</span>이고 <span data-math-inline data-latex="\\sin\\pi = 0">\\sin\\pi = 0</span>이므로:</p>
        <div data-math-block data-latex="e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1">e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1</div>
        <p>양변에 <span data-math-inline data-latex="1">1</span>을 더하면 바로 <span data-math-inline data-latex="e^{i\\pi} + 1 = 0">e^{i\\pi} + 1 = 0</span>이 됩니다.</p>

        <h3>테일러 급수로 보는 증명</h3>
        <p>오일러 공식 자체는 세 함수의 테일러 급수 전개로부터 유도할 수 있습니다:</p>
        <div data-math-block data-latex="e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}, \\quad \\cos x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n}}{(2n)!}, \\quad \\sin x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n+1}}{(2n+1)!}">...</div>
        <p><span data-math-inline data-latex="e^x">e^x</span>의 급수에 <span data-math-inline data-latex="x = i\\theta">x = i\\theta</span>를 대입하면 <span data-math-inline data-latex="i">i</span>의 거듭제곱이 4주기로 순환(<span data-math-inline data-latex="i^0=1,\\; i^1=i,\\; i^2=-1,\\; i^3=-i">i^0=1, i^1=i, i^2=-1, i^3=-i</span>)하므로, 실수부와 허수부를 분리하면 코사인과 사인 급수가 그대로 나타납니다 — 놀라울 만큼 우아한 증명입니다.</p>

        <h3>왜 중요한가?</h3>
        <p>오일러 항등식은 단순히 아름다운 것을 넘어, 실용적인 의미도 큽니다. 복소 지수를 통해 삼각함수를 다루면 전기공학에서 교류 회로 해석이 훨씬 간결해지고, 양자역학에서 파동함수의 위상을 표현하는 데 필수적입니다. 신호 처리에서 쓰이는 푸리에 변환 역시 오일러 공식이 없으면 성립하지 않습니다. 하나의 항등식이 수학과 물리학, 공학의 거의 모든 분야를 관통하는 셈입니다.</p>
        `,
        pythagorean: `
        <h2>피타고라스 정리 — 기하학의 초석</h2>
        <p>직각삼각형에서, 빗변의 길이의 제곱은 나머지 두 변의 길이의 제곱의 합과 같습니다. 이것이 바로 <strong>피타고라스 정리</strong>이며, 수학에서 가장 오래되고 가장 널리 사용되는 정리 중 하나입니다:</p>
        <div data-math-block data-latex="a^2 + b^2 = c^2">a^2 + b^2 = c^2</div>
        <p>여기서 <span data-math-inline data-latex="a">a</span>와 <span data-math-inline data-latex="b">b</span>는 직각을 끼는 두 변(직각변)이고, <span data-math-inline data-latex="c">c</span>는 직각의 맞은편에 있는 가장 긴 변(빗변)입니다. 이 정리의 이름은 고대 그리스 수학자 피타고라스에게서 왔지만, 실제로는 바빌로니아와 인도의 수학자들이 훨씬 이전부터 이 관계를 알고 있었습니다.</p>

        <h3>시각적 증명: 넓이로 이해하기</h3>
        <p>피타고라스 정리의 가장 직관적인 증명은 <strong>넓이 비교</strong>입니다. 각 변 위에 정사각형을 그려보면, 두 직각변 위의 정사각형 넓이(<span data-math-inline data-latex="a^2">a^2</span>과 <span data-math-inline data-latex="b^2">b^2</span>)의 합이 빗변 위의 정사각형 넓이(<span data-math-inline data-latex="c^2">c^2</span>)와 정확히 일치합니다. 위의 수식 블록을 더블클릭하여 값을 바꿔보면, 이 관계가 어떻게 변하는지 시각적으로 확인할 수 있습니다.</p>
        <p>한 변의 길이가 <span data-math-inline data-latex="a + b">a + b</span>인 큰 정사각형 안에 직각삼각형 네 개를 배치하는 방법도 유명합니다. 안쪽에 남는 영역이 한 번은 <span data-math-inline data-latex="c^2">c^2</span>이고, 삼각형을 재배치하면 <span data-math-inline data-latex="a^2 + b^2">a^2 + b^2</span>이 되어 두 넓이가 같음을 보입니다.</p>

        <h3>구체적인 예: 3-4-5 삼각형</h3>
        <p>가장 유명한 피타고라스 수 세 쌍은 <span data-math-inline data-latex="(3, 4, 5)">3, 4, 5</span>입니다. 실제로 확인해 봅시다:</p>
        <div data-math-block data-latex="3^2 + 4^2 = 9 + 16 = 25 = 5^2">3^2 + 4^2 = 9 + 16 = 25 = 5^2</div>
        <p>이 외에도 <span data-math-inline data-latex="(5, 12, 13)">5, 12, 13</span>, <span data-math-inline data-latex="(8, 15, 17)">8, 15, 17</span>, <span data-math-inline data-latex="(7, 24, 25)">7, 24, 25</span> 등 무한히 많은 피타고라스 수가 존재합니다. 일반적으로, 임의의 양의 정수 <span data-math-inline data-latex="m > n">m > n</span>에 대해 <span data-math-inline data-latex="(m^2 - n^2,\\; 2mn,\\; m^2 + n^2)">m^2 - n^2, 2mn, m^2 + n^2</span>는 항상 피타고라스 수를 이룹니다.</p>

        <h3>일상 속의 피타고라스</h3>
        <p>피타고라스 정리는 교과서 속에만 머물지 않습니다. 건축가는 벽이 직각인지 확인할 때 3-4-5 비율을 사용하고, 내비게이션은 두 지점 사이의 직선 거리를 이 정리로 계산합니다. 컴퓨터 그래픽에서 두 점 사이의 거리 공식도 피타고라스 정리의 확장입니다:</p>
        <div data-math-block data-latex="d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}">d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}</div>
        <p>3차원으로 확장하면 <span data-math-inline data-latex="d = \\sqrt{\\Delta x^2 + \\Delta y^2 + \\Delta z^2}">d = \\sqrt{\\Delta x^2 + \\Delta y^2 + \\Delta z^2}</span>가 되며, 이는 게임 엔진부터 천문학의 별 사이 거리 계산까지 광범위하게 쓰입니다.</p>

        <h3>페르마의 마지막 정리와의 연결</h3>
        <p>피타고라스 정리에서 자연스럽게 떠오르는 질문이 있습니다: 지수를 <span data-math-inline data-latex="2">2</span>보다 크게 올리면 어떻게 될까? 즉, <span data-math-inline data-latex="a^n + b^n = c^n">a^n + b^n = c^n</span>을 만족하는 양의 정수해가 <span data-math-inline data-latex="n \\geq 3">n \\geq 3</span>일 때도 존재할까? 페르마는 1637년에 "해가 없다"고 주장했지만 증명을 남기지 않았고, 이 문제는 358년 뒤인 1995년에 앤드루 와일스에 의해 마침내 증명되었습니다.</p>
        `,
      },
    },
  },
};
