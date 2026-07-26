/**
 * 字根练习"已掌握"计数
 *
 * 基于统一 progress store 的累计 correctCountMap 计算已掌握字根数，
 * 与首页进度（useLearningProgress）、成就（useAchievementData）、
 * 键盘淡化（PracticeKeyboard）保持同一口径。
 *
 * 掌握判定：单个字根累计答对次数 >= 3。
 */
export function calcMasteredRootCount(
  correctCountMap: Record<string, number>,
): number {
  return Object.values(correctCountMap).filter(c => c >= 3).length;
}
