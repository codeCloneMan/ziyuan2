/**
 * 词组取码（以官方单字码表为准）
 *
 * 词长规则（每个字按"需要的键数"取码）：
 *   2 字词 = 2 + 2
 *   3 字词 = 1 + 1 + 2
 *   4 字及以上 = 1 + 1 + 1 + 末 1
 *
 * 单字取码优先用**恰好等于所需键数**的官方编码（简码优先）：
 *   - 无 = hmo / hw，取 2 键时用 hw（不是最长码 hmo 截出的 hm）→ 无法 = hwcb
 *   - 万 = lmo / lw / lwa，取 2 键时用 lw → 万岁 = lwim
 * 没有恰好键数的码时，才取更长官方码的前 N 键（法 = cbj → cb）。
 * 若该字所有码都短于所需键数（如 能 只有 j），则原样取最长码，
 * 该词码会不足 4 键（练习时按空格上屏，如 可能 = dkj）。
 *
 * 只认按本规则推导出的编码，不再接受"最长码截断"的变体（hmcb / lmim 判错）。
 */

import type { FullCodeInfo } from './full-codes';

export interface PhraseCodeInfo {
  /** 全部合法编码（去重，长度降序 → 词典序）；打出任意一个即算对 */
  accepted: string[];
  /** 主展示码（accepted[0]）逐字所用的那段码，按词中字的位置对齐（未参与的位为空串） */
  perChar: string[];
}

/** 该字在"需要 need 键"时的候选码（可能有多个等长写法） */
function candidatesFor(codes: readonly string[], need: number): string[] {
  const exact = [...new Set(codes.filter(c => c.length === need))];
  if (exact.length > 0) return exact;
  const longer = [...new Set(codes.filter(c => c.length > need).map(c => c.slice(0, need)))];
  if (longer.length > 0) return longer;
  const maxLen = Math.max(0, ...codes.map(c => c.length));
  if (maxLen === 0) return [];
  return [...new Set(codes.filter(c => c.length === maxLen).map(c => c.slice(0, need)))];
}

/** 词组取码位置表：[字位置, 需要键数] */
function positionSpec(len: number): Array<[number, number]> {
  if (len === 2) return [[0, 2], [1, 2]];
  if (len === 3) return [[0, 1], [1, 1], [2, 2]];
  return [[0, 1], [1, 1], [2, 1], [len - 1, 1]];
}

export function getPhraseCodeInfo(
  phrase: string,
  index: Map<string, FullCodeInfo>,
): PhraseCodeInfo | null {
  const chars = [...phrase];
  const len = chars.length;
  if (len < 2) return null;

  const spec = positionSpec(len);
  let combos: Array<{ code: string; parts: string[] }> = [{ code: '', parts: [] }];
  for (const [idx, need] of spec) {
    const info = index.get(chars[idx]);
    if (!info) return null;
    const cands = candidatesFor(info.accepted, need);
    if (cands.length === 0) return null;
    combos = combos.flatMap(prev => cands.map(c => ({ code: prev.code + c, parts: [...prev.parts, c] })));
  }

  const valid = combos.filter(c => c.code.length >= 2);
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.code.length - a.code.length || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

  const seen = new Set<string>();
  const accepted: string[] = [];
  for (const c of valid) {
    if (!seen.has(c.code)) {
      seen.add(c.code);
      accepted.push(c.code);
    }
  }

  // 逐字展示：主展示码的取码段按字位置对齐（≥4 字词的中间字不参与取码，留空串）
  const primary = valid[0];
  const perChar = chars.map(() => '');
  spec.forEach(([idx], i) => { perChar[idx] = primary.parts[i] ?? ''; });

  return { accepted, perChar };
}
