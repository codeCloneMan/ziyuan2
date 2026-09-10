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

describe('全部编码判定（buildFullCodeIndex）', () => {
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

  it('主展示码 = 最长码；码表里列出的每一个编码都算对（含简码）', () => {
    expect(index.get('好')).toEqual({ fullCode: 'ahh', accepted: ['ahh', 'a'], alternates: ['a'] });
    expect(index.get('了')).toEqual({ fullCode: 'hle', accepted: ['hle', 'hli', 'h'], alternates: ['hli', 'h'] });
    expect(index.get('大')).toEqual({ fullCode: 'edai', accepted: ['edai', 'eda', 'e'], alternates: ['eda', 'e'] });
  });

  it('输入是任一编码的前缀时继续，命中任一编码即正确', () => {
    const accepted = index.get('了')!.accepted;
    // "hl" 是 hle/hli 的共同前缀 → 继续输入
    expect(accepted.some(c => c.startsWith('hl'))).toBe(true);
    // 打出第二个全码 hli → 判对
    expect(accepted.includes('hli')).toBe(true);
    // 打错（hlx 不是任何编码前缀）→ 判错
    expect(accepted.some(c => c.startsWith('hlx'))).toBe(false);
  });

  it('重复编码被去重', () => {
    const dup = buildFullCodeIndex([
      { char: '乐', code: 'uil' },
      { char: '乐', code: 'uil' },
      { char: '乐', code: 'uiyu' },
    ]);
    expect(dup.get('乐')!.accepted).toEqual(['uiyu', 'uil']);
  });

  it('真实码表：常用字的全部写法都被接受（乐/的/大/了/万）', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8')
    ) as { char: string; code: string }[];
    const realIndex = buildFullCodeIndex(data);
    for (const ch of common5000) {
      const info = realIndex.get(ch);
      expect(info, `${ch} 无码表数据`).toBeTruthy();
      // 主展示码就是最长码；其余写法都在 accepted 里
      expect(info!.accepted[0]).toBe(info!.fullCode);
      expect(info!.accepted).toEqual([info!.fullCode, ...info!.alternates]);
      for (const c of info!.accepted) {
        expect(c.length).toBeLessThanOrEqual(info!.fullCode.length);
        expect(c.length).toBeGreaterThan(0);
      }
    }
    // 用户实测案例：乐 uil 与 uiyu 都算对
    expect(realIndex.get('乐')!.accepted).toEqual(['uiyu', 'uil']);
    expect(realIndex.get('的')!.accepted).toEqual(['kav', 'k']);
    expect(realIndex.get('大')!.accepted).toEqual(['edai', 'eda', 'e']);
    expect(realIndex.get('万')!.accepted).toEqual(['lmo', 'lwa', 'lw']);
    // 等长多全码
    expect(realIndex.get('了')!.accepted).toEqual(['hle', 'hli', 'h']);
    expect(realIndex.get('地')!.accepted).toEqual(['blde', 'bldi', 'b']);
    expect(realIndex.get('会')!.accepted).toEqual(['snh', 'snk', 'sn']);
    expect(realIndex.get('种')!.accepted).toEqual(['tvc', 'tvz', 'tv']);
    expect(realIndex.get('见')!.accepted).toEqual(['uhj', 'uhx', 'uh']);
  });
});
