/**
 * 小圆角选项组（段长 / 最低准度等）。
 * 左栏设置区与工具条「设置」浮层共用同一份，免得两处 chip 样式各写一遍后慢慢长歪。
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChipOption<T> {
  value: T;
  label: string;
  title?: string;
}

interface ChipGroupProps<T> {
  label?: ReactNode;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 选中态配色：primary 蓝（常规） / amber 橙（门槛这类约束项） */
  tone?: 'primary' | 'amber';
  className?: string;
}

export function ChipGroup<T extends string | number>({
  label, options, value, onChange, tone = 'primary', className,
}: ChipGroupProps<T>) {
  return (
    <div className={className}>
      {label && <div className="text-[10px] text-muted-foreground mb-1.5">{label}</div>}
      <div className="flex gap-1 flex-wrap">
        {options.map(o => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              title={o.title}
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'px-2 py-0.5 rounded-md border text-[11px] transition-colors',
                active
                  ? (tone === 'amber'
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                    : 'border-primary/60 bg-primary/10 text-primary font-medium')
                  : 'border-border/60 text-muted-foreground hover:border-primary/40',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
