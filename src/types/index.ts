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

/** 字根练习模式：渐进学习（科学记忆全部字根）、错题回顾（复习做错的字根）、简体练习（科学记忆简体字根） */
export type PracticeMode = 'progressive' | 'weak' | 'common';

/** 整字练习模式：全部汉字（科学记忆渐进）、前500常用汉字（科学记忆渐进） */
export type WholeCharMode = 'progressive' | 'progressive500';

export type PageRoute = 'home' | 'practice' | 'table' | 'chart';
