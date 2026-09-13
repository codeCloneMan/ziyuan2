import { describe, it, expect } from 'vitest';
import { DEFAULT_ARTICLES } from './articles';
import { GENDA_ARTICLES } from './genda-articles.generated';

/**
 * 默认文章列表:自有文章 + genda 文章库(单字池/宇浩文章),
 * 每篇 id 唯一、正文非空、分组正确。
 */
describe('默认文章列表', () => {
  it('包含 genda 文章库的全部单字池与文章', () => {
    for (const g of GENDA_ARTICLES) {
      const found = DEFAULT_ARTICLES.find(a => a.id === `genda:${g.id}`);
      expect(found, g.id).toBeDefined();
      expect(found?.text).toBe(g.text);
      expect(found?.group).toBe(g.type === 'character' ? 'char' : 'article');
    }
  });

  it('包含自有文章(实践论/矛盾论/常用字练习文段)', () => {
    for (const id of ['shijianlun', 'maodunlun', 'common']) {
      expect(DEFAULT_ARTICLES.find(a => a.id === id)).toBeDefined();
    }
  });

  it('id 唯一且正文非空', () => {
    const ids = DEFAULT_ARTICLES.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_ARTICLES.every(a => a.text.trim().length > 0)).toBe(true);
  });

  it('单字池分组正确且无标点', () => {
    const charPools = DEFAULT_ARTICLES.filter(a => a.group === 'char');
    expect(charPools.length).toBeGreaterThanOrEqual(8);
    expect(charPools.every(a => !/[\s，。、；：？！“”（）《》—…]/.test(a.text))).toBe(true);
  });
});
