import { defineConfig } from 'vitest/config';

/**
 * 코퍼스 테스트 전용 설정.
 *
 * 기본 `vitest.config.ts` 는 실행 시간이 길어 `src/__tests__/corpus/**` 를 exclude 한다.
 * exclude 는 CLI 로 넘긴 파일 filter 보다 우선하고 `--exclude` 플래그는 치환이 아니라
 * 추가라, 기본 설정을 그대로 두고는 코퍼스 테스트를 실행할 방법이 없다.
 * 그래서 exclude 없는 설정을 따로 둔다.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/corpus/corpus.test.ts'],
  },
});
