import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useCharCodeData, useBuiltinPhrases, type CharCodeItem } from '@/lib/data-loader';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { keyboardRows } from '@/data/roots';
import {
  Play, RotateCcw, Trophy, CheckCircle2, XCircle,
  Zap, Keyboard, BookOpen, ArrowLeft, Delete,
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
  } else if (phraseLen === 4) {
    extracted = fullCodes.map(c => c.slice(0, 1)).join('');
  } else {
    extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1)
      + fullCodes[2].slice(0, 1) + fullCodes[phraseLen - 1].slice(0, 1);
  }
  const result = extracted.length >= 4 ? extracted : null;
  phraseCodeCache.set(phrase, result);
  return result;
}

// ============================================
// 词组类型 & 配置
// ============================================

interface PhraseItem {
  phrase: string;
  codes: string[];
  fullCode: string;
}

type PhraseMode = 'twoChar' | 'threeChar' | 'fourChar' | 'mixed' | 'sentence';

const modeConfig: Record<PhraseMode, { label: string; description: string; icon: typeof Zap }> = {
  twoChar: { label: '双字词', description: '练习常用双字词组', icon: BookOpen },
  threeChar: { label: '三字词', description: '练习常用三字词组', icon: BookOpen },
  fourChar: { label: '四字词', description: '练习四字词和成语', icon: BookOpen },
  mixed: { label: '混合词组', description: '混合练习双字和三字词', icon: Zap },
  sentence: { label: '短句练习', description: '练习常用短句', icon: Keyboard },
};

const commonShortSentences: string[] = [
  '我们一起去', '今天天气好', '学习很重要', '工作完成了', '谢谢大家',
  '请问您贵姓', '很高兴认识', '请多关照', '祝你成功', '一路顺风',
  '生日快乐', '万事如意', '身体健康', '好好学习', '天天向上',
  '改革开放', '科学发展', '和谐社会', '美好家园', '共同努力',
];

