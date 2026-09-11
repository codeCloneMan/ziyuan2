import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ARTICLES, COMMON500_ARTICLE, COMMON500_ARTICLE_ID, shuffledCommon500Text,
} from './articles';
import { practiceChars500 } from './practice-pools.generated';

/**
 * 前 500 常用字练习文章：必须与整字/词组练习的 500 池完全同序，
 * 乱序版只能是同一批字的不同排列（不能丢字/加字）。
 */
describe('常用字 500 练习文章', () => {
  it('已进入默认文章列表，且标记为可乱序', () => {
    const found = DEFAULT_ARTICLES.find(a => a.id === COMMON500_ARTICLE_ID);
    expect(found).toBeDefined();
    expect(found?.shufflable).toBe(true);
    expect(found?.text).toBe(COMMON500_ARTICLE.text);
  });

  it('正文 = 500 池按字频序、每行 20 字', () => {
    const lines = COMMON500_ARTICLE.text.split('\n');
    expect(lines).toHaveLength(Math.ceil(practiceChars500.length / 20));
    expect(lines.every(l => l.length === 20)).toBe(true);
    expect([...COMMON500_ARTICLE.text.replace(/\n/g, '')]).toEqual([...practiceChars500]);
  });

  it('乱序版字集与顺序版完全相同，且顺序被打乱', () => {
    const shuffled = shuffledCommon500Text();
    const flat = [...shuffled.replace(/\n/g, '')];
    expect(flat).toHaveLength(practiceChars500.length);
    expect([...flat].sort().join('')).toBe([...practiceChars500].sort().join(''));
    expect(shuffled).not.toBe(COMMON500_ARTICLE.text);
  });

  it('每行都是 GB2312 常用字（可直接练习，无需跳过标点）', () => {
    // 换行是排版用的行分隔，剩下的内容里不应该出现标点或空白
    expect(COMMON500_ARTICLE.text.replace(/\n/g, '')).not.toMatch(/[\s，。、；：？！“”（）《》—…]/);
  });
});
