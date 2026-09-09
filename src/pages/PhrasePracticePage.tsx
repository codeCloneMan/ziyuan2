import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useCharCodeData, useBuiltinPhrases, type CharCodeItem, type BuiltinPhrasesData } from '@/lib/data-loader';
import { PracticeKeyboard, RoundCompleteToast } from '@/components/practice';
import { usePracticeSession } from '@/hooks/use-practice-session';
import { usePracticeRound } from '@/hooks/use-practice-round';
import {
  usePhraseProgress,
  usePreferences,
  useDailyStats,
} from '@/store/progress-store';
import type { PracticeLevel } from '@/types';
import {
  Play, RotateCcw, Trophy, CheckCircle2, XCircle,
  Zap, BookOpen, ArrowLeft, Flame,
} from 'lucide-react';

// ============================================
// 字符编码映射（延迟构建）
// ============================================

function buildCharToFullCodes(charCodeData: CharCodeItem[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of charCodeData) {
    const existing = map.get(item.char);
    if (existing) {
      if (!existing.includes(item.code)) existing.push(item.code);
    } else {
      map.set(item.char, [item.code]);
    }
  }
  return map;
}

function getFullCode(ch: string, charToFullCodes: Map<string, string[]>): string | null {
  const codes = charToFullCodes.get(ch);
  if (!codes || codes.length === 0) return null;
  return codes.reduce((a, b) => a.length >= b.length ? a : b);
}

const phraseCodeCache = new Map<string, string | null>();

function getPhraseCode(phrase: string, charToFullCodes: Map<string, string[]>): string | null {
  const cached = phraseCodeCache.get(phrase);
  if (cached !== undefined) return cached;
  const phraseLen = phrase.length;
  const fullCodes: string[] = [];
  for (const ch of phrase) {
    const fc = getFullCode(ch, charToFullCodes);
    if (!fc) { phraseCodeCache.set(phrase, null); return null; }
    fullCodes.push(fc);
  }
  let extracted = '';
  if (phraseLen === 2) {
    extracted = fullCodes[0].slice(0, 2) + fullCodes[1].slice(0, 2);
  } else if (phraseLen === 3) {
    extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1) + fullCodes[2].slice(0, 2);
  } else {
    extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1)
      + fullCodes[2].slice(0, 1) + fullCodes[phraseLen - 1].slice(0, 1);
  }
  const result = extracted.length >= 4 ? extracted : null;
  phraseCodeCache.set(phrase, result);
  return result;
}

// ============================================
// 词组类型 & 配置（仅两种级别）
// ============================================

interface PhraseItem {
  phrase: string;
  codes: string[];
  fullCode: string;
}

const modeConfig: Record<PracticeLevel, { label: string; description: string; icon: typeof BookOpen }> = {
  beginner: { label: '入门', description: '前500高频双字词', icon: BookOpen },
  advanced: { label: '进阶', description: '前5000高频混合词', icon: Zap },
};

