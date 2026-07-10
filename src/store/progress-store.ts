/**
 * 统一学习进度 Store
 *
 * 将散落各处的 localStorage 进度数据收敛到一个版本化 schema 中，
 * 支持跨页面联动、统一导入导出、集中迁移。
 *
 * Schema:
 *   version: number
 *   root: { correctCountMap, wrongCountMap, ... }
 *   wholeChar: { modes: Record<mode, {...}> }
 *   phrase: { ... }
 *   spacedPools: Record<poolKey, LearningPool>
 *   achievements: string[]
 *   preferences: { theme, practiceStyle, showHint, ... }
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';

// ========================================
// Schema 类型定义
// ========================================

export interface SpacedItem {
  id: string;
  consecutiveCorrect: number;
  isMastered: boolean;
  lastPracticeTime: number;
  totalAttempts: number;
  wrongCount: number;
  stability: number;
}

export interface SpacedPool {
  items: Record<string, SpacedItem>;
  activePool: string[];
  masteredPool: string[];
  pendingPool: string[];
  newItemsPerRound: number;
  masteryThreshold: number;
  reviewProbability: number;
}

export interface RootProgress {
  correctCountMap: Record<string, number>;
  wrongCountMap: Record<string, number>;
  totalAttempts: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
  lastPracticeAt: number;
}

export interface WholeCharModeProgress {
  correctCountMap: Record<string, number>;
  wrongCountMap: Record<string, number>;
  totalAttempts: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
  lastPracticeAt: number;
}

export interface WholeCharProgress {
  modes: Record<string, WholeCharModeProgress>;
  currentMode: string;
}

export interface PhraseProgress {
  totalAttempts: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
  lastMode: string;
  lastPracticeAt: number;
}

/** 练习难度级别（三页面统一）：入门/进阶 */
export type PracticeLevel = 'beginner' | 'advanced';

export interface Preferences {
  theme: 'light' | 'dark';
  practiceStyle: string;
  rootMode: PracticeLevel;
  charSetRange: PracticeLevel;
  phraseMode: PracticeLevel;
  showHint: boolean;
  wholeCharShowHint: boolean;
}

export interface DailyStat {
  attempts: number;
  correct: number;
  score: number;
}

export interface ProgressState {
  version: number;
  root: RootProgress;
  wholeChar: WholeCharProgress;
  phrase: PhraseProgress;
  spacedPools: Record<string, SpacedPool>;
  achievements: string[];
  preferences: Preferences;
  totalPoints: number;
  dailyStats: Record<string, DailyStat>;
}

const CURRENT_VERSION = 3;
const STORAGE_KEY = 'ziyuan-progress-v3';

// ========================================
// 默认值
// ========================================

const defaultRoot: RootProgress = {
  correctCountMap: {},
  wrongCountMap: {},
  totalAttempts: 0,
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
  lastPracticeAt: 0,
};

const defaultWholeChar: WholeCharProgress = {
  modes: {},
  currentMode: 'progressive',
};

const defaultPhrase: PhraseProgress = {
  totalAttempts: 0,
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
  lastMode: '',
  lastPracticeAt: 0,
};

const defaultPreferences: Preferences = {
  theme: 'light',
  practiceStyle: 'beginner',
  rootMode: 'beginner',
  charSetRange: 'beginner',
  phraseMode: 'beginner',
  showHint: false,
  wholeCharShowHint: false,
};

function createDefaultState(): ProgressState {
  return {
    version: CURRENT_VERSION,
    root: { ...defaultRoot },
    wholeChar: { ...defaultWholeChar },
    phrase: { ...defaultPhrase },
    spacedPools: {},
    achievements: [],
    preferences: { ...defaultPreferences },
    totalPoints: 0,
    dailyStats: {},
  };
}

