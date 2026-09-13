/**
 * iOS 风格开关行（跟打器设置栏口径）：一行一个开关，说明放悬停提示。
 */

import { cn } from '@/lib/utils';

interface SwitchRowProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}

export function SwitchRow({ label, checked, onChange, disabled, title }: SwitchRowProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={title}
      className="w-full flex items-center justify-between gap-2 py-[5px] group disabled:opacity-40"
    >
      <span className={cn('text-xs transition-colors', checked ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          checked ? 'bg-emerald-500' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
}
