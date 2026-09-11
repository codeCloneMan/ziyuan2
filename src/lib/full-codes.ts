/**
 * 单字"全码 / 全部编码"索引
 *
 * charCodeData.json 是输入法词典：同一个字的每一条记录都是**能打出这个字**的编码，
 * 既可能是全码，也可能是简码（一级/二级/三级简码）或另一种拆分的写法。
 * 例：乐 = uil / uiyu，的 = k / kav，大 = e / eda / edai，了 = h / hle / hli。
 *
 * 因此整字练习的正确判定 = **输入命中码表中该字的任意一个编码**（用户口径：
 * "码表里有的全算对"）。展示时仍以最长码为主码（练习目标是全码拆分），
 * 其余写法作为 alternates 一并列出，避免"我打的是对的却被判错"。
 */

export interface FullCodeInfo {
  /** 主展示码：最长码（多个等长时取词典序首个），用于提示与揭晓 */
  fullCode: string;
  /** 码表中该字的全部编码，按 长度降序 → 词典序 排序；打出任意一个即判正确 */
  accepted: string[];
  /** 除主展示码外的其它写法（简码 / 别名），用于揭晓时一并展示 */
  alternates: string[];
}

export interface CharCodeLike {
  char: string;
  code: string;
}

/** 从码表构建 char → 全部编码 索引 */
export function buildFullCodeIndex(data: readonly CharCodeLike[]): Map<string, FullCodeInfo> {
  const byChar = new Map<string, Set<string>>();
  for (const item of data) {
    const set = byChar.get(item.char);
    if (set) set.add(item.code);
    else byChar.set(item.char, new Set([item.code]));
  }

  const index = new Map<string, FullCodeInfo>();
  for (const [char, set] of byChar) {
    // 长码优先（主展示码），同长按词典序，保证结果稳定
    const accepted = [...set].sort(
      (a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0),
    );
    index.set(char, { fullCode: accepted[0], accepted, alternates: accepted.slice(1) });
  }
  return index;
}

/**
 * 该字最短编码的键数（0 = 无编码）。
 * 整字练习的"码长档"按它互斥归类：一个字只属于它最短码长的那一档
 * （于是 1 简出现后不会在 2/3/4 档再出现，依此类推）。
 */
export function shortestCodeLength(info: FullCodeInfo | undefined): number {
  if (!info || info.accepted.length === 0) return 0;
  let min = Infinity;
  for (const c of info.accepted) if (c.length < min) min = c.length;
  return min === Infinity ? 0 : min;
}

/**
 * 该字的全部"全码"（最长码，可能多个等长）。
 * 词组取码只能基于全码（简码长度不够，取不出 4 码），所以词组判定用这个子集。
 */
export function fullCodesOf(info: FullCodeInfo | undefined): string[] {
  if (!info) return [];
  const maxLen = info.fullCode.length;
  return info.accepted.filter(c => c.length === maxLen);
}

