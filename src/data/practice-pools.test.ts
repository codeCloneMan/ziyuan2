/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from '@/lib/full-codes';
import { getPhraseCodeInfo } from '@/lib/phrase-codes';
import { shortestCodeLength } from '@/lib/full-codes';
import {
  practiceChars500,
  practiceChars5000,
  practicePhrases500,
  practicePhrases5000,
} from './practice-pools.generated';

const data = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8'),
) as { char: string; code: string }[];
const index = buildFullCodeIndex(data);

const countWithLen = (pool: readonly string[], n: number) =>
  pool.filter(ch => index.get(ch)?.accepted.some(c => c.length === n)).length;

describe('练习题库（附件字频/词频前 N，官方码表校验）', () => {
  it('池大小与首项保持附件字频/词频序', () => {
    expect(practiceChars500).toHaveLength(500);
    // 前 5000 条里剔除 4 个国标外字（镕瞭跶祇）
    expect(practiceChars5000).toHaveLength(4996);
    expect(practicePhrases500).toHaveLength(500);
    expect(practicePhrases5000).toHaveLength(5000);
    expect(practiceChars500.slice(0, 5)).toEqual(['的', '是', '我', '不', '了']);
    expect(practicePhrases5000.slice(0, 3)).toEqual(['就是', '一个', '但是']);
  });

  it('每个字都在官方码表里，且入门池 = 进阶池前 500', () => {
    for (const ch of practiceChars5000) expect(index.has(ch)).toBe(true);
    expect(practiceChars5000.slice(0, 500)).toEqual([...practiceChars500]);
  });

  it('码长档（1简/2简/3简/4码）各档都有字', () => {
    for (const n of [1, 2, 3, 4]) expect(countWithLen(practiceChars5000, n)).toBeGreaterThan(0);
    expect(countWithLen(practiceChars5000, 4)).toBeGreaterThan(500);
    expect(countWithLen(practiceChars500, 1)).toBeGreaterThan(0);
  });

  it('每个词都能按词组取码规则拼出编码（否则不入池）', () => {
    for (const w of practicePhrases5000) expect(getPhraseCodeInfo(w, index)).not.toBeNull();
    for (const w of practicePhrases500) expect(getPhraseCodeInfo(w, index)).not.toBeNull();
  });

  it('词池保留 4 字词', () => {
    expect(practicePhrases5000.some(w => w.length === 4)).toBe(true);
    expect(practicePhrases5000).toContain('作为一个');
    expect(getPhraseCodeInfo('作为一个', index)?.accepted).toEqual(['svqs']);
  });

  it('含「只有 1 键码」的字的词保留在池里（码不足 4 键，按空格上屏）', () => {
    expect(practicePhrases5000).toContain('可能');
    expect(getPhraseCodeInfo('可能', index)?.accepted).toEqual(['dkj']);
    expect(getPhraseCodeInfo('可能', index)?.perChar).toEqual(['dk', 'j']);
  });

  it('无法按官方码优先取码（不是最长码截断的 hmcb）', () => {
    expect(practicePhrases5000).toContain('无法');
    expect(getPhraseCodeInfo('无法', index)?.accepted).toEqual(['hwcb']);
  });
});

describe('词长档与码长互斥归类', () => {
  it('词池按词长可分档（2 字词 / 4 字词）', () => {
    const two = practicePhrases5000.filter(w => w.length === 2).length;
    const four = practicePhrases5000.filter(w => w.length === 4).length;
    expect(two).toBe(4654);
    expect(four).toBe(346);
    expect(practicePhrases500.filter(w => w.length === 2).length).toBe(497);
    expect(practicePhrases500.filter(w => w.length === 4).length).toBe(3);
  });

  it('码长档按「最短码长」互斥归类：1/2/3/4 档之和 = 全部池', () => {
    const cls = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const ch of practiceChars5000) {
      const n = shortestCodeLength(index.get(ch));
      expect(n).toBeGreaterThanOrEqual(1);
      cls[n as 1 | 2 | 3 | 4]++;
    }
    expect(cls[1] + cls[2] + cls[3] + cls[4]).toBe(practiceChars5000.length);
    expect(cls[1]).toBe(26);   // 一级简码字
    expect(cls[2]).toBe(646);
    expect(cls[4]).toBe(964);
  });

  it('最短码长工具：的=1、两=2、乐=3、单 4 码字=4', () => {
    expect(shortestCodeLength(index.get('的'))).toBe(1);   // k / kav
    expect(shortestCodeLength(index.get('两'))).toBe(2);   // wl / wli
    expect(shortestCodeLength(index.get('乐'))).toBe(3);   // uil / uiyu
    expect(shortestCodeLength(index.get('揽'))).toBe(4);   // djth
    expect(shortestCodeLength(undefined)).toBe(0);
  });
});
