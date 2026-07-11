/**
 * 成就与等级系统
 *
 * 根据用户的练习数据解锁成就，积分对应等级。
 * 让积分系统有意义化，提供正反馈循环。
 */

import { practiceRootMappings } from '@/data/roots';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (data: AchievementData) => boolean;
}

export interface AchievementData {
  totalPoints: number;
  masteredRoots: number;
  totalAttempts: number;
  maxStreak: number;
  totalCorrect: number;
  practiceDays: number;
}

/** 等级定义 */
export const LEVELS = [
  { level: 1, title: '字根新手', minPoints: 0, color: 'text-gray-500' },
  { level: 2, title: '字根学徒', minPoints: 100, color: 'text-green-500' },
  { level: 3, title: '字根熟手', minPoints: 300, color: 'text-blue-500' },
  { level: 4, title: '字根达人', minPoints: 800, color: 'text-purple-500' },
  { level: 5, title: '字根高手', minPoints: 1500, color: 'text-amber-500' },
  { level: 6, title: '字根大师', minPoints: 3000, color: 'text-orange-500' },
  { level: 7, title: '字根宗师', minPoints: 5000, color: 'text-red-500' },
  { level: 8, title: '形码圣者', minPoints: 10000, color: 'text-pink-500' },
] as const;

/** 成就列表 */
export const ACHIEVEMENTS: Achievement[] = [
  // 入门成就
  {
    id: 'first_step',
    title: '初出茅庐',
    description: '完成第一次练习',
    icon: '🌱',
    condition: (d) => d.totalAttempts >= 1,
  },
  {
    id: 'ten_roots',
    title: '小有收获',
    description: '掌握 10 个字根',
    icon: '🌿',
    condition: (d) => d.masteredRoots >= 10,
  },
  {
    id: 'fifty_roots',
    title: '渐入佳境',
    description: '掌握 50 个字根',
    icon: '🌳',
    condition: (d) => d.masteredRoots >= 50,
  },
  {
    id: 'hundred_roots',
    title: '初窥门径',
    description: '掌握 100 个字根',
    icon: '🏔️',
    condition: (d) => d.masteredRoots >= 100,
  },
  {
    id: 'all_roots',
    title: '融会贯通',
    description: `掌握全部 ${practiceRootMappings.length} 个字根`,
    icon: '👑',
    condition: (d) => d.masteredRoots >= practiceRootMappings.length,
  },

  // 连击成就
  {
    id: 'streak_10',
    title: '连击入门',
    description: '达成 10 连击',
    icon: '🔥',
    condition: (d) => d.maxStreak >= 10,
  },
  {
    id: 'streak_30',
    title: '势如破竹',
    description: '达成 30 连击',
    icon: '⚡',
    condition: (d) => d.maxStreak >= 30,
  },
  {
    id: 'streak_50',
    title: '势不可挡',
    description: '达成 50 连击',
    icon: '💫',
    condition: (d) => d.maxStreak >= 50,
  },
  {
    id: 'streak_100',
    title: '百发百中',
    description: '达成 100 连击',
    icon: '🌟',
    condition: (d) => d.maxStreak >= 100,
  },

  // 练习量成就
  {
    id: 'practice_100',
    title: '勤学苦练',
    description: '累计练习 100 题',
    icon: '📝',
    condition: (d) => d.totalAttempts >= 100,
  },
  {
    id: 'practice_500',
    title: '锲而不舍',
    description: '累计练习 500 题',
    icon: '📖',
    condition: (d) => d.totalAttempts >= 500,
  },
  {
    id: 'practice_1000',
    title: '千锤百炼',
    description: '累计练习 1000 题',
    icon: '🏆',
    condition: (d) => d.totalAttempts >= 1000,
  },
  {
    id: 'practice_5000',
    title: '万题王',
    description: '累计练习 5000 题',
    icon: '💎',
    condition: (d) => d.totalAttempts >= 5000,
  },

  // 积分成就
  {
    id: 'points_500',
    title: '积分新星',
    description: '累计获得 500 积分',
    icon: '⭐',
    condition: (d) => d.totalPoints >= 500,
  },
  {
    id: 'points_2000',
    title: '积分达人',
    description: '累计获得 2000 积分',
    icon: '🌠',
    condition: (d) => d.totalPoints >= 2000,
  },

  // 坚持成就
  {
    id: 'days_3',
    title: '三天打鱼',
    description: '累计练习 3 天',
    icon: '📅',
    condition: (d) => d.practiceDays >= 3,
  },
  {
    id: 'days_7',
    title: '一周坚持',
    description: '累计练习 7 天',
    icon: '🗓️',
    condition: (d) => d.practiceDays >= 7,
  },
  {
    id: 'days_30',
    title: '月度达人',
    description: '累计练习 30 天',
    icon: '🏅',
    condition: (d) => d.practiceDays >= 30,
  },
];

/**
 * 获取当前等级
 */
export function getCurrentLevel(totalPoints: number): typeof LEVELS[number] {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (totalPoints >= level.minPoints) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

/**
 * 获取下一等级信息
 */
export function getNextLevel(totalPoints: number): { level: typeof LEVELS[number]; pointsNeeded: number } | null {
  const current = getCurrentLevel(totalPoints);
  const currentIdx = LEVELS.findIndex(l => l.level === current.level);
  if (currentIdx < LEVELS.length - 1) {
    const next = LEVELS[currentIdx + 1];
    return { level: next, pointsNeeded: next.minPoints - totalPoints };
  }
  return null; // 已满级
}

/**
 * 获取已解锁的成就
 */
export function getUnlockedAchievements(data: AchievementData): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.condition(data));
}

/**
 * 获取下一个可解锁的成就（最接近完成的）
 */
export function getNextAchievement(data: AchievementData): { achievement: Achievement; progress: number } | null {
  const unlocked = new Set(getUnlockedAchievements(data).map(a => a.id));

  for (const achievement of ACHIEVEMENTS) {
    if (!unlocked.has(achievement.id)) {
      // 简单进度估算
      let progress = 0;
      if (achievement.id.startsWith('streak_')) {
        const target = parseInt(achievement.id.split('_')[1]);
        progress = Math.min(Math.round((data.maxStreak / target) * 100), 99);
      } else if (achievement.id.startsWith('practice_')) {
        const target = parseInt(achievement.id.split('_')[1]);
        progress = Math.min(Math.round((data.totalAttempts / target) * 100), 99);
      } else if (achievement.id.startsWith('points_')) {
        const target = parseInt(achievement.id.split('_')[1]);
        progress = Math.min(Math.round((data.totalPoints / target) * 100), 99);
      } else if (achievement.id.startsWith('days_')) {
        const target = parseInt(achievement.id.split('_')[1]);
        progress = Math.min(Math.round((data.practiceDays / target) * 100), 99);
      } else if (achievement.id.endsWith('_roots')) {
        const match = achievement.description.match(/(\d+)/);
        if (match) {
          const target = parseInt(match[1]);
          progress = Math.min(Math.round((data.masteredRoots / target) * 100), 99);
        }
      }
      return { achievement, progress };
    }
  }
  return null; // 全部解锁
}