function normalizeState(partial: Partial<ProgressState>): ProgressState {
  const defaults = createDefaultState();
  const prefs = { ...defaults.preferences, ...partial.preferences };

  // ============================================
  // 校验：确保 level 字段只能是 'beginner' | 'advanced'
  // 防止旧数据 / 损坏的 localStorage 导致 levelConfig[level] 为 undefined 崩溃
  // ============================================
  const validLevels: PracticeLevel[] = ['beginner', 'advanced'];
  if (!validLevels.includes(prefs.rootMode as PracticeLevel)) prefs.rootMode = 'beginner';
  if (!validLevels.includes(prefs.charSetRange as PracticeLevel)) prefs.charSetRange = 'beginner';
  if (!validLevels.includes(prefs.phraseMode as PracticeLevel)) prefs.phraseMode = 'beginner';

  return {
    ...defaults,
    ...partial,
    version: CURRENT_VERSION,
    root: { ...defaults.root, ...partial.root },
    wholeChar: { ...defaults.wholeChar, ...partial.wholeChar },
    phrase: { ...defaults.phrase, ...partial.phrase },
    preferences: prefs,
    spacedPools: partial.spacedPools ?? defaults.spacedPools,
    achievements: partial.achievements ?? defaults.achievements,
    totalPoints: partial.totalPoints ?? defaults.totalPoints,
    dailyStats: partial.dailyStats ?? defaults.dailyStats,
  };
}

// ========================================
// Reducer Helpers
// ========================================

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function calculatePoints(currentStreak: number, isCorrect: boolean): number {
  if (!isCorrect) return -5;
  const streakBonus = Math.min(currentStreak, 10);
  return 10 + streakBonus;
}

function updateDailyStats(
  dailyStats: Record<string, DailyStat>,
  isCorrect: boolean,
  points: number,
): Record<string, DailyStat> {
  const today = getTodayKey();
  const prev = dailyStats[today] || { attempts: 0, correct: 0, score: 0 };
  return {
    ...dailyStats,
    [today]: {
      attempts: prev.attempts + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      score: Math.max(0, prev.score + points),
    },
  };
}

// ========================================
// Reducer Actions
// ========================================

export type ProgressAction =
  | { type: 'ROOT_ANSWER'; char: string; isCorrect: boolean }
  | { type: 'ROOT_RESET' }
  | { type: 'WHOLE_CHAR_ANSWER'; mode: string; char: string; isCorrect: boolean }
  | { type: 'WHOLE_CHAR_SET_MODE'; mode: string }
  | { type: 'PHRASE_ANSWER'; isCorrect: boolean }
  | { type: 'PHRASE_SET_MODE'; mode: string }
  | { type: 'SPACED_RECORD'; poolKey: string; itemId: string; isCorrect: boolean; allItemIds: string[] }
  | { type: 'SPACED_RESET'; poolKey: string; allItemIds: string[] }
  | { type: 'ACHIEVE'; achievement: string }
  | { type: 'SET_PREF'; key: keyof Preferences; value: Preferences[keyof Preferences] }
  | { type: 'HYDRATE'; state: ProgressState }
  | { type: 'MIGRATE'; oldState: unknown };

function reducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'ROOT_ANSWER': {
      const { char, isCorrect } = action;
      const root = { ...state.root };
      const oldStreak = root.streak;
      if (isCorrect) {
        root.correctCountMap = { ...root.correctCountMap, [char]: (root.correctCountMap[char] || 0) + 1 };
        root.totalCorrect++;
        root.streak = oldStreak + 1;
        if (root.streak > root.bestStreak) root.bestStreak = root.streak;
      } else {
        root.wrongCountMap = { ...root.wrongCountMap, [char]: (root.wrongCountMap[char] || 0) + 1 };
        root.streak = 0;
      }
      root.totalAttempts++;
      root.lastPracticeAt = Date.now();
      const points = calculatePoints(oldStreak, isCorrect);
      return {
        ...state,
        root,
        totalPoints: Math.max(0, state.totalPoints + points),
        dailyStats: updateDailyStats(state.dailyStats, isCorrect, points),
      };
    }

    case 'ROOT_RESET':
      return { ...state, root: { ...defaultRoot } };

    case 'WHOLE_CHAR_ANSWER': {
      const { mode, char, isCorrect } = action;
      const wholeChar = { ...state.wholeChar };
      const modes = { ...wholeChar.modes };
      const m = modes[mode] || {
        correctCountMap: {}, wrongCountMap: {}, totalAttempts: 0, totalCorrect: 0,
        streak: 0, bestStreak: 0, lastPracticeAt: 0,
      };
      const oldStreak = m.streak;
      const newStreak = isCorrect ? oldStreak + 1 : 0;
      modes[mode] = {
        correctCountMap: isCorrect
          ? { ...m.correctCountMap, [char]: (m.correctCountMap[char] || 0) + 1 }
          : m.correctCountMap,
        wrongCountMap: !isCorrect
          ? { ...m.wrongCountMap, [char]: (m.wrongCountMap[char] || 0) + 1 }
          : m.wrongCountMap,
        totalAttempts: m.totalAttempts + 1,
        totalCorrect: m.totalCorrect + (isCorrect ? 1 : 0),
        streak: newStreak,
        bestStreak: Math.max(m.bestStreak, newStreak),
        lastPracticeAt: Date.now(),
      };
      const points = calculatePoints(oldStreak, isCorrect);
      return {
        ...state,
        wholeChar: { ...wholeChar, modes },
        totalPoints: Math.max(0, state.totalPoints + points),
        dailyStats: updateDailyStats(state.dailyStats, isCorrect, points),
      };
    }

    case 'WHOLE_CHAR_SET_MODE':
      return { ...state, wholeChar: { ...state.wholeChar, currentMode: action.mode } };

    case 'PHRASE_ANSWER': {
      const phrase = { ...state.phrase };
      const oldStreak = phrase.streak;
      const newStreak = action.isCorrect ? oldStreak + 1 : 0;
      phrase.totalAttempts++;
      if (action.isCorrect) phrase.totalCorrect++;
      phrase.streak = newStreak;
      phrase.bestStreak = Math.max(phrase.bestStreak, newStreak);
      phrase.lastPracticeAt = Date.now();
      const points = calculatePoints(oldStreak, action.isCorrect);
      return {
        ...state,
        phrase,
        totalPoints: Math.max(0, state.totalPoints + points),
        dailyStats: updateDailyStats(state.dailyStats, action.isCorrect, points),
      };
    }

    case 'PHRASE_SET_MODE':
      return { ...state, phrase: { ...state.phrase, lastMode: action.mode } };

    case 'SPACED_RECORD': {
      const { poolKey, itemId, isCorrect, allItemIds } = action;
      const pools = { ...state.spacedPools };
      let pool = pools[poolKey];
      if (!pool) {
        pool = createDefaultPool(allItemIds);
      }
      pool = { ...pool, items: { ...pool.items } };
      let item = pool.items[itemId];

      // ============================================
      // 防御：如果 item 不在 items 里（getNextItem
      // fallback 路径从未持久化的 pendingPool 借出），
      // 就地创建一个默认条目，而非直接 return state。
      // 否则下方的 auto-promotion 永远无法执行——死循环。
      // ============================================
      if (!item) {
        item = {
          id: itemId,
          consecutiveCorrect: 0,
          isMastered: false,
          lastPracticeTime: 0,
          totalAttempts: 0,
          wrongCount: 0,
          stability: 30,
        };
        pool.items[itemId] = item;
        // 如果该项不在 activePool 中，加入（确保它在池中有归属）
        if (!pool.activePool.includes(itemId) && !pool.masteredPool.includes(itemId)) {
          pool.activePool = [...pool.activePool, itemId];
        }
      }

      const STABILITY_GROWTH = 2.0;
      const STABILITY_DECAY = 0.3;
      const MIN_STABILITY = 5;
      const MAX_STABILITY = 90 * 24 * 3600;

      if (isCorrect) {
        const newStability = Math.min(item.stability * STABILITY_GROWTH, MAX_STABILITY);
        const newConsecutive = item.consecutiveCorrect + 1;
        const isNowMastered = newConsecutive >= pool.masteryThreshold && !item.isMastered;
        pool.items[itemId] = {
          ...item,
          consecutiveCorrect: newConsecutive,
          isMastered: item.isMastered || isNowMastered,
          lastPracticeTime: Date.now(),
          totalAttempts: item.totalAttempts + 1,
          stability: newStability,
        };
        if (isNowMastered) {
          pool.activePool = pool.activePool.filter(id => id !== itemId);
          pool.masteredPool = [...pool.masteredPool, itemId];
        }
      } else {
        const newStability = Math.max(item.stability * STABILITY_DECAY, MIN_STABILITY);
        pool.items[itemId] = {
          ...item,
          consecutiveCorrect: 0,
          lastPracticeTime: Date.now(),
          totalAttempts: item.totalAttempts + 1,
          wrongCount: item.wrongCount + 1,
          stability: newStability,
        };
        if (item.isMastered) {
          pool.masteredPool = pool.masteredPool.filter(id => id !== itemId);
          if (!pool.activePool.includes(itemId)) {
            pool.activePool = [...pool.activePool, itemId];
          }
          pool.items[itemId].isMastered = false;
        }
      }

      // ============================================
      // 自动补充：活跃池空了 + 待学池有货 → 提拔新项
      // 否则 getNextItem 会读到空 activePool，只能从
      // pending 临时"借"一个返回（不持久化），导致该
      // 项的 SPACED_RECORD 找不到 item 记录 → no-op
      // → 死循环同一个字根。
      // ============================================
      if (pool.activePool.length === 0 && pool.pendingPool.length > 0) {
        const promoteCount = Math.min(pool.newItemsPerRound, pool.pendingPool.length);
        const promoted = pool.pendingPool.slice(0, promoteCount);
        const remaining = pool.pendingPool.slice(promoteCount);

        for (const id of promoted) {
          if (!pool.items[id]) {
            pool.items[id] = {
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

        pool.activePool = promoted;
        pool.pendingPool = remaining;
      }

      pools[poolKey] = pool;
      return { ...state, spacedPools: pools };
    }

    case 'SPACED_RESET': {
      const { poolKey, allItemIds } = action;
      const pools = { ...state.spacedPools };
      pools[poolKey] = createDefaultPool(allItemIds);
      return { ...state, spacedPools: pools };
    }

    case 'ACHIEVE': {
      if (state.achievements.includes(action.achievement)) return state;
      return { ...state, achievements: [...state.achievements, action.achievement] };
    }

    case 'SET_PREF': {
      return { ...state, preferences: { ...state.preferences, [action.key]: action.value } };
    }

    case 'HYDRATE':
      return action.state;

    case 'MIGRATE':
      return migrateFromOld(action.oldState);

    default:
      return state;
  }
}

function createDefaultPool(allItemIds: string[]): SpacedPool {
  // 打乱顺序：确保每次新建池时初始 5 项是随机的，而非固定前 5 个
  const shuffled = [...allItemIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const items: Record<string, SpacedItem> = {};
  const active = shuffled.slice(0, 5);
  const pending = shuffled.slice(5);
  active.forEach(id => {
    items[id] = {
      id,
      consecutiveCorrect: 0,
      isMastered: false,
      lastPracticeTime: 0,
      totalAttempts: 0,
      wrongCount: 0,
      stability: 30,
    };
  });
  return {
    items,
    activePool: active,
    masteredPool: [],
    pendingPool: pending,
    newItemsPerRound: 5,
    masteryThreshold: 3,
    reviewProbability: 0.1,
  };
}

// ========================================
// 迁移：从旧版本 localStorage 数据
// ========================================

function migrateFromOld(old: unknown): ProgressState {
  const state = createDefaultState();
  if (!old || typeof old !== 'object') return state;

  const o = old as Record<string, unknown>;

  // v5 字根练习
  try {
    const v5 = typeof o['ziyuan-practice-v5'] === 'string'
      ? JSON.parse(o['ziyuan-practice-v5'])
      : o['ziyuan-practice-v5'];
    if (v5 && typeof v5 === 'object') {
      state.root.correctCountMap = v5.correctCountMap || {};
      state.root.wrongCountMap = v5.wrongCountMap || {};
      state.root.totalAttempts = v5.totalAttempts || 0;
      state.root.totalCorrect = v5.totalCorrect || 0;
      state.root.streak = v5.streak || 0;
      state.root.bestStreak = v5.bestStreak || 0;
    }
  } catch { /* ignore */ }

  // v3 整字练习
  try {
    const v3 = typeof o['ziyuan-whole-char-v3'] === 'string'
      ? JSON.parse(o['ziyuan-whole-char-v3'])
      : o['ziyuan-whole-char-v3'];
    if (v3 && typeof v3 === 'object') {
      state.wholeChar.modes = v3.modes || {};
    }
  } catch { /* ignore */ }

  // 词组
  try {
    const phraseMode = o['phrase-mode'];
    if (typeof phraseMode === 'string') {
      state.phrase.lastMode = phraseMode;
    }
  } catch { /* ignore */ }

  // 间隔学习池
  const poolKeys = ['beginner', 'progressive', 'fullcode', 'weak'];
  for (const key of poolKeys) {
    try {
      const raw = typeof o[`ziyuan-practice-${key}`] === 'string'
        ? JSON.parse(o[`ziyuan-practice-${key}`])
        : o[`ziyuan-practice-${key}`];
      if (raw && typeof raw === 'object' && raw.items) {
        state.spacedPools[key] = raw as SpacedPool;
      }
    } catch { /* ignore */ }
  }

  // 偏好
  try {
    const style = o['ziyuan-practice-style'];
    if (typeof style === 'string') {
      state.preferences.practiceStyle = style;
      // 只将合法值映射到 rootMode，'progressive'/'fullcode'/'weak' 已废弃
      if (style === 'beginner' || style === 'advanced') {
        state.preferences.rootMode = style;
      }
    }
    const hint = o['ziyuan-practice-show-hint'];
    if (typeof hint === 'boolean') state.preferences.showHint = hint;
    const theme = o['ziyuan-theme'];
    if (theme === 'dark' || theme === 'light') state.preferences.theme = theme;
  } catch { /* ignore */ }

  // 初始化新版字段
  if (typeof o['totalPoints'] === 'number') state.totalPoints = o['totalPoints'];
  if (o['dailyStats'] && typeof o['dailyStats'] === 'object') state.dailyStats = o['dailyStats'] as Record<string, DailyStat>;

  return normalizeState(state);
}

// ========================================
// Store 实现（类 Redux 模式，无依赖）
// ========================================

type Listener = () => void;

let currentState: ProgressState = loadFromStorage();
const listeners = new Set<Listener>();

function loadFromStorage(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      if (parsed.version === CURRENT_VERSION) return normalizeState(parsed);
      // 版本不匹配：尝试迁移
      return migrateFromOld(parsed);
    }
  } catch { /* ignore */ }

  // 首次访问：尝试从旧 key 迁移
  const oldData: Record<string, unknown> = {};
  const oldKeys = [
    'ziyuan-practice-v5', 'ziyuan-whole-char-v3', 'phrase-mode',
    'ziyuan-practice-style', 'ziyuan-practice-show-hint', 'ziyuan-theme',
    'ziyuan-practice-beginner', 'ziyuan-practice-progressive',
    'ziyuan-practice-fullcode', 'ziyuan-practice-weak',
  ];
  for (const key of oldKeys) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) oldData[key] = v;
    } catch { /* ignore */ }
  }
  if (Object.keys(oldData).length > 0) {
    return migrateFromOld(oldData);
  }

  return createDefaultState();
}

