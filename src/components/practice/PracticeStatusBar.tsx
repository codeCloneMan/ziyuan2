import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, Trophy, Flame, Timer, Eye, EyeOff } from 'lucide-react';
import type { PracticeStats } from '@/types';

interface PracticeStatusBarProps {
  modeLabel: string;
  stageModeLabel: string;
  stats: PracticeStats;
  accuracy: number;
  masteredCount: number;
  practicedCount?: number;
  totalRootsCount: number;
  todayAttempts: number;
  showHint: boolean;
  speedModeTimeLeft?: number;
  isSpeedMode: boolean;
  onStop: () => void;
  onToggleHint: () => void;
}

export default function PracticeStatusBar({
  modeLabel,
  stageModeLabel,
  stats,
  accuracy,
  masteredCount,
  practicedCount,
  totalRootsCount,
  todayAttempts,
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
        {/* 第一行：模式 + 退出 + 核心数据 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="bg-primary/8 text-primary font-medium px-2.5 py-1 text-xs">
              {modeLabel}
            </Badge>
            {stageModeLabel && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-border/50">
                {stageModeLabel}
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
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500/70" />
              <span className="font-bold font-mono-stat">{stats.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className={cn('h-3 w-3', stats.streak >= 10 ? 'text-orange-500' : 'text-muted-foreground/50')} />
              <span className={cn('font-bold font-mono-stat', stats.streak >= 10 ? 'text-orange-500' : '')}>
                {stats.streak}x
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-muted-foreground/60">正确率</span>
              <span className="font-bold font-mono-stat">{accuracy}%</span>
            </div>
            {isSpeedMode && speedModeTimeLeft !== undefined && (
              <div className={cn('flex items-center gap-1 font-bold font-mono-stat', speedModeTimeLeft <= 10 ? 'text-red-500' : 'text-foreground')}>
                <Timer className="h-3 w-3" />{speedModeTimeLeft}s
              </div>
            )}
          </div>
        </div>
        {/* 第二行：进度条 */}
        <div className="mt-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground/60 mb-0.5">
            <span>
              已掌握 <span className="font-bold text-primary/80 font-mono-stat">{masteredCount}</span>
              {practicedCount !== undefined && practicedCount > masteredCount && (
                <> · 已练习 <span className="font-mono-stat">{practicedCount}</span></>
              )}
              <span className="text-muted-foreground/40"> / {totalRootsCount}</span>
            </span>
            <span>今日 {todayAttempts}题</span>
          </div>
          <div className="progress-base h-1 relative overflow-hidden">
            {/* 已练习（浅色底层） */}
            {practicedCount !== undefined && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((practicedCount / totalRootsCount) * 100))}%` }} />
            )}
            {/* 已掌握（深色覆盖） */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((masteredCount / totalRootsCount) * 100))}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
