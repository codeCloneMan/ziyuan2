import { Target, Play, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorItem {
  /** 唯一键（字 / 词 / 图片文件名） */
  id: string;
  /** 展示文本（字词；图片类可留空只用缩略图） */
  label?: string;
  /** 可选缩略图（字根练习用） */
  imageSrc?: string;
  /** 错次 */
  wrong: number;
}

interface ErrorItemsPanelProps {
  items: ErrorItem[];
  /** 点"练易错项"：用这批项组池练习 */
  onDrill?: () => void;
  /** 最多展示几条 */
  max?: number;
  title?: string;
  className?: string;
}

/**
 * 易错项面板：按错次降序列出（默认最多 20 条），并提供"练易错项"跳转。
 * 三个练习页共用（字根页传缩略图，整字/词组传字词）。
 */
export function ErrorItemsPanel({
  items,
  onDrill,
  max = 20,
  title = '易错项',
  className,
}: ErrorItemsPanelProps) {
  const top = [...items].sort((a, b) => b.wrong - a.wrong).slice(0, max);
  return (
    <div className={cn('card-base p-3', className)}>
      <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-red-500" />
        {title}
        {top.length > 0 && <span className="text-muted-foreground/60 font-normal">（前 {top.length} 个）</span>}
      </h4>
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />暂无易错项，继续保持！
        </p>
      ) : (
        <>
          <div className="space-y-1 mb-2 max-h-56 overflow-y-auto">
            {top.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground/60">{i + 1}</span>
                {it.imageSrc ? (
                  <img src={it.imageSrc} alt="" className="h-6 w-6 object-contain rounded border border-border/50" />
                ) : (
                  <span className="text-sm w-14 truncate text-center">{it.label}</span>
                )}
                <div className="flex-1 progress-base h-1.5">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(it.wrong * 20, 100)}%` }} />
                </div>
                <span className="text-muted-foreground/70 text-[10px] font-mono-stat">错 {it.wrong}</span>
              </div>
            ))}
          </div>
          {onDrill && (
            <button
              onClick={onDrill}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:border-red-800 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />练易错项
            </button>
          )}
        </>
      )}
    </div>
  );
}
