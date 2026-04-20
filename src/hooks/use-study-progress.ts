import { useState, useEffect, useCallback } from 'react';

// 学习进度数据类型
export interface StudyProgress {
  // 打卡记录：日期字符串 -> 是否打卡
  checkInMap: Record<string, boolean>;
  // 每日练习次数：日期字符串 -> 练习次数
  dailyPracticeMap: Record<string, number>;
  // 总学习天数
  totalDays: number;
  // 连续打卡天数
  consecutiveDays: number;
  // 最长连续打卡
  maxConsecutiveDays: number;
  // 上次打卡日期
  lastCheckIn: string | null;
  // 今日目标
  dailyGoal: number;
  // 今日已完成
  todayCompleted: number;
}

const STORAGE_KEY = 'ziyuan-study-progress';

const defaultProgress: StudyProgress = {
  checkInMap: {},
  dailyPracticeMap: {},
  totalDays: 0,
  consecutiveDays: 0,
  maxConsecutiveDays: 0,
  lastCheckIn: null,
  dailyGoal: 50, // 每日目标50题
  todayCompleted: 0,
};

// 获取今天的日期字符串 (YYYY-MM-DD)
function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// 获取昨天的日期字符串
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
}

// 计算连续打卡天数
function calculateConsecutiveDays(checkInMap: Record<string, boolean>): number {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  
  // 如果今天或昨天都没有打卡，连续天数为0
  if (!checkInMap[today] && !checkInMap[yesterday]) {
    return 0;
  }
  
  let consecutive = 0;
  let currentDate = new Date();
  
  // 从今天开始往前数
  while (true) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    if (checkInMap[dateStr]) {
      consecutive++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return consecutive;
}

export function useStudyProgress() {
  const [progress, setProgress] = useState<StudyProgress>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 重置今日完成数（如果是新的一天）
        const today = getTodayString();
        const yesterday = getYesterdayString();
        
        // 如果今天是新的一天，重置今日完成数
        if (!parsed.dailyPracticeMap[today]) {
          parsed.todayCompleted = 0;
          parsed.dailyPracticeMap[today] = 0;
        }
        
        // 重新计算连续打卡天数
        parsed.consecutiveDays = calculateConsecutiveDays(parsed.checkInMap);
        
        return { ...defaultProgress, ...parsed };
      } catch {
        return defaultProgress;
      }
    }
    return defaultProgress;
  });

  // 保存到localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // 记录练习（每次完成一题）
  const recordPractice = useCallback(() => {
    const today = getTodayString();
    
    setProgress((prev) => {
      const newDailyPracticeMap = { ...prev.dailyPracticeMap };
      const todayCount = (newDailyPracticeMap[today] || 0) + 1;
      newDailyPracticeMap[today] = todayCount;
      
      // 检查是否达到打卡条件（达到每日目标）
      const shouldCheckIn = todayCount >= prev.dailyGoal && !prev.checkInMap[today];
      const newCheckInMap = { ...prev.checkInMap };
      
      if (shouldCheckIn) {
        newCheckInMap[today] = true;
      }
      
      // 计算新的连续天数
      const newConsecutiveDays = shouldCheckIn 
        ? calculateConsecutiveDays(newCheckInMap)
        : prev.consecutiveDays;
      
      return {
        ...prev,
        dailyPracticeMap: newDailyPracticeMap,
        todayCompleted: todayCount,
        checkInMap: newCheckInMap,
        consecutiveDays: newConsecutiveDays,
        maxConsecutiveDays: Math.max(prev.maxConsecutiveDays, newConsecutiveDays),
        lastCheckIn: shouldCheckIn ? today : prev.lastCheckIn,
        totalDays: Object.keys(newCheckInMap).length,
      };
    });
  }, []);

  // 手动打卡
  const checkIn = useCallback(() => {
    const today = getTodayString();
    
    setProgress((prev) => {
      if (prev.checkInMap[today]) {
        return prev; // 今天已经打卡了
      }
      
      const newCheckInMap = { ...prev.checkInMap, [today]: true };
      const newConsecutiveDays = calculateConsecutiveDays(newCheckInMap);
      
      return {
        ...prev,
        checkInMap: newCheckInMap,
        consecutiveDays: newConsecutiveDays,
        maxConsecutiveDays: Math.max(prev.maxConsecutiveDays, newConsecutiveDays),
        lastCheckIn: today,
        totalDays: Object.keys(newCheckInMap).length,
      };
    });
  }, []);

  // 设置每日目标
  const setDailyGoal = useCallback((goal: number) => {
    setProgress((prev) => ({
      ...prev,
      dailyGoal: goal,
    }));
  }, []);

  // 检查今天是否已打卡
  const isTodayCheckedIn = useCallback(() => {
    const today = getTodayString();
    return progress.checkInMap[today] || false;
  }, [progress.checkInMap]);

  // 获取最近7天的打卡记录
  const getRecentCheckIns = useCallback(() => {
    const result: { date: string; checkedIn: boolean; count: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      result.push({
        date: dateStr,
        checkedIn: progress.checkInMap[dateStr] || false,
        count: progress.dailyPracticeMap[dateStr] || 0,
      });
    }
    
    return result;
  }, [progress.checkInMap, progress.dailyPracticeMap]);

  // 获取进度百分比
  const getProgressPercentage = useCallback(() => {
    return Math.min((progress.todayCompleted / progress.dailyGoal) * 100, 100);
  }, [progress.todayCompleted, progress.dailyGoal]);

  return {
    progress,
    recordPractice,
    checkIn,
    setDailyGoal,
    isTodayCheckedIn,
    getRecentCheckIns,
    getProgressPercentage,
  };
}