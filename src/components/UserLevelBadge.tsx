import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAchievements } from '@/hooks/use-achievements';
import { Trophy, Star, ChevronUp } from 'lucide-react';

const LEVEL_ICONS = ['🌱', '🌿', '🍃', '🌳', '⭐', '🌟', '💫', '👑'];

export default function UserLevelBadge() {
  const { level, nextLevel, unlocked, unlockedCount, total, totalPoints } = useAchievements();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const levelIcon = LEVEL_ICONS[Math.min(level.level - 1, LEVEL_ICONS.length - 1)];
  const recentUnlocked = unlocked.slice(-4).reverse();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
          open
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
        )}
        title={`${level.title} · ${totalPoints} 积分`}
      >
        <span className="text-sm leading-none">{levelIcon}</span>
        <span className={cn('font-mono-stat hidden sm:inline', level.color)}>Lv{level.level}</span>
        <span className="font-mono-stat text-amber-600 dark:text-amber-400">{totalPoints}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl animate-fadeIn overflow-hidden">
          {/* 等级头部 */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-2xl">
                {levelIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('font-bold text-sm', level.color)}>Lv{level.level}</span>
                  <span className="font-semibold text-foreground text-sm truncate">{level.title}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {totalPoints.toLocaleString()} 积分
                </div>
              </div>
            </div>

            {/* 下一等级进度 */}
            {nextLevel ? (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>距 Lv{nextLevel.level.level} {nextLevel.level.title}</span>
                  <span className="font-mono-stat">还差 {nextLevel.pointsNeeded}</span>
                </div>
                <div className="progress-base h-1.5">
                  <div
                    className="progress-bar-animated bg-amber-500"
                    style={{
                      width: `${Math.min(100, Math.round((totalPoints / nextLevel.level.minPoints) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Trophy className="h-3 w-3" />已达成最高等级
              </div>
            )}
          </div>

          {/* 成就概览 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" />成就
              </span>
              <span className="text-xs text-muted-foreground font-mono-stat">
                {unlockedCount}/{total}
              </span>
            </div>

            {/* 进度条 */}
            <div className="progress-base h-1.5 mb-4">
              <div
                className="progress-bar-animated bg-primary"
                style={{ width: `${Math.round((unlockedCount / total) * 100)}%` }}
              />
            </div>

            {/* 最近解锁 */}
            {recentUnlocked.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">最近解锁</div>
                {recentUnlocked.map(a => (
                  <div key={a.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/40">
                    <span className="text-base">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{a.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-[11px] text-muted-foreground">
                继续练习以解锁成就
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <ChevronUp className="h-3 w-3" />点击空白处关闭
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
