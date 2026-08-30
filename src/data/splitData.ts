/**
 * 字源形码 v1.32 单字拆分数据
 * 格式：字 → 拆分组件（如 "的" → "白勹丶"）
 * 数据来源：public/字源拆分.txt（20,901条）
 */

import splitRaw from './字源拆分.txt?raw';

/** 汉字 → 拆分字符串 */
export const charSplits = new Map<string, string>();

{
  const lines = splitRaw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    const tabIdx = trimmed.indexOf('\t');
    if (tabIdx === -1) continue;
    const char = trimmed.slice(0, tabIdx);
    const split = trimmed.slice(tabIdx + 1).trim();
    if (char && split) {
      charSplits.set(char, split);
    }
  }
}

/**
 * 获取单字拆分信息
 * @param char 汉字
 * @returns 拆分字符串，如 "白勹丶"，未找到返回 null
 */
export function getCharSplit(char: string): string | null {
  return charSplits.get(char) ?? null;
}

/**
 * 获取词组的逐字拆分
 * @param phrase 词组
 * @returns 每个字的拆分数组，如 ["白勹丶", "禾口"]
 */
export function getPhraseSplits(phrase: string): (string | null)[] {
  return phrase.split('').map(ch => charSplits.get(ch) ?? null);
}
