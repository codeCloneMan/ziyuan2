/**
 * 练习轮次 Hook
 *
 * 每个练习池（poolKey）维护"当前这一轮已经答过哪些题"，
 * 答完池内最后一题时把轮次记录 +1（持久化），本轮统计由调用方归零，
 * 练习自动进入下一轮。
 *
 * 当前轮已答集合只存在于会话内存：退出/刷新后本轮从头开始，
 * 已完成轮数则从 store 读取，不会丢。
 */

import { useCallback, useRef, useState } from 'react';
import { useProgressStore } from '@/store/progress-store';
import { recordRoundSeen } from '@/lib/practice-round';

export function usePracticeRound(poolKey: string, poolSize: number) {
  const { state, dispatch } = useProgressStore();
  const completedRounds = state.rounds[poolKey] ?? 0;

  // 池签名：切换难度 / 数据加载完成时本轮记录作废，惰性重置（不在渲染期写 ref）
  const sig = `${poolKey}:${poolSize}`;
  const sigRef = useRef(sig);
  const seenRef = useRef<Set<string>>(new Set());
  const [seenCount, setSeenCount] = useState(0);

  /** 重新开始计数（开始新一轮练习时调用）；已完成轮数保留 */
  const resetRound = useCallback(() => {
    sigRef.current = sig;
    seenRef.current = new Set();
    setSeenCount(0);
  }, [sig]);

  /** 记录一道题已作答；返回 true 表示本次刚好完成一轮 */
  const markSeen = useCallback((id: string): boolean => {
    if (sigRef.current !== sig) {
      sigRef.current = sig;
      seenRef.current = new Set();
      setSeenCount(0);
    }
    const completed = recordRoundSeen(seenRef.current, id, poolSize);
    setSeenCount(seenRef.current.size);
    if (completed) dispatch({ type: 'ROUND_COMPLETE', poolKey });
    return completed;
  }, [dispatch, poolKey, poolSize, sig]);

  return { completedRounds, seenCount, markSeen, resetRound, poolSize };
}
