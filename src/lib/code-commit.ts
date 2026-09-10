/**
 * 上屏（提交）规则 —— 模拟真实打字
 *
 * 判定时机只有两个，与编码长短无关：
 * - 打满 4 键 → 自动判断上屏；
 * - 不足 4 键 → 按空格上屏后再判断（fxj + 空格 这样）。
 * 未满 4 键前绝不判定（即使已打错），由空格或第 4 键来触发。
 *
 * 判定标准：码表里该字的任何一条编码（简码/全码）都算对。
 * 该字编码不足 4 码时，第 4 键相当于"早已上屏后多打的键"，
 * 只要是打在完整编码之后就不追究（与输入法自动上屏行为一致）。
 */

/** 编码键盘的位数（码表里最长 4 码），打满即自动判断 */
export const AUTO_COMMIT_LENGTH = 4;

/**
 * 第 4 键自动上屏时的判定：
 * 输入恰好是某条编码，或某条完整编码的前缀（该字编码不足 4 码、第 4 键多打）都算对。
 */
export function isAutoCommitCorrect(input: string, accepted: readonly string[]): boolean {
  if (input.length < AUTO_COMMIT_LENGTH) return false;
  if (accepted.includes(input)) return true;
  return accepted.some(code => code.length > 0 && input.startsWith(code));
}

/**
 * 空格上屏时的判定：当前输入必须恰好是码表里的某条编码。
 */
export function isSpaceCommitCorrect(input: string, accepted: readonly string[]): boolean {
  return input.length > 0 && accepted.includes(input);
}

/**
 * 是否已打出一条完整编码（且不足 4 码）→ 提示"按空格上屏"。
 */
export function isCompleteCodeAwaitingSpace(input: string, accepted: readonly string[]): boolean {
  return input.length > 0 && input.length < AUTO_COMMIT_LENGTH && accepted.includes(input);
}
