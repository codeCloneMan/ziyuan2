/**
 * 字根练习的作答归一化与判定 —— 支持用**其它输入法**作答。
 *
 * 字根练习的题目是一张官方字根图，答案是该图所在键位（文件名首字母）。
 * 用输入法作答时（拼音、五笔、字源形码都一样），你打出来的是**汉字**，
 * 不是字母；所以判定换成「这个汉字的字源编码首键，是不是本题键位」：
 *
 * - 木 的编码是 xm / xmu → 首键 x，所以「木」这张图打「木」就判对；
 * - 这条口径不需要「图 → 字根汉字」映射（那层映射只有 49/390 张图有），
 *   而是用官方字根表自证的规则：397 条字根里能查到编码的 323 条中，
 *   322 条的码表编码首键 == 该字根的键位（唯一例外是私用区变体 𲿣）。
 *
 * 字母仍然按字面判定（输入法切到英文/直通模式时就是原来的手感）。
 */

import type { FullCodeInfo } from './full-codes';

export type RootAnswer =
  | { kind: 'key'; key: string }
  | { kind: 'char'; char: string };

/**
 * 把一次输入归一成答案：
 * - 单个拉丁字母（大小写皆可）→ 键位作答；
 * - 汉字（含扩展区）→ 汉字作答（多字取第一个字，兼容输入法一次上屏多个字符）；
 * - 其它（标点、空白、空串）→ null，调用方应忽略，不要计错。
 */
export function normalizeRootAnswer(text: string): RootAnswer | null {
  const s = text.trim();
  if (!s) return null;
  const first = [...s][0];
  if (/^[a-zA-Z]$/.test(first)) return { kind: 'key', key: first.toLowerCase() };
  if (/\p{Script=Han}/u.test(first)) return { kind: 'char', char: first };
  return null;
}

/**
 * 该汉字是否归在这个键位上：码表里它的任意一条编码的首键 == 键位。
 * 码表里查不到这个字（生僻变体等）→ false。
 */
export function charBelongsToKey(
  char: string,
  key: string,
  index: Map<string, FullCodeInfo>,
): boolean {
  const codes = index.get(char)?.accepted ?? [];
  return codes.some(c => c.length > 0 && c[0] === key);
}

/** 判定一次作答：字母按字面比，汉字按其字源编码首键比 */
export function isRootAnswerCorrect(
  answer: RootAnswer,
  key: string,
  index: Map<string, FullCodeInfo>,
): boolean {
  return answer.kind === 'key'
    ? answer.key === key
    : charBelongsToKey(answer.char, key, index);
}
