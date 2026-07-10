import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RootMapping } from '@/data/roots';
import { getRootImagePath } from '@/data/roots';

interface RootCharDisplayProps {
  root: RootMapping;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showDesc?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  sm: { box: 'h-8 w-8 min-w-[2rem]', text: 'text-base', desc: 'text-[10px]' },
  md: { box: 'h-10 w-10 min-w-[2.5rem]', text: 'text-lg', desc: 'text-[10px]' },
  lg: { box: 'h-16 w-16 min-w-[4rem]', text: 'text-3xl', desc: 'text-[10px]' },
  xl: { box: 'h-28 w-28 min-w-[7rem] sm:h-40 sm:w-40 sm:min-w-[10rem]', text: 'text-6xl sm:text-8xl', desc: 'text-xs' },
};

export default function RootCharDisplay({ root, size = 'md', className, showDesc = false, onClick }: RootCharDisplayProps) {
  const s = sizeMap[size];

  // 使用 displayChar：正常字符直接显示，不可渲染字符显示描述（如"食变"、"U+3404"）
  const isFallback = root.displayChar !== root.char;
  const hex = root.codePoint.toString(16).toUpperCase().padStart(4, '0');
  const [imgFailed, setImgFailed] = useState(false);
  const imagePath = !imgFailed ? getRootImagePath(root) : null;
  const imageUrl = imagePath ? `${import.meta.env.BASE_URL}${imagePath}` : null;

  if (!isFallback) {
    // 正常可渲染字符
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-border bg-muted/30 root-char',
          onClick && 'cursor-pointer',
          s.box, s.text, className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      >
        {root.char}
      </span>
    );
  }

  // 不可渲染字符：优先使用字根图，加载失败再回退到描述文本
  return (
    <span
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30',
        onClick && 'cursor-pointer',
        s.box, className
      )}
      title={`U+${hex} ${root.desc || root.displayChar}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={root.desc || root.char}
          className="max-h-full max-w-full object-contain p-0.5"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={cn(
          'font-semibold text-amber-700 dark:text-amber-300 leading-tight',
          size === 'xl' ? 'text-base sm:text-lg' : s.desc
        )}>
          {root.displayChar}
        </span>
      )}
      {showDesc && size !== 'sm' && (
        <span className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">
          U+{hex}
        </span>
      )}
    </span>
  );
}
