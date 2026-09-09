import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RootMapping } from '@/data/roots';
import { getRootImagePath, isRenderableRoot } from '@/data/roots';

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

  // 语义描述（"老变"、"𧘇上"这类）：基础字能正常渲染时大字显示基础字、
  // 小字显示"变/上"后缀，比整串描述更接近真实字根的提示效果；
  // 基础字本身不可渲染（如 𧘇 属扩展B区）或描述是裸码（"U+E16B"）则整串显示。
  const isCodeDesc = /^U\+/.test(root.displayChar);
  const base = isCodeDesc ? '' : [...root.displayChar][0];
  const suffix = isCodeDesc ? '' : root.displayChar.slice(base.length);
  const baseRenderable = base !== '' && isRenderableRoot(base.codePointAt(0) ?? 0);
  const bigBase = baseRenderable && (size === 'lg' || size === 'xl');

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
      ) : bigBase ? (
        <>
          <span className={cn(
            'font-semibold text-amber-700 dark:text-amber-300 leading-none',
            size === 'xl' ? 'text-5xl sm:text-6xl' : 'text-3xl'
          )}>
            {base}
          </span>
          {suffix && (
            <span className="text-xs sm:text-sm text-amber-500 dark:text-amber-400 mt-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {suffix}
            </span>
          )}
        </>
      ) : (
        <span className={cn(
          'font-semibold text-amber-700 dark:text-amber-300 leading-tight',
          size === 'xl' ? 'text-base sm:text-lg' : s.desc
        )}>
          {root.displayChar}
        </span>
      )}
      {/* 码点小字只给配图字根（字根表详细模式的文档信息）；
          文本回退时不显示——描述本身已是答案，裸码只会造成"老变 U+E431"这类噪音 */}
      {showDesc && size !== 'sm' && imageUrl && (
        <span className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">
          U+{hex}
        </span>
      )}
    </span>
  );
}