function buildPhraseList(
  level: PracticeLevel,
  charToFullCodes: Map<string, string[]>,
  phrasesData: BuiltinPhrasesData,
): PhraseItem[] {
  const phrases: PhraseItem[] = [];
  const seen = new Set<string>();
  const addPhrase = (phrase: string) => {
    if (seen.has(phrase)) return;
    seen.add(phrase);
    const fullCode = getPhraseCode(phrase, charToFullCodes);
    if (!fullCode) return;
    const codes = phrase.split('').map(ch => getFullCode(ch, charToFullCodes) || '?');
    if (codes.includes('?')) return;
    phrases.push({ phrase, codes, fullCode });
  };

  const { twoCharPhrases, twoCharFreqs, threeCharPhrases, threeCharFreqs } = phrasesData;

  if (level === 'beginner') {
    // 入门：前500个双字词（数据已按词频降序排列）
    const limit = 500;
    for (let i = 0; i < twoCharPhrases.length && phrases.length < limit; i++) {
      const p = twoCharPhrases[i];
      if (p.length === 2) addPhrase(p);
    }
  } else {
    // 进阶：前5000个词（双字+三字合并，按词频降序取前5000）
    const limit = 5000;
    const merged: { phrase: string; freq: number }[] = [];
    for (let i = 0; i < twoCharPhrases.length; i++) {
      merged.push({ phrase: twoCharPhrases[i], freq: twoCharFreqs[i] });
    }
    for (let i = 0; i < threeCharPhrases.length; i++) {
      const p = threeCharPhrases[i];
      merged.push({ phrase: p.length >= 3 ? p.slice(0, 3) : p, freq: threeCharFreqs[i] });
    }
    merged.sort((a, b) => b.freq - a.freq);
    for (const m of merged) {
      if (phrases.length >= limit) break;
      addPhrase(m.phrase);
    }
  }

  return phrases;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface SessionResult {
  phrase: string;
  correct: boolean;
  input: string;
  time: number;
  fullCode: string;
}

export default function PhrasePracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const { data: phrasesData } = useBuiltinPhrases();
  const charToFullCodes = useMemo(() => charCodeData ? buildCharToFullCodes(charCodeData) : new Map(), [charCodeData]);

  const { progress: phraseProgress, recordAnswer, setMode: setStoreMode } = usePhraseProgress();
  const { preferences, setPref } = usePreferences();
  const phraseShowHint = preferences.phraseShowHint;
  const todayStats = useDailyStats();

  const rawLevel = preferences.phraseMode;
  const level: PracticeLevel = (rawLevel === 'beginner' || rawLevel === 'advanced') ? rawLevel : 'beginner';
  const isBeginner = level === 'beginner';

  // ============================================
  // 答错处理策略（对齐字根练习）：
  //   入门+进阶：答错都切下一题。
  //   答错反馈延长（入门2.5s/进阶1.5s），给用户消化词组编码。
  //   反馈期间键盘输入被阻止。
  //   答错的词组加入错题重练队列，3 步后重新出现。
  // ============================================
  const wrongQueueRef = useRef<{ phrase: PhraseItem; step: number }[]>([]);

  const [currentPhrase, setCurrentPhrase] = useState<PhraseItem | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [phraseQueue, setPhraseQueue] = useState<PhraseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundToast, setRoundToast] = useState<number | null>(null);

  const answerStartTime = useRef<number>(0);
  const phraseInputRef = useRef<HTMLInputElement>(null);

  // 用 ref 持有最新 currentPhrase，使 useMemo 缓存的 onWrong 闭包不会捕获过期值
  const currentPhraseRef = useRef(currentPhrase);
  useEffect(() => {
    currentPhraseRef.current = currentPhrase;
  });

  // 词组池（同步计算，getPhraseCode 有缓存，构建足够快）
  const phrasePool = useMemo(() => {
    if (!charCodeData || !phrasesData) return [];
    return buildPhraseList(level, charToFullCodes, phrasesData);
  }, [level, charCodeData, phrasesData, charToFullCodes]);
  const poolReady = phrasePool.length > 0;
  const poolCount = phrasePool.length;

  // 轮次记录：一轮 = 当前词库每个词都答过至少一次；答完自动重开下一轮
  const roundKey = `phrase:${level}`;
  const { completedRounds, seenCount: roundSeen, markSeen, resetRound } = usePracticeRound(roundKey, poolCount);

  const advancePhrase = useCallback(() => {
    // 优先取错题（已隔 ≥3 步）；原地修改队列避免重新赋值 ref.current
    for (const w of wrongQueueRef.current) w.step += 1;
    const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
    if (dueWrong) {
      const idx = wrongQueueRef.current.indexOf(dueWrong);
      if (idx >= 0) wrongQueueRef.current.splice(idx, 1);
      setCurrentPhrase(dueWrong.phrase);
      setInputCode('');
      // 重置计时起点，否则下一题用时统计会累积前面的时间
      answerStartTime.current = Date.now();
      return;
    }
    const nextIndex = (currentIndex + 1) % phraseQueue.length;
    if (nextIndex === 0) {
      // 回绕时重新洗牌，避免每轮顺序相同
      const reshuffled = shuffleArray(phraseQueue);
      setPhraseQueue(reshuffled);
      setCurrentIndex(0);
      setCurrentPhrase(reshuffled[0]);
      setInputCode('');
      answerStartTime.current = Date.now();
      return;
    }
    setCurrentIndex(nextIndex);
    setCurrentPhrase(phraseQueue[nextIndex]);
    setInputCode('');
    answerStartTime.current = Date.now();
  }, [currentIndex, phraseQueue]);

  const {
    isPlaying, start, stop, reset, submit,
    keyFeedback, feedbackType, stats, accuracy,
  } = usePracticeSession(useMemo(() => ({
    correctClearDelay: 800,
    wrongClearDelay: isBeginner ? 2500 : 1500,
    onCorrect: () => advancePhrase(),
    onWrong: () => {
      // 通过 ref 读取最新 currentPhrase，避免闭包捕获过期值
      const phrase = currentPhraseRef.current;
      if (phrase) {
        wrongQueueRef.current.push({ phrase, step: 0 });
      }
      advancePhrase();
    },
  }), [isBeginner, advancePhrase]));

  const stopPractice = useCallback(() => {
    // 停止练习：显示统计（如有结果）
    stop();
    setShowStats(sessionResults.length > 0);
    setCurrentPhrase(null);
    setInputCode('');
  }, [stop, sessionResults.length]);

  const backToMenu = useCallback(() => {
    // 从统计页返回级别选择页
    stop();
    setShowStats(false);
    setPhraseQueue([]);
    setCurrentPhrase(null);
    setInputCode('');
    setSessionResults([]);
  }, [stop]);

  const startPractice = useCallback(() => {
    if (phrasePool.length === 0) return;
    setStoreMode(level); // 真正开始练习时才记录 lastMode
    // 清空上一轮遗留的错题队列，避免新练习开头插入旧错题
    wrongQueueRef.current = [];
    const shuffled = shuffleArray(phrasePool);
    setPhraseQueue(shuffled);
    setCurrentIndex(0);
    setCurrentPhrase(shuffled[0]);
    setInputCode('');
    setShowStats(false);
    setSessionResults([]);
    answerStartTime.current = Date.now();
    reset();
    // 新一轮练习：本轮已答集合清零（已完成轮数是持久记录，保留）
    resetRound();
    start();
  }, [phrasePool, level, setStoreMode, reset, resetRound, start]);

  const handleLevelChange = useCallback((lvl: PracticeLevel) => {
    setPref('phraseMode', lvl);
  }, [setPref]);

  // 逐键累加编码：前缀正确继续等待；四码完整且正确判对；前缀断裂判错
  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType || !currentPhrase) return;

    const newCode = inputCode + key;
    setInputCode(newCode);

    const correctCode = currentPhrase.fullCode;
    const time = Date.now() - answerStartTime.current;
    const result = { phrase: currentPhrase.phrase, input: newCode, time, fullCode: correctCode };

    const isPrefix = correctCode.startsWith(newCode);
    // 前缀未走完（还可能打对）→ 继续输入，不算一次作答
    if (isPrefix && newCode !== correctCode) return;

    const isCorrect = newCode === correctCode;
    if (isCorrect) {
      recordAnswer(true);
      setSessionResults(prev => [...prev, { ...result, correct: true }]);
    } else {
      recordAnswer(false);
      setSessionResults(prev => [...prev, { ...result, correct: false }]);
    }

    // 轮次：答完词库最后一个词即完成一轮 —— 记录轮次、本轮统计归零，
    // 下一题自动进入新一轮。先 reset 再 submit，最后一题计入新一轮不丢。
    const roundDone = markSeen(currentPhrase.phrase);
    if (roundDone) {
      reset();
      setSessionResults([]);
      setRoundToast(completedRounds + 1);
    }

    submit(isCorrect, key);
  }, [isPlaying, feedbackType, inputCode, currentPhrase, recordAnswer, submit, markSeen, reset, completedRounds]);

  /** 虚拟键盘退格 */
  const handleBackspace = useCallback(() => {
    if (!isPlaying || feedbackType) return;
    setInputCode(prev => prev.slice(0, -1));
  }, [isPlaying, feedbackType]);

  // 全局键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      // 中文输入法组合期间不提交（isComposing 为主，keyCode 229 为 WebView 纵深防御）
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') { stopPractice(); return; }
      if (feedbackType) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        setInputCode(prev => prev.slice(0, -1));
        return;
      }
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        e.preventDefault();
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, feedbackType, handleKeyPress, stopPractice]);

  // 本轮进度 = 本轮已答词数 / 词库总数（与轮次记录同一口径，不再用队列下标）
  const progress = poolCount > 0 ? (roundSeen / poolCount) * 100 : 0;

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

  return (
    <div className="min-h-screen bg-background">

      {/* 级别选择（未开始时） */}
      {!isPlaying && !showStats && (
        <div className="min-h-[calc(100vh-3.5rem)] bg-mesh">
          <section className="container-page py-10 sm:py-16">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-8 sm:mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                  词组<span className="text-gradient-primary">练习</span>
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  看词组，打四码编码。练习常用词组的输入
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
                {/* 左：开始 + 统计 */}
                <div className="lg:col-span-3 card-base !rounded-2xl p-6 sm:p-8 flex flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center py-4 mb-6">
                    <button
                      onClick={startPractice}
                      disabled={!poolReady}
                      className="group inline-flex items-center gap-3 rounded-2xl bg-primary text-primary-foreground px-10 py-4 text-lg font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {poolReady ? '开始练习' : '加载中...'}
                    </button>
                    <p className="text-xs text-muted-foreground/70 mt-4">
                      {poolCount.toLocaleString()} 个词组 · 完整循环随机练习
                      {completedRounds > 0 && <> · 已完成 {completedRounds} 轮</>}
                      {' · '}今日 {todayStats.attempts} 题
                    </p>
                  </div>

                  {(phraseProgress.totalAttempts > 0 || phraseProgress.bestStreak > 0) && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold font-mono-stat text-foreground">{phraseProgress.totalAttempts}</div>
                        <div className="text-xs text-muted-foreground">累计练习 · {phraseProgress.totalCorrect} 对</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold font-mono-stat text-amber-500">{phraseProgress.bestStreak}x</div>
                        <div className="text-xs text-muted-foreground">历史最佳连击</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 右：级别与设置 */}
                <div className="lg:col-span-2 card-base !rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4 font-serif">练习级别</h2>
                  <div className="space-y-2 mb-5">
                    {(Object.keys(modeConfig) as PracticeLevel[]).map((lvl) => {
                      const cfg = modeConfig[lvl];
                      return (
                        <button key={lvl} onClick={() => handleLevelChange(lvl)}
                          className={cn('w-full p-3 rounded-xl border text-left transition-all duration-200',
                            level === lvl
                              ? 'border-primary/40 bg-primary/[0.05] shadow-sm'
                              : 'border-border/50 hover:border-primary/25 hover:bg-primary/[0.02]')}>
                          <div className="flex items-center gap-2">
                            <cfg.icon className={cn('h-4 w-4 shrink-0', level === lvl ? 'text-primary' : 'text-muted-foreground')} />
                            <span className={cn('text-sm font-medium', level === lvl ? 'text-foreground' : 'text-muted-foreground')}>{cfg.label}</span>
                          </div>
                          <div className="text-xs text-muted-foreground/70 mt-0.5">{cfg.description}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-xs text-muted-foreground">新词组自动显示答案提示</span>
                    <button onClick={() => setPref('phraseShowHint', !phraseShowHint)} aria-label="切换答案提示"
                      className={cn('w-9 h-5 rounded-full transition-colors relative',
                        phraseShowHint ? 'bg-primary' : 'bg-muted-foreground/30')}>
                      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                        phraseShowHint ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ===== 练习区 ===== */}
      {isPlaying && currentPhrase && (
        <section className="py-4 sm:py-12">
          <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            {/* 进度条 + 退出 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm items-center mb-2">
                <span className="text-muted-foreground">
                  第 {completedRounds + 1} 轮 · 本轮 <span className="font-mono-stat text-foreground/70">{roundSeen}</span>/{poolCount}
                  {completedRounds > 0 && (
                    <span className="ml-2 text-sky-600 dark:text-sky-400 font-semibold text-xs">已完成 {completedRounds} 轮</span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Flame className={cn('h-3.5 w-3.5', stats.streak >= 10 ? 'text-orange-500' : 'text-muted-foreground')} />
                  连击 <span className="font-mono-stat font-bold text-foreground">{stats.streak}</span>
                </span>
                <span className="text-muted-foreground">
                  正确率 <span className="font-mono-stat font-bold text-foreground">{accuracy}%</span>
                </span>
                <button
                  onClick={stopPractice}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:border-red-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  退出
                  <kbd className="hidden sm:inline ml-0.5 px-1 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/50 rounded font-mono">Esc</kbd>
                </button>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* 词组显示 */}
            <div className="text-center py-6 mb-6">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-wider mb-4 root-char">
                {currentPhrase.phrase}
              </div>

              {/* 逐字全码提示（开启提示或答案揭晓后显示） */}
              {(phraseShowHint || feedbackType) && (
                <div className="flex justify-center gap-4 text-sm mb-4 animate-fade-in">
                  {currentPhrase.phrase.split('').map((char, i) => (
                    <div key={i} className="text-center">
                      <div className="font-bold root-char">{char}</div>
                      <div className="font-mono text-xs text-muted-foreground">{currentPhrase.codes[i]}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 四码输入显示 */}
              <div className="flex justify-center gap-2 mb-4">
                {Array.from({ length: 4 }).map((_, i) => {
                  const char = inputCode[i];
                  const isFilled = !!char;
                  const isCurrent = !feedbackType && !isFilled && i === inputCode.length;
                  const isCorrectChar = feedbackType === 'correct' && char;
                  const isWrongChar = feedbackType === 'wrong' && i < inputCode.length;

                  return (
                    <div
                      key={i}
                      className={cn(
                        'w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center',
                        'text-2xl font-mono font-bold uppercase transition-all duration-150',
                        isCorrectChar && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                        isWrongChar && i < currentPhrase.fullCode.length && char === currentPhrase.fullCode[i]
                          && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                        isWrongChar && i < inputCode.length && char !== currentPhrase.fullCode[i]
                          && 'border-red-500 bg-red-50 text-red-700',
                        !feedbackType && isFilled && 'border-primary bg-primary/5',
                        !feedbackType && isCurrent && 'border-primary ring-2 ring-primary/40 bg-primary/[0.03]',
                        !feedbackType && !isFilled && !isCurrent && 'border-border/60',
                        feedbackType === 'correct' && !isFilled && 'border-emerald-300 bg-emerald-50/50',
                        feedbackType === 'wrong' && !isFilled && 'border-red-200 bg-red-50/30',
                      )}
                    >
                      {char || ''}
                    </div>
                  );
                })}
              </div>

              {/* 原生输入框：手机软键盘/桌面直接键入（beforeinput 逐按键提交，中文组合被忽略） */}
              <div className="flex justify-center mb-3">
                <input
                  ref={phraseInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="输入四码"
                  onBeforeInput={(e) => {
                    const ne = e.nativeEvent as InputEvent;
                    if (ne.inputType === 'insertText' && ne.data && /^[a-z]$/i.test(ne.data)) {
                      e.preventDefault(); // 受控组件无需实际插入
                      handleKeyPress(ne.data.toLowerCase());
                    } else if (ne.inputType === 'deleteContentBackward' || ne.inputType === 'insertFromPaste' || ne.inputType === 'insertFromDrop') {
                      e.preventDefault();
                      // 与 window keydown 的 Backspace 分支一致：反馈期间不允许删除；粘贴/拖放无意义
                      if (ne.inputType === 'deleteContentBackward' && !feedbackType) setInputCode(c => c.slice(0, -1));
                    }
                  }}
                  className={cn(
                    "w-48 sm:w-56 h-12 sm:h-14 text-center text-2xl sm:text-3xl font-mono bg-muted border-2 rounded-lg caret-primary focus:outline-none transition-colors",
                    keyFeedback && feedbackType === 'correct' && "border-emerald-400 bg-emerald-50 text-emerald-600",
                    keyFeedback && feedbackType === 'wrong' && "border-red-400 bg-red-50 text-red-600",
                    !keyFeedback && "border-primary/30"
                  )}
                  value={inputCode.toUpperCase()} />
              </div>

              {/* 正确答案（错误时显示） */}
              {feedbackType === 'wrong' && (
                <div className="text-lg font-mono font-bold text-red-600 animate-fade-in">
                  正确编码：<span className="uppercase">{currentPhrase.fullCode}</span>
                </div>
              )}

              {/* 反馈提示 */}
              {feedbackType && (
                <div className={cn(
                  'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium animate-fade-in',
                  feedbackType === 'correct'
                    ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                )}>
                  {feedbackType === 'correct'
                    ? <><CheckCircle2 className="h-4 w-4" /> 正确！</>
                    : <><XCircle className="h-4 w-4" /> 错误</>
                  }
                </div>
              )}
            </div>

            {/* 快捷键提示 - 仅桌面端显示 */}
            {!feedbackType && (
              <div className="hidden sm:flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">A-Z</kbd>输入编码</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Esc</kbd>退出</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Backspace</kbd>删除</span>
              </div>
            )}

            {/* 手机端作答提示 */}
            <p className="sm:hidden text-center text-xs text-muted-foreground/70 mb-2">点击上方输入框或用下方键盘作答</p>

            {/* 虚拟键盘 */}
            <PracticeKeyboard
              mode="codes"
              keyFeedback={keyFeedback}
              feedbackType={feedbackType}
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              headerLeft="编码键盘"
              headerRight={
                <span className="text-[10px] text-muted-foreground">
                  得分 <span className="font-mono-stat font-bold text-foreground">{stats.score}</span>
                </span>
              }
            />
          </div>
        </section>
      )}

      {/* ===== 统计页 ===== */}
      {showStats && (
        <section className="py-8 sm:py-12">
          <div className="container-page max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">练习完成！</h2>
              <p className="text-muted-foreground mt-1">
                共完成 <span className="font-mono-stat">{sessionResults.length}</span> 个词组
              </p>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-2xl font-bold font-mono-stat text-emerald-600">{accuracy}%</div>
                <div className="text-xs text-muted-foreground">正确率</div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-2xl font-bold font-mono-stat text-accent">{stats.maxStreak}</div>
                <div className="text-xs text-muted-foreground">最高连击</div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-2xl font-bold font-mono-stat text-emerald-600">{stats.correctAttempts}</div>
                <div className="text-xs text-muted-foreground">答对</div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className="text-2xl font-bold font-mono-stat text-red-600">{stats.totalAttempts - stats.correctAttempts}</div>
                <div className="text-xs text-muted-foreground">答错</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden mb-8">
              <div className="px-4 py-3 bg-muted font-medium text-sm">练习详情</div>
              <div className="max-h-64 overflow-y-auto">
                {sessionResults.map((result, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm border-b last:border-b-0',
                      result.correct ? 'bg-emerald-50/50' : 'bg-red-50/50'
                    )}
                  >
                    <span className="text-muted-foreground w-6 text-right">{i + 1}</span>
                    <span className="font-medium root-char w-20">{result.phrase}</span>
                    <span className={cn(
                      'font-mono text-xs',
                      result.correct ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {result.input.toUpperCase()}
                    </span>
                    {!result.correct && (
                      <span className="text-xs text-muted-foreground font-mono">
                        → {result.fullCode.toUpperCase()}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground font-mono-stat">
                      {(result.time / 1000).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={startPractice} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                再来一次
              </Button>
              <Button variant="outline" onClick={backToMenu} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回级别选择
              </Button>
            </div>
          </div>
        </section>
      )}

      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />
    </div>
  );
}
