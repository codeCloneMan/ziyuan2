/**
 * 词组取码
 *
 * 每个字取一个"全码"，按词长规则抽出 4 码：
 *   2 字词：各取前 2 码
 *   3 字词：前两字各取 1 码，末字取 2 码
 *   4 字及以上：前 3 字各取 1 码，末字取 1 码
 *
 * 一个字可能有多条等长全码（如 了 = hle/hli），所以一个词组也可能有多个
 * 合法编码 —— 全部列出，打出任意一个都算对（与整字练习同一口径：码表支持
 * 的写法都算）。词组只认全码：简码长度不够，取不出 4 码。
 */

import { fullCodesOf, type FullCodeInfo } from './full-codes';

export function getPhraseCodes(phrase: string, index: Map<string, FullCodeInfo>): string[] {
  const len = phrase.length;
  if (len < 2) return [];

  const perChar: string[][] = [];
  for (const ch of phrase) {
    const fulls = fullCodesOf(index.get(ch));
    if (fulls.length === 0) return [];
    perChar.push(fulls);
  }

  const extract = (codes: string[]): string => {
    if (len === 2) return codes[0].slice(0, 2) + codes[1].slice(0, 2);
    if (len === 3) return codes[0].slice(0, 1) + codes[1].slice(0, 1) + codes[2].slice(0, 2);
    return codes[0].slice(0, 1) + codes[1].slice(0, 1)
      + codes[2].slice(0, 1) + codes[len - 1].slice(0, 1);
  };

  const out = new Set<string>();
  const walk = (i: number, acc: string[]) => {
    if (i === perChar.length) {
      const code = extract(acc);
      if (code.length >= 4) out.add(code);
      return;
    }
    for (const c of perChar[i]) walk(i + 1, [...acc, c]);
  };
  walk(0, []);

  // 主展示码 = 最长（词长 <= 3 时全为 4 码），同长按词典序，保证结果稳定
  return [...out].sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
}
