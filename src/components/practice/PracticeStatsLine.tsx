import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PracticeStatsLineProps {
  /** 当前是第几轮（已完成轮数 + 1） */
  roundNo: number;
  /** 本轮已答数 */
  seen: number;
  /** 本轮总题数（池大小） */
  total: number;
  /** 本轮正确率（0~100） */
  accuracy: number;
  /** 额外内容（如档位徽章） */
  extra?: ReactNode;
  className?: string;
}

/**
 * 统一精简统计行：第 N 轮 · 本轮 a/b · 正确率 P%。
 * 积分与等级只在右上角徽章显示，页面里不再重复提示。
 */
export function PracticeStatsLine({
  roundNo,
  seen,
  total,
  accuracy,
  extra,
  className,
}: PracticeStatsLineProps) {
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
      {extra}
    </div>
  );
}
