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
      parse: { label: '파싱', desc: 'LaTeX-AST 양방향 변환, 187개+ 명령어' },
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
      desc: 'HTML Canvas 위에 TeX 품질의 Box 모델 레이아웃으로 렌더링. DOM 오버헤드 없는 키보드 기반 수식 입력.',
    },
    latex: {
      title: 'LaTeX 파서',
      desc: '187개+ 명령어를 지원하는 LaTeX-AST 양방향 변환. 파싱, 변환, 직렬화.',
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
  comparison: {
    title: 'Fizzex는 어떻게 다른가',
    sub: '또 하나의 렌더러가 아닌, 완전한 수식 표현 플랫폼.',
    headers: {
      feature: '기능',
      katex: 'KaTeX',
      mathjax: 'MathJax',
      mathlive: 'MathLive',
      fizzex: 'Fizzex',
    },
    rows: {
      rendering: { label: '렌더링', values: ['CSS/DOM', 'SVG/DOM', 'DOM', 'Canvas'] },
      editing: { label: '편집', values: ['-', '-', '지원', '지원'] },
      latex_parse: { label: 'LaTeX 파싱', values: ['지원', '지원', '지원', '지원'] },
      analysis: { label: '수식 분석', values: ['-', '-', '-', '지원'] },
      cas: { label: 'CAS (대수)', values: ['-', '-', '-', '지원'] },
      visualization: { label: '시각화', values: ['-', '-', '-', '지원'] },
      autocomplete: { label: '자동완성', values: ['-', '-', '기본', '컨텍스트 인식'] },
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
      visualization: '추천 시각화',
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
    sub: '수학 도메인별 수식을 탐색하세요. Render를 클릭하면 Fizzex가 작동합니다.',
    render_btn: '렌더링',
    collapse_btn: '접기',
    analysis_label: '분석',
    visualization_label: '시각화',
    categories: {
      polynomial: '다항식',
      trigonometric: '삼각함수',
      calculus: '미적분',
      inequality: '부등식',
      polar: '극좌표',
      structures: '행렬 & 구조',
      complex: '복잡한 수식',
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
    categories: {
      fractions: '분수',
      powers: '거듭제곱 & 근호',
      trig: '삼각함수',
      hyperbolic: '쌍곡선함수',
      log: '로그 & 지수',
      integrals: '적분',
      sigma: '합 & 극한',
      algebra: '대수 함수',
      greek: '그리스 문자',
      accents: '악센트',
      relations: '관계 연산자',
      arrows: '화살표',
      sets: '집합 & 논리',
      operators: '연산자',
      dots: '점 & 공백',
      fonts: '글꼴',
      matrices: '행렬',
      complex: '복잡한 수식',
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
      desc: 'FizzexRenderer & FizzexEditor — 어떤 DOM 요소에든 마운트',
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
      headless_desc: 'FizzexRenderer(읽기 전용)와 FizzexEditor(편집 가능). DOM 요소를 넘기면 Canvas 설정, HiDPI 스케일링, 폰트 로딩, 렌더링 파이프라인을 모두 처리합니다.',
      plugins_title: 'fizzex/tiptap, fizzex/slate, ...',
      plugins_desc: 'Headless adapter를 특정 호스트 에디터에 연결하는 얇은 래퍼. 각 플러그인은 보통 20~30줄의 코드입니다.',
      philosophy: 'Headless 레이어가 무거운 작업을 처리하므로 플러그인 개발자는 호스트 전용 연결 코드만 작성하면 됩니다.',
    },
    api: {
      title: 'Headless API',
      sub: '두 개의 클래스로 모든 통합 요구를 충족합니다.',
      renderer_title: 'FizzexRenderer',
      renderer_desc: '읽기 전용 수식 렌더링. 컨테이너 요소와 LaTeX 문자열을 전달하면 됩니다.',
      editor_title: 'FizzexEditor',
      editor_desc: '키보드 입력, 커서, IME 지원, 자동완성이 내장된 인터랙티브 수식 에디터.',
      config_title: 'FizzexConfig',
    },
    guide: {
      title: '나만의 플러그인 만들기',
      sub: '세 단계로 Fizzex를 어떤 에디터에든 통합할 수 있습니다.',
      step1_title: '1. 컨테이너 얻기',
      step1_desc: '호스트 에디터가 커스텀 노드 렌더링을 위한 DOM 요소를 제공합니다 (NodeView, Element 등).',
      step2_title: '2. 렌더러 생성',
      step2_desc: 'FizzexRenderer 또는 FizzexEditor를 컨테이너와 설정으로 인스턴스화합니다.',
      step3_title: '3. 라이프사이클 관리',
      step3_desc: '데이터가 변경되면 render(), 노드가 제거되면 destroy()를 호출합니다.',
      tiptap_example: 'Tiptap 플러그인 — 전체 구현',
      outro: '이 패턴은 Slate, ProseMirror, Quill, CodeMirror 등 커스텀 노드 렌더링을 지원하는 모든 에디터에서 동일하게 작동합니다.',
    },
    demo: {
      title: 'Tiptap 라이브 데모',
      sub: 'Fizzex가 구동하는 MathInline과 MathBlock 확장이 포함된 실제 Tiptap 에디터입니다.',
      instructions: '실제 Tiptap 에디터입니다. 텍스트를 자유롭게 편집할 수 있습니다. 블록 수식을 더블클릭하면 편집할 수 있습니다.',
      content: `
        <h2>오일러 항등식 — 가장 아름다운 방정식</h2>
        <p>1748년, 레온하르트 오일러는 수학에서 가장 근본적인 다섯 개의 상수 사이의 깊은 연결을 발견했습니다. 그 결과물이 바로 <strong>오일러 항등식</strong>입니다:</p>
        <div data-math-block data-latex="e^{i\\pi} + 1 = 0">e^{i\\pi} + 1 = 0</div>
        <p>이 하나의 방정식은 덧셈의 항등원 <span data-math-inline data-latex="0">0</span>, 곱셈의 항등원 <span data-math-inline data-latex="1">1</span>, 자연로그의 밑 <span data-math-inline data-latex="e">e</span>, 허수 단위 <span data-math-inline data-latex="i">i</span>, 그리고 원주율 <span data-math-inline data-latex="\\pi">\\pi</span>를 하나로 연결합니다.</p>
        <h3>어디서 왔을까?</h3>
        <p>오일러 항등식은 복소 지수함수와 삼각함수를 연결하는 <strong>오일러 공식</strong>의 특수한 경우입니다:</p>
        <div data-math-block data-latex="e^{i\\theta} = \\cos\\theta + i\\sin\\theta">e^{i\\theta} = \\cos\\theta + i\\sin\\theta</div>
        <p>여기에 <span data-math-inline data-latex="\\theta = \\pi">\\theta = \\pi</span>를 대입하면 <span data-math-inline data-latex="\\cos\\pi = -1">\\cos\\pi = -1</span>이고 <span data-math-inline data-latex="\\sin\\pi = 0">\\sin\\pi = 0</span>이므로:</p>
        <div data-math-block data-latex="e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1">e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1</div>
        <p>이를 정리하면 항등식을 얻습니다. 오일러 공식 자체는 테일러 급수 전개로부터 유도할 수 있습니다:</p>
        <div data-math-block data-latex="e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}, \\quad \\cos x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n}}{(2n)!}, \\quad \\sin x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n+1}}{(2n+1)!}">...</div>
        <p><span data-math-inline data-latex="e^x">e^x</span>의 급수에 <span data-math-inline data-latex="x = i\\theta">x = i\\theta</span>를 대입하고 실수부와 허수부를 분리하면 코사인과 사인 급수가 그대로 나타납니다 — 놀라울 만큼 우아한 증명입니다.</p>
      `,
    },
  },
};