function saveToStorage(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function dispatch(action: ProgressAction) {
  currentState = reducer(currentState, action);
  saveToStorage(currentState);
  listeners.forEach(l => l());
}

function getState(): ProgressState {
  return currentState;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ========================================
// React Hook
// ========================================

export function useProgressStore(): {
  state: ProgressState;
  dispatch: typeof dispatch;
} {
  const state = useSyncExternalStore(
    subscribe,
    getState,
    getState,
  );

  // 保持 dispatch 引用稳定
  const stableDispatch = useCallback((action: ProgressAction) => {
    dispatch(action);
  }, []);

  return { state, dispatch: stableDispatch };
}

// ========================================
// 便捷 Hooks
// ========================================

export function useRootProgress() {
  const { state, dispatch } = useProgressStore();
  return {
    progress: state.root,
    recordAnswer: (char: string, isCorrect: boolean) =>
      dispatch({ type: 'ROOT_ANSWER', char, isCorrect }),
    reset: () => dispatch({ type: 'ROOT_RESET' }),
  };
}

export function useDailyStats() {
  const { state } = useProgressStore();
  return useMemo(() => {
    const today = getTodayKey();
    return state.dailyStats[today] || { attempts: 0, correct: 0, score: 0 };
  }, [state.dailyStats]);
}

export function useWholeCharProgress() {
  const { state, dispatch } = useProgressStore();
  return {
    progress: state.wholeChar,
    recordAnswer: (mode: string, char: string, isCorrect: boolean) =>
      dispatch({ type: 'WHOLE_CHAR_ANSWER', mode, char, isCorrect }),
    setMode: (mode: string) => dispatch({ type: 'WHOLE_CHAR_SET_MODE', mode }),
  };
}

export function usePhraseProgress() {
  const { state, dispatch } = useProgressStore();
  return {
    progress: state.phrase,
    recordAnswer: (isCorrect: boolean) =>
      dispatch({ type: 'PHRASE_ANSWER', isCorrect }),
    setMode: (mode: string) => dispatch({ type: 'PHRASE_SET_MODE', mode }),
  };
}

export function useSpacedPool(poolKey: string, allItemIds: string[]) {
  const { state, dispatch } = useProgressStore();
  const pool = state.spacedPools[poolKey] || createDefaultPool(allItemIds);

  return {
    pool,
    recordResult: (itemId: string, isCorrect: boolean) =>
      dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect, allItemIds }),
    reset: () => dispatch({ type: 'SPACED_RESET', poolKey, allItemIds }),
  };
}

