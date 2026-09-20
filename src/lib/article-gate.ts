/**
 * 文章练习「最低准度」门槛的判定规则（纯函数，便于单测）。
 *
 * 为什么单独抽出来：门槛曾经只存在段结算面板的瞬时 state 里，
 * 于是「上一段 → 下一段 → 下一段」就能把未达标的段跳过去。
 * 现在规则收敛到这一处：达标结果按段号记在 passed 集合，
 * 前进与否只看这个集合，不再看瞬时面板状态。
 */

/** 本段准度是否达标（门槛 accGate = 0 表示不设门槛，永远达标） */
export function isAccPassed(accGate: number, accuracy: number): boolean {
  if (!Number.isFinite(accGate) || accGate <= 0) return true;
  return accuracy >= accGate;
}

/**
 * 是否允许从第 segIndex 段往后走（下一段按钮 / Ctrl+J / 自动发文）。
 * 不设门槛 → 随意前进；设了门槛 → 本段必须先达标。
 */
export function canAdvanceSegment(
  accGate: number,
  passed: ReadonlySet<number>,
  segIndex: number,
): boolean {
  if (!Number.isFinite(accGate) || accGate <= 0) return true;
  return passed.has(segIndex);
}

/** 结算面板是否被门槛锁住（门槛随时可改，所以在渲染时重判，不必重打） */
export function isResultBlocked(accGate: number, accuracy: number): boolean {
  return !isAccPassed(accGate, accuracy);
}
