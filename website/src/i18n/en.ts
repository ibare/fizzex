import type { Dictionary } from './types';

export const en: Dictionary = {
  nav: {
    home: 'Home',
    docs: 'Docs',
    demo: 'Demo',
    github: 'GitHub',
  },
  hero: {
    headline: 'Canvas-based math editor\nthat feels like fizzy bubbles.',
    sub: 'A lightweight, TeX-quality formula editor for the web. Parse LaTeX, render on Canvas, analyze expressions, and visualize — all in one package.',
    cta_demo: 'Try Demo',
    cta_github: 'GitHub',
  },
  features: {
    title: 'Everything you need for math on the web',
    sub: 'From input to visualization, Fizzex covers the full pipeline.',
    editor_title: 'Canvas Editor',
    editor_desc: 'Keyboard-driven math input rendered on HTML Canvas with TeX-quality box model layout.',
    latex_title: 'LaTeX Parser',
    latex_desc: 'Bidirectional LaTeX conversion — parse LaTeX to AST and serialize back. Supports 187+ commands.',
    analysis_title: 'Expression Analyzer',
    analysis_desc: 'Detect mathematical domains, classify variables, extract features, and recommend visualizations.',
    cas_title: 'Computer Algebra',
    cas_desc: 'Simplify, expand, factor, solve, differentiate, and integrate — powered by Nerdamer.',
    visualization_title: 'Visualization',
    visualization_desc: 'Function graphs, unit circles, number lines, polar plots, and auto-visualization based on analysis.',
    i18n_title: 'Internationalization',
    i18n_desc: 'Built-in i18n support with customizable labels. Works with any language via the provider pattern.',
  },
  quickStart: {
    title: 'Get started in seconds',
    sub: 'Install, import, render. That simple.',
    install_label: 'Install',
    usage_label: 'Usage',
  },
  architecture: {
    title: 'How it works',
    sub: 'A clean pipeline from input to pixels.',
    pipeline_label: 'Rendering Pipeline',
  },
  footer: {
    tagline: 'Light and easy formula input.',
  },
};