function buildPhraseList(mode: PhraseMode, charToFullCodes: Map<string, string[]>, phrasesData: import('@/lib/data-loader').BuiltinPhrasesData): PhraseItem[] {
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
  const { twoCharPhrases, threeCharPhrases, fourCharPhrases } = phrasesData;
  if (mode === 'twoChar' || mode === 'mixed') {
    for (const p of twoCharPhrases) { if (p.length === 2) addPhrase(p); }
  }
  if (mode === 'threeChar' || mode === 'mixed') {
    for (const p of threeCharPhrases) { if (p.length >= 3) addPhrase(p.slice(0, 3)); }
  }
  if (mode === 'fourChar') {
    for (const p of fourCharPhrases) { if (p.length >= 4) addPhrase(p.slice(0, 4)); }
  }
  if (mode === 'sentence') {
    for (const s of commonShortSentences) addPhrase(s);
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

// ============================================
// 组件
// ============================================

interface PhraseStats {
  totalAttempts: number;
  correctAttempts: number;
  streak: number;
  maxStreak: number;
}

export default function PhrasePracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const { data: phrasesData } = useBuiltinPhrases();
  const charToFullCodes = useMemo(() => charCodeData ? buildCharToFullCodes(charCodeData) : new Map(), [charCodeData]);

  const [mode, setMode] = useLocalStorage<PhraseMode>('phrase-mode', 'twoChar');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState<PhraseItem | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);
  const keyFeedbackTimer = useRef<ReturnType<typeof setTimeout>>();
  const [stats, setStats] = useState<PhraseStats>({
    totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0,
  });
  const [sessionResults, setSessionResults] = useState<Array<{
    phrase: string; correct: boolean; input: string; time: number;
  }>>([]);
  const [showStats, setShowStats] = useState(false);
  const [phraseQueue, setPhraseQueue] = useState<PhraseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();
  const answerStartTime = useRef<number>(0);

  // 词组池懒初始化
  const phrasePoolRef = useRef<PhraseItem[]>([]);
  const [poolReady, setPoolReady] = useState(false);
  const [poolCount, setPoolCount] = useState(0);

  useEffect(() => {
    if (!charCodeData || !phrasesData) return;
    setPoolReady(false);
    const timer = setTimeout(() => {
      const pool = buildPhraseList(mode, charToFullCodes, phrasesData);
      phrasePoolRef.current = pool;
      setPoolCount(pool.length);
      setPoolReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [mode, charCodeData, phrasesData, charToFullCodes]);

  const advancePhrase = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < phraseQueue.length) {
      setCurrentIndex(nextIndex);
      setCurrentPhrase(phraseQueue[nextIndex]);
      setInputCode('');
      setFeedbackType(null);
      answerStartTime.current = Date.now();
    } else {
      setIsPlaying(false);
      setShowStats(true);
    }
  }, [currentIndex, phraseQueue]);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType) return;
    if (!currentPhrase) return;

    const newCode = inputCode + key;
    setInputCode(newCode);

    const correctCode = currentPhrase.fullCode;

    // 正确前缀 → 继续
    if (correctCode.startsWith(newCode)) {
      if (newCode === correctCode) {
        // 四码输入完毕且完全正确
        const time = Date.now() - answerStartTime.current;
        setFeedbackType('correct');
        setStats(prev => ({
          ...prev,
          totalAttempts: prev.totalAttempts + 1,
          correctAttempts: prev.correctAttempts + 1,
          streak: prev.streak + 1,
          maxStreak: Math.max(prev.maxStreak, prev.streak + 1),
        }));
        setSessionResults(prev => [...prev, {
          phrase: currentPhrase.phrase, correct: true, input: newCode, time,
        }]);
        feedbackTimer.current = setTimeout(advancePhrase, 800);
      }
      // 未满4码且前缀正确 → 继续等待
      return;
    }

    // 前缀不匹配 → 错误
    const time = Date.now() - answerStartTime.current;
    setFeedbackType('wrong');
    setStats(prev => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
      streak: 0,
    }));
    setSessionResults(prev => [...prev, {
      phrase: currentPhrase.phrase, correct: false, input: newCode, time,
    }]);
    feedbackTimer.current = setTimeout(advancePhrase, 1200);
  }, [isPlaying, feedbackType, inputCode, currentPhrase, advancePhrase]);

  /** 虚拟键盘按键 - 带视觉反馈 */
  const handleVirtualKeyPress = useCallback((key: string) => {
    handleKeyPress(key);
    setKeyFeedback(key);
    if (keyFeedbackTimer.current) clearTimeout(keyFeedbackTimer.current);
    keyFeedbackTimer.current = setTimeout(() => setKeyFeedback(null), 150);
  }, [handleKeyPress]);

  /** 虚拟键盘退格 */
  const handleBackspace = useCallback(() => {
    if (!isPlaying || feedbackType) return;
    setInputCode(prev => prev.slice(0, -1));
  }, [isPlaying, feedbackType]);

  // 全局键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === 'Escape') { exitPractice(); return; }
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
  }, [isPlaying, feedbackType, handleKeyPress]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (keyFeedbackTimer.current) clearTimeout(keyFeedbackTimer.current);
    };
  }, []);

  const startPractice = useCallback(() => {
    const pool = phrasePoolRef.current;
    if (pool.length === 0) return;
    const shuffled = shuffleArray(pool).slice(0, 20);
    setPhraseQueue(shuffled);
    setCurrentIndex(0);
    setCurrentPhrase(shuffled[0]);
    setInputCode('');
    setFeedbackType(null);
    setIsPlaying(true);
    setShowStats(false);
    setSessionResults([]);
    setStats({ totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0 });
    answerStartTime.current = Date.now();
  }, []);

  const exitPractice = useCallback(() => {
    setIsPlaying(false);
    setShowStats(false);
    setPhraseQueue([]);
    setCurrentPhrase(null);
    setInputCode('');
    setFeedbackType(null);
  }, []);

  const accuracy = stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0;
  const progress = phraseQueue.length > 0
    ? (currentIndex / phraseQueue.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* 标题区 */}
      <section className="py-6 sm:py-12 lg:py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container-page text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <Keyboard className="h-4 w-4 mr-1.5" />
            词组练习
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            词组练习
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            直接按键输入四码词组编码，自动判定对错
          </p>
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
            <span>词组库: <span className="font-bold text-foreground">{poolCount.toLocaleString()}</span> 个</span>
            <span>四码一组 · 按键即输入 · 满码自动判定</span>
          </div>
        </div>
      </section>

      {/* 模式选择（未开始时） */}
      {!isPlaying && !showStats && (
        <section className="py-8 sm:py-12">
          <div className="container-page max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-6">选择练习模式</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(modeConfig) as PhraseMode[]).map((m) => {
                const config = modeConfig[m];
                const Icon = config.icon;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      mode === m
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/50 hover:border-primary/30'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 mb-2', mode === m ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="font-medium text-sm">{config.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{config.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Button size="lg" onClick={startPractice} disabled={!poolReady} className="gap-2 px-8">
                <Play className="h-5 w-5" />
                {poolReady ? '开始练习' : '加载中...'}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                当前：{modeConfig[mode].label} · 共 {poolCount.toLocaleString()} 个词组 · 每次练习 20 个
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===== 练习区 ===== */}
      {isPlaying && currentPhrase && (
        <section className="py-4 sm:py-12">
          <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            {/* 进度条 + 退出 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm items-center mb-2">
                <span className="text-muted-foreground">
                  {currentIndex + 1} / {phraseQueue.length}
                </span>
                <span className="text-muted-foreground">
                  正确率 <span className="font-bold text-foreground">{accuracy}%</span>
                </span>
                <span className="text-muted-foreground">
                  连击 <span className="font-bold text-foreground">{stats.streak}</span>
                </span>
                <button
                  onClick={exitPractice}
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

              {/* 逐字全码提示（答案揭晓后显示） */}
              {feedbackType && (
                <div className="flex justify-center gap-4 text-sm mb-4 animate-fadeIn">
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
                        !feedbackType && !isFilled && 'border-border/60',
                        feedbackType === 'correct' && !isFilled && 'border-emerald-300 bg-emerald-50/50',
                        feedbackType === 'wrong' && !isFilled && 'border-red-200 bg-red-50/30',
                      )}
                    >
                      {char || ''}
                    </div>
                  );
                })}
              </div>

              {/* 正确答案（错误时显示） */}
              {feedbackType === 'wrong' && (
                <div className="text-lg font-mono font-bold text-red-600 animate-fadeIn">
                  正确编码：<span className="uppercase">{currentPhrase.fullCode}</span>
                </div>
              )}

              {/* 反馈提示 */}
              {feedbackType && (
                <div className={cn(
                  'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium animate-fadeIn',
                  feedbackType === 'correct'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
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

            {/* 虚拟键盘 */}
            <div className="sm:card-base p-1 sm:p-4 mt-2 sm:mt-4 mobile-keyboard">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs font-medium text-muted-foreground">编码键盘</span>
              </div>
              <div className="flex flex-col items-center gap-[3px] sm:gap-1.5">
                {keyboardRows.map((row, ri) => (
                  <div key={ri} className="flex gap-[3px] sm:gap-1.5 w-full" style={{ paddingLeft: `${ri * 4}px` }}>
                    {row.map((key) => {
                      const isActive = keyFeedback === key;
                      return (
                        <button key={key} onClick={() => handleVirtualKeyPress(key)}
                          className={cn(
                            'flex-1 min-w-0 h-12 sm:flex-none sm:h-11 sm:w-10 rounded-lg font-mono text-sm font-semibold transition-colors duration-150 border-2',
                            isActive && feedbackType === 'correct' && 'bg-emerald-500 text-white border-emerald-600',
                            isActive && feedbackType === 'wrong' && 'bg-red-500 text-white border-red-600',
                            !isActive && 'bg-card hover:bg-accent/10 border-border'
                          )}>
                          {key.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {/* 退格键行 */}
                <div className="flex gap-[3px] sm:gap-1.5 w-full" style={{ paddingLeft: '12px' }}>
                  <button onClick={handleBackspace}
                    className="flex-[2] min-w-0 h-12 sm:flex-none sm:h-11 sm:w-20 rounded-lg font-mono text-xs font-semibold transition-colors duration-150 border-2 bg-card hover:bg-accent/10 border-border flex items-center justify-center gap-1">
                    <Delete className="h-3.5 w-3.5" />
                    <span className="text-[11px]">删除</span>
                  </button>
                </div>
              </div>
            </div>
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
                共完成 {sessionResults.length} 个词组
              </p>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold text-emerald-600">{accuracy}%</div>
                <div className="text-xs text-muted-foreground">正确率</div>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.maxStreak}</div>
                <div className="text-xs text-muted-foreground">最高连击</div>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.correctAttempts}</div>
                <div className="text-xs text-muted-foreground">答对</div>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold text-red-600">{stats.totalAttempts - stats.correctAttempts}</div>
                <div className="text-xs text-muted-foreground">答错</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden mb-8">
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
                        → {phraseQueue[i]?.fullCode.toUpperCase()}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
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
              <Button variant="outline" onClick={exitPractice} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回模式选择
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
