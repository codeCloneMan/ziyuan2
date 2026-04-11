import type { RootMapping } from '@/data/roots';

export interface RootMapping {
  /** 字根字符 */
  char: string;
  /** 对应的键盘按键 */
  key: string;
}

export interface KeyGroup {
  /** 键盘按键 */
  key: string;
  /** 该按键对应的所有字根 */
  roots: string[];
}

export interface PracticeStats {
  /** 总练习次数 */
  totalAttempts: number;
  /** 正确次数 */
  correctAttempts: number;
  /** 当前连击数 */
  streak: number;
  /** 最高连击数 */
  maxStreak: number;
  /** 当前分数 */
  score: number;
}

export type PracticeMode = 'random' | 'sequential' | 'weak' | 'common';

export type PageRoute = 'home' | 'practice' | 'table' | 'chart';
