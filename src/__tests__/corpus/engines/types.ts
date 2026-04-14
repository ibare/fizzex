/**
 * 엔진 비교 테스트 공통 인터페이스
 */

export interface EngineResult {
  parseSuccess: boolean;
  parseError?: string;
  renderSuccess: boolean;
  renderError?: string;
}

export interface Engine {
  name: string;
  test(latex: string): EngineResult;
}
