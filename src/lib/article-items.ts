/**
 * 文章练习的题目序列构建：只保留码表里有编码的汉字，标点/换行/码表缺字自动跳过。
 */

import type { FullCodeInfo } from './full-codes';

export interface ArticleItem {
  /** 在原文中的字符下标（渲染时用） */
  textIndex: number;
  char: string;
  /** 码表里该字的全部编码（打出任意一个即算对） */
  codes: string[];
}

export function buildArticleItems(
  text: string,
  index: Map<string, FullCodeInfo>,
): ArticleItem[] {
  const items: ArticleItem[] = [];
  [...text].forEach((ch, i) => {
    const info = index.get(ch);
    if (info && info.accepted.length > 0) items.push({ textIndex: i, char: ch, codes: info.accepted });
  });
  return items;
}
