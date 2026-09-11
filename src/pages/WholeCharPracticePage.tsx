import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCharCodeData, type CharCodeItem } from '@/lib/data-loader';
import { practiceChars500, practiceChars5000 } from '@/data/practice-pools.generated';
import { buildFullCodeIndex, shortestCodeLength } from '@/lib/full-codes';
import {
  isAutoCommitCorrect,
  isSpaceCommitCorrect,
  isExactCode,
  isCompleteCodeAwaitingSpace,
  AUTO_COMMIT_LENGTH,
} from '@/lib/code-commit';
import type { PracticeLevel } from '@/types';
import { PracticeKeyboard, RoundCompleteToast, PracticeStatsLine, ErrorItemsPanel } from '@/components/practice';
import { usePracticeSession } from '@/hooks/use-practice-session';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import { usePracticeRound } from '@/hooks/use-practice-round';
import {
  useWholeCharProgress,
  usePreferences,
  useProgressStore,
  WHOLE_CHAR_CODE_LENS,
  type WholeCharCodeLen,
} from '@/store/progress-store';
import { getCharSplit } from '@/data/splitData';
import {
  Play, RotateCcw, Trash2, Star, Trophy, CheckCircle2, XCircle,
  Lightbulb, Eye, EyeOff, SplitSquareHorizontal, GraduationCap,
} from 'lucide-react';

/** 就地洗牌（Fisher-Yates），进阶模式用 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const levelConfig: Record<PracticeLevel, { label: string; description: string; icon: typeof Star }> = {
  beginner: { label: '入门', description: '字频前 500 字', icon: Star },
  advanced: { label: '进阶', description: '字频前 5000 字，科学记忆', icon: GraduationCap },
};

/** 码长档标签：'all'=码表全部编码都算对；'1'..'4'=只练恰好 N 键的编码 */
const codeLenLabels: Record<WholeCharCodeLen, string> = {
  all: '全部',
  '1': '1简',
  '2': '2简',
  '3': '3简',
  '4': '4码',
};
const codeLenDescriptions: Record<WholeCharCodeLen, string> = {
  all: '该字码表里的任意编码都算对',
  '1': '只练最短码为 1 键的字（含 1 码字），打完按空格上屏',
  '2': '只练最短码为 2 键的字（含 2 码字），打完按空格上屏',
  '3': '只练最短码为 3 键的字（含 3 码字），打完按空格上屏',
  '4': '只练最短码为 4 键的字，打满自动上屏',
};

type CodeRule = 'A' | 'AB' | 'ABb' | 'ABCc' | 'ABCD' | 'ABCZ';
function getCodeRule(code: string): CodeRule {
  const len = code.length;
  if (len === 1) return 'A';
  if (len === 2) return 'AB';
  if (len === 3) return 'ABb';
  if (len === 4) return 'ABCD';
  return 'ABCZ';
}

const codeRuleLabels: Record<CodeRule, string> = {
  'A': '一字根',
  'AB': 'AB规则',
  'ABb': 'ABb规则',
  'ABCc': 'ABCc规则',
  'ABCD': 'ABCD规则',
  'ABCZ': 'ABCZ规则',
};

const codeRuleDescriptions: Record<CodeRule, string> = {
  'A': '单字根字，直接取码',
  'AB': '二根字，各取大码',
  'ABb': '三根字，首二取大码，末根大小码',
  'ABCc': '四根字，前三取大码，末根大小码',
  'ABCD': '四根字，各取大码',
  'ABCZ': '多根字，前三取大码，末根取小码',
};

function getSplitParts(char: string): string[] {
  const split = getCharSplit(char);
  if (split) return [...split];
  return [char];
}

/** 必拆字：拆分后部件数 >= 3，仅用于键盘标记提示 */
function isMustSplitChar(char: string): boolean {
  const split = getCharSplit(char);
  if (!split) return false;
  return split.length >= 3;
}

/**
 * 当前题目。codes = 码表中该字的全部编码（全码 + 简码 + 别名），
 * 打出任意一个都算对；code 只作主展示码（最长码）。
 */
interface PracticeItem extends CharCodeItem {
  codes: string[];
}

