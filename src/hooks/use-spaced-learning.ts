/**
 * 渐进式学习系统 Hook
 * 基于艾宾浩斯记忆曲线和虎码/宇浩的练习方式
 * 
 * 核心原理：
 * 1. 每次新增少量字根进入练习池（默认5个）
 * 2. 连续答对N次视为"掌握"（默认3次）
 * 3. 掌握的字根降低出现频率，但偶尔复习
 * 4. 未掌握的字根高频重复出现
 */

import { useState, useCallback, useEffect } from 'react';

// 学习项状态
export interface LearningItem {
  id: string;           // 唯一标识
  consecutiveCorrect: number;  // 连续正确次数
  isMastered: boolean;  // 是否已掌握
  lastPracticeTime: number; // 最后练习时间
  totalAttempts: number; // 总尝试次数
  wrongCount: number;   // 错误次数
}

// 学习池状态
export interface LearningPool {
  items: Record<string, LearningItem>;
  activePool: string[];      // 当前活跃池（未掌握+新加入）
  masteredPool: string[];    // 已掌握池
  pendingPool: string[];     // 待加入池（未学习）
  newItemsPerRound: number;  // 每轮新增数量
  masteryThreshold: number;  // 掌握阈值（连续正确次数）
  reviewProbability: number; // 复习概率
}

const DEFAULT_POOL: LearningPool = {
  items: {},
  activePool: [],
  masteredPool: [],
  pendingPool: [],
  newItemsPerRound: 5,
  masteryThreshold: 3,
  reviewProbability: 0.1, // 10%概率出现已掌握的
};

interface UseSpacedLearningOptions {
  allItemIds: string[];       // 所有可学习的项目ID
  newItemsPerRound?: number;  // 每轮新增数量
  masteryThreshold?: number;  // 掌握阈值
  reviewProbability?: number; // 复习概率
  storageKey?: string;        // 本地存储键
}

