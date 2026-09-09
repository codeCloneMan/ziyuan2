import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Target, CheckCircle2, Flame, AlertTriangle,
  Trophy, Lightbulb, ChevronDown, ChevronUp, Repeat,
} from 'lucide-react';
import type { PracticeStats } from '@/types';
import { rootImagePath } from '@/data/root-images';

interface WeakestRoot {
  file: string;
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
  todayStats: DailyStat;
  masteredCount: number;
  totalRootsCount: number;
  weakestRoots: WeakestRoot[];
  /** 累计答题（跨轮次/跨天），让第二轮练习也有可见进度 */
  cumulative?: { attempts: number; correct: number };
  /** 已完成轮数（持久化记录） */
  completedRounds?: number;
  /** 当前这一轮已答题数 */
  roundSeen?: number;
  /** 当前这一轮的题目总数 */
  roundTotal?: number;
}

export default function StatsSidePanel({
  stats,
  todayStats,
  masteredCount,
  totalRootsCount,
  weakestRoots,
  cumulative,
  completedRounds,
  roundSeen,
  roundTotal,
}: StatsSidePanelProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="space-y-2.5">
      {/* 本轮统计：未开始时不再显示一排 0，避免"练了却像没统计"的误导 */}
      <div className="card-stats p-4">
        <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          <BarChart3 className="h-3.5 w-3.5 text-primary/70" />本轮统计
        </h3>
        {stats.totalAttempts === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            本轮尚未答题
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: '题数', value: stats.totalAttempts, icon: Target },
              { label: '正确', value: stats.correctAttempts, icon: CheckCircle2 },
              { label: '连击', value: stats.streak, icon: Flame },
              { label: '正确率', value: `${Math.round((stats.correctAttempts / Math.max(stats.totalAttempts, 1)) * 100)}%`, icon: BarChart3 },
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
        )}
      </div>

      {/* 今日 / 累计 / 掌握 */}
      <div className="card-base p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            <Flame className="h-3 w-3 text-orange-500/70" />今日
          </span>
          <span className="text-xs font-bold font-mono-stat">{todayStats.attempts}题 / {todayStats.correct}对</span>
        </div>
        {cumulative && cumulative.attempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              <Target className="h-3 w-3 text-sky-500/70" />累计
            </span>
            <span className="text-xs font-bold font-mono-stat">
              {cumulative.attempts}题 / {Math.round((cumulative.correct / Math.max(cumulative.attempts, 1)) * 100)}%
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            <Trophy className="h-3 w-3 text-emerald-500/70" />已掌握
          </span>
          <span className="text-xs font-bold font-mono-stat">{masteredCount}/{totalRootsCount}</span>
        </div>
        {completedRounds !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              <Repeat className="h-3 w-3 text-sky-500/70" />轮次
            </span>
            <span className="text-xs font-bold font-mono-stat">
              已完成 {completedRounds} 轮
              {roundTotal ? <span className="text-muted-foreground/60 font-normal"> · 本轮 {roundSeen ?? 0}/{roundTotal}</span> : null}
            </span>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          单张图累计答对 3 次计入掌握，多轮练习逐步积累
        </p>
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
            <AlertTriangle className="h-3 w-3" />累计弱项
            {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          {showDetail && (
            <div className="card-base p-3 animate-fade-in">
              {weakestRoots.slice(0, 5).map((r, i) => {
                const total = r.correct + r.wrong;
                const rate = total > 0 ? Math.round((r.correct / total) * 100) : 0;
                return (
                  <div key={r.file} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-3 text-muted-foreground/50 font-mono">{i + 1}</span>
                    <img src={rootImagePath(r.file)} alt="字根图" className="h-6 w-6 rounded border border-border/40 bg-muted/30 object-contain p-0.5" draggable={false} />
                    <span className="w-3 text-center font-mono font-bold text-muted-foreground/70">{r.key.toUpperCase()}</span>
                    <span className="flex-1 text-red-500/80 font-medium">错 {r.wrong} 次</span>
                    <span className="text-muted-foreground/60 w-9 text-right font-mono-stat">{rate}%</span>
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
