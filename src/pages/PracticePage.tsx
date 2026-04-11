import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  practiceRootMappings,
  commonRootMappings,
  getRandomRoot,
  findKeyByRoot,
  keyboardRows,
} from '@/data/roots';
import type { RootMapping } from '@/data/roots';
import type { PracticeMode, PracticeStats } from '@/types';
import {
  usePracticePersist,
  defaultPracticeData,
  type PracticePersistData,
} from '@/hooks/use-local-storage';
import RootCharDisplay from '@/components/RootCharDisplay';
import {
  Play,
  RotateCcw,
  Zap,
  Target,
  Shuffle,
  Trophy,
  CheckCircle2,
  XCircle,
  Trash2,
  BookOpen,
} from 'lucide-react';

const modeConfig: Record<PracticeMode, { label: string; icon: typeof Shuffle; description: string }> = {
  random: { label: '随机练习', icon: Shuffle, description: '随机出题，全面覆盖' },
  sequential: { label: '顺序练习', icon: Target, description: '按顺序逐个学习' },
  weak: { label: '弱项强化', icon: Zap, description: '针对错误字根强化' },
  common: { label: '常用字根', icon: BookOpen, description: '去除繁体字根，专注简体' },
};

const KEY_COLORS: Record<string, string> = {
  correct: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200 dark:shadow-emerald-900',
  wrong: 'bg-red-500 text-white border-red-600 shadow-red-200 dark:shadow-red-900',
  highlight: 'bg-amber-400 text-white border-amber-500 shadow-amber-200 dark:shadow-amber-900',
  default: 'bg-card text-foreground border-border hover:bg-accent/10',
};

