import { cn } from '@/lib/utils';
import type { RootMapping } from '@/data/roots';

interface RootCharDisplayProps {
  root: RootMapping;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showDesc?: boolean;
}

const sizeMap = {
  sm: { box: 'h-8 w-8 min-w-[2rem]', text: 'text-base', desc: 'text-[8px]' },
  md: { box: 'h-10 w-10 min-w-[2.5rem]', text: 'text-lg', desc: 'text-[9px]' },
  lg: { box: 'h-16 w-16 min-w-[4rem]', text: 'text-3xl', desc: 'text-[10px]' },
  xl: { box: 'h-28 w-28 min-w-[7rem] sm:h-40 sm:w-40 sm:min-w-[10rem]', text: 'text-6xl sm:text-8xl', desc: 'text-xs' },
};

/** 判断字符是否可正常渲染 */
function isRenderableChar(cp: number): boolean {
  // PUA区 - 多数字体无法渲染，使用描述标签
  if (cp >= 0xE000 && cp <= 0xF8FF) return false;
  // 其他区域（包括CJK扩展B）都尝试直接渲染
  // 现代字体（Noto Sans SC等）已支持大部分CJK扩展B区字符
  return true;
}

export default function RootCharDisplay({ root, size = 'md', className, showDesc = false }: RootCharDisplayProps) {
  const s = sizeMap[size];
  const cp = root.codePoint;
  const renderable = isRenderableChar(cp);

  if (renderable) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-border bg-muted/30 root-char',
          s.box,
          s.text,
          className
        )}
      >
        {root.char}
      </span>
    );
  }

  // PUA字根：显示描述标签 + Unicode码点
  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
  const desc = root.desc || `U+${hex}`;

  return (
    <span
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30',
        s.box,
        className
      )}
      title={`U+${hex} ${desc}`}
    >
      <span className={cn('font-semibold text-amber-700 dark:text-amber-300 leading-tight', size === 'xl' ? 'text-base sm:text-lg' : s.desc)}>
        {desc}
      </span>
      {showDesc && size !== 'sm' && (
        <span className="text-[8px] text-amber-500 dark:text-amber-400 mt-0.5">
          U+{hex}
        </span>
      )}
    </span>
  );
}
