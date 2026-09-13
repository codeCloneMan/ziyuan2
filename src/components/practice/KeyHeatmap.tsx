/**
 * 按键热图（genda「键盘统计」口径）：把历史成绩聚合出的按键次数
 * 画到键盘布局上，颜色深浅 = 该键占比；悬停显示次数。
 */

import { cn } from '@/lib/utils';

const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ['⇧', ';', ',', '.', '/', "'"],
];

/** 功能键单独一行：空格、回删、数字候选键 */
const FUNC_KEYS = ['space', '⌫', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const FUNC_LABELS: Record<string, string> = { space: '空格', '⌫': '回删' };

interface KeyHeatmapProps {
  counts: Record<string, number>;
  className?: string;
}

export function KeyHeatmap({ counts, className }: KeyHeatmapProps) {
  const entries = Object.entries(counts);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const max = entries.reduce((m, [, n]) => Math.max(m, n), 0);

  const heat = (key: string) => {
    const n = counts[key] ?? 0;
    if (!n || !max) return 'bg-muted/40 text-muted-foreground/60';
    // 占比越大颜色越深（相对最高频键，避免总量影响观感）
    const ratio = n / max;
    if (ratio > 0.75) return 'bg-primary text-primary-foreground font-semibold';
    if (ratio > 0.5) return 'bg-primary/70 text-primary-foreground';
    if (ratio > 0.25) return 'bg-primary/45 text-primary-foreground';
    return 'bg-primary/20 text-foreground/80';
  };

  const title = (key: string) => {
    const n = counts[key] ?? 0;
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';
    return `${FUNC_LABELS[key] ?? key.toUpperCase()}：${n} 次（${pct}%）`;
  };

  const KeyCap = ({ k, wide }: { k: string; wide?: boolean }) => (
    <div
      title={title(k)}
      className={cn(
        'flex items-center justify-center rounded-md border border-border/40 h-8 text-[11px] font-mono select-none transition-colors',
        wide ? 'w-14' : 'w-8',
        heat(k),
      )}
    >
      {FUNC_LABELS[k] ?? k}
    </div>
  );

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      {KEY_ROWS.map((row, i) => (
        <div key={i} className="flex gap-1.5" style={{ paddingLeft: `${i * 14}px` }}>
          {row.map(k => <KeyCap key={k} k={k} />)}
        </div>
      ))}
      <div className="flex gap-1.5 mt-1">
        {FUNC_KEYS.map(k => <KeyCap key={k} k={k} wide={k === 'space' || k === '⌫'} />)}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        共 {total} 次击键 · 颜色越深占比越高（悬停看明细）
      </p>
    </div>
  );
}