/** 获取当前模式使用的字根列表 */
function getRootsForMode(mode: PracticeMode): RootMapping[] {
  return mode === 'common' ? commonRootMappings : practiceRootMappings;
}

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>('random');
  const [persistData, setPersistData] = usePracticePersist(mode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRoot, setCurrentRoot] = useState<RootMapping>(practiceRootMappings[0]);
  const [stats, setStats] = useState<PracticeStats>({
    totalAttempts: 0,
    correctAttempts: 0,
    streak: 0,
    maxStreak: 0,
    score: 0,
  });
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  const activeRoots = getRootsForMode(mode);

  // 获取弱项字根列表
  const weakRoots = Object.entries(persistData.wrongCountMap)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([char]) => char);

  // 生成下一个字根
  const nextRoot = useCallback(() => {
    setShowAnswer(false);
    setKeyFeedback(null);
    setFeedbackType(null);

    if (mode === 'sequential') {
      const idx = persistData.sequentialIndex % activeRoots.length;
      setCurrentRoot(activeRoots[idx]);
      return;
    }

    if (mode === 'weak' && weakRoots.length > 0) {
      const char = weakRoots[Math.floor(Math.random() * weakRoots.length)];
      const found = practiceRootMappings.find(r => r.char === char) ?? practiceRootMappings[0];
      setCurrentRoot(found);
      return;
    }

    if (mode === 'common') {
      setCurrentRoot(commonRootMappings[Math.floor(Math.random() * commonRootMappings.length)]);
      return;
    }

    setCurrentRoot(getRandomRoot());
  }, [mode, persistData.sequentialIndex, weakRoots, activeRoots]);

  // 开始练习
  const startPractice = useCallback(() => {
    setIsPlaying(true);
    setStats({
      totalAttempts: 0,
      correctAttempts: 0,
      streak: 0,
      maxStreak: 0,
      score: 0,
    });
    nextRoot();
  }, [nextRoot]);

  // 重置
  const resetPractice = useCallback(() => {
    setIsPlaying(false);
    setStats({ totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 });
    setKeyFeedback(null);
    setFeedbackType(null);
    setShowAnswer(false);
  }, []);

  // 清除本地存储
  const clearPersist = useCallback(() => {
    setPersistData(defaultPracticeData);
  }, [setPersistData]);

  // 保存到 localStorage
  const saveToPersist = useCallback(
    (
      isCorrect: boolean,
      rootChar: string,
      currentStreak: number,
      currentMaxStreak: number
    ) => {
      setPersistData((prev) => {
        const next: PracticePersistData = {
          stats: {
            totalAttempts: prev.stats.totalAttempts + 1,
            correctAttempts: prev.stats.correctAttempts + (isCorrect ? 1 : 0),
            maxStreak: Math.max(prev.stats.maxStreak, currentMaxStreak),
            totalScore: prev.stats.totalScore + (isCorrect ? 10 + Math.min(currentStreak, 10) : 0),
          },
          wrongCountMap: { ...prev.wrongCountMap },
          correctCountMap: { ...prev.correctCountMap },
          sequentialIndex:
            mode === 'sequential'
              ? prev.sequentialIndex + 1
              : prev.sequentialIndex,
          lastPracticeTime: Date.now(),
        };

        if (isCorrect) {
          next.correctCountMap[rootChar] = (prev.correctCountMap[rootChar] || 0) + 1;
          if (next.wrongCountMap[rootChar] && next.wrongCountMap[rootChar] > 0) {
            next.wrongCountMap[rootChar] = Math.max(0, prev.wrongCountMap[rootChar] - 1);
          }
        } else {
          next.wrongCountMap[rootChar] = (prev.wrongCountMap[rootChar] || 0) + 1;
        }

        return next;
      });
    },
    [mode, setPersistData]
  );

  // 处理键盘输入
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!isPlaying || keyFeedback) return;

      const isCorrect = key === currentRoot.key;
      setKeyFeedback(key);
      setFeedbackType(isCorrect ? 'correct' : 'wrong');
      setShowAnswer(true);

      if (isCorrect) {
        const newStreak = stats.streak + 1;
        const newMaxStreak = Math.max(stats.maxStreak, newStreak);
        setStats((prev) => ({
          totalAttempts: prev.totalAttempts + 1,
          correctAttempts: prev.correctAttempts + 1,
          streak: newStreak,
          maxStreak: newMaxStreak,
          score: prev.score + 10 + Math.min(newStreak, 10),
        }));
        saveToPersist(true, currentRoot.char, newStreak, newMaxStreak);
      } else {
        setStats((prev) => ({
          totalAttempts: prev.totalAttempts + 1,
          correctAttempts: prev.correctAttempts,
          streak: 0,
          maxStreak: prev.maxStreak,
          score: prev.score,
        }));
        saveToPersist(false, currentRoot.char, 0, stats.maxStreak);
      }

      feedbackTimer.current = setTimeout(() => {
        nextRoot();
      }, isCorrect ? 600 : 1200);
    },
    [isPlaying, keyFeedback, currentRoot, stats, nextRoot, saveToPersist]
  );

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        e.preventDefault();
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleKeyPress]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const accuracy = stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
    : 0;

  const totalAccuracy = persistData.stats.totalAttempts > 0
    ? Math.round((persistData.stats.correctAttempts / persistData.stats.totalAttempts) * 100)
    : 0;

  // 未开始时显示模式选择
  if (!isPlaying) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">v1.31版字根练习</h1>
          <p className="mt-2 sm:mt-3 text-muted-foreground">选择练习模式，开始训练</p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
          {(Object.entries(modeConfig) as [PracticeMode, typeof modeConfig.random][]).map(
            ([modeKey, config]) => {
              const Icon = config.icon;
              return (
                <Card
                  key={modeKey}
                  className={cn(
                    'cursor-pointer border-2 transition-all hover:shadow-lg',
                    mode === modeKey
                      ? 'border-primary bg-primary/5 shadow-lg'
                      : 'border-border bg-card hover:border-primary/30'
                  )}
                  onClick={() => setMode(modeKey)}
                >
                  <CardHeader className="text-center p-3 sm:p-6">
                    <Icon
                      className={cn(
                        'mx-auto mb-1 sm:mb-2 h-6 w-6 sm:h-10 sm:w-10',
                        mode === modeKey ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <CardTitle
                      className={cn(
                        'text-sm sm:text-lg',
                        mode === modeKey ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {config.label}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{config.description}</p>
                  </CardHeader>
                </Card>
              );
            }
          )}
        </div>

        {mode === 'weak' && weakRoots.length === 0 && (
          <div className="mt-4 sm:mt-6 text-center text-sm text-amber-600 dark:text-amber-400">
            弱项列表为空，请先进行随机练习以收集弱项数据
          </div>
        )}

        {mode === 'common' && (
          <div className="mt-4 sm:mt-6 text-center text-sm text-muted-foreground">
            常用字根模式：共 {commonRootMappings.length} 个字根（已去除有简体对应的繁体字根）
          </div>
        )}

        {/* 历史统计 */}
        {persistData.stats.totalAttempts > 0 && (
          <Card className="mt-6 sm:mt-8 border-border bg-card/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg text-foreground">历史学习记录</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearPersist} className="gap-1 text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">清除记录</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{persistData.stats.totalAttempts}</div>
                  <div className="text-xs text-muted-foreground">累计练习</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{totalAccuracy}%</div>
                  <div className="text-xs text-muted-foreground">历史正确率</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-amber-500">{persistData.stats.maxStreak}</div>
                  <div className="text-xs text-muted-foreground">历史最高连击</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{weakRoots.length}</div>
                  <div className="text-xs text-muted-foreground">待强化字根</div>
                </div>
              </div>
              {mode === 'sequential' && (
                <div className="mt-3 sm:mt-4 rounded-lg bg-primary/5 p-3 text-center text-sm text-muted-foreground">
                  顺序练习进度：{persistData.sequentialIndex} / {activeRoots.length}
                  {persistData.sequentialIndex >= activeRoots.length && '（已完成一轮）'}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 sm:mt-10 text-center">
          <Button
            size="lg"
            className="gap-2 bg-primary px-10 sm:px-12 text-base text-primary-foreground hover:bg-primary/90"
            onClick={startPractice}
          >
            <Play className="h-5 w-5" />
            开始练习
          </Button>
        </div>
      </div>
    );
  }

  // 练习中
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-8">
      {/* 顶部状态栏 */}
      <div className="mb-4 sm:mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="border-border text-muted-foreground text-xs sm:text-sm">
            {modeConfig[mode].label}
          </Badge>
          <Button variant="ghost" size="sm" onClick={resetPractice} className="gap-1 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            <span className="font-semibold text-foreground">{stats.score}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
            <span className="font-semibold text-foreground">{stats.streak}x</span>
          </div>
          <div className="text-muted-foreground">
            <span className="hidden sm:inline">正确率 </span>
            <span className="font-semibold text-foreground">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-6 sm:mb-8">
        <Progress value={accuracy} className="h-1.5 sm:h-2" />
      </div>

      {/* 字根展示区 */}
      <div className="mb-6 sm:mb-10 flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center rounded-3xl border-4 transition-all duration-300',
            feedbackType === 'correct'
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 scale-110'
              : feedbackType === 'wrong'
                ? 'border-red-400 bg-red-50 dark:bg-red-950/30 scale-95'
                : 'border-border bg-card',
            'h-28 w-28 sm:h-40 sm:w-40'
          )}
        >
          <RootCharDisplay
            root={currentRoot}
            size="xl"
            showDesc={true}
            className={cn(
              'border-0 bg-transparent',
              feedbackType === 'correct'
                ? 'text-emerald-600 dark:text-emerald-400'
                : feedbackType === 'wrong'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-foreground'
            )}
          />
        </div>

        {feedbackType && (
          <div
            className={cn(
              'mt-3 sm:mt-4 flex items-center gap-2 text-base sm:text-lg font-semibold',
              feedbackType === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {feedbackType === 'correct' ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                正确！
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                错误，正确键位：
                <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50 font-mono text-base sm:text-lg font-bold text-red-700 dark:text-red-300">
                  {currentRoot.key.toUpperCase()}
                </span>
              </>
            )}
          </div>
        )}

        {!feedbackType && (
          <p className="mt-3 sm:mt-4 text-muted-foreground text-sm sm:text-base">请按下对应的键位</p>
        )}
      </div>

      {/* 虚拟键盘 */}
      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-1.5" style={{ paddingLeft: `${rowIndex * 12}px` }}>
            {row.map((key) => {
              const isFeedback = keyFeedback === key;
              const isCorrectKey = key === currentRoot.key;
              let colorClass = KEY_COLORS.default;

              if (isFeedback && feedbackType === 'correct') {
                colorClass = KEY_COLORS.correct;
              } else if (isFeedback && feedbackType === 'wrong') {
                colorClass = KEY_COLORS.wrong;
              } else if (showAnswer && isCorrectKey && feedbackType === 'wrong') {
                colorClass = KEY_COLORS.highlight;
              }

              return (
                <button
                  key={key}
                  className={cn(
                    'flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl border-2 text-xs sm:text-base font-semibold transition-all duration-150 cursor-pointer select-none',
                    colorClass
                  )}
                  onClick={() => handleKeyPress(key)}
                >
                  {key.toUpperCase()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 sm:mt-10 grid grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: '本轮题数', value: stats.totalAttempts },
          { label: '本轮正确', value: stats.correctAttempts },
          { label: '本轮连击', value: stats.streak },
          { label: '弱项字根', value: weakRoots.length },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/80">
            <CardContent className="p-2 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-foreground">{item.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
