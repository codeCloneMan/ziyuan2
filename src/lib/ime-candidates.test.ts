/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex, type FullCodeInfo } from './full-codes';
import {
  buildCharsByCode, orderCharsByFrequency, firstCharForCode, candidatesFor, resolveCommitChar,
} from './ime-candidates';

/**
 * 候选顺序回归：
 * 曾经「壭」先以全码 bjqo 出现在码表里、「思」首次出现才是 bjs，
 * 于是按插入顺序取 bjs 的第 1 个得到壭（候选框里的第 2 个），
 * 而候选框按字频显示的第 1 个是思 —— 用户看到「默认选了第二个」。
 */
describe('候选顺序（字频口径）', () => {
  /** 故意让「壭」插在「思」前面，复现码表首次出现顺序的陷阱 */
  const index = new Map<string, FullCodeInfo>([
    ['壭', { fullCode: 'bjqo', accepted: ['bjqo', 'bjs'], alternates: ['bjs'] }],
    ['思', { fullCode: 'bjs', accepted: ['bjs'], alternates: [] }],
    ['壵', { fullCode: 'bbbq', accepted: ['bbbq'], alternates: [] }],
  ]);
  const charsByCode = buildCharsByCode(index);
  const sortedCodes = [...charsByCode.keys()].sort();
  const freq = { 思: 5000, 壭: 1, 壵: 2 };

  it('码 → 字的插入顺序确实是构造陷阱的那个顺序', () => {
    expect(charsByCode.get('bjs')).toEqual(['壭', '思']);
  });

  it('第 1 候选字按字频取，与插入顺序无关', () => {
    expect(firstCharForCode('bjs', charsByCode, freq)).toBe('思');
    expect(orderCharsByFrequency(['壭', '思'], freq)).toEqual(['思', '壭']);
  });

  it('候选框第 1 个 == 满 4 键/空格上屏打出的字', () => {
    const cands = candidatesFor('bjs', charsByCode, sortedCodes, freq);
    expect(cands[0]).toBe('思');
    expect(resolveCommitChar('bjs', charsByCode, freq)).toBe(cands[0]);
  });

  it('候选框：精确命中排在前、简码次之、字频高的优先，最多 9 个', () => {
    expect(candidatesFor('b', charsByCode, sortedCodes, freq)).toEqual(['思', '壭', '壵']);
    expect(candidatesFor('', charsByCode, sortedCodes, freq)).toEqual([]);
    expect(candidatesFor('zz', charsByCode, sortedCodes, freq)).toEqual([]);
  });

  it('第 4 键多打不追究（回退前 3 键），且空码打不出字给 null', () => {
    expect(resolveCommitChar('bjsx', charsByCode, freq, true)).toBe('思');
    expect(resolveCommitChar('bjsx', charsByCode, freq)).toBeNull();
    expect(resolveCommitChar('zzzz', charsByCode, freq, true)).toBeNull();
  });
});

describe('真实码表回归（public/data/charCodeData.json）', () => {
  const data = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8'),
  ) as Array<{ char: string; code: string }>;
  const index = buildFullCodeIndex(data);
  const charsByCode = buildCharsByCode(index);
  const sortedCodes = [...charsByCode.keys()].sort();
  // 字频表里没有的字按 0 计，这里只需要「思 > 壭」这种相对关系成立
  const freq = { 思: 1, 壭: 0 };

  it('bjs：插入顺序是壭在前，但上屏与候选框第 1 个都是思', () => {
    expect(charsByCode.get('bjs')).toEqual(['壭', '思']);
    expect(firstCharForCode('bjs', charsByCode, freq)).toBe('思');
    const cands = candidatesFor('bjs', charsByCode, sortedCodes, freq);
    expect(cands[0]).toBe('思');
    expect(resolveCommitChar('bjs', charsByCode, freq)).toBe('思');
  });

  it('抽样：凡是精确命中某码的，上屏字都等于候选框第 1 个', () => {
    let checked = 0;
    for (let i = 0; i < sortedCodes.length; i += 397) {
      const code = sortedCodes[i];
      const cands = candidatesFor(code, charsByCode, sortedCodes, freq);
      expect(resolveCommitChar(code, charsByCode, freq)).toBe(cands[0]);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('空格只认精确码：不足 4 键的码前缀不打字（回退开关只用于满 4 键）', () => {
    // 'bjq' 不是码 → 空格上屏打不出字；满 4 键时才回退到前 3 键
    if (!charsByCode.has('bjq')) {
      expect(resolveCommitChar('bjq', charsByCode, freq)).toBeNull();
      expect(resolveCommitChar('bjqx', charsByCode, freq, true)).toBeNull();
    }
  });
});
