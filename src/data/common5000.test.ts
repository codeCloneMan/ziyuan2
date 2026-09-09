/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { common5000 } from './builtinCharSets';
import { GB2312_CHARS } from './standardCharsets';
import { charFrequency } from './charFrequency';
import { buildFullCodeIndex } from '../lib/full-codes';

/**
 * 整字练习题库（常用前5000字）与多全码判定。
 *
 * 背景：旧"常用8000"基于 tongguiChars（近似字集），尾部混有大量字频为 0
 * 的凑数字；整字练习又只认码表里 find() 命中的第一个码（往往是简码），
 * 导致"好"要打 1 个键、"了"的第二个全码被判错。
 */
describe('常用前5000字题库', () => {
  it('恰好 5000 字、无重复、全部属于 GB2312 国标字集', () => {
    expect(common5000).toHaveLength(5000);
    expect(new Set(common5000).size).toBe(5000);
    const gb = new Set(GB2312_CHARS);
    for (const ch of common5000) {
      expect(gb.has(ch), `${ch} 不在 GB2312`).toBe(true);
    }
  });

  it('全部有真实字频且按字频降序（无凑数字）', () => {
    for (const ch of common5000) {
      expect(charFrequency[ch], `${ch} 无字频数据`).toBeGreaterThan(0);
    }
    for (let i = 1; i < common5000.length; i++) {
      expect(charFrequency[common5000[i - 1]]).toBeGreaterThanOrEqual(charFrequency[common5000[i]]);
    }
  });

  it('高频常用字都在题库内', () => {
    for (const ch of ['的', '一', '是', '不', '了', '人', '我', '在', '有', '他', '这', '中', '国', '大', '好']) {
      expect(common5000.includes(ch), `${ch} 缺失`).toBe(true);
    }
  });
});

describe('多全码判定（buildFullCodeIndex）', () => {
  const index = buildFullCodeIndex([
    { char: '好', code: 'a' },     // 一级简码
    { char: '好', code: 'ahh' },   // 全码
    { char: '了', code: 'h' },     // 一级简码
    { char: '了', code: 'hle' },   // 全码 1
    { char: '了', code: 'hli' },   // 全码 2
    { char: '大', code: 'e' },
    { char: '大', code: 'eda' },
    { char: '大', code: 'edai' },
  ]);

  it('全码 = 最长码；等长的多个全码全部接受，简码不作为答案', () => {
    expect(index.get('好')).toEqual({ fullCode: 'ahh', accepted: ['ahh'] });
    expect(index.get('了')).toEqual({ fullCode: 'hle', accepted: ['hle', 'hli'] });
    expect(index.get('大')).toEqual({ fullCode: 'edai', accepted: ['edai'] });
  });

  it('输入是任一全码的前缀时继续，命中任一全码即正确', () => {
    const accepted = index.get('了')!.accepted;
    // "hl" 是 hle/hli 的共同前缀 → 继续输入
    expect(accepted.some(c => c.startsWith('hl'))).toBe(true);
    // 打出第二个全码 hli → 判对
    expect(accepted.includes('hli')).toBe(true);
    // 打错（hlx 不是任何全码前缀）→ 判错
    expect(accepted.some(c => c.startsWith('hlx'))).toBe(false);
  });

  it('真实码表：常用多全码字（了/地/会/种/见）全部全码都被接受', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8')
    ) as { char: string; code: string }[];
    const realIndex = buildFullCodeIndex(data);
    // 每个常用字都应有全码，且 accepted 内全部等长（最长）
    for (const ch of common5000) {
      const info = realIndex.get(ch);
      expect(info, `${ch} 无码表数据`).toBeTruthy();
      for (const c of info!.accepted) expect(c.length).toBe(info!.fullCode.length);
      expect(info!.accepted).toContain(info!.fullCode);
    }
    // 多全码样例：第二个全码也在 accepted 中
    expect(realIndex.get('了')!.accepted).toEqual(['hle', 'hli']);
    expect(realIndex.get('地')!.accepted).toEqual(['blde', 'bldi']);
    expect(realIndex.get('会')!.accepted).toEqual(['snh', 'snk']);
    expect(realIndex.get('种')!.accepted).toEqual(['tvc', 'tvz']);
    expect(realIndex.get('见')!.accepted).toEqual(['uhj', 'uhx']);
  });
});
