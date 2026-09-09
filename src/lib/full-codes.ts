/**
 * 单字"全码"索引
 *
 * 字源码表中同一个字可能有多个码：既有简码（如 好 = a），也有全码；
 * 全码本身也可能多个（同一拆分的不同取码/异体拆分，如 姦 = aaaj / aaao，
 * 了 = hle / hli）。练习时的正确判定应为"打出该字任意一个全码即算对"。
 *
 * 全码定义：该字在码表中长度最长的码（可能多个等长）。简码（更短的码）
 * 不作为答案——整字练习的目标就是练全码拆分。
 */

export interface FullCodeInfo {
  /** 全码（多个等长全码时取首个，用于提示/展示） */
  fullCode: string;
  /** 该字全部全码；打出任意一个即判正确 */
  accepted: string[];
}

export interface CharCodeLike {
  char: string;
  code: string;
}

/** 从码表构建 char → 全码信息索引 */
export function buildFullCodeIndex(data: readonly CharCodeLike[]): Map<string, FullCodeInfo> {
  const byChar = new Map<string, string[]>();
  for (const item of data) {
    const list = byChar.get(item.char);
    if (list) list.push(item.code);
    else byChar.set(item.char, [item.code]);
  }

  const index = new Map<string, FullCodeInfo>();
  for (const [char, codes] of byChar) {
    let maxLen = 0;
    for (const c of codes) if (c.length > maxLen) maxLen = c.length;
    const accepted = codes.filter(c => c.length === maxLen).sort();
    index.set(char, { fullCode: accepted[0], accepted });
  }
  return index;
}
