/**
 * 上屏（提交）规则 —— 模拟真实输入法
 *
 * 一个字在码表里可能有多条编码，按该字自己的编码长度分两类：
 * - 「全码」= 该字最长的那条：打满即**自动上屏**、直接切下一题；
 * - 「简码」= 更短的那些：停在原地，**按空格才上屏**。
 *
 * 关键：全码按"该字自己的最长编码"判定，不能写死 4 码。
 * 像 攥 = dtj、也 = l / lye 这类最长码只有 3 码的字，
 * 打完 3 码就是全码，必须直接算对，不能再要求按空格。
 */

/** 编码键盘的位数（码表里最长 4 码） */
export const AUTO_COMMIT_LENGTH = 4;

export type CommitMode =
  /** 还没打完，或不是该字任何一条合法编码 */
  | 'none'
  /** 打满了全码（该字最长编码）→ 自动上屏 */
  | 'auto'
  /** 只打出更短的简码 → 需要按空格上屏 */
  | 'space';

/**
 * 判断当前输入对应的上屏方式。
 * accepted 为该字在码表里的全部编码。
 */
export function commitMode(input: string, accepted: readonly string[]): CommitMode {
  if (!input || !accepted.includes(input)) return 'none';
  let longest = 0;
  for (const c of accepted) if (c.length > longest) longest = c.length;
  return input.length >= longest ? 'auto' : 'space';
}
