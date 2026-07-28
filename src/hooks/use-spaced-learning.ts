/**
 * 渐进式学习系统 Hook (v2 - 基于统一 Store)
 * 基于艾宾浩斯记忆曲线
 *
 * 核心原理：
 * 1. 每次新增少量字根进入练习池（默认5个）
 * 2. 连续答对N次视为"掌握"（默认3次）
 * 3. 掌握的字根降低出现频率，但偶尔复习
 * 4. 未掌握的字根高频重复出现
 * 5. 时间维度：基于遗忘曲线预测记忆强度，到期自动安排复习
 */

import { useCallback, useMemo, useRef } from 'react';
import { useSpacedPool } from '@/store/progress-store';

/** 最小稳定性：5秒 */
const MIN_STABILITY = 5;
/** 已掌握项目的复习阈值 */
const REVIEW_RETENTION_THRESHOLD = 0.6;
/**
 * 最小冷却期（毫秒）：同一项两次出现之间至少间隔 5 秒。
 * 防止答错后权重暴增导致"立刻复现"——那起不到练习作用，
 * 练习者还没消化正确答案就又遇到了同一题。
 */
const MIN_COOLDOWN_MS = 5000;

/** 就地洗牌（Fisher-Yates），用于入门模式提升新批次时打乱顺序 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 学习项状态（从 store 导出，保持兼容）
export interface LearningItem {
  id: string;
  consecutiveCorrect: number;
  isMastered: boolean;
  lastPracticeTime: number;
  totalAttempts: number;
  wrongCount: number;
  stability: number;
}

// 学习池状态（从 store 导出，保持兼容）
export interface LearningPool {
  items: Record<string, LearningItem>;
  activePool: string[];
  masteredPool: string[];
  pendingPool: string[];
  newItemsPerRound: number;
  masteryThreshold: number;
  reviewProbability: number;
}

interface UseSpacedLearningOptions {
  allItemIds: string[];
  newItemsPerRound?: number;
  masteryThreshold?: number;
  reviewProbability?: number;
  storageKey: string; // pool key in store
}

/** 基于遗忘曲线计算当前记忆强度 R = e^(-t/S) */
function calcRetention(lastPracticeTime: number, stability: number): number {
  if (lastPracticeTime <= 0) return 0;
  const elapsed = (Date.now() - lastPracticeTime) / 1000;
  return Math.exp(-elapsed / Math.max(stability, MIN_STABILITY));
}

