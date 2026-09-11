/**
 * 文章里的官方词组（文章练习「按词组上屏」用）。
 *
 * 词组码来自官方词表（builtinPhrases 的 2/3/4/多字词）＋官方单字码表的
 * 「按词长取码」规则（见 lib/phrase-codes），并且**只收录本文真的出现过的词**：
 * 于是文章练习既能逐字打，也能在光标正好位于某个词开头时一次打出一整个词。
 *
 * 只收本文出现过的词，一是索引足够小（不必装载 6 万词进候选框），
 * 二是候选框里出现的词组一定是本文能用的，不会误导。
 */

import { getPhraseCodeInfo } from './phrase-codes';
import type { BuiltinPhrasesData } from './data-loader';
import type { FullCodeInfo } from './full-codes';

export interface ArticlePhrases {
  /** 词组码 → 词（同码多词，长词在前） */
  byCode: Map<string, string[]>;
  /** 词 → 该词的全部合法编码 */
  codesOf: Map<string, string[]>;
}

/** 全部官方词（按词长分组拼接） */
export function officialWords(phrases: BuiltinPhrasesData): string[] {
  return [
    ...phrases.twoCharPhrases,
    ...phrases.threeCharPhrases,
    ...phrases.fourCharPhrases,
    ...phrases.longCharPhrases,
  ];
}

export function buildArticlePhrases(
  text: string,
  charCodeIndex: Map<string, FullCodeInfo>,
  phrases: BuiltinPhrasesData,
): ArticlePhrases {
  const words = officialWords(phrases);
  if (words.length === 0 || charCodeIndex.size === 0) {
    return { byCode: new Map(), codesOf: new Map() };
  }

  // 文章的子串集合：只保留「原文里真的连着出现」的词
  let maxLen = 2;
  for (const w of words) if (w.length > maxLen) maxLen = w.length;
  const substrings = new Set<string>();
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    let w = '';
    for (let n = 1; n <= maxLen && i + n <= chars.length; n++) {
      w += chars[i + n - 1];
      if (n >= 2) substrings.add(w);
    }
  }

  const byCode = new Map<string, string[]>();
  const codesOf = new Map<string, string[]>();
  for (const word of words) {
    if (!substrings.has(word)) continue;
    const info = getPhraseCodeInfo(word, charCodeIndex);
    if (!info || info.accepted.length === 0) continue;
    codesOf.set(word, info.accepted);
    for (const code of info.accepted) {
      const arr = byCode.get(code);
      if (arr) {
        if (!arr.includes(word)) arr.push(word);
      } else {
        byCode.set(code, [word]);
      }
    }
  }
  // 同码多词：长词更具体，排在前面（候选框第 1 个就是它）
  for (const ws of byCode.values()) {
    if (ws.length > 1) ws.sort((a, b) => [...b].length - [...a].length);
  }
  return { byCode, codesOf };
}

/**
 * 该码此刻能上屏的词：必须与「光标起连续的原文汉字」逐字一致。
 * upcoming = 从光标开始、到下一个标点为止的汉字序列（标点会打断词组）。
 */
export function phraseAtCursor(
  code: string,
  byCode: ReadonlyMap<string, readonly string[]>,
  upcoming: readonly string[],
): string | null {
  const words = byCode.get(code);
  if (!words || upcoming.length === 0) return null;
  for (const word of words) {
    const wc = [...word];
    if (wc.length <= upcoming.length && wc.every((c, i) => c === upcoming[i])) return word;
  }
  return null;
}
