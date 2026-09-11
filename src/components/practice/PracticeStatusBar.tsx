import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, Timer, Eye, EyeOff } from 'lucide-react';
import { PracticeStatsLine } from './PracticeStatsLine';

interface PracticeStatusBarProps {
  modeLabel: string;
  stageModeLabel?: string;
  /** 当前第几轮（已完成轮数 + 1） */
  roundNo: number;
  /** 本轮已答题数 */
  roundSeen: number;
  /** 本轮题目总数 */
  roundTotal: number;
  /** 本轮正确率（0~100） */
  accuracy: number;
  /** 累计积分（答对一题 +1） */
  totalPoints: number;
  /** 是否处于易错项练习 */
  reviewMode?: boolean;
  showHint: boolean;
  speedModeTimeLeft?: number;
  isSpeedMode: boolean;
  onStop: () => void;
  onToggleHint: () => void;
}

/** 精简后的练习状态栏：只有轮次/本轮进度/正确率/积分等级（+易错项标记）。 */
export default function PracticeStatusBar({
  modeLabel,
  stageModeLabel,
  roundNo,
  roundSeen,
  roundTotal,
  accuracy,
  totalPoints,
  reviewMode,
  showHint,
  speedModeTimeLeft,
  isSpeedMode,
  onStop,
  onToggleHint,
}: PracticeStatusBarProps) {
  return (
    <div className="sticky z-30 border-b border-border/50 glass-nav bg-background/80"
      style={{ top: 'calc(3.5rem + env(safe-area-inset-top))' }}>
      <div className="container-page max-w-5xl py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="bg-primary/8 text-primary font-medium px-2.5 py-1 text-xs">
              {modeLabel}
            </Badge>
            {stageModeLabel && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-border/50">
                {stageModeLabel}
              </Badge>
            )}
            {reviewMode && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-red-500/40 text-red-600 dark:text-red-400">
                易错项练习
              </Badge>
            )}
            <button onClick={onStop}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <RotateCcw className="h-3 w-3" /><span>退出</span>
              <kbd className="hidden sm:inline ml-0.5 px-1 py-0.5 text-[9px] bg-muted/60 rounded font-mono">Esc</kbd>
            </button>
            <button onClick={onToggleHint}
              className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200',
                showHint
                  ? 'bg-amber-500/8 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}>
              {showHint ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span className="hidden sm:inline">{showHint ? '提示开' : '提示关'}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {isSpeedMode && speedModeTimeLeft !== undefined && (
              <span className={cn('flex items-center gap-1 text-xs font-bold font-mono-stat', speedModeTimeLeft <= 10 ? 'text-red-500' : 'text-foreground')}>
                <Timer className="h-3 w-3" />{speedModeTimeLeft}s
              </span>
            )}
            <PracticeStatsLine
              roundNo={roundNo}
              seen={roundSeen}
              total={roundTotal}
              accuracy={accuracy}
              totalPoints={totalPoints}
            />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground/60 mb-0.5">
            <span>本轮进度</span>
            <span className="font-mono-stat text-foreground/70">{roundSeen}/{roundTotal}</span>
          </div>
          <div className="progress-base h-1 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${roundTotal > 0 ? Math.min(100, Math.round((roundSeen / roundTotal) * 100)) : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
