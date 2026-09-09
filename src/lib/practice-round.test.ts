import { describe, it, expect } from 'vitest';
import { recordRoundSeen, sanitizeRounds } from './practice-round';

describe('recordRoundSeen 轮次判定', () => {
  it('新题加入本轮，未满一轮返回 false', () => {
    const seen = new Set<string>();
    expect(recordRoundSeen(seen, 'a', 3)).toBe(false);
    expect(recordRoundSeen(seen, 'b', 3)).toBe(false);
    expect(seen.size).toBe(2);
  });

  it('答完池内最后一题返回 true，并清空集合进入下一轮', () => {
    const seen = new Set<string>(['a', 'b']);
    expect(recordRoundSeen(seen, 'c', 3)).toBe(true);
    expect(seen.size).toBe(0);
  });

  it('同一题重复作答只算一次（错题重练不会虚增本轮进度）', () => {
    const seen = new Set<string>();
    recordRoundSeen(seen, 'a', 3);
    expect(recordRoundSeen(seen, 'a', 3)).toBe(false);
    expect(seen.size).toBe(1);
  });

  it('空池 / 空 id 不计数，也不会误判完成', () => {
    const seen = new Set<string>();
    expect(recordRoundSeen(seen, 'a', 0)).toBe(false);
    expect(recordRoundSeen(seen, '', 3)).toBe(false);
    expect(seen.size).toBe(0);
  });

  it('完成一轮后可以继续累积下一轮，互不干扰', () => {
    const seen = new Set<string>();
    expect(recordRoundSeen(seen, 'a', 2)).toBe(false);
    expect(recordRoundSeen(seen, 'b', 2)).toBe(true);
    expect(recordRoundSeen(seen, 'a', 2)).toBe(false);
    expect(recordRoundSeen(seen, 'b', 2)).toBe(true);
    expect(seen.size).toBe(0);
  });
});

describe('sanitizeRounds 轮次记录清洗', () => {
  it('保留正整数轮次', () => {
    expect(sanitizeRounds({ 'root:beginner': 3, 'phrase:advanced': 1 })).toEqual({
      'root:beginner': 3,
      'phrase:advanced': 1,
    });
  });

  it('剔除负数 / 非数字 / 零值，避免损坏数据污染展示', () => {
    expect(sanitizeRounds({ a: -1, b: 0, c: 'x', d: NaN, e: Infinity, f: 2 })).toEqual({ f: 2 });
  });

  it('非对象输入回退空对象', () => {
    expect(sanitizeRounds(null)).toEqual({});
    expect(sanitizeRounds('bad')).toEqual({});
    expect(sanitizeRounds([1, 2])).toEqual({});
  });
});
