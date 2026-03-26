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
    cta_demo: string;
    cta_github: string;
  };
  features: {
    title: string;
    sub: string;
    editor_title: string;
    editor_desc: string;
    latex_title: string;
    latex_desc: string;
    analysis_title: string;
    analysis_desc: string;
    cas_title: string;
    cas_desc: string;
    visualization_title: string;
    visualization_desc: string;
    i18n_title: string;
    i18n_desc: string;
  };
  quickStart: {
    title: string;
    sub: string;
    install_label: string;
    usage_label: string;
  };
  architecture: {
    title: string;
    sub: string;
    pipeline_label: string;
  };
  footer: {
    tagline: string;
  };
}

export type Lang = 'en' | 'ko';
