/**
 * 成就与等级系统 Hook
 *
 * 订阅统一进度 Store，自动解锁新成就，并提供当前等级信息。
 */

import { useEffect, useMemo } from 'react';
import {
  useProgressStore,
  useAchievementData,
  type ProgressAction,
} from '@/store/progress-store';
import {
  getCurrentLevel,
  getNextLevel,
  getUnlockedAchievements,
  getNextAchievement,
  ACHIEVEMENTS,
} from '@/lib/achievements';

export interface AchievementState {
  level: ReturnType<typeof getCurrentLevel>;
  nextLevel: ReturnType<typeof getNextLevel>;
  unlocked: ReturnType<typeof getUnlockedAchievements>;
  nextAchievement: ReturnType<typeof getNextAchievement>;
  total: number;
  unlockedCount: number;
  totalPoints: number;
}

export function useAchievements(): AchievementState {
  const { state, dispatch } = useProgressStore();
  const data = useAchievementData();

  const unlocked = useMemo(() => getUnlockedAchievements(data), [data]);

  // 自动 dispatch ACHIEVE：确保 Store 的 achievements 数组与计算结果一致
  useEffect(() => {
    const currentIds = new Set(state.achievements);
    const missing = unlocked.filter(a => !currentIds.has(a.id));
    if (missing.length > 0) {
      missing.forEach(a => {
        dispatch({ type: 'ACHIEVE', achievement: a.id } as ProgressAction);
      });
    }
  }, [unlocked, state.achievements, dispatch]);

  return useMemo(() => ({
    level: getCurrentLevel(data.totalPoints),
    nextLevel: getNextLevel(data.totalPoints),
    unlocked,
    nextAchievement: getNextAchievement(data),
    total: ACHIEVEMENTS.length,
    unlockedCount: unlocked.length,
    totalPoints: data.totalPoints,
  }), [data, unlocked]);
}