export default function WholeCharPracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  // 全码索引：一个字可能有多个全码（如 了 = hle/hli），打出任意一个即判正确
  const fullCodeIndex = useMemo(() => buildFullCodeIndex(charCodeData ?? []), [charCodeData]);
  const { progress, recordAnswer, resetMode } = useWholeCharProgress();
  const { preferences, setPref } = usePreferences();
  const { state: progressState } = useProgressStore();
  const totalPoints = progressState.totalPoints;

  // ============================================
  // 安全取值：防止旧数据中有非法 level 值导致崩溃
  // （normalizeState 已做校验，此处为双保险）
  // ============================================
  const rawLevel = preferences.charSetRange;
  const level: PracticeLevel = (rawLevel === 'beginner' || rawLevel === 'advanced') ? rawLevel : 'beginner';
  const currentConfig = levelConfig[level];
  const showHint = preferences.wholeCharShowHint;
  const rawCodeLen = preferences.wholeCharCodeLen;
  const codeLen: WholeCharCodeLen = WHOLE_CHAR_CODE_LENS.includes(rawCodeLen) ? rawCodeLen : 'all';

  // 字频前500 / 前5000（附件字表；已过滤国标外字与码表缺字）
  const basePool = level === 'beginner' ? practiceChars500 : practiceChars5000;
  const codeLenNeed = codeLen === 'all' ? 0 : Number(codeLen);

  // 练习池：码长档按「最短码长」互斥归类 —— 一个字只属于它最短码长的那一档，
  // 于是 1 简出现后不会再出现在 2/3/4 档，2 简出现后不会再出现在 3/4 档，依此类推。
  const learningPool = useMemo(() => {
    if (!charCodeData) return [];
    if (codeLenNeed === 0) return [...basePool];
    return basePool.filter(ch => shortestCodeLength(fullCodeIndex.get(ch)) === codeLenNeed);
  }, [charCodeData, basePool, codeLenNeed, fullCodeIndex]);

  // 各码长档的字数（选择器上展示）
  const codeLenCounts = useMemo(() => {
    const counts: Record<WholeCharCodeLen, number> = { all: basePool.length, '1': 0, '2': 0, '3': 0, '4': 0 };
    if (!charCodeData) return counts;
    for (const ch of basePool) {
      const min = shortestCodeLength(fullCodeIndex.get(ch));
      if (min >= 1 && min <= 4) counts[String(min) as WholeCharCodeLen]++;
    }
    return counts;
  }, [basePool, charCodeData, fullCodeIndex]);

  // 码长档是独立练习池与独立轮次记录；'all' 沿用旧 key，保留既有累计进度
  const modeKey = codeLenNeed === 0 ? `whole:${level}` : `whole:${level}:${codeLen}`;

  // 易错项练习：聚合所有档的错次，取前 20 个字组池（独立轮次记录 whole:review，判定用"全部"口径）
  const [reviewMode, setReviewMode] = useState(false);
  const reviewChars = useMemo(() => {
    const best: Record<string, number> = {};
    for (const m of Object.values(progress.modes)) {
      for (const [ch, n] of Object.entries(m?.wrongCountMap ?? {})) {
        if (n > (best[ch] ?? 0)) best[ch] = n;
      }
    }
    return Object.entries(best)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([ch]) => ch)
      .filter(ch => fullCodeIndex.has(ch));
  }, [progress.modes, fullCodeIndex]);
  const errorItems = useMemo(() => {
    const best: Record<string, number> = {};
    for (const m of Object.values(progress.modes)) {
      for (const [ch, n] of Object.entries(m?.wrongCountMap ?? {})) {
        if (n > (best[ch] ?? 0)) best[ch] = n;
      }
    }
    return Object.entries(best).map(([ch, wrong]) => ({ id: ch, label: ch, wrong })).sort((a, b) => b.wrong - a.wrong);
  }, [progress.modes]);

  // 当前生效的池与记录键：易错项练习时用错题池 + whole:review
  const activePool = reviewMode ? reviewChars : learningPool;
  const activeModeKey = reviewMode ? 'whole:review' : modeKey;
  const activeCodeLenNeed = reviewMode ? 0 : codeLenNeed;

  // 用 useMemo 稳定 modeProgress 引用：直接写 `progress.modes[modeKey] || {...}` 时，
  // mode 不存在的情况下每次渲染都会创建新对象，导致依赖它的 useCallback 每次重建
  const modeProgress = useMemo(
    () => progress.modes[activeModeKey] || {
      correctCountMap: {}, wrongCountMap: {}, totalAttempts: 0, totalCorrect: 0,
      streak: 0, bestStreak: 0, lastPracticeAt: 0,
    },
    [progress.modes, activeModeKey],
  );

  const isBeginner = level === 'beginner';

  // 轮次记录：一轮 = 当前池每个字都答过至少一次；答完自动重开下一轮
  const { completedRounds, seenCount: roundSeen, markSeen, resetRound } = usePracticeRound(activeModeKey, activePool.length);

  // ============================================
  // 入门模式：间隔学习（艾宾浩斯算法）
  // ============================================
  const spaced = useSpacedLearning({
    allItemIds: learningPool,
    newItemsPerRound: 5,
    masteryThreshold: 3,
    reviewProbability: 0.1,
    storageKey: modeKey,
  });
  // 解构稳定引用：spaced 对象每次渲染新建，但其方法引用永久稳定
  const spacedGetNextItem = spaced.getNextItem;
  const spacedRecordResult = spaced.recordResult;
  const spacedResetProgress = spaced.resetProgress;

  // ============================================
  // 进阶模式：洗牌轮转队列
  // ============================================
  const shuffleQueueRef = useRef<string[]>([]);
  const shuffleIndexRef = useRef(0);
  // 进阶模式错题重练队列：答错的字在 3 步后重新出现
  const wrongQueueRef = useRef<{ char: string; step: number }[]>([]);

  // ============================================
  // 答错处理策略（对齐字根练习）：
  //   入门+进阶：答错都切下一题。
  //   答错反馈延长（入门2.5s/进阶1.5s），给用户消化拆解和编码。
  //   反馈期间键盘输入被阻止。
  //   进阶模式：答错的字加入错题重练队列，3 步后重新出现。
  // ============================================
  const {
    isPlaying, start, stop, reset, submit,
    keyFeedback, feedbackType, stats, accuracy,
  } = usePracticeSession({
    correctClearDelay: 500,
    wrongClearDelay: isBeginner ? 2500 : 1500,
    onCorrect: () => generateNext(),
    onWrong: () => {
      if (!isBeginner && currentItem.char) {
        wrongQueueRef.current.push({ char: currentItem.char, step: 0 });
      }
      generateNext();
    },
  });

  const [currentItem, setCurrentItem] = useState<PracticeItem>(() => ({
    char: '', code: '', codes: [],
  }));
  const [inputCode, setInputCode] = useState('');
  const [showSplitViz, setShowSplitViz] = useState(false);
  const [splitAnimationStep, setSplitAnimationStep] = useState(0);
  const [userWrongSplit, setUserWrongSplit] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [roundToast, setRoundToast] = useState<number | null>(null);
  // 重新练习时 isPlaying 可能已是 true（完成弹窗内），setState 相同值会被 React bail out，
  // 不会触发下方 generateNext effect；用 nonce 强制 effect 重跑
  const [restartNonce, setRestartNonce] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const splitAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [inputFocused, setInputFocused] = useState(false);
  // 用户是否正在使用原生输入框（软键盘）：仅在此时切题后保持 focus，
  // 避免 Android 上每次切题强制 focus 导致软键盘反复弹出、遮挡虚拟键盘
  const nativeInputActiveRef = useRef(false);

  const splitParts = useMemo(() => getSplitParts(currentItem.char), [currentItem.char]);
  const codeRule = useMemo(() => getCodeRule(currentItem.code), [currentItem.code]);
  // 主展示码之外的其它写法（简码 / 别名）：答对或揭晓时一并列出
  const codeAlternates = useMemo(
    () => currentItem.codes.filter(c => c !== currentItem.code),
    [currentItem],
  );
  // 该题可接受的编码集合（码表里列出的全部写法）
  const acceptedCodes = useMemo(
    () => (currentItem.codes.length > 0
      ? currentItem.codes
      : currentItem.code ? [currentItem.code] : []),
    [currentItem],
  );
  // 已打出一条完整编码（不足 4 码）→ 提示按空格上屏
  const awaitingCommit = !feedbackType && isCompleteCodeAwaitingSpace(inputCode, acceptedCodes);

  const hintLevel = useMemo(() => {
    const seen = modeProgress.correctCountMap[currentItem.char] || 0;
    if (seen === 0) return 2;
    if (seen === 1) return 1;
    return 0;
  }, [modeProgress.correctCountMap, currentItem.char]);

  const masteredCount = useMemo(() => {
    return learningPool.filter(ch => (modeProgress.correctCountMap[ch] || 0) >= 3).length;
  }, [learningPool, modeProgress.correctCountMap]);

  const practicedCount = useMemo(() => {
    const seen = new Set<string>();
    for (const c of Object.keys(modeProgress.correctCountMap)) seen.add(c);
    for (const c of Object.keys(modeProgress.wrongCountMap)) seen.add(c);
    return seen.size;
  }, [modeProgress.correctCountMap, modeProgress.wrongCountMap]);

  const generateNext = useCallback(() => {
    if (!charCodeData || activePool.length === 0) return;

    // 完成判定改为会话内池掌握数（入门模式）：累计进度保留（首页/成就不清零），
    // 每轮练习从空池重新循序渐进，池全部掌握时才提示完成（易错项练习不做完成判定）
    if (isBeginner && !reviewMode && spaced.pool.masteredPool.length === learningPool.length) {
      // 所有字都已掌握，显示完成提示
      setShowCompletionModal(true);
      setShowSplitViz(false);
      setSplitAnimationStep(0);
      setUserWrongSplit(null);
      return;
    }

    let nextId: string | null = null;

    if (isBeginner && !reviewMode) {
      // 入门：由间隔学习算法决定下一题
      nextId = spacedGetNextItem();
    } else {
      // 优先取错题（已隔 ≥3 步）
      wrongQueueRef.current = wrongQueueRef.current.map(w => ({ ...w, step: w.step + 1 }));
      const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
      if (dueWrong) {
        wrongQueueRef.current = wrongQueueRef.current.filter(w => w !== dueWrong);
        nextId = dueWrong.char;
      } else {
        // 进阶 / 易错项练习：按洗牌队列顺序循环
        if (shuffleQueueRef.current.length === 0) {
          shuffleQueueRef.current = shuffleInPlace([...activePool]);
          shuffleIndexRef.current = 0;
        } else {
          shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
          // 回绕到 0 时重新洗牌，避免每轮顺序相同
          if (shuffleIndexRef.current === 0) {
            shuffleQueueRef.current = shuffleInPlace([...shuffleQueueRef.current]);
          }
        }
        nextId = shuffleQueueRef.current[shuffleIndexRef.current];
      }
    }

    if (nextId) {
      const info = fullCodeIndex.get(nextId);
      if (info && activeCodeLenNeed > 0) {
        // 码长档：只认该字「恰好 N 键」的官方编码（易错项练习用"全部"口径）
        const codes = info.accepted.filter(c => c.length === activeCodeLenNeed);
        setCurrentItem({
          char: nextId,
          code: codes[0] ?? info.fullCode,
          codes: codes.length > 0 ? codes : [info.fullCode],
        });
      } else {
        setCurrentItem(info
          ? { char: nextId, code: info.fullCode, codes: info.accepted }
          : { ...charCodeData[0], codes: [charCodeData[0].code] });
      }
      setInputCode('');
    }
    setShowSplitViz(false);
    setSplitAnimationStep(0);
    setUserWrongSplit(null);
  }, [charCodeData, fullCodeIndex, activePool, activeCodeLenNeed, isBeginner, reviewMode, learningPool.length, spacedGetNextItem, spaced.pool]);

  const startPractice = useCallback((poolOverride?: string[]) => {
    const pool = poolOverride ?? activePool;
    if (pool.length === 0) return;
    // 只重置间隔学习池（会话从空池重新循序渐进），不清当前模式的累计进度：
    // 首页进度/成就/已掌握统计均以 modes[modeKey] 的累计数据为数据源，清空会导致归零
    if (isBeginner && !reviewMode) {
      spacedResetProgress();
    } else {
      shuffleQueueRef.current = shuffleInPlace([...pool]);
      shuffleIndexRef.current = -1;
      // 清空上一轮遗留的错题队列，避免新练习开头插入旧错题
      wrongQueueRef.current = [];
    }
    reset();
    // 新一轮练习：本轮已答集合清零（已完成轮数是持久记录，保留）
    resetRound();
    start();
    // 强制 generateNext effect 重跑（isPlaying 可能已是 true，start() 不触发重渲染）
    setRestartNonce(n => n + 1);
  }, [isBeginner, reviewMode, activePool, reset, resetRound, start, spacedResetProgress]);

  /** 一键进入易错项练习（用错次前 20 个字组池，"全部"口径） */
  const startReviewPractice = useCallback(() => {
    if (reviewChars.length === 0) return;
    setReviewMode(true);
    startPractice(reviewChars);
  }, [reviewChars, startPractice]);

  const stopPractice = useCallback(() => {
    stop();
    setShowSplitViz(false);
    setSplitAnimationStep(0);
    setUserWrongSplit(null);
    setInputCode('');
    setReviewMode(false);
  }, [stop]);

  const clearData = useCallback(() => {
    if (confirm('确定要清除当前模式的整字练习记录吗？')) {
      resetMode(activeModeKey);
      spacedResetProgress();
      stop();
      reset();
    }
  }, [activeModeKey, stop, reset, resetMode, spacedResetProgress]);

  useEffect(() => {
    if (isPlaying && charCodeData) generateNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 首题生成依赖 store 重渲染后的池状态，由 restartNonce 控制重触发
  }, [isPlaying, restartNonce]);

  useEffect(() => {
    if (showSplitViz && splitAnimationStep < splitParts.length) {
      splitAnimTimer.current = setTimeout(() => {
        setSplitAnimationStep(prev => prev + 1);
      }, 300);
      return () => { if (splitAnimTimer.current) clearTimeout(splitAnimTimer.current); };
    }
  }, [showSplitViz, splitAnimationStep, splitParts.length]);

  /** 收尾：记录答题、推进轮次、交给状态机做反馈与切题 */
  const finishAnswer = useCallback((isCorrect: boolean, key: string) => {
    if (isCorrect) {
      recordAnswer(activeModeKey, currentItem.char, true);
      if (isBeginner && !reviewMode) spacedRecordResult(currentItem.char, true);
    } else {
      recordAnswer(activeModeKey, currentItem.char, false);
      if (isBeginner && !reviewMode) spacedRecordResult(currentItem.char, false);
    }

    // 轮次：答完池内最后一个字即完成一轮 —— 记录轮次、本轮统计归零，
    // 下一题自动进入新一轮。先 reset 再 submit，最后一题计入新一轮不丢。
    const roundDone = markSeen(currentItem.char);
    if (roundDone) {
      reset();
      setRoundToast(completedRounds + 1);
    }

    submit(isCorrect, key);
  }, [currentItem.char, recordAnswer, activeModeKey, isBeginner, reviewMode, spacedRecordResult, markSeen, reset, completedRounds, submit]);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType || !currentItem.char) return;
    if (inputCode.length >= AUTO_COMMIT_LENGTH) return;
    const newCode = inputCode + key;
    setInputCode(newCode);

    // 判定时机只有两个：满 4 键自动上屏；不足 4 键等空格上屏。
    // 未满 4 键绝不判定（即使已打错），与真实打字一致。
    if (newCode.length < AUTO_COMMIT_LENGTH) return;

    // 码长档只认「恰好该长度」的编码；「全部」档保留"该字编码不足 4 码时第 4 键不追究"的容错
    const isCorrect = activeCodeLenNeed > 0
      ? isExactCode(newCode, acceptedCodes)
      : isAutoCommitCorrect(newCode, acceptedCodes);
    if (!isCorrect) {
      // 判错（显示正确拆分与全部写法）
      setUserWrongSplit(newCode);
      setShowSplitViz(true);
      setSplitAnimationStep(splitParts.length);
    }
    finishAnswer(isCorrect, key);
  }, [isPlaying, feedbackType, inputCode, currentItem.char, acceptedCodes, activeCodeLenNeed, splitParts.length, finishAnswer]);

  /** 空格上屏：不足 4 键时按空格立即判定（码表里的编码才算对），返回是否消费了这次空格 */
  const handleSpaceCommit = useCallback((): boolean => {
    if (!isPlaying || feedbackType || !currentItem.char) return false;
    if (!inputCode) return false;
    const isCorrect = isSpaceCommitCorrect(inputCode, acceptedCodes);
    if (!isCorrect) {
      setUserWrongSplit(inputCode);
      setShowSplitViz(true);
      setSplitAnimationStep(splitParts.length);
    }
    finishAnswer(isCorrect, ' ');
    return true;
  }, [isPlaying, feedbackType, currentItem.char, inputCode, acceptedCodes, splitParts.length, finishAnswer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || feedbackType) return;
      // 中文输入法组合期间不提交（isComposing 为主，keyCode 229 为 WebView 纵深防御）
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') { stopPractice(); return; }
      if (e.key === ' ') {
        e.preventDefault();
        // 有输入 → 空格上屏并判定（不足 4 键时的上屏方式，模拟输入法）
        if (handleSpaceCommit()) return;
        // 无输入 → 空格用于查看/切换拆分提示
        if (showHint) {
          setShowSplitViz(true);
          setSplitAnimationStep(splitParts.length);
          // 仅显示拆分提示，不提交答案
        } else {
          setPref('wholeCharShowHint', !showHint);
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (inputCode.length > 0) setInputCode(inputCode.slice(0, -1));
        return;
      }
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, feedbackType, handleKeyPress, handleSpaceCommit, stopPractice, splitParts.length, showHint, inputCode, setPref]);

  useEffect(() => {
    // 仅当用户在用原生输入（软键盘）时，切题后保持焦点；
    // 虚拟键盘用户不被强制弹软键盘（Android 上反复 focus 会反复弹出软键盘）
    if (isPlaying && inputRef.current && nativeInputActiveRef.current) {
      inputRef.current.focus();
    }
  }, [isPlaying, currentItem]);

  // 原生键盘输入（手机软键盘/桌面直接键入）：beforeinput 逐物理按键提交。
  // 英文键盘每次按键触发一次 insertText；中文输入法组合过程
  // （insertCompositionText/insertFromComposition）被忽略，避免组合提交时
  // 旧 diff 逻辑把多个字符当作同一题的多个编码（误判）或注入下一题。
  const handleNativeBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const ne = e.nativeEvent as InputEvent;
    if (ne.inputType === 'insertText' && ne.data === ' ') {
      // 软键盘空格 = 上屏判定（不足 4 键时的上屏方式）
      e.preventDefault();
      if (!feedbackType) handleSpaceCommit();
    } else if (ne.inputType === 'insertText' && ne.data && /^[a-z]$/i.test(ne.data)) {
      e.preventDefault(); // 受控组件无需实际插入
      handleKeyPress(ne.data.toLowerCase());
    } else if (ne.inputType === 'deleteContentBackward' || ne.inputType === 'insertFromPaste' || ne.inputType === 'insertFromDrop') {
      e.preventDefault();
      // 与 window keydown 的 Backspace 分支一致：反馈期间不允许删除；
      // 粘贴/拖放无意义且会污染受控输入框，一律阻止（与字根/词组输入一致）
      if (ne.inputType === 'deleteContentBackward' && !feedbackType) setInputCode(c => c.slice(0, -1));
    }
  }, [handleKeyPress, handleSpaceCommit, feedbackType]);

  const renderCodeWithColor = (code: string) => {
    const rule = getCodeRule(code);
    return code.split('').map((c, i) => {
      let colorClass = 'text-foreground';
      if (rule === 'A' || rule === 'AB') colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABb' && i < 2) colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABb' && i === 2) colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
      else if (rule === 'ABCc' && i < 3) colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABCc' && i === 3) colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
      else if (rule === 'ABCD') colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABCZ' && i < 3) colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABCZ' && i === 3) colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
      return <span key={i} className={cn('font-mono text-lg', colorClass)}>{c.toUpperCase()}</span>;
    });
  };

  if (dataLoading || !charCodeData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">加载码表数据...</span>
        </div>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-background bg-mesh">
        <section className="container-page py-10 sm:py-16">
          <div className="max-w-4xl mx-auto">
            <header className="text-center mb-8 sm:mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                整字<span className="text-gradient-primary">练习</span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                看汉字，打编码。掌握字根后练习整字拆分
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
              {/* 左：开始 + 进度 */}
              <div className="lg:col-span-3 card-base !rounded-2xl p-6 sm:p-8 flex flex-col">
                <div className="flex-1 flex items-center justify-center py-2 mb-6">
                  <button
                    onClick={() => startPractice()}
                    className="group inline-flex items-center gap-3 rounded-2xl bg-primary text-primary-foreground px-10 py-4 text-lg font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                    开始练习
                  </button>
                </div>

                {masteredCount > 0 && (
                  <div className={cn(
                    "rounded-xl border p-4 text-left",
                    masteredCount === learningPool.length
                      ? "border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                      : "border-border/60 bg-muted/20"
                  )}>
                    <div className="flex justify-between items-center text-sm mb-2">
                      {masteredCount === learningPool.length ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Trophy className="h-4 w-4" />已全部掌握
                        </span>
                      ) : (
                        <span className="text-muted-foreground">已掌握</span>
                      )}
                      <span className="font-bold font-mono-stat">{masteredCount}/{learningPool.length}</span>
                    </div>
                    <div className="progress-base relative overflow-hidden">
                      <div className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        masteredCount === learningPool.length ? "bg-emerald-500/30"
                          : practicedCount === learningPool.length ? "bg-amber-500/25"
                          : "bg-primary/20"
                      )} style={{ width: `${Math.min(100, Math.round((practicedCount / Math.max(learningPool.length, 1)) * 100))}%` }} />
                      <div className={cn(
                        "progress-bar-animated transition-colors relative",
                        masteredCount === learningPool.length ? "bg-emerald-500" : "bg-primary"
                      )} style={{ width: `${Math.round((masteredCount / Math.max(learningPool.length, 1)) * 100)}%` }} />
                    </div>
                    {masteredCount === learningPool.length && (
                      <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>太棒了！你已经掌握了所有汉字</span>
                      </div>
                    )}
                  </div>
                )}

                <PracticeStatsLine
                  roundNo={completedRounds + 1}
                  seen={roundSeen}
                  total={activePool.length}
                  accuracy={accuracy}
                  totalPoints={totalPoints}
                  extra={
                    <>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {currentConfig.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">
                        {codeLenLabels[codeLen]}
                      </span>
                    </>
                  }
                  className="mt-3"
                />
                <p className="mt-1 text-[11px] text-muted-foreground/60">
                  已完成 {completedRounds} 轮（每轮 {activePool.length} 个字各答一次）
                </p>

                <ErrorItemsPanel
                  items={errorItems}
                  onDrill={reviewChars.length > 0 ? startReviewPractice : undefined}
                  title="易错项（答错次数）"
                  className="mt-4"
                />
              </div>

              {/* 右：难度与设置 */}
              <div className="lg:col-span-2 card-base !rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 font-serif">练习难度</h2>
                <div className="space-y-2 mb-5">
                  {(Object.entries(levelConfig) as [PracticeLevel, typeof levelConfig.beginner][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button key={key} onClick={() => setPref('charSetRange', key)}
                        className={cn('w-full p-3 rounded-xl border text-left transition-all duration-200 flex items-center gap-2.5',
                          level === key
                            ? 'border-primary/40 bg-primary/[0.05] shadow-sm'
                            : 'border-border/50 hover:border-primary/25 hover:bg-primary/[0.02]')}>
                        <Icon className={cn('h-4 w-4 shrink-0', level === key ? 'text-primary' : 'text-muted-foreground')} />
                        <div className="min-w-0">
                          <div className={cn('text-sm font-medium', level === key ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</div>
                          <div className="text-xs text-muted-foreground/70">{config.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <h2 className="text-sm font-semibold text-muted-foreground mb-4 font-serif">练习码长</h2>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {WHOLE_CHAR_CODE_LENS.map(len => (
                    <button key={len} onClick={() => setPref('wholeCharCodeLen', len)}
                      className={cn('p-2 rounded-lg border text-center transition-all duration-200',
                        codeLen === len
                          ? 'border-primary/40 bg-primary/[0.05] shadow-sm'
                          : 'border-border/50 hover:border-primary/25 hover:bg-primary/[0.02]')}>
                      <div className={cn('text-xs font-medium', codeLen === len ? 'text-foreground' : 'text-muted-foreground')}>
                        {codeLenLabels[len]}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 font-mono-stat">{codeLenCounts[len]}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/70 mb-5">{codeLenDescriptions[codeLen]}</p>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 mb-4">
                  <span className="text-xs text-muted-foreground">首次出现显示拆分与编码提示</span>
                  <button onClick={() => setPref('wholeCharShowHint', !showHint)} aria-label="切换提示"
                    className={cn('w-9 h-5 rounded-full transition-colors relative',
                      showHint ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      showHint ? 'left-[18px]' : 'left-0.5')} />
                  </button>
                </div>

                {modeProgress.totalAttempts > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearData} className="w-full gap-1.5 text-xs text-red-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />清除当前模式进度
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky z-30 border-b border-border bg-card"
        style={{ top: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <div className="container-page max-w-5xl py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium px-3 py-1.5 text-xs">
                {currentConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs px-2.5 py-1.5 border-sky-500/40 text-sky-600 dark:text-sky-400">
                {codeLenLabels[codeLen]}
              </Badge>
              {reviewMode && (
                <Badge variant="outline" className="text-xs px-2.5 py-1.5 border-red-500/40 text-red-600 dark:text-red-400">
                  易错项练习
                </Badge>
              )}
              <button onClick={stopPractice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:border-red-800 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /><span>退出</span>
                <kbd className="hidden sm:inline ml-0.5 px-1 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/50 rounded font-mono">Esc</kbd>
              </button>
              <button onClick={() => setPref('wholeCharShowHint', !showHint)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-300',
                  showHint
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                {showHint ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{showHint ? '提示开' : '提示关'}</span>
              </button>
            </div>
            <PracticeStatsLine
              roundNo={completedRounds + 1}
              seen={roundSeen}
              total={activePool.length}
              accuracy={accuracy}
              totalPoints={totalPoints}
            />
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>本轮进度</span>
              <span className="font-mono-stat text-foreground/70">{roundSeen}/{activePool.length}</span>
            </div>
            <div className="progress-base h-1.5 relative overflow-hidden">
              <div className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                masteredCount === learningPool.length ? "bg-emerald-500/30"
                  : practicedCount === learningPool.length ? "bg-amber-500/25"
                  : "bg-primary/20"
              )} style={{ width: `${Math.min(100, Math.round((practicedCount / Math.max(learningPool.length, 1)) * 100))}%` }} />
              <div className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                masteredCount === learningPool.length ? "bg-emerald-500" : "bg-primary"
              )} style={{ width: `${Math.min(100, Math.round((masteredCount / Math.max(learningPool.length, 1)) * 100))}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">
            <div className={cn(
              "card-base p-6 sm:p-8 transition-[border-color,background-color] duration-300",
              feedbackType === 'correct' && "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
              feedbackType === 'wrong' && "border-red-400 bg-red-50/50 dark:bg-red-950/20"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400">
                    {codeRuleLabels[codeRule]}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{codeRuleDescriptions[codeRule]}</span>
                </div>

                <div className="text-center">
                  <div className={cn(
                    "text-5xl sm:text-7xl lg:text-8xl font-bold mb-4 select-none transition-colors duration-300",
                    feedbackType === 'correct' && "text-emerald-600 dark:text-emerald-400",
                    feedbackType === 'wrong' && "text-red-600 dark:text-red-400"
                  )}>
                    {currentItem.char}
                  </div>

                  {(showHint || feedbackType === 'wrong') && showSplitViz && splitParts.length > 1 && (
                    <div className="mb-4 animate-fade-in">
                      <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl">
                        <span className="text-muted-foreground text-sm mr-1">{currentItem.char} →</span>
                        {splitParts.map((part, i) => (
                          <span key={i} className={cn(
                            "inline-flex items-center justify-center px-2 py-1 rounded-lg transition-[opacity,transform] duration-300",
                            i < splitAnimationStep
                              ? "bg-primary/10 text-primary font-bold scale-100 opacity-100"
                              : "scale-75 opacity-0",
                            i > 0 && i < splitAnimationStep && "ml-1"
                          )} style={{ transitionDelay: `${i * 100}ms` }}>
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(feedbackType === 'correct' || (showHint && hintLevel >= 2 && !feedbackType)) && currentItem.code && (
                    <div className="mb-4 flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">编码：</span>
                        {renderCodeWithColor(currentItem.code)}
                      </div>
                      {codeAlternates.length > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          也可：<span className="font-mono tracking-wider">{codeAlternates.map(c => c.toUpperCase()).join(' / ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 四码位置框：逐位分辨输入（与词组练习一致） */}
                  <div className="flex justify-center gap-1.5 sm:gap-2 mb-3">
                    {Array.from({ length: AUTO_COMMIT_LENGTH }).map((_, i) => {
                      const ch = inputCode[i];
                      const isFilled = !!ch;
                      const isCurrent = !feedbackType && !isFilled && i === inputCode.length;
                      const isCorrectChar = feedbackType === 'correct' && isFilled;
                      const isWrongChar = feedbackType === 'wrong' && isFilled;
                      const matchesAnswer = acceptedCodes.some(c => c.length > i && c[i] === ch);
                      return (
                        <div key={i} className={cn(
                          'w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 flex items-center justify-center',
                          'text-xl sm:text-2xl font-mono font-bold uppercase transition-all duration-150',
                          isCorrectChar && 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                          isWrongChar && matchesAnswer && 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                          isWrongChar && !matchesAnswer && 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                          !feedbackType && isFilled && 'border-primary bg-primary/5',
                          !feedbackType && isCurrent && 'border-primary ring-2 ring-primary/40 bg-primary/[0.03]',
                          !feedbackType && !isFilled && !isCurrent && 'border-border/60',
                        )}>
                          {ch ? ch.toUpperCase() : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-center items-center gap-4">
                    <div className="relative" onClick={() => inputRef.current?.focus()}>
                      <input ref={inputRef} type="text" inputMode="text"
                        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                        placeholder="输入编码" aria-label="输入编码"
                        onFocus={() => { setInputFocused(true); nativeInputActiveRef.current = true; }}
                        onBlur={() => { setInputFocused(false); nativeInputActiveRef.current = false; }}
                        onBeforeInput={handleNativeBeforeInput}
                        className={cn(
                          "w-48 sm:w-56 h-12 sm:h-14 text-center text-2xl sm:text-3xl font-mono bg-muted border-2 rounded-lg caret-primary focus:outline-none transition-[border-color,background-color,color] duration-200",
                          keyFeedback && feedbackType === 'correct' && "border-emerald-400 bg-emerald-50 text-emerald-600",
                          keyFeedback && feedbackType === 'wrong' && "border-red-400 bg-red-50 text-red-600",
                          !keyFeedback && "border-primary/30"
                        )}
                        value={inputCode.toUpperCase()} />
                      {!inputCode && !feedbackType && !inputFocused && (
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none animate-caret-blink text-2xl">▎</span>
                      )}
                    </div>
                  </div>

                  {awaitingCommit && (
                    <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      已打完整编码 · 按
                      <kbd className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-[10px]">空格</kbd>
                      上屏{codeLenNeed === 0 ? '（或继续输入自动上屏）' : ''}
                    </div>
                  )}

                  {/* 手机端作答提示 */}
                  <p className="sm:hidden mt-1 text-xs text-muted-foreground/70 text-center">点击输入框或用下方键盘作答</p>

                  {feedbackType === 'correct' && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-5 w-5" /><span>正确！🎉</span>
                    </div>
                  )}

                  {feedbackType === 'wrong' && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                        <XCircle className="h-5 w-5" /><span>错误</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        {userWrongSplit && (
                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-red-600 dark:text-red-400 font-mono">{userWrongSplit.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">{currentItem.code.toUpperCase()}</span>
                        </div>
                      </div>
                      {codeAlternates.length > 0 && (
                        <div className="text-center text-[11px] text-muted-foreground">
                          也可：<span className="font-mono tracking-wider">{codeAlternates.map(c => c.toUpperCase()).join(' / ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {showHint && hintLevel === 2 && !feedbackType && !showSplitViz && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                      <Lightbulb className="h-3.5 w-3.5 inline mr-1" />首次出现：完整拆分+编码提示已显示
                    </div>
                  )}
                  {showHint && hintLevel === 1 && !feedbackType && !showSplitViz && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                      <Eye className="h-3.5 w-3.5 inline mr-1" />按空格键可查看拆分提示
                    </div>
                  )}
                </div>
              </div>
            </div>

            <PracticeKeyboard
              mode="codes"
              keyFeedback={keyFeedback}
              feedbackType={feedbackType}
              onKeyPress={handleKeyPress}
              onBackspace={() => { if (!feedbackType && inputCode.length > 0) setInputCode(inputCode.slice(0, -1)); }}
              onSpace={() => { if (!feedbackType) handleSpaceCommit(); }}
              headerLeft="编码键盘"
              headerRight={isMustSplitChar(currentItem.char) ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/30 text-amber-600">
                  必拆字
                </Badge>
              ) : undefined}
            />
          </div>

          <div className="space-y-3">
            <ErrorItemsPanel
              items={errorItems}
              onDrill={reviewChars.length > 0 ? startReviewPractice : undefined}
              title="易错项（答错次数）"
            />

            <div className="card-base p-3">
              <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                <SplitSquareHorizontal className="h-3.5 w-3.5 text-blue-500" />编码规则
              </h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">大</span>
                  <span className="text-muted-foreground">= 字根大码</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">小</span>
                  <span className="text-muted-foreground">= 字根小码</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-border/40 text-muted-foreground">
                  <span className="text-foreground font-semibold">满4键自动上屏</span> · 不足4键按空格上屏
                </div>
                <div className="pt-1 text-muted-foreground">
                  当前码长：<span className="text-foreground font-semibold">{codeLenLabels[codeLen]}</span>
                  {codeLenNeed > 0 && <span className="text-muted-foreground/60">（只认 {codeLenNeed} 键编码）</span>}
                </div>
                <div className="pt-1 text-muted-foreground">
                  当前：<span className="text-foreground font-semibold">{codeRuleLabels[codeRule]}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 进度完成弹窗 */}
      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-base p-8 max-w-sm w-full mx-4 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">恭喜完成！🎉</h2>
            <p className="text-muted-foreground mb-6">
              你已经掌握了当前模式下的所有汉字！
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold font-mono-stat">{masteredCount}</div>
                <div className="text-xs text-muted-foreground">已掌握</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold font-mono-stat">{stats.totalAttempts}</div>
                <div className="text-xs text-muted-foreground">总题数</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold font-mono-stat">{accuracy}%</div>
                <div className="text-xs text-muted-foreground">正确率</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {
                setShowCompletionModal(false);
                stopPractice();
              }} className="flex-1">
                返回首页
              </Button>
              <Button onClick={() => {
                setShowCompletionModal(false);
                startPractice();
              }} className="flex-1">
                重新练习
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
