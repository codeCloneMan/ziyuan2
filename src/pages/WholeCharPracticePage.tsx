import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCharCodeData, type CharCodeItem } from '@/lib/data-loader';
import { top500Chars } from '@/data/commonChars';
import { commonStandard } from '@/data/builtinCharSets';
import type { PracticeLevel } from '@/types';
import { PracticeKeyboard } from '@/components/practice';
import { usePracticeSession } from '@/hooks/use-practice-session';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import {
  useWholeCharProgress,
  usePreferences,
  useDailyStats,
} from '@/store/progress-store';
import { getCharSplit } from '@/data/splitData';
import {
  Play, RotateCcw, Trash2, Star, Trophy, CheckCircle2, XCircle,
  Lightbulb, BarChart3, Target, AlertTriangle, ChevronUp, ChevronDown,
  Eye, EyeOff, SplitSquareHorizontal, Flame, GraduationCap,
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
  beginner: { label: '入门', description: '常用 500 高频字', icon: Star },
  advanced: { label: '进阶', description: '常用 8000+ 字，科学记忆', icon: GraduationCap },
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

export default function WholeCharPracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const { progress, recordAnswer, resetMode } = useWholeCharProgress();
  const { preferences, setPref } = usePreferences();
  const todayStats = useDailyStats();

  // ============================================
  // 安全取值：防止旧数据中有非法 level 值导致崩溃
  // （normalizeState 已做校验，此处为双保险）
  // ============================================
  const rawLevel = preferences.charSetRange;
  const level: PracticeLevel = (rawLevel === 'beginner' || rawLevel === 'advanced') ? rawLevel : 'beginner';
  const currentConfig = levelConfig[level];
  const showHint = preferences.wholeCharShowHint;

  const allCharIds = useMemo(() => charCodeData?.map(d => d.char) ?? [], [charCodeData]);

  // 入门=500高频，进阶=常用8000字（通用规范汉字表）
  const learningPool = useMemo(() => {
    if (!charCodeData) return [];
    if (level === 'beginner') return top500Chars;
    // 使用通用规范汉字表（8105字），控制在常用8000字内循环
    return commonStandard;
  }, [charCodeData, level]);

  const modeKey = `whole:${level}`;
  const modeProgress = progress.modes[modeKey] || {
    correctCountMap: {}, wrongCountMap: {}, totalAttempts: 0, totalCorrect: 0,
    streak: 0, bestStreak: 0, lastPracticeAt: 0,
  };

  const isBeginner = level === 'beginner';

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

  const [currentItem, setCurrentItem] = useState<CharCodeItem>(() => ({
    char: '', code: '',
  }));
  const [inputCode, setInputCode] = useState('');
  const [showSplitViz, setShowSplitViz] = useState(false);
  const [splitAnimationStep, setSplitAnimationStep] = useState(0);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [userWrongSplit, setUserWrongSplit] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const splitAnimTimer = useRef<ReturnType<typeof setTimeout>>();
  const [inputFocused, setInputFocused] = useState(false);
  const nativePrevRef = useRef('');

  const splitParts = useMemo(() => getSplitParts(currentItem.char), [currentItem.char]);
  const codeRule = useMemo(() => getCodeRule(currentItem.code), [currentItem.code]);

  const hintLevel = useMemo(() => {
    const seen = modeProgress.correctCountMap[currentItem.char] || 0;
    if (seen === 0) return 2;
    if (seen === 1) return 1;
    return 0;
  }, [modeProgress.correctCountMap, currentItem.char]);

  const weakestChars = useMemo(() => {
    if (!charCodeData) return [];
    return charCodeData
      .filter(d => (modeProgress.wrongCountMap[d.char] || 0) > 0)
      .map(d => ({ char: d.char, code: d.code, wrong: modeProgress.wrongCountMap[d.char] || 0 }))
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 10);
  }, [modeProgress.wrongCountMap, charCodeData]);

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
    if (!charCodeData || learningPool.length === 0) return;

    // 检查是否已全部掌握（与进度条同口径：只统计 learningPool 内的项）
    const currentCorrectMap = modeProgress.correctCountMap;
    const masteredCount = learningPool.filter(ch => (currentCorrectMap[ch] || 0) >= 3).length;
    if (masteredCount === learningPool.length) {
      // 所有字都已掌握，显示完成提示
      setShowCompletionModal(true);
      setShowSplitViz(false);
      setSplitAnimationStep(0);
      setUserWrongSplit(null);
      return;
    }

    let nextId: string | null = null;

    if (isBeginner) {
      // 入门：由间隔学习算法决定下一题
      nextId = spaced.getNextItem();
    } else {
      // 优先取错题（已隔 ≥3 步）
      wrongQueueRef.current = wrongQueueRef.current.map(w => ({ ...w, step: w.step + 1 }));
      const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
      if (dueWrong) {
        wrongQueueRef.current = wrongQueueRef.current.filter(w => w !== dueWrong);
        nextId = dueWrong.char;
      } else {
        // 进阶：按洗牌队列顺序循环
        if (shuffleQueueRef.current.length === 0) {
          shuffleQueueRef.current = shuffleInPlace([...learningPool]);
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
      const found = charCodeData.find(d => d.char === nextId) ?? charCodeData[0];
      setCurrentItem(found);
      setInputCode('');
    }
    setShowSplitViz(false);
    setSplitAnimationStep(0);
    setUserWrongSplit(null);
  }, [charCodeData, learningPool, isBeginner, spaced, modeProgress]);

  const startPractice = useCallback(() => {
    // 清全局 correctCountMap（避免完成检查误判）+ 清间隔池
    resetMode(modeKey);
    if (isBeginner) {
      spaced.resetProgress();
    } else {
      shuffleQueueRef.current = shuffleInPlace([...learningPool]);
      shuffleIndexRef.current = -1;
    }
    reset();
    start();
  }, [isBeginner, learningPool, modeKey, spaced, reset, resetMode, start]);

  const stopPractice = useCallback(() => {
    stop();
    setShowSplitViz(false);
    setSplitAnimationStep(0);
    setUserWrongSplit(null);
    setInputCode('');
  }, [stop]);

  const clearData = useCallback(() => {
    if (confirm('确定要清除当前模式的整字练习记录吗？')) {
      resetMode(modeKey);
      spaced.resetProgress();
      stop();
      reset();
    }
  }, [modeKey, spaced, stop, reset, resetMode]);

  useEffect(() => {
    if (isPlaying && charCodeData) generateNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    if (showSplitViz && splitAnimationStep < splitParts.length) {
      splitAnimTimer.current = setTimeout(() => {
        setSplitAnimationStep(prev => prev + 1);
      }, 300);
      return () => { if (splitAnimTimer.current) clearTimeout(splitAnimTimer.current); };
    }
  }, [showSplitViz, splitAnimationStep, splitParts.length]);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType || !currentItem.char) return;
    const newCode = inputCode + key;
    setInputCode(newCode);

    const correctCode = currentItem.code;
    if (correctCode.startsWith(newCode)) {
      if (newCode === correctCode) {
        recordAnswer(modeKey, currentItem.char, true);
        if (isBeginner) spaced.recordResult(currentItem.char, true);
        submit(true, key);
      }
    } else {
      recordAnswer(modeKey, currentItem.char, false);
      if (isBeginner) spaced.recordResult(currentItem.char, false);
      setUserWrongSplit(newCode);
      setShowSplitViz(true);
      setSplitAnimationStep(splitParts.length);
      submit(false, key);
    }
  }, [isPlaying, feedbackType, inputCode, currentItem, recordAnswer, modeKey, isBeginner, spaced, splitParts.length, submit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || feedbackType) return;
      if (e.key === 'Escape') { stopPractice(); return; }
      if (e.key === ' ') {
        e.preventDefault();
        if (showHint && inputCode.length > 0) {
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
  }, [isPlaying, feedbackType, handleKeyPress, stopPractice, splitParts.length, showHint, inputCode, setPref]);

  useEffect(() => {
    if (isPlaying && inputRef.current) inputRef.current.focus();
  }, [isPlaying, currentItem]);

  // 同步原生键盘输入比对基准，避免自定义键盘与原生键盘混用时错位
  useEffect(() => { nativePrevRef.current = inputCode; }, [inputCode]);

  // 原生键盘（手机/桌面直接键入）输入处理：与当前编码逐字比对，增量提交
  const handleNativeInput = useCallback((raw: string) => {
    if (feedbackType) { nativePrevRef.current = inputCode; return; }
    const val = raw.toLowerCase().replace(/[^a-z]/g, '');
    const prev = nativePrevRef.current;
    if (val === prev) return;
    if (val.startsWith(prev) && val.length > prev.length) {
      const appended = val.slice(prev.length);
      for (const ch of appended) handleKeyPress(ch);
    } else if (prev.startsWith(val) && val.length < prev.length) {
      const removed = prev.length - val.length;
      for (let i = 0; i < removed; i++) {
        if (!feedbackType) setInputCode(c => c.slice(0, -1));
      }
    } else {
      setInputCode(val);
    }
    nativePrevRef.current = val;
  }, [feedbackType, handleKeyPress, inputCode]);

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
      <div className="min-h-screen bg-background">
        <section className="py-12 sm:py-20 lg:py-28">
          <div className="container-page text-center max-w-xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              整字<span className="text-gradient-primary">练习</span>
            </h1>
            <p className="text-muted-foreground mb-10">
              看汉字，打编码。掌握字根后练习整字拆分
            </p>

            <Button size="lg" onClick={startPractice} className="btn-primary text-lg px-12 py-4 mb-6">
              <Play className="h-5 w-5 mr-2" />开始练习
            </Button>

            {masteredCount > 0 && (
              <div className={cn(
                "card-base p-4 text-left max-w-sm mx-auto mb-8",
                masteredCount === learningPool.length && "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
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

            <details open={showSettings} onToggle={e => setShowSettings(e.currentTarget.open)} className="text-left max-w-sm mx-auto">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-center">
                练习设置
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-foreground mb-2">练习难度</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(levelConfig) as [PracticeLevel, typeof levelConfig.beginner][]).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button key={key} onClick={() => setPref('charSetRange', key)}
                          className={cn('p-2 rounded-lg border text-left text-xs transition-all flex items-center gap-2',
                            level === key ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30')}>
                          <Icon className={cn('h-4 w-4 shrink-0', level === key ? 'text-primary' : 'text-muted-foreground')} />
                          <div>
                            <div className={cn('font-medium', level === key ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</div>
                            <div className="text-[10px] text-muted-foreground">{config.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">首次出现显示拆分与编码提示</span>
                  <button onClick={() => setPref('wholeCharShowHint', !showHint)}
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
            </details>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky z-30 border-b border-border bg-card"
        style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}>
        <div className="container-page max-w-5xl py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium px-3 py-1.5 text-xs">
                {currentConfig.label}
              </Badge>
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
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-bold font-mono-stat">{stats.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className={cn('h-3.5 w-3.5', stats.streak >= 10 ? 'text-orange-500' : 'text-muted-foreground')} />
                <span className={cn('font-bold font-mono-stat', stats.streak >= 10 ? 'text-orange-500' : '')}>{stats.streak}x</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-muted-foreground">正确率</span>
                <span className="font-bold font-mono-stat">{accuracy}%</span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>
                已掌握 <span className="font-bold text-primary/80 font-mono-stat">{masteredCount}</span>
                {' · '}已练习 <span className="font-mono-stat">{practicedCount}</span>
                <span className="text-muted-foreground/40"> / {learningPool.length}</span>
                {practicedCount === learningPool.length && masteredCount < learningPool.length && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">已完成一轮</span>
                )}
                {masteredCount === learningPool.length && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">全部掌握</span>
                )}
              </span>
              <span>今日 {todayStats.attempts}题</span>
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
                    <div className="mb-4 animate-fadeIn">
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
                    <div className="mb-4 flex items-center justify-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">编码：</span>
                      {renderCodeWithColor(currentItem.code)}
                    </div>
                  )}

                  <div className="flex justify-center items-center gap-4">
                    <div className="relative" onClick={() => inputRef.current?.focus()}>
                      <input ref={inputRef} type="text" inputMode="text"
                        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                        placeholder="输入编码"
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        onChange={(e) => handleNativeInput(e.target.value)}
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
              headerLeft="编码键盘"
              headerRight={isMustSplitChar(currentItem.char) ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/30 text-amber-600">
                  必拆字
                </Badge>
              ) : undefined}
            />
          </div>

          <div className="space-y-3">
            <div className="card-stats p-4">
              <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />本轮统计
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '题数', value: stats.totalAttempts, icon: Target },
                  { label: '正确', value: stats.correctAttempts, icon: CheckCircle2 },
                  { label: '连击', value: stats.streak, icon: Flame },
                  { label: '弱项', value: weakestChars.length, icon: AlertTriangle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="text-center p-2 rounded-lg bg-card border border-border">
                      <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-lg font-bold font-mono-stat">{item.value}</div>
                      <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                  当前：<span className="text-foreground font-semibold">{codeRuleLabels[codeRule]}</span>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowStatsPanel(!showStatsPanel)} className="w-full gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />{showStatsPanel ? '收起统计' : '详细统计'}
              {showStatsPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showStatsPanel && (
              <div className="card-base p-3 animate-fadeIn">
                <h4 className="font-semibold text-xs text-foreground mb-2">最弱汉字</h4>
                {weakestChars.length > 0 ? (
                  <div className="space-y-1">
                    {weakestChars.slice(0, 5).map((r, i) => (
                      <div key={r.char} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-muted-foreground">{i + 1}</span>
                        <span className="text-sm w-5 text-center">{r.char}</span>
                        <div className="flex-1 progress-base h-1.5">
                          <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(r.wrong * 20, 100)}%` }} />
                        </div>
                        <span className="text-muted-foreground text-[10px]">{r.wrong}次</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">暂无数据</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 进度完成弹窗 */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-base p-8 max-w-sm w-full mx-4 text-center animate-fadeIn">
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
