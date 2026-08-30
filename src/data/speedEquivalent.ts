/**
 * 速度当量计算（对标社区官方口径）
 *
 * 当量表使用陈一凡键位相关速度当量矩阵（见 speed-table.gen.ts 头注），
 * 与宇浩测码 / 虎测评等社区工具发布的「全码速度当量」同源同口径，
 * 测得数值可与官方发布数据直接对比（如字源 v1.30 = 1.3473）。
 */

import { SPEED_EQUIVALENT_SOURCE, TABLE } from './speed-table.gen';

export { SPEED_EQUIVALENT_SOURCE };

export const speedEquivalentTable: Record<string, number> = TABLE;

/** 查询键对当量；未知键对（如含标点/通配符）按最慢档 2.1 处理 */
export function getSpeedEquivalent(key1: string, key2: string): number {
  const k1 = key1.toLowerCase();
  const k2 = key2.toLowerCase();
  return TABLE[k1 + k2] ?? 2.1;
}

/**
 * 速度指数 = 100 / 速度当量（社区通用换算），
 * 直观反映相对理论速度上限（纯当量 1.0 时为 100）。
 */
export function calcSpeedIndex(speedEquivalent: number): number {
  if (speedEquivalent <= 0) return 0;
  return Math.round((100 / speedEquivalent) * 100) / 100;
}

/**
 * 计算字频加权速度当量（宇浩官方算法口径）
 *
 * - 不用空格补齐码长，仅统计编码中实际存在的字母二元组
 * - 跳过非字母字符（数字、通配符等）组成的二元组
 * - 参考：https://shurufa.app/docs/statistics
 */
export function calcWeightedSpeedEquivalent(
  entries: Array<{ char: string; code: string }>,
  charFrequency: Record<string, number>,
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const entry of entries) {
    const freq = charFrequency[entry.char] || 0;
    if (freq === 0) continue;

    const code = entry.code.toLowerCase();
    // 提取编码中的纯字母序列（过滤数字和通配符等非字母字符）
    const letters: string[] = [];
    for (const ch of code) {
      if (ch >= 'a' && ch <= 'z') {
        letters.push(ch);
      }
    }

    // 至少需要 2 个字母才能构成二元组
    if (letters.length < 2) continue;

    // 仅计算实际字母相邻对的速度当量，跳过非字母间隔
    for (let i = 0; i < letters.length - 1; i++) {
      const eq = getSpeedEquivalent(letters[i], letters[i + 1]);
      weightedSum += eq * freq;
      totalWeight += freq;
    }
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10000) / 10000 : 0;
}
