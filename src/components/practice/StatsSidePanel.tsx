import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Target, CheckCircle2, Flame, AlertTriangle,
  Trophy, Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { PracticeStats } from '@/types';

interface WeakestRoot {
  char: string;
  key: string;
  wrong: number;
  correct: number;
}

interface DailyStat {
  attempts: number;
  correct: number;
  score: number;
}

interface StatsSidePanelProps {
  stats: PracticeStats;
  weakRootsCount: number;
  todayStats: DailyStat;
  masteredCount: number;
  totalRootsCount: number;
  weakestRoots: WeakestRoot[];
}

export default function StatsSidePanel({
  stats,
  weakRootsCount,
  todayStats,
  masteredCount,
  totalRootsCount,
  weakestRoots,
}: StatsSidePanelProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="space-y-2.5">
      {/* 本轮统计 - 更精致 */}
      <div className="card-stats p-4">
        <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          <BarChart3 className="h-3.5 w-3.5 text-primary/70" />本轮统计
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: '题数', value: stats.totalAttempts, icon: Target },
            { label: '正确', value: stats.correctAttempts, icon: CheckCircle2 },
            { label: '连击', value: stats.streak, icon: Flame },
            { label: '弱项', value: weakRootsCount, icon: AlertTriangle },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="text-center p-2 rounded-md bg-muted/30">
                <Icon className="h-3 w-3 mx-auto mb-1 text-muted-foreground/50" />
                <div className="text-base font-bold font-mono-stat">{item.value}</div>
                <div className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "'Noto Serif SC', serif" }}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 今日进度 */}
      <div className="card-base p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            <Flame className="h-3 w-3 text-orange-500/70" />今日
          </span>
          <span className="text-xs font-bold font-mono-stat">{todayStats.attempts}题 / {todayStats.correct}对</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            <Trophy className="h-3 w-3 text-emerald-500/70" />已掌握
          </span>
          <span className="text-xs font-bold font-mono-stat">{masteredCount}/{totalRootsCount}</span>
        </div>
      </div>

      {/* 快捷键 */}
      <div className="card-base p-3">
        <h4 className="font-medium text-[11px] text-foreground mb-2 flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          <Lightbulb className="h-3 w-3 text-amber-500/60" />快捷键
        </h4>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/40 font-mono min-w-[2rem] text-center">A-Z</kbd>
            <span className="text-muted-foreground/70">输入字根编码</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/40 font-mono min-w-[2rem] text-center">Esc</kbd>
            <span className="text-muted-foreground/70">退出练习</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/40 font-mono min-w-[2rem] text-center">Space</kbd>
            <span className="text-muted-foreground/70">切换提示</span>
          </div>
        </div>
      </div>

      {/* 弱项字根（可展开） */}
      {weakestRoots.length > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={() => setShowDetail(!showDetail)} className="w-full gap-1 text-xs border-border/50">
            <AlertTriangle className="h-3 w-3" />弱项字根
            {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          {showDetail && (
            <div className="card-base p-3 animate-fadeIn">
              {weakestRoots.slice(0, 5).map((r, i) => {
                const total = r.correct + r.wrong;
                const rate = total > 0 ? Math.round((r.correct / total) * 100) : 0;
                return (
                  <div key={r.char} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-3 text-muted-foreground/50 font-mono">{i + 1}</span>
                    <span className="root-char text-sm w-5 text-center">{r.char}</span>
                    <div className="flex-1 progress-base h-1">
                      <div className="h-full rounded-full bg-red-400/70 transition-all" style={{ width: `${100 - rate}%` }} />
                    </div>
                    <span className="text-muted-foreground/60 w-8 text-right font-mono-stat">{rate}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
