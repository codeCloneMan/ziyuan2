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
import { imagePoolSet } from '@/data/root-images';
import { sanitizeRounds } from '@/lib/practice-round';

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
  /**
   * 降级基线：已掌握项在复习时答错会降级回 activePool，
   * 此字段记录降级时的全局 correctCount。
   * 重新掌握需 globalCorrectCount - downgradeBaseline >= masteryThreshold（再答对 N 次）。
   * undefined 表示未被降级过（首次掌握判定用 globalCorrectCount >= masteryThreshold）。
   */
  downgradeBaseline?: number;
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
  phraseShowHint: boolean;
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
  /**
   * 各练习池已完成轮数（poolKey → 轮数）。
   * 一轮 = 该池每道题都至少作答过一次；答完最后一题即 +1 并自动重开下一轮。
   * 与进行中的累计计数分开记录，避免"题再次出现"时统计口径混淆。
   */
  rounds: Record<string, number>;
  achievements: string[];
  preferences: Preferences;
  totalPoints: number;
  dailyStats: Record<string, DailyStat>;
}

const CURRENT_VERSION = 4;
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
  showHint: true,
  wholeCharShowHint: true,
  phraseShowHint: true,
};

export function createDefaultState(): ProgressState {
  return {
    version: CURRENT_VERSION,
    root: { ...defaultRoot },
    wholeChar: { ...defaultWholeChar },
    phrase: { ...defaultPhrase },
    spacedPools: {},
    rounds: {},
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

  // 嵌套字段类型防御：导入文件/localStorage 可能损坏（如 correctCountMap 变成字符串），
  // 非plain object 的分段一律回退默认值，避免下游 .filter/Object.keys 崩溃
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  const partialRoot = isPlainObject(partial.root) ? partial.root : {};
  const partialWholeChar = isPlainObject(partial.wholeChar) ? partial.wholeChar : {};
  const partialPhrase = isPlainObject(partial.phrase) ? partial.phrase : {};
  const partialPools = isPlainObject(partial.spacedPools) ? partial.spacedPools : defaults.spacedPools;
  const partialDaily = isPlainObject(partial.dailyStats) ? partial.dailyStats : defaults.dailyStats;

  // ============================================
  // 字根进度自愈式清洗：剔除不在当前练习池的记录。
  // 字根练习的练习单元 = 官方图集图片（root.correctCountMap/wrongCountMap
  // 以图片文件名为键），练习池调整时历史残留会滞留其中，导致"已掌握/已练习"
  // 各页面口径不一。在所有数据入口统一清洗一次，首页/成就/练习页天然同口径。
  // ============================================
  const mergedRoot = { ...defaults.root, ...partialRoot };
  {
    const pool = imagePoolSet;
    const prune = (m: Record<string, number>) => {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(m)) {
        if (pool.has(k)) out[k] = v;
      }
      return out;
    };
    mergedRoot.correctCountMap = prune(mergedRoot.correctCountMap ?? {});
    mergedRoot.wrongCountMap = prune(mergedRoot.wrongCountMap ?? {});
  }

  return {
    ...defaults,
    ...partial,
    version: CURRENT_VERSION,
    root: mergedRoot,
    wholeChar: { ...defaults.wholeChar, ...partialWholeChar },
    phrase: { ...defaults.phrase, ...partialPhrase },
    preferences: prefs,
    spacedPools: partialPools,
    rounds: sanitizeRounds(partial.rounds),
    achievements: Array.isArray(partial.achievements) ? partial.achievements : defaults.achievements,
    totalPoints: typeof partial.totalPoints === 'number' ? partial.totalPoints : defaults.totalPoints,
    dailyStats: partialDaily,
  };
}

// ========================================
// Reducer Helpers
// ========================================

