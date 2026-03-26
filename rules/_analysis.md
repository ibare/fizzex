## 프로젝트 구조 분석

### 기본 정보
- 언어: TypeScript (strict mode)
- 주요 프레임워크/라이브러리: React 19, Konva, Nerdamer, Tiptap
- 모노레포 여부: 아니오 (단일 패키지 + website)
- 모듈/패키지 목록: 13개 모듈 (box, latex, analyzer, cas, visualizer, react, headless, integrations, suggestion, fonts, i18n, export, utils)
- 빌드 시스템: tsc + Vite
- 테스트 프레임워크: Vitest
- 사용 중인 정적 분석 도구: TypeScript strict mode만 (ESLint/Prettier 미설정)

### 규모
- 소스 파일 수: 88
- 대략적 코드 라인 수: 20,454
- 테스트 파일: 8개 (1,095줄, 111개 테스트)

### 핵심 도메인
- LaTeX 파싱: LaTeX 문자열 ↔ AST 양방향 변환, 187+ 명령어
- Box 모델: TeX 스타일 레이아웃 시스템, Canvas 렌더링
- 수식 분석: 도메인 감지, 변수 분류, 시각화 추천
- CAS: Nerdamer 기반 심볼릭 연산
- Headless Adapter: 프레임워크 무관 렌더러/에디터
- 호스트 통합: Tiptap 등 외부 에디터 플러그인

### 발견된 공통 패턴
- AST-First 설계: 모든 연산이 AST를 중심으로 동작
- 파이프라인 구조: LaTeX → AST → Box → Canvas
- 레지스트리 패턴: LaTeX 명령어 핸들러 등록
- Barrel export: 각 모듈의 index.ts에서 re-export
- ID 생성: generateEditorId, generateLatexId, deriveId 분리

### 발견된 안티패턴
- 에러 핸들링 비일관: 일부는 silent catch, 일부는 throw
- 프레임워크 격리 미준수 가능성: core 모듈에 React import 혼입 위험
- Canvas context 정리 패턴 미표준화
