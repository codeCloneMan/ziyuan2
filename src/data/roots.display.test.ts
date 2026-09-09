/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  rootMappings,
  practiceRootMappings,
  PUA_ROOTS,
  ROOT_IMAGE_MANIFEST,
  getRootImagePath,
  dedupeRootsByDisplay,
  isRenderableRoot,
  type RootMapping,
} from './roots';
import { calcMasteredRootCount } from '../lib/mastered-count';

/**
 * 字根显示正确性单元测试
 *
 * 背景：历史上字根图按"键位内顺序推算文件名"加载，存在缺图、错图与
 * 重复图（r.png 与 r (7).png 内容完全相同）；同时 CJK 扩展G及以后的两个
 * 代理对字根（U+32FE3、U+475F3）被误判为"可渲染"，练习池里必然显示为
 * 豆腐块。本组测试锁定修复后的不变量。
 */
describe('字根图显式映射', () => {
  it('映射中引用的图片文件都真实存在于 public/roots/', () => {
    for (const [, file] of Object.entries(ROOT_IMAGE_MANIFEST)) {
      expect(existsSync(resolve(import.meta.dirname, '../../public/roots', file)), `缺少图片: ${file}`).toBe(true);
    }
  });

  it('getRootImagePath 只对有显式映射的字根返回路径', () => {
    const yi = rootMappings.find(r => r.codePoint === 0x382F)!; // 㠯
    const jie = rootMappings.find(r => r.codePoint === 0x353E)!; // 㔾
    expect(getRootImagePath(yi)).toBe('roots/b.png');
    expect(getRootImagePath(jie)).toBe('roots/j (4).png');
    // 未核验的字根一律回退文本描述，不再做位置推算
    const li = rootMappings.find(r => r.codePoint === 0xE106)!; // 立变（y 键无立形裁剪）
    expect(getRootImagePath(li)).toBeNull();
  });

  it('映射码点都在字根表内；共享同一文件的码点必须在同一键位', () => {
    const byFile = new Map<string, Set<string>>();
    for (const cp of Object.keys(ROOT_IMAGE_MANIFEST)) {
      const root = rootMappings.find(r => r.codePoint === Number(cp));
      expect(root, `映射码点 U+${Number(cp).toString(16)} 不在字根表`).toBeTruthy();
      const file = ROOT_IMAGE_MANIFEST[Number(cp)];
      if (!byFile.has(file)) byFile.set(file, new Set());
      byFile.get(file)!.add(root!.key);
    }
    for (const [file, keys] of byFile) {
      expect(keys.size, `图片 ${file} 被跨键位指派: ${[...keys].join(',')}`).toBe(1);
    }
  });
});

describe('扩展区字根判定', () => {
  it('CJK 扩展G及以后的代理对字根不可渲染；U+32FE3 有图入池，U+475F3 无图不入池', () => {
    // U+32FE3（键s，扩展G）、U+475F3（键j，平面4）
    expect(isRenderableRoot(0x32FE3)).toBe(false);
    expect(isRenderableRoot(0x475F3)).toBe(false);
    // s 键裁剪 6 图 = 6 字根穷举指认 U+32FE3 → s (3).png，可作答故入池
    expect(ROOT_IMAGE_MANIFEST[0x32FE3]).toBe('s (3).png');
    expect(practiceRootMappings.some(r => r.codePoint === 0x32FE3)).toBe(true);
    // U+475F3 无图且描述为裸码，用户无法作答，不入池
    expect(practiceRootMappings.some(r => r.codePoint === 0x475F3)).toBe(false);
  });

  it('每个不可渲染字根都有 PUA_ROOTS 描述（displayChar 不退化为 □）', () => {
    for (const r of rootMappings) {
      if (isRenderableRoot(r.codePoint)) continue;
      expect(PUA_ROOTS[r.codePoint], `U+${r.codePoint.toString(16).toUpperCase()} 缺少 desc`).toBeTruthy();
      expect(r.displayChar).not.toBe('□');
    }
  });

  it('PUA_ROOTS 中的码点都在字根表内（无死配置）', () => {
    const rawCps = new Set(rootMappings.map(r => r.codePoint));
    for (const cp of Object.keys(PUA_ROOTS)) {
      expect(rawCps.has(Number(cp)), `PUA_ROOTS 多余条目 U+${Number(cp).toString(16).toUpperCase()}`).toBe(true);
    }
  });
});

describe('同键同形字根去重', () => {
  const fake = (displayChar: string, key: string, cp: number): RootMapping => ({
    char: displayChar,
    key,
    codePoint: cp,
    isPUA: false,
    displayChar,
  });

  it('同键同显示文本只保留首个（頁变×3 场景）', () => {
    const list = [
      fake('頁变', 'c', 0xE491),
      fake('頁变', 'c', 0xE50F),
      fake('見变', 'c', 0xE492),
      fake('頁变', 'c', 0xE48A),
    ];
    expect(dedupeRootsByDisplay(list).map(r => r.codePoint)).toEqual([0xE491, 0xE492]);
  });

  it('同名但键位不同的变体保留（老变 d/u 场景）', () => {
    const list = [fake('老变', 'd', 0xE431), fake('老变', 'u', 0xE478)];
    expect(dedupeRootsByDisplay(list)).toHaveLength(2);
  });
});

describe('练习池（虎码模式：全部字根入练）', () => {
  it('每个练习池字根都可作答：有配图或有语义描述', () => {
    for (const r of practiceRootMappings) {
      const hasImage = r.codePoint in ROOT_IMAGE_MANIFEST;
      const semanticDesc = !/^U\+[0-9A-Fa-f]{4,6}$/.test(r.displayChar);
      expect(hasImage || semanticDesc, `字根 ${r.displayChar}(U+${r.codePoint.toString(16)}) 既无图也无语义描述`).toBe(true);
    }
  });

  it('同键位同图/同描述的变体只保留一个（頁变×3 → 1）', () => {
    const ye = practiceRootMappings.filter(r => r.desc === '頁变');
    expect(ye).toHaveLength(1);
  });

  it('跨键位同名变体保留（老变 d/u、灬变 o/v、歹变 i/j）', () => {
    for (const desc of ['老变', '灬变', '歹变']) {
      const keys = new Set(practiceRootMappings.filter(r => r.desc === desc).map(r => r.key));
      expect(keys.size, `${desc} 应出现在多个键位`).toBeGreaterThan(1);
    }
  });

  it('池内无重复（键位+图/描述 标签唯一）且渲染字根全部在池', () => {
    const labels = practiceRootMappings.map(r => `${r.key}|${ROOT_IMAGE_MANIFEST[r.codePoint] ?? r.displayChar}`);
    expect(new Set(labels).size).toBe(labels.length);
    // 渲染字根原本就各不相同，必须全部在池内
    const renderable = rootMappings.filter(r => isRenderableRoot(r.codePoint));
    for (const r of renderable) {
      expect(practiceRootMappings.some(p => p.codePoint === r.codePoint)).toBe(true);
    }
  });
});

describe('calcMasteredRootCount 池过滤', () => {
  it('传入池列表后不统计池外字根（历史残留不计）', () => {
    const map = { '白': 3, 'legacy': 9 };
    expect(calcMasteredRootCount(map)).toBe(2); // 不传池：按旧口径
    expect(calcMasteredRootCount(map, ['白'])).toBe(1); // 传池：legacy 不计
  });
});
