/**
 * 텍스트 모드 명령어 목록 동기화
 *
 * `tolerant/pre-processor.ts` 와 `streaming/tokenizer.ts` 가 같은 이름의 Set 을 따로 갖는다.
 * 목적이 달라(정규화 스킵 / 구분자 감지 스킵) 합치지 않았지만, 내용이 갈라지면
 * 한쪽에서만 처리되는 명령어가 생겨 조용히 깨진다.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** 소스에서 TEXT_MODE_COMMANDS 리터럴을 읽는다 */
function readTextModeCommands(relativePath: string): Set<string> {
  const source = readFileSync(resolve(here, relativePath), 'utf-8');
  const match = source.match(/TEXT_MODE_COMMANDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!match) throw new Error(`TEXT_MODE_COMMANDS 를 찾지 못했다: ${relativePath}`);
  return new Set(Array.from(match[1].matchAll(/'([^']+)'/g), (m) => m[1]));
}

describe('TEXT_MODE_COMMANDS 동기화', () => {
  const preProcessor = readTextModeCommands('./tolerant/pre-processor.ts');
  const streaming = readTextModeCommands('./streaming/tokenizer.ts');

  it('두 Set 의 내용이 같다', () => {
    expect([...preProcessor].sort()).toEqual([...streaming].sort());
  });

  it('화학식이 양쪽에 들어 있다', () => {
    // \ce 본문은 공백이 의미를 가지므로 정규화도 구분자 감지도 건너뛰어야 한다
    expect(preProcessor.has('ce')).toBe(true);
    expect(streaming.has('ce')).toBe(true);
  });
});