export function useSpacedLearning(options: UseSpacedLearningOptions) {
  const {
    allItemIds,
    storageKey,
  } = options;

  const { pool, recordResult: storeRecordResult, reset } = useSpacedPool(storageKey, allItemIds);

  // ============================================
  // 用 ref 持有最新值，避免 getNextItem/recordResult
  // 依赖不稳定对象 → 每次答题后引用变化 → 连锁重建
  // ============================================
  const poolRef = useRef(pool);
  poolRef.current = pool;
  const storeRecordResultRef = useRef(storeRecordResult);
  storeRecordResultRef.current = storeRecordResult;

  // 获取下一个要练习的项目（引用稳定，始终读 poolRef.current）
  const getNextItem = useCallback((): string | null => {
    const p = poolRef.current;
    const now = Date.now();

    // 活跃池空了，补充新项目（就地提升整批到 activePool，避免 SPACED_RECORD 的
    // defense block 只把单个借出项加入 activePool 而阻塞其余 pending 的提升）
    if (p.activePool.length === 0 && p.pendingPool.length > 0) {
      const promoteCount = Math.min(p.newItemsPerRound, p.pendingPool.length);
      const promoted = p.pendingPool.slice(0, promoteCount);
      shuffleInPlace(promoted); // 批次内随机顺序，避免固定顺序
      p.activePool = [...p.activePool, ...promoted];
      p.pendingPool = p.pendingPool.slice(promoteCount);
      for (const id of promoted) {
        if (!p.items[id]) {
          p.items[id] = {
            id,
            consecutiveCorrect: 0,
            isMastered: false,
            lastPracticeTime: 0,
            totalAttempts: 0,
            wrongCount: 0,
            stability: 30,
          };
        }
      }
      return promoted[0];
    }

    // 检查已掌握池中是否有需要复习的
    // 门控：activePool 有货时按 reviewProbability 概率进入复习分支（默认 10%）；
    //       activePool 空时必须从 masteredPool 选（兜底，避免无题可出）。
    if (p.masteredPool.length > 0) {
      const shouldReviewMastered = p.activePool.length === 0 || Math.random() < p.reviewProbability;
      if (shouldReviewMastered) {
        const dueForReview: string[] = [];
        for (const id of p.masteredPool) {
          const item = p.items[id];
          if (item && calcRetention(item.lastPracticeTime, item.stability) < REVIEW_RETENTION_THRESHOLD) {
            dueForReview.push(id);
          }
        }
        if (dueForReview.length > 0) {
          dueForReview.sort((a, b) => {
            const retA = calcRetention(p.items[a].lastPracticeTime, p.items[a].stability);
            const retB = calcRetention(p.items[b].lastPracticeTime, p.items[b].stability);
            return retA - retB;
          });
          return dueForReview[0];
        }

        // 增加"最长未复习优先"机制，确保所有已掌握项都能被循环到
        // 混合概率策略：
        //   30% 概率选择最长未复习的项（保证遍历覆盖）
        //   40% 概率随机选择（保持随机性）
        //   30% 概率选择记忆强度最低的项（强化薄弱项）
        const sortedByLastPractice = [...p.masteredPool].sort((a, b) => {
          return (p.items[a].lastPracticeTime || 0) - (p.items[b].lastPracticeTime || 0);
        });

        const sortedByRetention = [...p.masteredPool].sort((a, b) => {
          const retA = calcRetention(p.items[a].lastPracticeTime, p.items[a].stability);
          const retB = calcRetention(p.items[b].lastPracticeTime, p.items[b].stability);
          return retA - retB;
        });

        const rand = Math.random();
        if (rand < 0.3) {
          // 30%：最长未复习优先，确保所有项都能被循环到
          return sortedByLastPractice[0];
        } else if (rand < 0.7) {
          // 40%：随机选择，保持练习多样性
          const randomIndex = Math.floor(Math.random() * p.masteredPool.length);
          return p.masteredPool[randomIndex];
        } else {
          // 30%：记忆强度最低优先，强化薄弱项
          return sortedByRetention[0];
        }
      }
    }

    // 从活跃池中选择（加权随机）
    if (p.activePool.length > 0) {
      // 冷却过滤：排除刚练过的项（除非所有项都在冷却中）
      const eligibleItems = p.activePool.filter(id => {
        const item = p.items[id];
        if (!item || item.lastPracticeTime <= 0) return true;
        return (now - item.lastPracticeTime) > MIN_COOLDOWN_MS;
      });
      const itemsToUse = eligibleItems.length > 0 ? eligibleItems : p.activePool;

      const weights = itemsToUse.map(id => {
        const item = p.items[id];
        if (!item) return 1;
        const wrongBoost = 1 + item.wrongCount * 2;
        const retention = calcRetention(item.lastPracticeTime, item.stability);
        const timeBoost = item.lastPracticeTime > 0 ? (2 - retention) : 1;
        return wrongBoost * timeBoost;
      });

      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < itemsToUse.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return itemsToUse[i];
        }
      }
      return itemsToUse[0];
    }

    // 兜底：如果所有项都掌握且前面逻辑未返回（理论上不会走到这里）
    if (p.masteredPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * p.masteredPool.length);
      return p.masteredPool[randomIndex];
    }

    return null;
  }, []); // 空依赖 — pool 通过 ref 读取，引用永久稳定

  // 记录答题结果（引用稳定）
  const recordResult = useCallback((itemId: string, isCorrect: boolean) => {
    storeRecordResultRef.current(itemId, isCorrect);
  }, []);

  // 重置进度（引用稳定）
  const resetProgress = useCallback(() => {
    reset();
  }, [reset]);

  // 统计信息
  const stats = useMemo(() => ({
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
  }), [pool, allItemIds.length]);

  return {
    pool,
    getNextItem,
    recordResult,
    resetProgress,
    stats,
  };
}


