/**
 * 文章练习的题目序列：**汉字按码表编码打，标点按对应按键打**。
 *
 * 逐字扫描原文：
 * - 汉字且码表里有编码 → kind 'char'（打出该字任意一个官方编码即算对）
 * - 全角标点 → kind 'punct'（按它在中文输入法里对应的那个半角键上屏）
 * - 换行 / 空白 / 码表缺字 / 拉丁字母等 → 跳过，只占位不参与跟打
 */

import type { FullCodeInfo } from './full-codes';

export interface ArticleCharItem {
  kind: 'char';
  /** 在原文中的字符下标（渲染定位用） */
  textIndex: number;
  char: string;
  /** 码表里该字的全部编码（打出任意一个即算对） */
  codes: string[];
}

export interface ArticlePunctItem {
  kind: 'punct';
  textIndex: number;
  char: string;
  /** 上屏该标点要按的键 */
  key: string;
}

export type ArticleItem = ArticleCharItem | ArticlePunctItem;

export const isCharItem = (item: ArticleItem): item is ArticleCharItem => item.kind === 'char';
export const isPunctItem = (item: ArticleItem): item is ArticlePunctItem => item.kind === 'punct';

/**
 * 全角标点 → 上屏按键，对齐微软拼音 / 搜狗输入法的中文标点映射：
 * 「，」按 `,`、「。」按 `.`、「、」按 `\`、「《」按 `<`、「“」按 `"`……
 * 同时也接受输入法直接上屏的全角标点本身（键盘事件里 e.key === 标点字符）。
 * 全角空格不在此表（与「空格上屏」冲突），按空白跳过。
 */
export const PUNCT_KEYS: Record<string, string> = {
  '，': ',', '。': '.', '、': '\\', '；': ';', '：': ':', '？': '?', '！': '!',
  '“': '"', '”': '"', '‘': "'", '’': "'",
  '（': '(', '）': ')', '《': '<', '》': '>',
  '「': '[', '」': ']', '『': '{', '』': '}', '【': '[', '】': ']',
  '·': '`', '—': '-', '…': '^', '～': '~',
  '％': '%', '＃': '#', '＆': '&', '＊': '*', '＠': '@', '＋': '+', '＝': '=',
  '｜': '|', '／': '/', '＼': '\\', '＜': '<', '＞': '>',
};

export function punctKeyOf(ch: string): string | null {
  return PUNCT_KEYS[ch] ?? null;
}

export function buildArticleItems(
  text: string,
  index: Map<string, FullCodeInfo>,
): ArticleItem[] {
  const items: ArticleItem[] = [];
  [...text].forEach((ch, i) => {
    const info = index.get(ch);
    if (info && info.accepted.length > 0) {
      items.push({ kind: 'char', textIndex: i, char: ch, codes: info.accepted });
      return;
    }
    const key = PUNCT_KEYS[ch];
    if (key) items.push({ kind: 'punct', textIndex: i, char: ch, key });
  });
  return items;
}