function getTodayKey(): string {
  // 用本地时区日期（非 UTC），避免 UTC+8 等地区"今天"边界提前 8 小时切换，
  // 导致今日题数 / practiceDays 成就在 0-8 点之间统计错乱。
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
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
  | { type: 'WHOLE_CHAR_RESET_MODE'; mode: string }
  | { type: 'PHRASE_ANSWER'; isCorrect: boolean }
  | { type: 'PHRASE_SET_MODE'; mode: string }
  | { type: 'SPACED_RECORD'; poolKey: string; itemId: string; isCorrect: boolean; allItemIds: string[] }
  | { type: 'SPACED_RESET'; poolKey: string; allItemIds: string[] }
  | { type: 'ROUND_COMPLETE'; poolKey: string }
  | { type: 'ACHIEVE'; achievement: string }
  | { type: 'SET_PREF'; key: keyof Preferences; value: Preferences[keyof Preferences] }
  | { type: 'HYDRATE'; state: ProgressState }
  | { type: 'MIGRATE'; oldState: unknown };

export function reducer(state: ProgressState, action: ProgressAction): ProgressState {
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

    case 'WHOLE_CHAR_RESET_MODE': {
      // 清除单个 wholeChar mode 的进度（correctCountMap/wrongCountMap/统计）。
      // 下次 WHOLE_CHAR_ANSWER 会自动重建默认结构。
      const wholeChar = { ...state.wholeChar };
      const modes = { ...wholeChar.modes };
      delete modes[action.mode];
      wholeChar.modes = modes;
      return { ...state, wholeChar };
    }

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

      // 使用全局累计答对次数判定掌握状态，与 PracticePage/成就/进度保持一致。
      // 注意：dispatch 是同步的，调用方先 dispatch ROOT_ANSWER/WHOLE_CHAR_ANSWER
      // （已更新 correctCountMap）再 dispatch SPACED_RECORD，因此此处读到的已是最新值，
      // 不需要 +1。按 poolKey 前缀选择正确的 correctCountMap：
      //   - 'whole:' 前缀 → 整字练习，读 state.wholeChar.modes[poolKey]
      //   - 其他 → 字根练习，读 state.root
      const globalCorrectCount = poolKey.startsWith('whole:')
        ? (state.wholeChar.modes[poolKey]?.correctCountMap[itemId] || 0)
        : (state.root.correctCountMap[itemId] || 0);
      
      if (isCorrect) {
        const newStability = Math.min(item.stability * STABILITY_GROWTH, MAX_STABILITY);
        const newConsecutive = item.consecutiveCorrect + 1;
        // 掌握判定：
        // - 未被降级过（无 downgradeBaseline）：globalCorrectCount >= masteryThreshold
        // - 被降级过：globalCorrectCount - downgradeBaseline >= masteryThreshold（降级后需再答对 N 次）
        const effectiveCount = item.downgradeBaseline !== undefined
          ? globalCorrectCount - item.downgradeBaseline
          : globalCorrectCount;
        const isNowMastered = effectiveCount >= pool.masteryThreshold && !item.isMastered;
        pool.items[itemId] = {
          ...item,
          consecutiveCorrect: newConsecutive,
          isMastered: item.isMastered || isNowMastered,
          lastPracticeTime: Date.now(),
          totalAttempts: item.totalAttempts + 1,
          stability: newStability,
          // 重新掌握后清除降级基线
          downgradeBaseline: isNowMastered ? undefined : item.downgradeBaseline,
        };
        if (isNowMastered) {
          pool.activePool = pool.activePool.filter(id => id !== itemId);
          pool.masteredPool = [...pool.masteredPool, itemId];
        }
      } else {
        const newStability = Math.max(item.stability * STABILITY_DECAY, MIN_STABILITY);
        // 已掌握项答错 → 降级回 activePool（重新高频练习）
        // 全局 correctCountMap 保持 append-only（不影响首页/成就），仅间隔池内部降级
        const wasMastered = item.isMastered;
        pool.items[itemId] = {
          ...item,
          consecutiveCorrect: 0,
          isMastered: false,
          lastPracticeTime: Date.now(),
          totalAttempts: item.totalAttempts + 1,
          wrongCount: item.wrongCount + 1,
          stability: newStability,
          // 记录降级基线：重新掌握需再答对 masteryThreshold 次
          downgradeBaseline: wasMastered ? globalCorrectCount : item.downgradeBaseline,
        };
        if (wasMastered) {
          pool.masteredPool = pool.masteredPool.filter(id => id !== itemId);
          if (!pool.activePool.includes(itemId)) {
            pool.activePool = [...pool.activePool, itemId];
          }
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

    case 'ROUND_COMPLETE': {
      // 轮次记录只增不减：答完一轮就留痕，下一轮统计从零开始互不干扰
      const { poolKey } = action;
      return {
        ...state,
        rounds: { ...state.rounds, [poolKey]: (state.rounds[poolKey] || 0) + 1 },
      };
    }

    case 'ACHIEVE': {
      if (state.achievements.includes(action.achievement)) return state;
      return { ...state, achievements: [...state.achievements, action.achievement] };
    }

    case 'SET_PREF': {
      return { ...state, preferences: { ...state.preferences, [action.key]: action.value } };
    }

    case 'HYDRATE':
      // 防御：任何来源的导入都经过 normalizeState 补齐字段与校验 level，
      // 避免缺字段/损坏的 JSON 直接进入 store 导致各页面访问 undefined 崩溃。
      return normalizeState(action.state);

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
    const rawV5 = o['ziyuan-practice-v5'];
    const v5 = typeof rawV5 === 'string'
      ? JSON.parse(rawV5)
      : rawV5;
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
    const rawV3 = o['ziyuan-whole-char-v3'];
    const v3 = typeof rawV3 === 'string'
      ? JSON.parse(rawV3)
      : rawV3;
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
      const rawKey = o[`ziyuan-practice-${key}`];
      const raw = typeof rawKey === 'string'
        ? JSON.parse(rawKey)
        : rawKey;
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

  // ============================================
  // v4 迁移：强制开启所有"首次提示"开关
  // 旧版本中部分用户的 hint 偏好被持久化为 false，
  // 导致默认看不到首次提示。迁移时统一重置为 true。
  // ============================================
  state.preferences.showHint = true;
  state.preferences.wholeCharShowHint = true;
  state.preferences.phraseShowHint = true;

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
      // 同 schema 数据（无论版本号新旧）一律走 normalizeState：按 partial 合并默认值并保留全部字段。
      // 不走 migrateFromOld（那是给旧独立 key 集合用的，会把同 schema 数据误判为无旧 key
      // 而清空 root/wholeChar/phrase/spacedPools/achievements）。
      return normalizeState(parsed);
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
    // 旧 key 迁移结果同样过 normalizeState，确保字根进度被清洗到当前练习池
    return normalizeState(migrateFromOld(oldData));
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
  // 稳定函数引用：避免内联箭头函数导致下游 useCallback 依赖每次渲染变化
  const recordAnswer = useCallback(
    (char: string, isCorrect: boolean) => dispatch({ type: 'ROOT_ANSWER', char, isCorrect }),
    [dispatch],
  );
  const reset = useCallback(() => dispatch({ type: 'ROOT_RESET' }), [dispatch]);
  return {
    progress: state.root,
    recordAnswer,
    reset,
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
  const recordAnswer = useCallback(
    (mode: string, char: string, isCorrect: boolean) =>
      dispatch({ type: 'WHOLE_CHAR_ANSWER', mode, char, isCorrect }),
    [dispatch],
  );
  const setMode = useCallback(
    (mode: string) => dispatch({ type: 'WHOLE_CHAR_SET_MODE', mode }),
    [dispatch],
  );
  const resetMode = useCallback(
    (mode: string) => dispatch({ type: 'WHOLE_CHAR_RESET_MODE', mode }),
    [dispatch],
  );
  return {
    progress: state.wholeChar,
    recordAnswer,
    setMode,
    resetMode,
  };
}

export function usePhraseProgress() {
  const { state, dispatch } = useProgressStore();
  const recordAnswer = useCallback(
    (isCorrect: boolean) => dispatch({ type: 'PHRASE_ANSWER', isCorrect }),
    [dispatch],
  );
  const setMode = useCallback(
    (mode: string) => dispatch({ type: 'PHRASE_SET_MODE', mode }),
    [dispatch],
  );
  return {
    progress: state.phrase,
    recordAnswer,
    setMode,
  };
}

export function useSpacedPool(poolKey: string, allItemIds: string[]) {
  const { state, dispatch } = useProgressStore();
  const pool = state.spacedPools[poolKey] || createDefaultPool(allItemIds);
  const recordResult = useCallback(
    (itemId: string, isCorrect: boolean) =>
      dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect, allItemIds }),
    [dispatch, poolKey, allItemIds],
  );
  const reset = useCallback(
    () => dispatch({ type: 'SPACED_RESET', poolKey, allItemIds }),
    [dispatch, poolKey, allItemIds],
  );

  return {
    pool,
    recordResult,
    reset,
  };
}

export function usePreferences() {
  const { state, dispatch } = useProgressStore();
  const setPref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      dispatch({ type: 'SET_PREF', key, value }),
    [dispatch],
  );
  return {
    preferences: state.preferences,
    setPref,
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
    // normalizeState 补齐缺失字段/校验非法 level，防止缺字段文件导致页面崩溃
    dispatch({ type: 'HYDRATE', state: normalizeState(parsed) });
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
