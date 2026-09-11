/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from './full-codes';
import { normalizeRootAnswer, charBelongsToKey, isRootAnswerCorrect } from './root-answer';
import { rootMappings } from '@/data/roots';

const data = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8'),
) as { char: string; code: string }[];
const index = buildFullCodeIndex(data);

describe('字根练习：用输入法打汉字作答', () => {
  it('归一化：字母→键位，汉字→汉字，其它忽略', () => {
    expect(normalizeRootAnswer('M')).toEqual({ kind: 'key', key: 'm' });
    expect(normalizeRootAnswer('x')).toEqual({ kind: 'key', key: 'x' });
    expect(normalizeRootAnswer('木')).toEqual({ kind: 'char', char: '木' });
    expect(normalizeRootAnswer('  水 ')).toEqual({ kind: 'char', char: '水' });
    // 输入法一次上屏多个字符：取第一个字
    expect(normalizeRootAnswer('马克思')).toEqual({ kind: 'char', char: '马' });
    // 标点 / 空白 / 空串 → 不作答（调用方忽略，不计错）
    expect(normalizeRootAnswer('')).toBeNull();
    expect(normalizeRootAnswer('  ')).toBeNull();
    expect(normalizeRootAnswer('，')).toBeNull();
    expect(normalizeRootAnswer('1')).toBeNull();
  });

  it('汉字按「码表编码首键」归属判定（真实码表）', () => {
    // 木 = xm / xmu → 归 x
    expect(charBelongsToKey('木', 'x', index)).toBe(true);
    expect(charBelongsToKey('木', 'm', index)).toBe(false);
    // 水 = cs / csh → 归 c
    expect(charBelongsToKey('水', 'c', index)).toBe(true);
    // 土 = bt → 归 b；火 = vh → 归 v
    expect(charBelongsToKey('土', 'b', index)).toBe(true);
    expect(charBelongsToKey('火', 'v', index)).toBe(true);
    // 码表里没有的字（私用区变体）→ 不归任何键
    expect(charBelongsToKey('\uE000', 's', index)).toBe(false);
  });

  it('判定入口：字母走字面，汉字走首键', () => {
    expect(isRootAnswerCorrect({ kind: 'key', key: 'x' }, 'x', index)).toBe(true);
    expect(isRootAnswerCorrect({ kind: 'key', key: 'm' }, 'x', index)).toBe(false);
    expect(isRootAnswerCorrect({ kind: 'char', char: '木' }, 'x', index)).toBe(true);
    expect(isRootAnswerCorrect({ kind: 'char', char: '木' }, 'c', index)).toBe(false);
  });

  it('官方字根表自证：字根汉字的码表首键 == 字根键位（覆盖率 ≥99%）', () => {
    let ok = 0;
    let total = 0;
    const bad: string[] = [];
    for (const r of rootMappings) {
      const codes = index.get(r.char)?.accepted ?? [];
      if (codes.length === 0) continue;   // 变体字根在码表里没有独立条目
      total++;
      if (codes.some(c => c[0] === r.key)) ok++;
      else bad.push(`${r.char}(${r.key})`);
    }
    expect(total).toBeGreaterThan(300);
    expect(ok / total).toBeGreaterThan(0.99);
    expect(bad).toEqual(['𲿣(s)']);   // 私用区变体：字根表键位与码表编码不一致
  });
});