export function usePreferences() {
  const { state, dispatch } = useProgressStore();
  return {
    preferences: state.preferences,
    setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      dispatch({ type: 'SET_PREF', key, value }),
  };
}

export function useAchievementData() {
  const { state } = useProgressStore();
  return useMemo(() => {
    const rootCorrect = state.root.correctCountMap;
    const masteredRoots = Object.values(rootCorrect).filter(c => c >= 3).length;

    const wholeCharAttempts = Object.values(state.wholeChar.modes).reduce(
      (sum, m) => sum + (m.totalAttempts || 0), 0
    );
    const wholeCharCorrect = Object.values(state.wholeChar.modes).reduce(
      (sum, m) => sum + (m.totalCorrect || 0), 0
    );
    const wholeCharBestStreak = Object.values(state.wholeChar.modes).reduce(
      (max, m) => Math.max(max, m.bestStreak || 0), 0
    );

    const practiceDays = Object.keys(state.dailyStats).length;

    return {
      totalPoints: state.totalPoints,
      masteredRoots,
      totalAttempts: state.root.totalAttempts + wholeCharAttempts + state.phrase.totalAttempts,
      maxStreak: Math.max(state.root.bestStreak, wholeCharBestStreak, state.phrase.bestStreak),
      totalCorrect: state.root.totalCorrect + wholeCharCorrect + state.phrase.totalCorrect,
      practiceDays,
    };
  }, [state]);
}

