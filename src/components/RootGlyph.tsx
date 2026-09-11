import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getRootImageUrl, findRootByChar } from '@/data/roots';

interface RootGlyphProps {
  /** 拆分组件字 / 字根字（如 "女"、PUA 变体字） */
  char: string;
  /** 方框尺寸类（如 "h-6 w-6"、"h-10 w-10"） */
  box?: string;
  /** 字形字号类（回退到文本时用） */
  text?: string;
  className?: string;
  /** 无官方图时是否用虚线琥珀底（提示"这是字形回退"） */
  markFallback?: boolean;
  title?: string;
}

/**
 * 字根字形展示：**优先官方字根图**（public/roots/ 的裁剪图），
 * 官方图集里没有对应裁剪图的字根（可渲染汉字本身、或核验后确认无图者）
 * 回退为字形/描述文本，保证同尺寸方框排列整齐。
 */
export default function RootGlyph({
  char,
  box = 'h-8 w-8',
  text = 'text-base',
  className,
  markFallback = false,
  title,
}: RootGlyphProps) {
  const [broken, setBroken] = useState(false);
  const url = findRootByChar(char) ? getRootImageUrl(findRootByChar(char)!) : null;
  const label = title ?? (findRootByChar(char)?.displayChar || char);

  if (url && !broken) {
    return (
      <span className={cn('inline-flex items-center justify-center shrink-0', box, className)} title={label}>
        <img
          src={url}
          alt={label}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0 root-char',
        markFallback && 'rounded-md border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30',
        box,
        text,
        className,
      )}
      title={label}
    >
      <span className="font-semibold leading-none text-amber-700 dark:text-amber-300">{label}</span>
    </span>
  );
}
