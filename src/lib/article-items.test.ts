/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from './full-codes';
import { buildArticleItems } from './article-items';
import { DEFAULT_ARTICLES } from '@/data/articles';

const data = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8'),
) as { char: string; code: string }[];
const index = buildFullCodeIndex(data);

const isHan = (ch: string) => ch >= '\u4e00' && ch <= '\u9fff';

describe('文章练习题目序列', () => {
  it('标点、换行、码表缺字被跳过，只保留可打的汉字', () => {
    const items = buildArticleItems('你好，世界！\nabc', index);
    expect(items.map(i => i.char)).toEqual(['你', '好', '世', '界']);
    expect(items.every(i => i.codes.length > 0)).toBe(true);
  });

  it('textIndex 指向原文下标（渲染定位用）', () => {
    const items = buildArticleItems('a你，好', index);
    expect(items.map(i => i.textIndex)).toEqual([1, 3]);
  });

  it('默认文章均为成段文章，且汉字几乎全部可打（缺字仅自动跳过）', () => {
    expect(DEFAULT_ARTICLES.length).toBeGreaterThanOrEqual(3);
    for (const article of DEFAULT_ARTICLES) {
      const han = [...article.text].filter(isHan);
      expect(han.length).toBeGreaterThan(300);
      const items = buildArticleItems(article.text, index);
      const playable = han.length === 0 ? 0 : items.length / han.length;
      expect(playable).toBeGreaterThan(0.98);
    }
  });

  it('《实践论》《矛盾论》选段用字可打，标题与来源齐全', () => {
    const titles = DEFAULT_ARTICLES.map(a => a.title);
    expect(titles.some(t => t.includes('实践论'))).toBe(true);
    expect(titles.some(t => t.includes('矛盾论'))).toBe(true);
    for (const a of DEFAULT_ARTICLES) expect(a.source && a.source.length > 0).toBe(true);
  });
});
