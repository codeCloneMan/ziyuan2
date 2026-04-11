import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // localStorage full or unavailable
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

/** 练习持久化数据结构 */
export interface PracticePersistData {
  /** 累计统计 */
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    maxStreak: number;
    totalScore: number;
  };
  /** 每个字根的错误次数记录 */
  wrongCountMap: Record<string, number>;
  /** 每个字根的正确次数记录 */
  correctCountMap: Record<string, number>;
  /** 顺序练习当前进度 */
  sequentialIndex: number;
  /** 上次练习时间 */
  lastPracticeTime: number;
}

export const defaultPracticeData: PracticePersistData = {
  stats: {
    totalAttempts: 0,
    correctAttempts: 0,
    maxStreak: 0,
    totalScore: 0,
  },
  wrongCountMap: {},
  correctCountMap: {},
  sequentialIndex: 0,
  lastPracticeTime: 0,
};

const STORAGE_KEY_PREFIX = 'ziyuan-practice-';

export function usePracticePersist(mode: string): [PracticePersistData, (data: PracticePersistData | ((prev: PracticePersistData) => PracticePersistData)) => void] {
  const key = `${STORAGE_KEY_PREFIX}${mode}`;
  return useLocalStorage<PracticePersistData>(key, defaultPracticeData);
}
