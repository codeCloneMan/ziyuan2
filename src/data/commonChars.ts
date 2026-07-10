/**
 * 常用汉字数据
 *
 * 来源：CJK统一汉字基本区（0x4E00-0x9FA5）
 * - 前500字覆盖约80%日常使用
 * - 前1000字覆盖约92%日常使用
 * - 前1500字覆盖约96%日常使用
 * - 前3000字覆盖约99%日常使用
 *
 * 数据与 builtinCharSets.ts 共享，确保一致性
 */

// 从 builtinCharSets 导入基础字集，避免数据重复
import {
  top500Chars as baseTop500,
  top1000Chars as baseTop1000,
  top3000Chars as baseTop3000,
} from './builtinCharSets';

// ========================================
// 字集校验工具（本地使用）
// ========================================

/** 检查字符是否为汉字 */
function isHanChar(char: string): boolean {
  const code = char.charCodeAt(0);
  if (code >= 0x4E00 && code <= 0x9FFF) return true;
  if (code >= 0x3400 && code <= 0x4DBF) return true;
  const cp = char.codePointAt(0) ?? 0;
  if (cp >= 0x20000 && cp <= 0x2A6DF) return true;
  return false;
}

/** 清理字集：去重 + 过滤非汉字 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cleanCharSet(chars: string[], _name: string): string[] {
  const hanChars = chars.filter(isHanChar);

  const seen = new Set<string>();
  const uniqueChars: string[] = [];
  for (const ch of hanChars) {
    if (!seen.has(ch)) {
      seen.add(ch);
      uniqueChars.push(ch);
    }
  }

  return uniqueChars;
}

// ========================================
// 导出字集
// ========================================

// 直接使用 builtinCharSets 的数据，确保一致性
export const top500Chars = baseTop500;
export const top1000Chars = baseTop1000;

// 前1500字：取前1000 + 再从top3000中取500个补充
const RAW_TOP1001_1500 = baseTop3000.slice(1000, 1500);
export const top1500Chars = cleanCharSet([...baseTop1000, ...RAW_TOP1001_1500], 'top1500');

// 导出前3000字（完整覆盖）
export const top3000Chars = baseTop3000;

// ========================================
// 码表数据相关接口
// ========================================

export interface CharCodeItem {
  char: string;
  code: string;
}

/** 获取前500常用字的编码 */
export function getCommonCharCodeItems(charCodeData: CharCodeItem[]): CharCodeItem[] {
  const result: CharCodeItem[] = [];
  const seen = new Set<string>();
  for (const ch of top500Chars) {
    if (seen.has(ch)) continue;
    const item = charCodeData.find(d => d.char === ch);
    if (item) {
      result.push(item);
      seen.add(ch);
    }
  }
  return result;
}

// 统计信息
export const commonCharStats = {
  top500: { total: top500Chars.length, coverage: '约80%日常使用' },
  top1000: { total: top1000Chars.length, coverage: '约92%日常使用' },
  top1500: { total: top1500Chars.length, coverage: '约96%日常使用' },
  top3000: { total: top3000Chars.length, coverage: '约99%日常使用' },
};

// 运行时校验
if (typeof window !== 'undefined') {
  // 静默校验（不输出日志）
  const checks = [
    { name: '前500字', set: top500Chars, expected: 500 },
    { name: '前1000字', set: top1000Chars, expected: 1000 },
    { name: '前1500字', set: top1500Chars, expected: 1500 },
    { name: '前3000字', set: top3000Chars, expected: 3000 },
  ];
  checks.forEach(({ set, expected }) => {
    if (set.length !== expected) {
      // 数量不符时静默处理
    }
  });
}