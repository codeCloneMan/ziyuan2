import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getCurrentLevel } from '@/lib/achievements';

interface PracticeStatsLineProps {
  /** 当前是第几轮（已完成轮数 + 1） */
  roundNo: number;
  /** 本轮已答数 */
  seen: number;
  /** 本轮总题数（池大小） */
  total: number;
  /** 本轮正确率（0~100） */
  accuracy: number;
  /** 累计积分（答对一题 +1） */
  totalPoints: number;
  /** 额外内容（如档位徽章） */
  extra?: ReactNode;
  className?: string;
}

/**
 * 统一精简统计行：第 N 轮 · 本轮 a/b · 正确率 P% · 积分 X（LvY）。
 * 统计精简后各练习页只保留这些 + 易错项。
 */
export function PracticeStatsLine({
  roundNo,
  seen,
  total,
  accuracy,
  totalPoints,
  extra,
  className,
}: PracticeStatsLineProps) {
  const level = getCurrentLevel(totalPoints);
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground', className)}>
      <span>
        第 <span className="font-mono-stat font-semibold text-foreground">{roundNo}</span> 轮
      </span>
      <span>
        本轮 <span className="font-mono-stat font-semibold text-foreground">{seen}</span>/{total}
      </span>
      <span>
        正确率 <span className="font-mono-stat font-semibold text-foreground">{accuracy}%</span>
      </span>
      <span>
        积分 <span className="font-mono-stat font-semibold text-amber-600 dark:text-amber-400">{totalPoints}</span>
        <span className={cn('ml-1 font-semibold', level.color)}>Lv{level.level}</span>
      </span>
      {extra}
    </div>
  );
}
