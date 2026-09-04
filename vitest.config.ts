import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // registries/ 의 spec 검증 테스트도 기본 실행에 포함한다 (C11: 필수 필드 누락 시 실패)
    include: ['src/**/*.test.ts', 'registries/**/*.test.ts'],
    exclude: ['src/__tests__/corpus/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/react/**',
        'src/visualizer/**',
        'src/export/**',
      ],
    },
  },
});
