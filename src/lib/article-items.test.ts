/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from './full-codes';
import { buildArticleItems, isCharItem, isPunctItem, PUNCT_KEYS } from './article-items';
import { DEFAULT_ARTICLES } from '@/data/articles';

const data = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8'),
) as { char: string; code: string }[];
const index = buildFullCodeIndex(data);

const isHan = (ch: string) => ch >= '\u4e00' && ch <= '\u9fff';

describe('文章练习题目序列', () => {
  it('汉字进题目（带编码），标点进题目（带按键），换行与拉丁字母跳过', () => {
    const items = buildArticleItems('你好，世界！\nabc', index);
    expect(items.map(i => i.char)).toEqual(['你', '好', '，', '世', '界', '！']);
    expect(items.map(i => i.kind)).toEqual(['char', 'char', 'punct', 'char', 'char', 'punct']);
    const chars = items.filter(isCharItem);
    expect(chars.every(i => i.codes.length > 0)).toBe(true);
    const puncts = items.filter(isPunctItem);
    expect(puncts.map(p => [p.char, p.key])).toEqual([['，', ','], ['！', '!']]);
  });

  it('textIndex 指向原文下标（渲染定位用）', () => {
    const items = buildArticleItems('a你，好', index);
    expect(items.map(i => i.textIndex)).toEqual([1, 2, 3]);
  });

  it('标点映射覆盖默认文章里出现的全部标点', () => {
    for (const article of DEFAULT_ARTICLES) {
      for (const ch of article.text) {
        if (isHan(ch) || ch === '\n' || ch === ' ' || index.has(ch)) continue;
        expect(Object.keys(PUNCT_KEYS)).toContain(ch);
      }
    }
  });

  it('默认文章：汉字与标点都在题目里，只有换行/空白被跳过', () => {
    expect(DEFAULT_ARTICLES.length).toBeGreaterThanOrEqual(3);
    for (const article of DEFAULT_ARTICLES) {
      const text = [...article.text];
      const items = buildArticleItems(article.text, index);
      const itemCharIdx = new Set(items.map(it => it.textIndex));
      const skipped = text.filter((ch, i) => !itemCharIdx.has(i) && ch !== '\n' && ch !== ' ');
      expect(skipped).toEqual([]);
      const han = text.filter(isHan);
      expect(han.length).toBeGreaterThan(300);
      expect(items.length).toBeGreaterThanOrEqual(han.length);  // 标点也进题目（纯字表文章相等）
    }
  });

  it('《实践论》《矛盾论》选段用字可打，标题与来源齐全', () => {
    const titles = DEFAULT_ARTICLES.map(a => a.title);
    expect(titles.some(t => t.includes('实践论'))).toBe(true);
    expect(titles.some(t => t.includes('矛盾论'))).toBe(true);
    for (const a of DEFAULT_ARTICLES) expect(a.source && a.source.length > 0).toBe(true);
  });
});
