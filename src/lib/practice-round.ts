/**
 * 练习轮次（pass）判定
 *
 * 一轮 = 当前练习池里每道题都至少作答过一次（答对、答错都算）。
 * 答完本轮最后一题即完成一轮：轮次记录 +1，本轮已答集合清空，
 * 下一题自动进入新一轮——不弹窗、不中断，练习连续循环。
 *
 * 统计口径（避免"再次出现"与旧统计混淆）：
 * - 本轮统计（题数 / 正确 / 连击 / 得分）：完成一轮时归零，只反映当前这一轮；
 * - 已掌握 / 已练习 / 累计：跨轮次的累计学习进度，不受轮次切换影响；
 * - 已完成轮数：持久化记录，明确标记"这一遍练完了"，与进行中的累计计数分开。
 */

/**
 * 标记一道题已作答；就地修改 seen，返回是否刚好在本轮完成。
 * 完成时 seen 会被清空，供下一轮从头累积。
 */
export function recordRoundSeen(seen: Set<string>, id: string, poolSize: number): boolean {
  if (poolSize <= 0 || !id) return false;
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size >= poolSize) {
    seen.clear();
    return true;
  }
  return false;
}

/** 清洗持久化的轮次记录：只保留正整数，避免损坏数据污染展示 */
export function sanitizeRounds(input: unknown): Record<string, number> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[key] = Math.floor(value);
    }
  }
  return out;
}
