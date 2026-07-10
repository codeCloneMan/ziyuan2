export interface PracticeStats {
  /** 总练习次数 */
  totalAttempts: number;
  /** 正确次数 */
  correctAttempts: number;
  /** 当前连击数 */
  streak: number;
  /** 最高连击数 */
  maxStreak: number;
  /** 当前分数 */
  score: number;
}

/** 练习难度级别（三页面统一）：入门 / 进阶 */
export type PracticeLevel = 'beginner' | 'advanced';
