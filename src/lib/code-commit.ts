/**
 * 上屏（提交）规则 —— 模拟真实输入法
 *
 * - 打满 4 码：自动上屏，直接切下一题；
 * - 没到 4 码（简码 / 短码）：停在原地，按空格才上屏。
 *
 * 这样"打 uiyu 自动走"和"打 uil 空格走"就与真实打字习惯一致，
 * 也让一级/二级简码不能靠自动跳题蒙过去。
 */

/** 满码长度：打满即自动上屏 */
export const AUTO_COMMIT_LENGTH = 4;

/**
 * 输入已完整命中某个编码，但未到 4 码 —— 需要按空格上屏。
 * 注意：此时并不阻断继续输入，用户仍可补全成更长的编码。
 */
export function needsSpaceToCommit(input: string, accepted: readonly string[]): boolean {
  return input.length > 0
    && input.length < AUTO_COMMIT_LENGTH
    && accepted.includes(input);
}
