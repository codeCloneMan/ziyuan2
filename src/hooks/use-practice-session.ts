import { useCallback, useEffect, useRef, useState } from 'react';

/** 一轮练习的统计 */
export interface SessionStats {
  totalAttempts: number;
  correctAttempts: number;
  streak: number;
  maxStreak: number;
  score: number;
}

export type FeedbackType = 'correct' | 'wrong' | null;

const INITIAL_STATS: SessionStats = {
  totalAttempts: 0,
  correctAttempts: 0,
  streak: 0,
  maxStreak: 0,
  score: 0,
};

interface UsePracticeSessionOptions {
  /** 答对后自动清除反馈并触发 onCorrect 的延迟(ms) */
  correctClearDelay?: number;
  /**
   * 答错后自动清除反馈的延迟(ms)。
   * - > 0：到时清除反馈并触发 onWrong（用于自动进入下一题）
   * - = 0：不自动清除，由 onWrong 同步处理（用于需要自定义错误处理的场景）
   */
  wrongClearDelay?: number;
  /** 答对且反馈清除后的回调（切换到下一题） */
  onCorrect?: () => void;
  /** 答错后的回调（清输入 / 进入下一题 / 同题重试） */
  onWrong?: (key?: string) => void;
}

/**
 * 统一的练习会话状态机。
 *
 * 三个练习页（字根 / 整字 / 词组）原本各自维护一套
 * isPlaying + keyFeedback + feedbackType + sessionStats + 一堆 setTimeout，
 * 极易出现 stale closure 与计时器竞态。本钩子把它们集中实现，
 * 页面只需：调用 start/stop、提交 submit(isCorrect, key)、在回调里切题。
 */
export function usePracticeSession(options: UsePracticeSessionOptions = {}) {
  const { correctClearDelay = 500, wrongClearDelay = 1200, onCorrect, onWrong } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 用 ref 保存最新的回调，避免 setTimeout 内调用到过期闭包
  const onCorrectRef = useRef(onCorrect);
  const onWrongRef = useRef(onWrong);
  onCorrectRef.current = onCorrect;
  onWrongRef.current = onWrong;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setFeedbackType(null);
    setKeyFeedback(null);
    setStats(INITIAL_STATS);
  }, [clearTimer]);

  const start = useCallback(() => {
    reset();
    setIsPlaying(true);
  }, [reset]);

  const stop = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setFeedbackType(null);
    setKeyFeedback(null);
  }, [clearTimer]);

  const submit = useCallback((isCorrect: boolean, key?: string) => {
    const pressed = key ?? null;
    setKeyFeedback(pressed);
    setFeedbackType(isCorrect ? 'correct' : 'wrong');

    setStats(prev => {
      const streakBonus = Math.min(prev.streak, 10);
      const points = isCorrect ? 10 + streakBonus : -5;
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        totalAttempts: prev.totalAttempts + 1,
        correctAttempts: prev.correctAttempts + (isCorrect ? 1 : 0),
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        score: Math.max(0, prev.score + points),
      };
    });

    clearTimer();
    if (isCorrect) {
      timerRef.current = setTimeout(() => {
        setFeedbackType(null);
        setKeyFeedback(null);
        onCorrectRef.current?.();
      }, correctClearDelay);
    } else if (wrongClearDelay > 0) {
      timerRef.current = setTimeout(() => {
        setFeedbackType(null);
        setKeyFeedback(null);
        onWrongRef.current?.(pressed ?? undefined);
      }, wrongClearDelay);
    } else {
      onWrongRef.current?.(pressed ?? undefined);
    }
  }, [clearTimer, correctClearDelay, wrongClearDelay]);

  // 卸载时清理计时器，避免内存泄漏 / 控制台报错
  useEffect(() => () => clearTimer(), [clearTimer]);

  const accuracy = stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
    : 0;

  return {
    isPlaying,
    start,
    stop,
    reset,
    submit,
    feedbackType,
    keyFeedback,
    stats,
    accuracy,
    clearTimer,
  };
}
