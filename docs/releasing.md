# 배포

`main` 에 push 하면 `.github/workflows/release.yml` 이 `package.json` 의 버전을
보고 npm 에 게시한다. 이미 게시된 버전이면 건너뛴다. 즉 **버전을 올린 커밋이
main 에 닿는 순간이 배포다.**

## 릴리즈 노트는 세 곳에 간다

셋은 같은 내용이고 출처는 하나 — changeset 이다.

| 어디 | 무엇이 만드나 | 누가 읽나 |
|---|---|---|
| `CHANGELOG.md` | `changeset version` 이 자동 생성 | 저장소를 읽는 사람 |
| git 태그 메시지 | 사람이 넣는다 | `git show v0.5.0` 하는 사람 |
| GitHub Release | 사람이 발행한다 | 저장소 밖에서 보는 사람 |

0.4.0 까지는 CHANGELOG 만 채워졌다. 태그는 메시지가 태그명뿐이었고 GitHub
Release 는 아예 없었다 — 잘 쓴 노트가 저장소 안에만 머물렀다. 0.5.0 부터
세 곳을 함께 채운다.

## 어느 말로 쓰나

**밖으로 나가는 것은 영어, 저장소 안에서 도는 것은 한국어.**

| 어디 | 언어 | 누가 읽나 |
|---|---|---|
| `README.md` | 영어 | npm 페이지를 보는 사람 |
| `CHANGELOG.md` | 영어 | 버전을 올릴지 정하는 사람 |
| git 태그 메시지 | 영어 | `git show v0.5.0` 하는 사람 |
| GitHub Release | 영어 | 저장소 밖에서 보는 사람 |
| `docs/**` | 한국어 | 이 저장소를 고치는 사람 |
| 커밋 메시지 | 한국어 | 같음 |

경계는 **독자가 누구냐**다. 패키지를 쓰는 사람은 우리가 어느 나라 사람인지
모르고 알 필요도 없다. 저장소를 고치는 사람은 우리다.

0.4.0 까지는 CHANGELOG 도 한국어였다 — README 만 영어인 채로. 0.5.0 부터
바깥 표면을 영어로 맞췄고, **과거 노트는 소급해 고치지 않는다.** 이미 게시된
버전의 기록이라 당시 사실과 어긋나게 된다.

fizzex 가 열 개 언어를 지원하게 된 것도 이유다. 그 언어 사용자가 정작
릴리즈 노트를 못 읽으면 앞뒤가 맞지 않는다.

## 절차

```bash
# 1. changeset 을 쓴다. 이것이 릴리즈 노트의 원본이다
pnpm changeset            # 또는 .changeset/*.md 를 손으로

# 2. main 에 올린다
git switch main && git merge --ff-only <branch>

# 3. 버전을 올린다 — package.json 과 CHANGELOG.md 가 함께 바뀐다
pnpm version-packages

# 4. 게시 전에 확인한다
pnpm build && pnpm test && pnpm typecheck

# 5. 커밋하고 태그를 단다. 태그 메시지에 릴리즈 노트를 넣는다
git commit -am "chore(release): 0.5.0"
git tag -a v0.5.0 -F <노트 파일>

# 6. push — 이 순간 CI 가 npm 에 게시한다
git push origin main --follow-tags

# 7. GitHub Release 를 발행한다
gh release create v0.5.0 --title "v0.5.0" --notes-file <노트 파일>
```

## changeset 을 쓸 때

**사용자가 무엇을 겪는지 쓴다.** 커밋 목록을 요약하지 않는다. 커밋은 저장소를
읽는 사람이 보고, 릴리즈 노트는 라이브러리를 쓰는 사람이 본다.

- **공개 표면이 바뀌면 맨 앞에 쓴다.** 무엇이 없어지고 무엇으로 대신하는지.
  0.x 라 minor 에서도 breaking 이 나가지만, 나가는 것과 알리지 않는 것은 다르다.
- 무엇이 달라졌는지와 **왜 그렇게 했는지**를 함께. 수치가 있으면 수치로.
- 내부 리팩터·문서·테스트는 사용자가 겪는 변화가 없으면 넣지 않는다.

버전은 0.x 동안 이렇게 고른다.

- **minor** — 새 기능, 공개 표면 변경, 조판 결과가 바뀌는 수정
- **patch** — 겉으로 드러나는 동작이 그대로인 수정

조판 수치가 바뀌면 patch 가 아니다. 쓰는 쪽에서 화면이 달라 보인다.

## 게시 전에 보는 것

CI 가 `pnpm build` 를 돌리고 실패하면 게시까지 가지 않는다. 그래도 로컬에서
한 번 돌린다 — CI 가 잡는 것은 빌드 실패뿐이고, `dist/` 에 무엇이 들어갔는지는
보지 않는다.

- `pnpm build` — `rm -rf dist` 로 시작하므로 이전 산출물이 섞이지 않는다
- `pnpm test` · `pnpm typecheck` · `pnpm semantic:validate` · `pnpm test:layout`
- `npx tsc -b website/tsconfig.json` — 루트 typecheck 는 `src/**` 만 본다.
  소비자 관점에서 깨지는 것을 여기서 잡는다

## 되돌릴 수 없는 것

npm 게시는 되돌릴 수 없다(72시간 안에 unpublish 가 되지만 같은 버전을 다시
쓸 수 없다). 버전을 올린 커밋을 main 에 push 하기 전에 위 목록을 확인한다.
