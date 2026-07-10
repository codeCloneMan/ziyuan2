/**
 * 全局学习进度追踪 Hook
 *
 * 基于统一 progress store 计算整体学习旅程进度，
 * 提供"下一步"引导和阶段状态。
 */

import { useMemo } from 'react';
import { useProgressStore } from '@/store/progress-store';

export interface LearningStage {
  id: string;
  title: string;
  description: string;
  link: string;
  isCompleted: boolean;
  isActive: boolean;
  progress: number; // 0~100
}

const STAGE_DEFINITIONS = [
  {
    id: 'table',
    title: '认识字根',
    description: '查看字根表，了解 329 个字根的分布规律',
    link: '/table',
    threshold: 0,
  },
  {
    id: 'practice',
    title: '记忆字根',
    description: '科学渐进式练习，逐步掌握全部字根',
    link: '/practice',
    threshold: 0,
  },
  {
    id: 'practice-mastery',
    title: '字根掌握',
    description: '掌握 80% 以上字根，进入整字练习',
    link: '/practice',
    threshold: 80,
  },
  {
    id: 'whole-char',
    title: '整字输入',
    description: '从字根到整字，练习汉字编码拆分',
    link: '/whole-char',
    threshold: 0,
  },
  {
    id: 'phrase',
    title: '实战打字',
    description: '词组和短句练习，流畅运用输入法',
    link: '/phrase',
    threshold: 0,
  },
];

export function useLearningProgress() {
  const { state } = useProgressStore();

  const stages = useMemo<LearningStage[]>(() => {
    // 字根进度：correctCountMap 中 >=3 的占比
    const rootCorrect = state.root.correctCountMap;
    const totalRoots = 329;
    const rootMastered = Object.values(rootCorrect).filter(c => c >= 3).length;
    const rootProgress = Math.min(Math.round((rootMastered / totalRoots) * 100), 100);

    // 整字进度：聚合所有 whole:* 模式，按字取最高 correctCount，>=3 视为掌握（目标 500 常用字）
    const wcModes = state.wholeChar.modes;
    const charBestCorrect: Record<string, number> = {};
    for (const modeKey of Object.keys(wcModes)) {
      const correctMap = wcModes[modeKey]?.correctCountMap || {};
      for (const [char, count] of Object.entries(correctMap)) {
        if (count > (charBestCorrect[char] || 0)) charBestCorrect[char] = count;
      }
    }
    const wcMastered = Object.values(charBestCorrect).filter(c => c >= 3).length;
    const wholeCharProgress = Math.min(Math.round((wcMastered / 500) * 100), 100);

    // 词组进度：按累计答题数和正确率综合计算
    let phraseProgress = 0;
    if (state.phrase.totalAttempts > 0) {
      const accuracy = state.phrase.totalCorrect / state.phrase.totalAttempts;
      const volumeBonus = Math.min(state.phrase.totalAttempts / 50, 1) * 30;
      phraseProgress = Math.min(Math.round(volumeBonus + accuracy * 70), 100);
    }

    const progressMap: Record<string, number> = {
      'table': rootProgress > 0 ? 100 : 0,
      'practice': rootProgress,
      'practice-mastery': rootProgress,
      'whole-char': wholeCharProgress,
      'phrase': phraseProgress,
    };

    const stages: LearningStage[] = [];
    let foundActive = false;
    for (const def of STAGE_DEFINITIONS) {
      const progress = progressMap[def.id] || 0;
      const isCompleted = progress >= (def.threshold || 100);
      const isActive = !foundActive && !isCompleted;
      if (isActive) foundActive = true;

      stages.push({
        id: def.id,
        title: def.title,
        description: def.description,
        link: def.link,
        isCompleted,
        isActive,
        progress,
      });
    }
    return stages;
  }, [state.root, state.wholeChar, state.phrase]);

  const overallProgress = useMemo(() => {
    const completed = stages.filter(s => s.isCompleted).length;
    return Math.round((completed / stages.length) * 100);
  }, [stages]);

  const currentStage = useMemo(() => {
    return stages.find(s => s.isActive) || stages[stages.length - 1];
  }, [stages]);

  return {
    stages,
    overallProgress,
    currentStage,
  };
}
