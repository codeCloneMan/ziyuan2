/**
 * 输入法候选（码 → 字）：候选框显示顺序与「顶第 1 候选」共用的唯一口径。
 *
 * 为什么不能让两处各写一套：码表是「字 → 编码」列表，反查「码 → 字」时，
 * 同码字在 Map 里的先后 = 该字**首次出现在码表里的行号**，而不是字频。
 * 例：「壭」先以全码 bjqo 出现（第 4990 条），「思」首次出现才是 bjs（第 5010 条），
 * 于是按插入顺序取 bjs 的第 1 个会取到壭，而候选框按字频排序显示的第 1 个是思——
 * 用户就会看到「候选框第 1 个是思，上屏的却是第 2 个壭」。
 * 所以同码字的顺序一律经 orderCharsByFrequency 得到，候选框与上屏都走它。
 */

import type { FullCodeInfo } from './full-codes';

/** 字频表：字 → 权重（未收录按 0 计） */
export type FrequencyTable = Readonly<Record<string, number | undefined>>;

/** 候选框最多显示的候选数（输入法习惯：数字键 1-9 选字） */
export const MAX_CANDIDATES = 9;

/** 码 → 同码字（顺序为码表插入顺序，仅作内部构造，对外取值请用 orderCharsByFrequency） */
export function buildCharsByCode(index: ReadonlyMap<string, FullCodeInfo>): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [ch, info] of index) {
    for (const code of info.accepted) {
      const arr = m.get(code);
      if (arr) {
        if (!arr.includes(ch)) arr.push(ch);
      } else {
        m.set(code, [ch]);
      }
    }
  }
  return m;
}

/**
 * 同码字按输入法候选口径排序：字频降序，同频保持传入顺序（稳定排序）。
 * 这是候选框与「顶第 1 候选」唯一的排序入口。
 */
export function orderCharsByFrequency(chars: readonly string[], freq: FrequencyTable): string[] {
  return [...chars].sort((a, b) => (freq[b] ?? 0) - (freq[a] ?? 0));
}

/** 该码的第 1 候选字（= 候选框里排在最前面的同码字）；码表里没有该码时返回 null */
export function firstCharForCode(
  code: string,
  charsByCode: ReadonlyMap<string, readonly string[]>,
  freq: FrequencyTable,
): string | null {
  const chars = charsByCode.get(code);
  if (!chars || chars.length === 0) return null;
  if (chars.length === 1) return chars[0];
  return orderCharsByFrequency(chars, freq)[0];
}

/**
 * 以已敲的码为前缀取候选字（输入法候选框内容）：
 * 排序 = 精确命中该码 → 码更短（简码优先）→ 字频更高；去重后最多 MAX_CANDIDATES 个。
 */
export function candidatesFor(
  prefix: string,
  charsByCode: ReadonlyMap<string, readonly string[]>,
  sortedCodes: readonly string[],
  freq: FrequencyTable,
): string[] {
  if (!prefix) return [];
  // 排序数组中，以 prefix 开头的码是一段连续区间：二分找下界
  let lo = 0;
  let hi = sortedCodes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedCodes[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  const pool: Array<{ char: string; len: number; exact: boolean }> = [];
  const seen = new Set<string>();
  for (let i = lo; i < sortedCodes.length; i++) {
    const code = sortedCodes[i];
    if (!code.startsWith(prefix)) break;
    const chars = charsByCode.get(code);
    if (!chars) continue;
    for (const ch of chars) {
      const key = `${code}|${ch}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ char: ch, len: code.length, exact: code.length === prefix.length });
    }
  }
  pool.sort((a, b) =>
    Number(b.exact) - Number(a.exact)
    || a.len - b.len
    || (freq[b.char] ?? 0) - (freq[a.char] ?? 0));
  const out: string[] = [];
  for (const c of pool) {
    if (!out.includes(c.char)) out.push(c.char);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

/**
 * 满 4 键 / 空格上屏时「打出的字」。
 *
 * - 精确命中该码 → 该码第 1 候选字（与候选框显示的第 1 个一致）；
 * - 未命中且 allowExtraKeyOverride（只用于「满 4 键自动上屏」且码不足 4 键时）：
 *   第 4 键是打在完整短码之后的多余键，回退到前 3 键的码，不追究（同输入法自动上屏）；
 * - 否则返回 null：这个码在码表里打不出字（练习里显示红叉）。
 */
export function resolveCommitChar(
  code: string,
  charsByCode: ReadonlyMap<string, readonly string[]>,
  freq: FrequencyTable,
  allowExtraKeyOverride = false,
): string | null {
  const exact = firstCharForCode(code, charsByCode, freq);
  if (exact) return exact;
  if (!allowExtraKeyOverride || code.length < 2) return null;
  return firstCharForCode(code.slice(0, code.length - 1), charsByCode, freq);
}
