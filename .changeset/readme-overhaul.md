---
"fizzex": patch
---

docs: README 를 npm 패키지 viewer 시점으로 재작성

- ASCII 박스/트리 다이어그램 제거 (렌더링 환경에 따라 깨질 위험)
- 패키지 사용자와 무관한 내부 정보 제거: src 디렉터리 구조,
  Development 셋업, TODO 21항목, "What's in a Name?" 어원 설명
- API Reference 를 카테고리별 bullet 로 압축. `fizzex/headless`
  실제 export 17개 모두 반영 (이전엔 2개만 문서화)
- Browser Support 의 절대 버전 (Chrome 90+ 등 5년 묵음) 을
  "modern browsers + ES2020/Canvas" 로 단순화
- 정확성 수정
  - Euler bindings 키 `'\pi'` → `'π'`: LaTeX 명령은 unicode 로
    정규화되어 저장되므로 이전 키는 unbound 처리되어 결과가
    `undefined` 였음
  - Visualization `baseUrl` 가이드의 `new URL('fizzex/visualizers/',
    import.meta.url).href` 는 vanilla Node 의 ESM 에서 패키지
    specifier 를 해석하지 않으므로 작동하지 않음. 정적 호스팅 기준의
    단순 URL 예시 (`'/visualizers/'`) 로 교체
- 분량 444 → 207 라인 (-54%)
