/**
 * 文章跟打的分段与乱序（跟打器口径）：
 *
 * - splitSegments：把长文切成「段」——先按换行分成自然段，再超过段长的自然段
 *   按 segLen 均匀切块；segLen = 'all' 时全文为一段（文章模式）。
 *   段记录它在原文（[...text] 下标空间）里的 [start, end) 区间，练习页据此
 *   圈定该段参与的题目与渲染窗口。
 * - shuffleRangeText：把原文某区间内的字符打乱，空白（换行/空格）留在原位，
 *   这样段与行的边界不会因乱序而漂移。
 */

export type SegmentLength = 'all' | number;

export interface ArticleSegment {
  /** 原文字符下标区间的闭开边界 [start, end) */
  start: number;
  end: number;
  /** 该段的原文文本（不含段尾换行） */
  text: string;
}

/** 按段长把原文切段；'all' 时整篇为一段 */
export function splitSegments(text: string, segLen: SegmentLength): ArticleSegment[] {
  const chars = [...text];
  if (segLen === 'all') {
    return chars.length === 0 ? [] : [{ start: 0, end: chars.length, text }];
  }
  const segments: ArticleSegment[] = [];
  let i = 0;
  while (i < chars.length) {
    // 跳过换行；连续换行不产生空段
    if (chars[i] === '\n') { i++; continue; }
    let j = i;
    let len = 0;
    while (j < chars.length && len < segLen) {
      if (chars[j] !== '\n') len++;
      j++;
    }
    segments.push({ start: i, end: j, text: chars.slice(i, j).join('') });
    i = j;
  }
  return segments;
}

/** 把 [start, end) 内的字符打乱，换行/空格等空白留在原位 */
export function shuffleRangeText(text: string, start: number, end: number): string {
  const chars = [...text];
  const idxs: number[] = [];
  for (let i = start; i < end && i < chars.length; i++) {
    if (!/\s/.test(chars[i])) idxs.push(i);
  }
  for (let k = idxs.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [chars[idxs[k]], chars[idxs[j]]] = [chars[idxs[j]], chars[idxs[k]]];
  }
  return chars.join('');
}

/** 全文乱序（空白留原位） */
export function shuffleFullText(text: string): string {
  return shuffleRangeText(text, 0, [...text].length);
}