// ========================================
// 导入导出
// ========================================

export function exportProgress(): string {
  return JSON.stringify(getState(), null, 2);
}

export function downloadProgress(): void {
  const json = exportProgress();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ziyuan-progress-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProgressFromJSON(json: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as ProgressState;
    if (!parsed.version || typeof parsed.version !== 'number') {
      return { success: false, error: '无效的进度文件格式' };
    }
    dispatch({ type: 'HYDRATE', state: parsed });
    return { success: true };
  } catch {
    return { success: false, error: '无法解析 JSON 文件' };
  }
}

export function importProgressFromFile(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      if (!json) {
        resolve({ success: false, error: '无法读取文件' });
        return;
      }
      resolve(importProgressFromJSON(json));
    };
    reader.onerror = () => resolve({ success: false, error: '文件读取失败' });
    reader.readAsText(file);
  });
}

export function clearAllProgress(): void {
  dispatch({ type: 'HYDRATE', state: createDefaultState() });
  // 清理旧 key
  const oldKeys = [
    'ziyuan-progress-v2', 'ziyuan-progress-v3',
    'ziyuan-practice-v5', 'ziyuan-whole-char-v3', 'phrase-mode',
    'ziyuan-practice-style', 'ziyuan-practice-show-hint', 'ziyuan-theme',
    'ziyuan-practice-beginner', 'ziyuan-practice-progressive',
    'ziyuan-practice-fullcode', 'ziyuan-practice-weak',
    'ziyuan-whole-char-current-mode', 'ziyuan-whole-char-show-hint',
    'ziyuan-whole-char-all', 'ziyuan-whole-char-top500',
    'ziyuan-whole-char-top1000', 'ziyuan-whole-char-top1500',
    'ziyuan-whole-char-progressive-500',
  ];
  for (const key of oldKeys) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}
