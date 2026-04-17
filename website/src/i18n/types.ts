export interface StepItem {
  label: string;
  desc: string;
}

export interface FeatureItem {
  title: string;
  desc: string;
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
  underTheHood: {
    title: string;
    sub: string;
    tolerantParser: { title: string; desc: string };
    texLayout: { title: string; desc: string };
    modular: { title: string; desc: string };
    hiFidelity: { title: string; desc: string };
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
    no_variables: string;
    categories: {
      polynomial: string;
      trigonometric: string;
      calculus: string;
      inequality: string;
      polar: string;
      structures: string;
      algebra: string;
      geometry: string;
      physics: string;
      analysis: string;
      statistics: string;
      astronomy: string;
      biology: string;
      finance: string;
      complex: string;
    };
    /** examples-data.ts의 ExampleItem.labelKey로 참조하는 라벨 사전 */
    items: Record<string, string>;
  };
  comparisonPage: {
    title: string;
    sub: string;
    render_btn: string;
    fizzex_label: string;
    katex_label: string;
    mathjax_label: string;
    latex_source: string;
    display_mode_display: string;
    display_mode_inline: string;
    sections: {
      rendering: string;
      symbols: string;
    };
    categories: Record<string, string>;
  };
  pluginSection: {
    title: string;
    sub: string;
    layer_core: { title: string; desc: string };
    layer_headless: { title: string; desc: string };
    layer_plugins: { title: string; desc: string };
    cta: string;
  };
  symbolPage: {
    title: string;
    sub: string;
    command_label: string;
    fizzex_label: string;
    katex_label: string;
    mathjax_label: string;
    items_label: string;
    display_mode_display: string;
    display_mode_inline: string;
    categories: {
      greek: string;
      binary: string;
      relations: string;
      negated: string;
      arrows: string;
      delimiters: string;
      bigops: string;
      accents: string;
      functions: string;
      structures: string;
      environments: string;
      fonts: string;
      spacing: string;
    };
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
      tabs: { euler: string; pythagorean: string };
      contents: { euler: string; pythagorean: string };
    };
  };
}

export type Lang = 'en' | 'ko';
