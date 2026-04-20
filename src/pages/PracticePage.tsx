import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { practiceRootMappings, commonRootMappings, keyboardRows } from '@/data/roots';
import type { RootMapping } from '@/data/roots';
import type { PracticeMode, PracticeStats } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import RootCharDisplay from '@/components/RootCharDisplay';
import { Play, RotateCcw, Zap, BookOpen, Trophy, CheckCircle2, XCircle, Trash2, GraduationCap } from 'lucide-react';

const modeConfig: Record<PracticeMode, { label: string; icon: typeof Zap; description: string }> = {
  progressive: { label: '渐进学习', icon: GraduationCap, description: '科学记忆，逐步掌握全部字根' },
  weak: { label: '错题回顾', icon: Zap, description: '针对错题，查漏补缺' },
  common: { label: '简体练习', icon: BookOpen, description: '科学记忆，逐步掌握简体字根' },
};
const MODES: PracticeMode[] = ['progressive', 'weak', 'common'];
const allRootIds = practiceRootMappings.map(r => r.char);
const commonRootIds = commonRootMappings.map(r => r.char);

interface ModePersistData {
  isPlaying: boolean;
  currentRootChar: string;
  stats: PracticeStats;
  wrongCountMap: Record<string, number>;
  correctCountMap: Record<string, number>;
  totalStats: { totalAttempts: number; correctAttempts: number; maxStreak: number; totalScore: number; };
  lastPracticeTime: number;
}

const defaultModePersist: ModePersistData = {
  isPlaying: false,
  currentRootChar: practiceRootMappings[0].char,
  stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
  wrongCountMap: {}, correctCountMap: {},
  totalStats: { totalAttempts: 0, correctAttempts: 0, maxStreak: 0, totalScore: 0 },
  lastPracticeTime: 0,
};

const KEY_COLORS: Record<string, string> = {
  correct: 'bg-emerald-500 text-white border-emerald-600',
  wrong: 'bg-red-500 text-white border-red-600',
  highlight: 'bg-amber-400 text-white border-amber-500',
  default: 'bg-card text-foreground border-border hover:bg-accent/10',
};

function getRootsForMode(mode: PracticeMode): RootMapping[] {
  return mode === 'common' ? commonRootMappings : practiceRootMappings;
}

// 保存当前模式的key
const CURRENT_MODE_KEY = 'ziyuan-practice-current-mode';

