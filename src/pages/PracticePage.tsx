import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { practiceRootMappings, commonRootMappings, keyboardRows } from '@/data/roots';
import type { RootMapping } from '@/data/roots';
import type { PracticeMode, PracticeStats } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import RootCharDisplay from '@/components/RootCharDisplay';
import { Play, RotateCcw, Zap, BookOpen, Trophy, CheckCircle2, XCircle, Trash2, GraduationCap, Target, AlertTriangle, Lightbulb, Eye, BarChart3 } from 'lucide-react';

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
      <div className="min-h-screen bg-background">
        {/* Hero区 - 简洁标题 */}
        <section className="py-16 sm:py-20">
          <div className="container-page text-center">
            <div className="max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
                v1.31版 · 字根练习系统
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
                选择你的
                <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent"> 练习模式</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-12 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                科学记忆，循序渐进，快速掌握全部字根
              </p>
            </div>

            {/* 模式选择卡片 */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto">
              {MODES.map((modeKey, idx) => {
                const config = modeConfig[modeKey];
                const Icon = config.icon;
                const isActive = mode === modeKey;
                return (
                  <button
                    key={modeKey}
                    onClick={() => setMode(modeKey)}
                    className={cn(
                      'card-feature text-left stagger-item',
                      isActive && 'border-primary ring-2 ring-primary/20'
                    )}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                      isActive ? 'bg-primary/15' : 'bg-muted/80'
                    )}>
                      <Icon className={cn(
                        'h-7 w-7 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    
                    <h3 className={cn(
                      'text-xl font-bold mb-2 transition-colors',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {config.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {config.description}
                    </p>

                    {isActive && (
                      <div className="mt-4 pt-4 border-t border-border/60">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                          已选择
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 学习进度区域 */}
        {(mode === 'progressive' || mode === 'common') && (
          <section className="pb-16 bg-muted/30">
            <div className="container-page max-w-3xl mx-auto">
              <div className="card-stats">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{mode === 'progressive' ? '全部字根学习进度' : '简体字根学习进度'}</h2>
                    <p className="text-sm text-muted-foreground">基于艾宾浩斯遗忘曲线的科学复习</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="stat-number text-primary">{learningStats.mastered}</div>
                    <div className="stat-label">已掌握</div>
                  </div>
                  <div className="text-center">
                    <div className="stat-number text-warning">{learningStats.active}</div>
                    <div className="stat-label">学习中</div>
                  </div>
                  <div className="text-center">
                    <div className="stat-number text-muted-foreground">{learningStats.pending}</div>
                    <div className="stat-label">待学习</div>
                  </div>
                  <div className="text-center">
                    <div className="stat-number text-success">{learningStats.progress}%</div>
                    <div className="stat-label">完成度</div>
                  </div>
                </div>

                <div className="progress-base">
                  <div className="progress-bar-animated" style={{ width: `${learningStats.progress}%` }} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 错题列表 */}
        {mode === 'weak' && weakRoots.length > 0 && (
          <section className="pb-16">
            <div className="container-page max-w-3xl mx-auto">
              <div className="card-base">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">错题列表</h2>
                    <p className="text-sm text-muted-foreground">重点突破，查漏补缺</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {weakRoots.slice(0, 40).map((char) => (
                    <Badge 
                      key={char} 
                      variant="secondary"
                      className="text-base px-3 py-1.5 hover:bg-destructive/10 cursor-pointer transition-colors"
                    >
                      <span className="root-char mr-1">{char}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({currentData.wrongCountMap[char]}次)
                      </span>
                    </Badge>
                  ))}
                  {weakRoots.length > 40 && (
                    <Badge variant="outline" className="px-3 py-1.5">
                      +{weakRoots.length - 40} 更多
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {mode === 'weak' && weakRoots.length === 0 && (
          <div className="container-page text-center py-8">
            <div className="alert-base alert-info max-w-md mx-auto">
              <Zap className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">错题列表为空</p>
                <p className="text-sm mt-1 opacity-90">请先进行练习以收集错题数据</p>
              </div>
            </div>
          </div>
        )}

        {/* 历史记录 */}
        {currentData.totalStats.totalAttempts > 0 && (
          <section className="pb-16 bg-muted/30">
            <div className="container-page max-w-3xl mx-auto">
              <div className="card-base">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-accent" />
                    <h2 className="font-bold text-lg">历史学习记录</h2>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearModeData} 
                    className="gap-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    清除记录
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60">
                    <div className="stat-number">{currentData.totalStats.totalAttempts}</div>
                    <div className="stat-label">累计练习</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60">
                    <div className="stat-number">{totalAccuracy}%</div>
                    <div className="stat-label">历史正确率</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60">
                    <div className="stat-number text-warning">{currentData.totalStats.maxStreak}</div>
                    <div className="stat-label">最高连击</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60">
                    <div className="stat-number">{weakRoots.length}</div>
                    <div className="stat-label">待强化</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA按钮组 */}
        <section className="pb-20">
          <div className="container-page text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {currentData.isPlaying && currentData.stats.totalAttempts > 0 && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={continuePractice} 
                  className="btn-secondary text-base gap-2 px-8 py-3"
                >
                  <Play className="h-5 w-5" />
                  继续练习
                </Button>
              )}
              
              <Button 
                size="lg" 
                onClick={startPractice} 
                className="btn-primary text-base px-10 py-3"
              >
                <Play className="h-5 w-5" />
                {currentData.isPlaying ? '重新开始' : '开始练习'}
              </Button>
            </div>
          </div>
          </section>
      </div>
    );
  }

  // 练习中 - 专业级UI
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部状态栏 */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container-page max-w-4xl py-3">
          <div className="flex items-center justify-between">
            {/* 左侧：模式 + 退出按钮 */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium px-3 py-1.5">
                {modeConfig[mode].label}
              </Badge>
              
              <button
                onClick={stopPractice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">退出练习</span>
              </button>
            </div>

            {/* 右侧：统计数据 */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* 分数 */}
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-foreground">{stats.score}</span>
              </div>

              {/* 连击 */}
              <div className="flex items-center gap-1.5">
                <Zap className={`h-4 w-4 ${stats.streak >= 10 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${stats.streak >= 10 ? 'text-orange-500' : 'text-foreground'}`}>
                  {stats.streak}x
                  {stats.streak >= 10 && (
                    <span className="ml-0.5 text-xs">🔥</span>
                  )}
                </span>
              </div>

              {/* 正确率 */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">正确率</span>
                <span className="text-sm font-bold text-foreground">{accuracy}%</span>
              </div>

              {/* 进度条（移动端显示） */}
              <div className="sm:hidden flex-1 max-w-[100px]">
                <Progress value={accuracy} className="h-1.5" />
              </div>
            </div>
          </div>

          {/* 桌面端进度条 */}
          <div className="mt-3 hidden sm:block">
            <Progress value={accuracy} className="h-1.5 progress-bar-animated" />
          </div>
        </div>
      </div>

      {/* 主练习区 */}
      <div className="container-page max-w-4xl py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：字根展示 + 输入区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 字根展示卡片 */}
            <div className={cn(
              "card-base p-8 sm:p-12 transition-all duration-300",
              feedbackType === 'correct' && "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.02]",
              feedbackType === 'wrong' && "border-red-400 bg-red-50/50 dark:bg-red-950/20"
            )}>
              <div className="flex flex-col items-center">
                {/* 当前字根 */}
                <div className={cn(
                  "relative flex items-center justify-center h-32 w-32 sm:h-40 sm:w-40 rounded-3xl border-4 transition-all duration-300 mb-6",
                  feedbackType === 'correct' 
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 scale-110 shadow-lg shadow-emerald-200" 
                    : feedbackType === 'wrong'
                    ? "border-red-400 bg-red-50 dark:bg-red-950/30 scale-95"
                    : "border-border bg-card"
                )}>
                  <RootCharDisplay 
                    root={currentRoot} 
                    size="xl" 
                    showDesc={true} 
                    className={cn(
                      "border-0 bg-transparent",
                      feedbackType === 'correct' && "text-emerald-600 dark:text-emerald-400",
                      feedbackType === 'wrong' && "text-red-600 dark:text-red-400"
                    )} 
                  />

                  {/* 反馈动画图标 */}
                  {feedbackType === 'correct' && (
                    <div className="absolute -top-2 -right-2 animate-bounce-in">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                  )}
                  
                  {feedbackType === 'wrong' && (
                    <div className="absolute -top-2 -right-2 animate-shake">
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  )}
                </div>

                {/* 输入框 */}
                <div className="relative w-full max-w-xs">
                  <input
                    ref={inputRef}
                    type="text"
                    readOnly
                    placeholder="输入键位"
                    className={cn(
                      "w-full h-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-bold",
                      "bg-muted border-2 rounded-xl focus:outline-none caret-primary transition-all duration-200",
                      keyFeedback
                        ? (feedbackType === 'correct' 
                          ? "border-emerald-400 bg-emerald-50 text-emerald-600 dark:text-emerald-400" 
                          : "border-red-400 bg-red-50 text-red-600 dark:text-red-400")
                        : "border-primary/30"
                    )}
                    value={keyFeedback?.toUpperCase() || ''}
                  />
                  
                  {!keyFeedback && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none animate-pulse text-lg">
                      ▎
                    </span>
                  )}

                  {/* 反馈文字 */}
                  {feedbackType && (
                    <div className={cn(
                      "mt-4 flex items-center justify-center gap-2 text-lg font-semibold",
                      feedbackType === 'correct' 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {feedbackType === 'correct' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          <span>正确！太棒了 🎉</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5" />
                          <span>错误，正确键位：</span>
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/50 font-mono text-base font-bold text-red-700 dark:text-red-300">
                            {currentRoot.key.toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 虚拟键盘 */}
            <div className="card-base p-6">
              <div className="flex flex-col items-center gap-2">
                {keyboardRows.map((row, rowIndex) => (
                  <div 
                    key={rowIndex} 
                    className="flex gap-1.5 sm:gap-2"
                    style={{ paddingLeft: `${rowIndex * 16}px` }}
                  >
                    {row.map((key) => {
                      const isFeedback = keyFeedback === key;
                      const isCorrectKey = key === currentRoot.key;
                      
                      let colorClass = KEY_COLORS.default;
                      if (isFeedback && feedbackType === 'correct') colorClass = KEY_COLORS.correct;
                      else if (isFeedback && feedbackType === 'wrong') colorClass = KEY_COLORS.wrong;
                      else if (showAnswer && isCorrectKey && feedbackType === 'wrong') colorClass = KEY_COLORS.highlight;

                      return (
                        <button
                          key={key}
                          onClick={() => handleKeyPress(key)}
                          className={cn(
                            "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border-2",
                            "text-sm sm:text-base font-semibold transition-all duration-150 cursor-pointer select-none",
                            "hover:shadow-md active:scale-95",
                            colorClass
                          )}
                        >
                          {key.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：统计面板 */}
          <div className="space-y-4">
            {/* 本轮统计 */}
            <div className="card-stats p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                本轮统计
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '题数', value: stats.totalAttempts, icon: Target },
                  { label: '正确', value: stats.correctAttempts, icon: CheckCircle2 },
                  { label: '连击', value: stats.streak, icon: Zap },
                  { label: '弱项', value: weakRoots.length, icon: AlertTriangle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                      <Icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
                      <div className="stat-number text-base">{item.value}</div>
                      <div className="stat-label text-[10px]">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 快捷提示 */}
            <div className="card-base p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                练习提示
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>使用键盘直接输入，无需点击屏幕</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>连击10次以上会触发🔥特效</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>按ESC可快速退出练习</span>
                </li>
              </ul>
            </div>

            {/* 下一个字根提示 */}
            <div className="card-base p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                学习提示
              </h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p>• 系统会根据记忆曲线智能安排复习</p>
                <p>• 重点关注错误次数多的字根</p>
                <p>• 坚持练习，逐步掌握所有字根</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
