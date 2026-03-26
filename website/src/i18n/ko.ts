import type { Dictionary } from './types';

export const ko: Dictionary = {
  nav: {
    home: '홈',
    docs: '문서',
    demo: '데모',
    github: 'GitHub',
  },
  hero: {
    headline: '거품처럼 가볍고 쉬운\nCanvas 기반 수식 에디터.',
    sub: '웹을 위한 경량 TeX 품질 수식 에디터. LaTeX 파싱, Canvas 렌더링, 수식 분석, 시각화까지 하나의 패키지로.',
    cta_demo: '데모 체험',
    cta_github: 'GitHub',
  },
  features: {
    title: '웹 수식에 필요한 모든 것',
    sub: '입력부터 시각화까지, Fizzex가 전체 파이프라인을 지원합니다.',
    editor_title: 'Canvas 에디터',
    editor_desc: 'HTML Canvas 위에 TeX 품질의 Box 모델 레이아웃으로 렌더링되는 키보드 기반 수식 입력.',
    latex_title: 'LaTeX 파서',
    latex_desc: 'LaTeX ↔ AST 양방향 변환. 187개 이상의 명령어를 지원합니다.',
    analysis_title: '수식 분석기',
    analysis_desc: '수학적 도메인 감지, 변수 분류, 특성 추출, 시각화 추천까지.',
    cas_title: '컴퓨터 대수 시스템',
    cas_desc: '간소화, 전개, 인수분해, 방정식 풀이, 미분, 적분 — Nerdamer 기반.',
    visualization_title: '시각화',
    visualization_desc: '함수 그래프, 단위원, 수직선, 극좌표 그래프, 분석 기반 자동 시각화.',
    i18n_title: '다국어 지원',
    i18n_desc: '커스터마이징 가능한 라벨 시스템. Provider 패턴으로 모든 언어를 지원합니다.',
  },
  quickStart: {
    title: '몇 초면 시작할 수 있습니다',
    sub: '설치하고, 가져오고, 렌더링. 그게 전부입니다.',
    install_label: '설치',
    usage_label: '사용법',
  },
  architecture: {
    title: '작동 방식',
    sub: '입력에서 픽셀까지, 깔끔한 파이프라인.',
    pipeline_label: '렌더링 파이프라인',
  },
  footer: {
    tagline: '거품처럼 가볍고 쉬운 수식 입력.',
  },
};