export default function PracticePage() {
  // 从localStorage恢复上次选择的模式
  const [mode, setMode] = useState<PracticeMode>(() => {
    const saved = localStorage.getItem(CURRENT_MODE_KEY);
    if (saved === 'progressive' || saved === 'weak' || saved === 'common') return saved;
    return 'progressive';
  });
  const [modeData, setModeData] = useLocalStorage<Record<PracticeMode, ModePersistData>>(
    'ziyuan-practice-modes-v3',
    { progressive: defaultModePersist, weak: defaultModePersist, common: defaultModePersist }
  );
  const safeModeData: Record<PracticeMode, ModePersistData> = {
    progressive: modeData.progressive ?? defaultModePersist,
    weak: modeData.weak ?? defaultModePersist,
    common: modeData.common ?? defaultModePersist,
  };
  const currentData = safeModeData[mode];

  // 保存当前模式到localStorage
  useEffect(() => {
    localStorage.setItem(CURRENT_MODE_KEY, mode);
  }, [mode]);

  const progressiveLearning = useSpacedLearning({
    allItemIds: allRootIds, newItemsPerRound: 5, masteryThreshold: 3, reviewProbability: 0.1, storageKey: 'ziyuan-progressive-learning',
  });
  const commonLearning = useSpacedLearning({
    allItemIds: commonRootIds, newItemsPerRound: 5, masteryThreshold: 3, reviewProbability: 0.1, storageKey: 'ziyuan-common-learning',
  });
  const weakRoots = Object.entries(currentData.wrongCountMap).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const weakLearning = useSpacedLearning({
    allItemIds: weakRoots.length > 0 ? weakRoots : allRootIds, newItemsPerRound: 5, masteryThreshold: 3, reviewProbability: 0.1, storageKey: 'ziyuan-weak-learning',
  });

  const [currentRoot, setCurrentRoot] = useState<RootMapping>(() => {
    const found = practiceRootMappings.find(r => r.char === currentData.currentRootChar);
    return found ?? practiceRootMappings[0];
  });
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  const isPlaying = currentData.isPlaying;
  const stats = currentData.stats;

  const getLearning = useCallback(() => {
    if (mode === 'progressive') return progressiveLearning;
    if (mode === 'common') return commonLearning;
    return weakLearning;
  }, [mode, progressiveLearning, commonLearning, weakLearning]);

  const updateModeData = useCallback((updater: (prev: ModePersistData) => ModePersistData) => {
    setModeData(prev => ({ ...prev, [mode]: updater(prev[mode] ?? defaultModePersist) }));
  }, [mode, setModeData]);

  const nextRoot = useCallback(() => {
    setShowAnswer(false); setKeyFeedback(null); setFeedbackType(null);
    const learning = getLearning();
    const nextCharId = learning.getNextItem();
    if (nextCharId) {
      const roots = getRootsForMode(mode);
      const found = roots.find(r => r.char === nextCharId) ?? roots[0];
      setCurrentRoot(found);
      updateModeData(prev => ({ ...prev, currentRootChar: found.char }));
    }
  }, [mode, getLearning, updateModeData]);

  const startPractice = useCallback(() => {
    updateModeData(prev => ({ ...prev, isPlaying: true, stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 } }));
    nextRoot();
  }, [nextRoot, updateModeData]);

  const continuePractice = useCallback(() => {
    const found = practiceRootMappings.find(r => r.char === currentData.currentRootChar) ?? commonRootMappings.find(r => r.char === currentData.currentRootChar) ?? practiceRootMappings[0];
    setCurrentRoot(found);
  }, [currentData.currentRootChar]);

  const stopPractice = useCallback(() => {
    updateModeData(prev => ({ ...prev, isPlaying: false, stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 } }));
    setKeyFeedback(null); setFeedbackType(null); setShowAnswer(false);
  }, [updateModeData]);

  const clearModeData = useCallback(() => {
    setModeData(prev => ({ ...prev, [mode]: defaultModePersist }));
  }, [mode, setModeData]);

  // 处理按键输入
  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || keyFeedback) return;
    const isCorrect = key === currentRoot.key;
    setKeyFeedback(key);
    setFeedbackType(isCorrect ? 'correct' : 'wrong');
    setShowAnswer(true);
    getLearning().recordResult(currentRoot.char, isCorrect);

    if (isCorrect) {
      const newStreak = stats.streak + 1;
      const newMaxStreak = Math.max(stats.maxStreak, newStreak);
      updateModeData(prev => ({
        ...prev,
        stats: { totalAttempts: prev.stats.totalAttempts + 1, correctAttempts: prev.stats.correctAttempts + 1, streak: newStreak, maxStreak: newMaxStreak, score: prev.stats.score + 10 + prev.stats.streak },
        correctCountMap: { ...prev.correctCountMap, [currentRoot.char]: (prev.correctCountMap[currentRoot.char] || 0) + 1 },
        totalStats: { totalAttempts: prev.totalStats.totalAttempts + 1, correctAttempts: prev.totalStats.correctAttempts + 1, maxStreak: Math.max(prev.totalStats.maxStreak, newMaxStreak), totalScore: prev.totalStats.totalScore + 10 + prev.stats.streak },
        wrongCountMap: prev.wrongCountMap[currentRoot.char] ? { ...prev.wrongCountMap, [currentRoot.char]: Math.max(0, (prev.wrongCountMap[currentRoot.char] || 0) - 1) } : prev.wrongCountMap,
      }));
      feedbackTimer.current = setTimeout(() => { setKeyFeedback(null); setFeedbackType(null); nextRoot(); }, 400);
    } else {
      updateModeData(prev => ({
        ...prev,
        stats: { ...prev.stats, totalAttempts: prev.stats.totalAttempts + 1, streak: 0 },
        wrongCountMap: { ...prev.wrongCountMap, [currentRoot.char]: (prev.wrongCountMap[currentRoot.char] || 0) + 1 },
        totalStats: { ...prev.totalStats, totalAttempts: prev.totalStats.totalAttempts + 1 },
      }));
      feedbackTimer.current = setTimeout(() => { setKeyFeedback(null); setFeedbackType(null); }, 800);
    }
  }, [isPlaying, keyFeedback, currentRoot, stats, getLearning, updateModeData, nextRoot]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= 'a' && key <= 'z') { e.preventDefault(); handleKeyPress(key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleKeyPress]);

  // 清理定时器
  useEffect(() => { return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }; }, []);

  // 聚焦输入框
  useEffect(() => { if (isPlaying && inputRef.current) inputRef.current.focus(); }, [isPlaying, currentRoot]);

  const accuracy = stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0;
  const totalAccuracy = currentData.totalStats.totalAttempts > 0 ? Math.round((currentData.totalStats.correctAttempts / currentData.totalStats.totalAttempts) * 100) : 0;
  const learningStats = getLearning().stats;

  // 未开始时显示模式选择
  if (!isPlaying) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">v1.31版字根练习</h1>
          <p className="mt-2 text-muted-foreground">选择练习模式，开始训练</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {MODES.map((modeKey) => {
            const config = modeConfig[modeKey];
            const Icon = config.icon;
            const isActive = mode === modeKey;
            return (
              <Card key={modeKey} className={cn('cursor-pointer border-2 transition-all hover:shadow-lg', isActive ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card hover:border-primary/30')} onClick={() => setMode(modeKey)}>
                <CardHeader className="text-center p-4">
                  <Icon className={cn('mx-auto mb-2 h-8 w-8', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <CardTitle className={cn('text-lg', isActive ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </CardHeader>
              </Card>
            );
          })}
        </div>
        {mode === 'weak' && weakRoots.length === 0 && <div className="mt-4 text-center text-sm text-amber-600">错题列表为空，请先进行练习以收集错题数据</div>}
        {(mode === 'progressive' || mode === 'common') && (
          <Card className="mt-6 border-border bg-card/80">
            <CardHeader><CardTitle className="text-lg text-foreground flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />{mode === 'progressive' ? '全部字根学习进度' : '简体字根学习进度'}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div><div className="text-2xl font-bold text-primary">{learningStats.mastered}</div><div className="text-xs text-muted-foreground">已掌握</div></div>
                  <div><div className="text-2xl font-bold text-amber-600">{learningStats.active}</div><div className="text-xs text-muted-foreground">学习中</div></div>
                  <div><div className="text-2xl font-bold text-muted-foreground">{learningStats.pending}</div><div className="text-xs text-muted-foreground">待学习</div></div>
                  <div><div className="text-2xl font-bold text-emerald-600">{learningStats.progress}%</div><div className="text-xs text-muted-foreground">完成度</div></div>
                </div>
                <Progress value={learningStats.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
        {mode === 'weak' && weakRoots.length > 0 && (
          <Card className="mt-6 border-border bg-card/80">
            <CardHeader><CardTitle className="text-lg text-foreground flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" />错题列表</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {weakRoots.slice(0, 30).map((char) => (<Badge key={char} variant="secondary" className="text-base">{char}<span className="ml-1 text-xs text-muted-foreground">({currentData.wrongCountMap[char]}次)</span></Badge>))}
                {weakRoots.length > 30 && <Badge variant="outline">+{weakRoots.length - 30} 更多</Badge>}
              </div>
            </CardContent>
          </Card>
        )}
        {currentData.totalStats.totalAttempts > 0 && (
          <Card className="mt-6 border-border bg-card/80">
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg text-foreground">历史学习记录</CardTitle><Button variant="ghost" size="sm" onClick={clearModeData} className="gap-1 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">清除记录</span></Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div><div className="text-xl sm:text-2xl font-bold text-foreground">{currentData.totalStats.totalAttempts}</div><div className="text-xs text-muted-foreground">累计练习</div></div>
                <div><div className="text-xl sm:text-2xl font-bold text-foreground">{totalAccuracy}%</div><div className="text-xs text-muted-foreground">历史正确率</div></div>
                <div><div className="text-xl sm:text-2xl font-bold text-amber-500">{currentData.totalStats.maxStreak}</div><div className="text-xs text-muted-foreground">历史最高连击</div></div>
                <div><div className="text-xl sm:text-2xl font-bold text-foreground">{weakRoots.length}</div><div className="text-xs text-muted-foreground">待强化字根</div></div>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="mt-8 text-center flex justify-center gap-4">
          {currentData.isPlaying && currentData.stats.totalAttempts > 0 && (<Button size="lg" variant="outline" onClick={continuePractice} className="gap-2 px-8"><Play className="h-5 w-5" />继续练习</Button>)}
          <Button size="lg" onClick={startPractice} className="gap-2 bg-primary px-10 text-primary-foreground"><Play className="h-5 w-5" />{currentData.isPlaying ? '重新开始' : '开始练习'}</Button>
        </div>
      </div>
    );
  }

  // 练习中
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="text-muted-foreground text-xs sm:text-sm">{modeConfig[mode].label}</Badge>
          <Button variant="ghost" size="sm" onClick={stopPractice} className="gap-1 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">退出</span></Button>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1 text-muted-foreground"><Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" /><span className="font-semibold text-foreground">{stats.score}</span></div>
          <div className="flex items-center gap-1 text-muted-foreground"><Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" /><span className="font-semibold text-foreground">{stats.streak}x</span></div>
          <div className="text-muted-foreground"><span className="hidden sm:inline">正确率 </span><span className="font-semibold text-foreground">{accuracy}%</span></div>
        </div>
      </div>
      <div className="mb-6 sm:mb-8"><Progress value={accuracy} className="h-1.5 sm:h-2" /></div>
      <div className="mb-6 sm:mb-8 flex flex-col items-center">
        <div className={cn('flex items-center justify-center rounded-3xl border-4 transition-all duration-300 h-28 w-28 sm:h-40 sm:w-40', feedbackType === 'correct' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 scale-110' : feedbackType === 'wrong' ? 'border-red-400 bg-red-50 dark:bg-red-950/30 scale-95' : 'border-border bg-card')}>
          <RootCharDisplay root={currentRoot} size="xl" showDesc={true} className={cn('border-0 bg-transparent', feedbackType === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : feedbackType === 'wrong' ? 'text-red-600 dark:text-red-400' : 'text-foreground')} />
        </div>
        <div className="mt-4 relative">
          <input ref={inputRef} type="text" readOnly placeholder="输入键位" className="w-40 sm:w-48 h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono bg-muted border-2 border-primary/30 rounded-xl focus:outline-none focus:border-primary caret-primary" value={keyFeedback?.toUpperCase() || ''} />
          {!keyFeedback && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none animate-pulse text-lg">▎</span>}
        </div>
        {feedbackType && (
          <div className={cn('mt-3 sm:mt-4 flex items-center gap-2 text-base sm:text-lg font-semibold', feedbackType === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {feedbackType === 'correct' ? <><CheckCircle2 className="h-5 w-5" />正确！</> : <><XCircle className="h-5 w-5" />错误，正确键位：<span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50 font-mono text-base sm:text-lg font-bold text-red-700 dark:text-red-300">{currentRoot.key.toUpperCase()}</span></>}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-1.5" style={{ paddingLeft: `${rowIndex * 12}px` }}>
            {row.map((key) => {
              const isFeedback = keyFeedback === key;
              const isCorrectKey = key === currentRoot.key;
              let colorClass = KEY_COLORS.default;
              if (isFeedback && feedbackType === 'correct') colorClass = KEY_COLORS.correct;
              else if (isFeedback && feedbackType === 'wrong') colorClass = KEY_COLORS.wrong;
              else if (showAnswer && isCorrectKey && feedbackType === 'wrong') colorClass = KEY_COLORS.highlight;
              return (<button key={key} className={cn('flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl border-2 text-xs sm:text-base font-semibold transition-all duration-150 cursor-pointer select-none', colorClass)} onClick={() => handleKeyPress(key)}>{key.toUpperCase()}</button>);
            })}
          </div>
        ))}
      </div>
      <div className="mt-6 sm:mt-8 grid grid-cols-4 gap-2 sm:gap-4">
        {[{ label: '本轮题数', value: stats.totalAttempts }, { label: '本轮正确', value: stats.correctAttempts }, { label: '本轮连击', value: stats.streak }, { label: '弱项字根', value: weakRoots.length }].map((item) => (
          <Card key={item.label} className="border-border bg-card/80"><CardContent className="p-2 sm:p-4 text-center"><div className="text-lg sm:text-2xl font-bold text-foreground">{item.value}</div><div className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</div></CardContent></Card>
        ))}
      </div>
    </div>
  );
}