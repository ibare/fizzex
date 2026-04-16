---
name: feedback_no_duplicate_impl
description: 동일한 기능을 React/Headless 양쪽에 중복 구현하지 말 것 — headless가 핵심이고 React는 thin wrapper
type: feedback
---

동일한 기능의 구현체는 하나만 유지한다. Headless(순수 DOM/Canvas)가 핵심 구현이고, React 컴포넌트는 thin wrapper로만 존재해야 한다.

**Why:** ExplorerOverlay(headless)와 ExpressionExplorer(React)를 별도로 구현했다가, 화살표 주석 UI 변경 시 양쪽 다 수정해야 하는 문제 발생. 사용자가 "수식 탐색은 하나가 아니야?"로 지적.

**How to apply:** 새로운 기능을 headless에 구현한 후 React에서도 필요하면, React 컴포넌트는 headless 클래스를 useEffect로 생성/파괴하는 wrapper로만 만든다. 로직을 복사하지 않는다.
