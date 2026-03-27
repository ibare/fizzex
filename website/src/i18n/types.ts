export interface StepItem {
  label: string;
  desc: string;
}

export interface FeatureItem {
  title: string;
  desc: string;
}

export interface ComparisonRow {
  label: string;
  values: [string, string, string, string];
}

export interface Dictionary {
  nav: {
    home: string;
    docs: string;
    demo: string;
    github: string;
  };
  hero: {
    headline: string;
    sub: string;
    install: string;
    cta_start: string;
    cta_github: string;
  };
  problem: {
    title: string;
    sub: string;
    current_title: string;
    current_items: string[];
    fizzex_title: string;
    fizzex_items: string[];
  };
  pipeline: {
    title: string;
    sub: string;
    steps: {
      input: StepItem;
      parse: StepItem;
      analyze: StepItem;
      compute: StepItem;
      visualize: StepItem;
    };
  };
  features: {
    title: string;
    sub: string;
    editor: FeatureItem;
    latex: FeatureItem;
    analysis: FeatureItem;
    cas: FeatureItem;
    visualization: FeatureItem;
    autocomplete: FeatureItem;
  };
  comparison: {
    title: string;
    sub: string;
    headers: {
      feature: string;
      katex: string;
      mathjax: string;
      mathlive: string;
      fizzex: string;
    };
    rows: {
      rendering: ComparisonRow;
      editing: ComparisonRow;
      latex_parse: ComparisonRow;
      analysis: ComparisonRow;
      cas: ComparisonRow;
      visualization: ComparisonRow;
      autocomplete: ComparisonRow;
    };
  };
  quickStart: {
    title: string;
    sub: string;
    tabs: {
      install: string;
      editor: string;
      latex: string;
      analysis: string;
      cas: string;
      visualization: string;
    };
  };
  footerCta: {
    title: string;
    cta_start: string;
    cta_github: string;
    cta_npm: string;
  };
  footer: {
    tagline: string;
  };
  playground: {
    title: string;
    sub: string;
    input_label: string;
    input_placeholder: string;
    presets_label: string;
    analyze_btn: string;
    analysis_empty: string;
    analysis_error: string;
    ast_btn: string;
    analysis: {
      domain: string;
      variables: string;
      features: string;
      visualization: string;
      complexity: string;
      form: string;
    };
  };
  pipelineExplorer: {
    title: string;
    sub: string;
    select_label: string;
    steps: {
      input: { title: string; desc: string };
      parse: { title: string; desc: string };
      analyze: { title: string; desc: string };
      compute: { title: string; desc: string };
      visualize: { title: string; desc: string };
    };
    click_to_expand: string;
    no_cas: string;
    no_viz: string;
    loading: string;
  };
  examples: {
    title: string;
    sub: string;
    render_btn: string;
    collapse_btn: string;
    analysis_label: string;
    visualization_label: string;
    categories: {
      polynomial: string;
      trigonometric: string;
      calculus: string;
      inequality: string;
      polar: string;
      structures: string;
      complex: string;
    };
  };
  comparisonPage: {
    title: string;
    sub: string;
    render_btn: string;
    fizzex_label: string;
    katex_label: string;
    latex_source: string;
    categories: {
      fractions: string;
      powers: string;
      trig: string;
      integrals: string;
      sigma: string;
      limits: string;
      greek: string;
      matrices: string;
      complex: string;
      sets: string;
    };
  };
  pluginSection: {
    title: string;
    sub: string;
    layer_core: { title: string; desc: string };
    layer_headless: { title: string; desc: string };
    layer_plugins: { title: string; desc: string };
    cta: string;
  };
  pluginsPage: {
    title: string;
    sub: string;
    arch: {
      title: string;
      sub: string;
      core_title: string;
      core_desc: string;
      headless_title: string;
      headless_desc: string;
      plugins_title: string;
      plugins_desc: string;
      philosophy: string;
    };
    api: {
      title: string;
      sub: string;
      renderer_title: string;
      renderer_desc: string;
      editor_title: string;
      editor_desc: string;
      config_title: string;
    };
    guide: {
      title: string;
      sub: string;
      step1_title: string;
      step1_desc: string;
      step2_title: string;
      step2_desc: string;
      step3_title: string;
      step3_desc: string;
      tiptap_example: string;
      outro: string;
    };
    demo: {
      title: string;
      sub: string;
      instructions: string;
      content: string;
    };
  };
}

export type Lang = 'en' | 'ko';
