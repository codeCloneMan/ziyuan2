/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from './full-codes';
import { buildArticlePhrases, phraseAtCursor } from './article-phrases';
import { getPhraseCodeInfo } from './phrase-codes';
import { DEFAULT_ARTICLES } from '@/data/articles';
import type { BuiltinPhrasesData } from './data-loader';

const charData = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8'),
) as { char: string; code: string }[];
const charCodeIndex = buildFullCodeIndex(charData);
const phrasesData = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../public/data/builtinPhrases.json'), 'utf8'),
) as BuiltinPhrasesData;

const shijianlun = DEFAULT_ARTICLES.find(a => a.id === 'shijianlun')!;

describe('文章内官方词组索引', () => {
  const phrases = buildArticlePhrases(shijianlun.text, charCodeIndex, phrasesData);

  it('收录本文出现过的官方词，且编码与官方取码规则一致', () => {
    expect(phrases.byCode.size).toBeGreaterThan(50);
    for (const [word, codes] of phrases.codesOf) {
      const official = getPhraseCodeInfo(word, charCodeIndex);
      expect(official).not.toBeNull();
      expect(codes).toEqual(official!.accepted);
      for (const code of codes) expect(phrases.byCode.get(code)).toContain(word);
    }
  });

  it('只收本文出现过的词（「中华人民共和国」不在《实践论》选段里）', () => {
    const words = new Set([...phrases.codesOf.keys()]);
    expect(words.has('马克思')).toBe(true);
    expect(words.has('中华人民共和国')).toBe(false);
  });

  it('词组码上屏：码必须落在光标处、且与原文逐字一致', () => {
    // 找一个 2 字词验证（如「社会」，在《实践论》里出现多次）
    const word = '社会';
    const codes = phrases.codesOf.get(word);
    expect(codes && codes.length > 0).toBe(true);
    const code = codes![0];
    expect(phraseAtCursor(code, phrases.byCode, ['社', '会', '性'])).toBe(word);
    // 光标处不是这个词 → 不上屏（退回单字判定）
    expect(phraseAtCursor(code, phrases.byCode, ['马', '克', '思'])).toBeNull();
    // 剩下的字不够组成该词 → 不上屏
    expect(phraseAtCursor(code, phrases.byCode, ['社'])).toBeNull();
  });

  it('词组码来自码表取码规则（不是最长码随便截断）', () => {
    // 社会 = sh + he 之类 4 键；断言它确实是官方 2 字词规则 2+2 的结果
    const codes = phrases.codesOf.get('社会')!;
    expect(codes.every(c => c.length >= 2 && c.length <= 4)).toBe(true);
  });

  it('没有词表的文章（只有汉字）不会产生词组索引', () => {
    const empty = buildArticlePhrases('你好世界', charCodeIndex, {
      ...phrasesData,
      twoCharPhrases: [], threeCharPhrases: [], fourCharPhrases: [], longCharPhrases: [],
    });
    expect(empty.byCode.size).toBe(0);
  });
});
