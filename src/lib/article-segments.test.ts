import { describe, it, expect } from 'vitest';
import { splitSegments, shuffleRangeText, shuffleFullText } from './article-segments';

describe('splitSegments', () => {
  it("'all' 时全文为一段", () => {
    const segs = splitSegments('你好\n世界', 'all');
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe('你好\n世界');
    expect(segs[0]).toEqual({ start: 0, end: 5, text: '你好\n世界' });
  });

  it('按段长切段，自然行不断开', () => {
    const text = '一二三四五\n六七八九十';
    const segs = splitSegments(text, 5);
    expect(segs.map(s => s.text)).toEqual(['一二三四五', '六七八九十']);
    expect(segs[1].start).toBe(6);
  });

  it('一行超过段长时切块且吃到行尾', () => {
    const text = '一二三四五六七八';
    const segs = splitSegments(text, 5);
    expect(segs.map(s => s.text)).toEqual(['一二三四五', '六七八']);
    expect(segs[1].start).toBe(5);
  });

  it('空文本不产生段', () => {
    expect(splitSegments('', 50)).toEqual([]);
    expect(splitSegments('a\n\nb', 'all')).toHaveLength(1);
  });
});

describe('shuffleRangeText', () => {
  it('空白留在原位，字符集合不变', () => {
    const text = '一二三\n四五六';
    const out = shuffleRangeText(text, 0, 7);
    expect([...out].filter(c => c === '\n')).toHaveLength(1);
    expect(out.replace(/\n/g, '').split('').sort().join('')).toBe(
      '一二三四五六'.split('').sort().join(''),
    );
  });

  it('只打乱指定区间', () => {
    const text = '一二三四五六';
    const out = shuffleRangeText(text, 0, 3);
    expect(out.slice(3, 6)).toBe('四五六');
  });

  it('单字区间打乱后不变', () => {
    expect(shuffleRangeText('甲乙丙', 1, 2)).toBe('甲乙丙');
  });
});

describe('shuffleFullText', () => {
  it('全文乱序保持多字节字符完整', () => {
    const out = shuffleFullText('汉字abc123');
    expect(out).toHaveLength(8);
  });
});