export function useSpacedLearning(options: UseSpacedLearningOptions) {
  const {
    allItemIds,
    newItemsPerRound = 5,
    masteryThreshold = 3,
    reviewProbability = 0.1,
    storageKey,
  } = options;

  const [pool, setPool] = useState<LearningPool>(() => {
    // 尝试从本地存储恢复
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as LearningPool;
          // 验证数据有效性
          if (parsed.items && parsed.activePool && parsed.masteredPool) {
            return parsed;
          }
        } catch {
          // 解析失败，使用默认值
        }
      }
    }

    // 初始化：前N个进入活跃池，其余进入待加入池
    const initialActive = allItemIds.slice(0, newItemsPerRound);
    const initialPending = allItemIds.slice(newItemsPerRound);
    
    const items: Record<string, LearningItem> = {};
    initialActive.forEach(id => {
      items[id] = {
        id,
        consecutiveCorrect: 0,
        isMastered: false,
        lastPracticeTime: 0,
        totalAttempts: 0,
        wrongCount: 0,
      };
    });

    return {
      items,
      activePool: initialActive,
      masteredPool: [],
      pendingPool: initialPending,
      newItemsPerRound,
      masteryThreshold,
      reviewProbability,
    };
  });

  // 保存到本地存储
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(pool));
    }
  }, [pool, storageKey]);

  // 获取下一个要练习的项目
  const getNextItem = useCallback((): string | null => {
    // 先检查是否有活跃池中的项目
    if (pool.activePool.length === 0 && pool.pendingPool.length > 0) {
      // 活跃池空了，补充新项目
      const toAdd = pool.pendingPool.slice(0, pool.newItemsPerRound);
      const remaining = pool.pendingPool.slice(pool.newItemsPerRound);
      
      const newItems: Record<string, LearningItem> = { ...pool.items };
      toAdd.forEach(id => {
        newItems[id] = {
          id,
          consecutiveCorrect: 0,
          isMastered: false,
          lastPracticeTime: 0,
          totalAttempts: 0,
          wrongCount: 0,
        };
      });

      setPool(prev => ({
        ...prev,
        items: newItems,
        activePool: toAdd,
        pendingPool: remaining,
      }));

      return toAdd[0] || null;
    }

    // 决定是否复习已掌握的项目
    if (pool.masteredPool.length > 0 && Math.random() < pool.reviewProbability) {
      // 随机选一个已掌握的复习
      const randomIndex = Math.floor(Math.random() * pool.masteredPool.length);
      return pool.masteredPool[randomIndex];
    }

    // 从活跃池中选择（优先选择错误次数多的）
    if (pool.activePool.length > 0) {
      // 加权随机：错误次数越多，被选中概率越高
      const weights = pool.activePool.map(id => {
        const item = pool.items[id];
        return 1 + (item?.wrongCount || 0) * 2;
      });
      
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      
      for (let i = 0; i < pool.activePool.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return pool.activePool[i];
        }
      }
      
      return pool.activePool[0];
    }

    // 如果所有项目都掌握了，随机复习
    if (pool.masteredPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.masteredPool.length);
      return pool.masteredPool[randomIndex];
    }

    return null;
  }, [pool]);

  // 记录答题结果
  const recordResult = useCallback((itemId: string, isCorrect: boolean) => {
    setPool(prev => {
      const item = prev.items[itemId];
      if (!item) return prev;

      const newItems = { ...prev.items };
      let newActivePool = [...prev.activePool];
      let newMasteredPool = [...prev.masteredPool];

      if (isCorrect) {
        // 答对
        const newConsecutiveCorrect = item.consecutiveCorrect + 1;
        const isNowMastered = newConsecutiveCorrect >= prev.masteryThreshold && !item.isMastered;

        newItems[itemId] = {
          ...item,
          consecutiveCorrect: newConsecutiveCorrect,
          isMastered: item.isMastered || isNowMastered,
          lastPracticeTime: Date.now(),
          totalAttempts: item.totalAttempts + 1,
        };

        // 如果刚掌握，从活跃池移到已掌握池
        if (isNowMastered) {
          newActivePool = newActivePool.filter(id => id !== itemId);
          newMasteredPool.push(itemId);
        }
      } else {
        // 答错：重置连续正确次数，增加错误计数
        newItems[itemId] = {
          ...item,
          consecutiveCorrect: 0,
          lastPracticeTime: Date.now(),
          totalAttempts: item.totalAttempts + 1,
          wrongCount: item.wrongCount + 1,
        };

        // 如果已掌握的项目答错了，移回活跃池
        if (item.isMastered) {
          newMasteredPool = newMasteredPool.filter(id => id !== itemId);
          if (!newActivePool.includes(itemId)) {
            newActivePool.push(itemId);
          }
          newItems[itemId].isMastered = false;
        }
      }

      return {
        ...prev,
        items: newItems,
        activePool: newActivePool,
        masteredPool: newMasteredPool,
      };
    });
  }, []);

  // 重置进度
  const resetProgress = useCallback(() => {
    const initialActive = allItemIds.slice(0, newItemsPerRound);
    const initialPending = allItemIds.slice(newItemsPerRound);
    
    const items: Record<string, LearningItem> = {};
    initialActive.forEach(id => {
      items[id] = {
        id,
        consecutiveCorrect: 0,
        isMastered: false,
        lastPracticeTime: 0,
        totalAttempts: 0,
        wrongCount: 0,
      };
    });

    setPool({
      items,
      activePool: initialActive,
      masteredPool: [],
      pendingPool: initialPending,
      newItemsPerRound,
      masteryThreshold,
      reviewProbability,
    });
  }, [allItemIds, newItemsPerRound, masteryThreshold, reviewProbability]);

  // 统计信息
  const stats = {
    total: allItemIds.length,
    mastered: pool.masteredPool.length,
    active: pool.activePool.length,
    pending: pool.pendingPool.length,
    progress: allItemIds.length > 0 
      ? Math.round((pool.masteredPool.length / allItemIds.length) * 100) 
      : 0,
    completion: allItemIds.length > 0 
      ? (pool.masteredPool.length / allItemIds.length) * 100 
      : 0,
  };

  return {
    pool,
    getNextItem,
    recordResult,
    resetProgress,
    stats,
  };
}