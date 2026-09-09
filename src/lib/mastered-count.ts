/**
 * 字根练习"已掌握"计数
 *
 * 基于统一 progress store 的累计 correctCountMap 计算已掌握字根数，
 * 与首页进度（useLearningProgress）、成就（useAchievementData）、
 * 键盘淡化（PracticeKeyboard）保持同一口径。
 *
 * 掌握判定：单个字根累计答对次数 >= 3。
 *
 * poolIds：当前练习池的字根列表。传入后只统计池内字根——
 * correctCountMap 是永久累计的，会包含早已移出练习池的字根
 * （如扩展区字根调整），不剔除会让"已掌握"虚高、甚至超过池总数。
 */
export function calcMasteredRootCount(
  correctCountMap: Record<string, number>,
  poolIds?: readonly string[],
): number {
  const inPool = poolIds ? new Set(poolIds) : null;
  let count = 0;
  for (const [char, c] of Object.entries(correctCountMap)) {
    if (c >= 3 && (!inPool || inPool.has(char))) count++;
  }
  return count;
}
