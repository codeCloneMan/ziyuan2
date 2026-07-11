import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { practiceRootMappings } from '@/data/roots';
import type { RootMapping } from '@/data/roots';
import type { PracticeLevel } from '@/types';
import { useCharCodeData } from '@/lib/data-loader';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import { usePracticeSession } from '@/hooks/use-practice-session';
import { useRootProgress, usePreferences, useDailyStats } from '@/store/progress-store';
import { PracticeKeyboard, StatsSidePanel, PracticeStatusBar, RootDisplayCard } from '@/components/practice';
import { Play, Sparkles, GraduationCap, Trash2 } from 'lucide-react';

const practiceStyleConfig: Record<PracticeLevel, { label: string; icon: typeof Sparkles; description: string }> = {
  beginner: { label: '入门', icon: Sparkles, description: '所有字根 · 科学循序渐进' },
  advanced: { label: '进阶', icon: GraduationCap, description: '所有字根 · 高速循环反馈' },
};

/** 所有可练习的字根 ID（入门和进阶都用全量） */
const allRootIds = practiceRootMappings.map(r => r.char);

/** 预建 char → RootMapping 索引，避免 nextRoot 中每次 .find() 做线性搜索 */
const rootByChar = new Map<string, RootMapping>();
practiceRootMappings.forEach(r => rootByChar.set(r.char, r));

const phoneticHintMap: Record<string, string> = {
  '高': 'Gāo → g', '古': 'Gǔ → g', '工': 'Gōng → g', '广': 'Guǎng → g',
  '己': 'Jǐ → j', '见': 'Jiàn → j', '金': 'Jīn → j', '斤': 'Jīn → j',
  '口': 'Kǒu → k', '可': 'Kě → k', '力': 'Lì → l', '立': 'Lì → l',
  '木': 'Mù → m', '目': 'Mù → m', '女': 'Nǚ → n', '日': 'Rì → r',
  '人': 'Rén → r', '山': 'Shān → sh/s', '水': 'Shuǐ → sh/s', '土': 'Tǔ → t',
  '王': 'Wáng → w', '月': 'Yuè → y', '大': 'Dà → d',
  '白': 'Bái → b', '贝': 'Bèi → b', '必': 'Bì → b', '寸': 'Cùn → c',
  '车': 'Chē → ch/c', '虫': 'Chóng → ch/c', '刀': 'Dāo → d', '东': 'Dōng → d',
  '耳': 'Ěr → e', '二': 'Èr → e', '方': 'Fāng → f', '风': 'Fēng → f',
  '火': 'Huǒ → h', '禾': 'Hé → h', '户': 'Hù → h', '井': 'Jǐng → j',
  '老': 'Lǎo → l', '门': 'Mén → m', '鸟': 'Niǎo → n', '皮': 'Pí → p',
  '七': 'Qī → q', '千': 'Qiān → q', '石': 'Shí → sh/s',
  '天': 'Tiān → t', '文': 'Wén → w', '心': 'Xīn → x', '小': 'Xiǎo → x',
  '言': 'Yán → y', '羊': 'Yáng → y', '走': 'Zǒu → z', '足': 'Zú → z',
};

/** 就地洗牌（Fisher-Yates），不分配新数组 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function PracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const { progress, recordAnswer } = useRootProgress();
  const { preferences, setPref } = usePreferences();
  const todayStats = useDailyStats();
  const practiceStyle: PracticeLevel = preferences.rootMode;
  const isBeginner = practiceStyle === 'beginner';

  // ============================================
  // 入门模式：间隔学习（艾宾浩斯算法）
  //     每次引入 5 个新字根，答对 3 次即掌握，
  //     答错高权重重复出现，掌握项根据遗忘曲线复习。
  // ============================================
  const poolKey = 'root:beginner';
  const spaced = useSpacedLearning({
    allItemIds: allRootIds,
    newItemsPerRound: 5,
    masteryThreshold: 3,
    reviewProbability: 0.1,
    storageKey: poolKey,
  });

  // ============================================
  // 进阶模式：高速循环
  //     所有字根洗牌后匀速轮转，不判断掌握/遗忘，
  //     答对答错都立即切入下一题，追求速度和广度。
  // ============================================
  const shuffleQueueRef = useRef<string[]>([]);
  const shuffleIndexRef = useRef(0);

  // 切题函数：根据模式选择不同的下一题策略
  // 注意：spaced.getNextItem 通过 ref 读取 pool，引用已永久稳定
  const nextRoot = useCallback(() => {
    setPhoneticHint(null);

    let nextChar: string | null = null;

    if (isBeginner) {
      nextChar = spaced.getNextItem();
    } else {
      shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
      nextChar = shuffleQueueRef.current[shuffleIndexRef.current];
    }

    if (nextChar) {
      setCurrentRoot(rootByChar.get(nextChar) ?? practiceRootMappings[0]);
    }
  }, [isBeginner]); // spaced.getNextItem 稳定，无需依赖

  // ============================================
  // 答错处理策略：
  //   入门+进阶：答错都切下一题，不卡在同一题上。
  //   答错后延长反馈时间（入门2.5s/进阶1.5s），给用户消化正确答案。
  //   反馈期间所有键盘输入被阻止，不会误操作。
  // ============================================
  const session = usePracticeSession(useMemo(() => ({
    correctClearDelay: isBeginner ? 400 : 200,
    wrongClearDelay: isBeginner ? 2500 : 1500,
    onCorrect: nextRoot,
    onWrong: nextRoot,
  }), [isBeginner])); // nextRoot 引用稳定，仅 isBeginner 变化时重建

  const { isPlaying, start, stop, reset, submit, keyFeedback, feedbackType, stats, accuracy } = session;

  const [currentRoot, setCurrentRoot] = useState<RootMapping>(practiceRootMappings[0]);
  const [firstTimeHint, setFirstTimeHint] = useState<string | null>(null);
  const [phoneticHint, setPhoneticHint] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const showHint = preferences.showHint;

  // 统计已掌握字根数（入门模式用间隔学习池的真实 mastered 数）
  const masteredCount = useMemo(() => {
    return isBeginner ? spaced.stats.mastered : 0;
  }, [isBeginner, spaced.stats.mastered]);

  const weakestRoots = useMemo(() => {
    return practiceRootMappings
      .map(r => ({
        char: r.char,
        key: r.key,
        wrong: progress.wrongCountMap[r.char] || 0,
        correct: progress.correctCountMap[r.char] || 0,
      }))
      .filter(r => r.wrong > 0)
      .sort((a, b) => {
        const rateA = a.correct / Math.max(a.correct + a.wrong, 1);
        const rateB = b.correct / Math.max(b.correct + b.wrong, 1);
        return rateA - rateB;
      })
      .slice(0, 10);
  }, [progress.totalAttempts]); // 仅在答题次数变化时重算，避免每次 map 对象引用变化都触发

  // ============================================
  // 练习生命周期
  // ============================================

  const startPractice = useCallback(() => {
    if (isBeginner) {
      // 入门：重置间隔学习池（从头开始循序渐进）
      spaced.resetProgress();
    } else {
      // 进阶：所有字根洗牌，从第 0 个开始高速循环
      shuffleQueueRef.current = shuffleInPlace([...allRootIds]);
      shuffleIndexRef.current = -1; // nextRoot 首次调用会 +1 → 0
    }
    reset();
    start();
  }, [isBeginner, spaced, reset, start]);

  const stopPractice = useCallback(() => {
    stop();
    setFirstTimeHint(null);
    setPhoneticHint(null);
  }, [stop]);

  const clearProgress = useCallback(() => {
    if (confirm('确定要清除当前模式的练习记录吗？')) {
      if (isBeginner) spaced.resetProgress();
      stop();
      reset();
    }
  }, [isBeginner, spaced, stop, reset]);

  // 开始练习时生成首题
  useEffect(() => {
    if (isPlaying) nextRoot();
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // 新字根首次出现时，显示答案提示（仅入门模式）
  useEffect(() => {
    if (showHint && isPlaying && !feedbackType) {
      const seenCount = progress.correctCountMap[currentRoot.char] || 0;
      if (seenCount === 0) {
        setFirstTimeHint(`答案是 ${currentRoot.key.toUpperCase()}`);
        const timer = setTimeout(() => setFirstTimeHint(null), 3000);
        return () => clearTimeout(timer);
      }
    }
    setFirstTimeHint(null);
  }, [currentRoot.char, currentRoot.key, isPlaying, showHint, feedbackType, progress.correctCountMap]);

  // ============================================
  // 键盘交互
  // ============================================

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType) return;

    const isCorrect = key === currentRoot.key;

    // 答错时显示音托提示
    if (!isCorrect) {
      const phonetic = phoneticHintMap[currentRoot.char];
      if (phonetic) setPhoneticHint(phonetic);
    }

    // 持久化进度
    recordAnswer(currentRoot.char, isCorrect);

    // 入门模式：同步更新间隔学习池（recordResult 引用稳定）
    if (isBeginner) {
      spaced.recordResult(currentRoot.char, isCorrect);
    }

    // 交由统一状态机处理反馈着色、计分与切题
    submit(isCorrect, key);
  }, [isPlaying, feedbackType, currentRoot, recordAnswer, isBeginner, submit]);
  // spaced.recordResult 和 submit 引用已稳定，无需额外依赖

  // 全局键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === 'Escape') { stopPractice(); return; }
      if (e.key === ' ') { e.preventDefault(); setPref('showHint', !showHint); return; }
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        e.preventDefault();
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleKeyPress, stopPractice, showHint, setPref]);

  useEffect(() => {
    if (isPlaying && inputRef.current) inputRef.current.focus();
  }, [isPlaying, currentRoot]);

  // ============================================
  // 渲染
  // ============================================

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

  const totalRoots = allRootIds.length;

  // ============ 非练习态：首页 ============
  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-background">
        <section className="py-12 sm:py-20 lg:py-28">
          <div className="container-page text-center max-w-xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              字根<span className="text-gradient-primary">练习</span>
            </h1>
            <p className="text-muted-foreground mb-10">
              {isBeginner
                ? '每次引入 5 个新字根，答对 3 次即掌握，遗忘自动复习'
                : '全部字根高速轮转，答对答错都秒切下一题'
              }
            </p>

            <Button size="lg" onClick={startPractice} className="btn-primary text-lg px-12 py-4 mb-6">
              <Play className="h-5 w-5 mr-2" />开始练习
            </Button>

            {isBeginner && masteredCount > 0 && (
              <div className="card-base p-4 text-left max-w-sm mx-auto mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">已掌握字根</span>
                  <span className="font-bold font-mono-stat">{masteredCount}/{totalRoots}</span>
                </div>
                <div className="progress-base">
                  <div className="progress-bar-animated bg-primary" style={{ width: `${Math.round((masteredCount / totalRoots) * 100)}%` }} />
                </div>
              </div>
            )}

            {!isBeginner && (
              <p className="text-xs text-muted-foreground mb-8">
                {totalRoots} 个字根随机洗牌高速轮转 · 今日已练 {todayStats.attempts} 题
              </p>
            )}

            <details className="text-left max-w-sm mx-auto">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-center">
                练习模式与设置
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-foreground mb-2">练习方式</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(practiceStyleConfig) as [PracticeLevel, typeof practiceStyleConfig.beginner][]).map(([key, config]) => {
                      const Icon = config.icon;
                      const isActive = practiceStyle === key;
                      return (
                        <button key={key} onClick={() => setPref('rootMode', key)}
                          className={cn('p-3 rounded-lg border text-left text-xs transition-all',
                            isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/50 hover:border-primary/30')}>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            <span className={cn('font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{config.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">新字根自动显示答案提示</span>
                  <button onClick={() => setPref('showHint', !showHint)}
                    className={cn('w-9 h-5 rounded-full transition-colors relative',
                      showHint ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      showHint ? 'left-[18px]' : 'left-0.5')} />
                  </button>
                </div>

                {(progress.totalAttempts > 0 || stats.totalAttempts > 0) && (
                  <Button variant="ghost" size="sm" onClick={clearProgress} className="w-full gap-1.5 text-xs text-red-400 hover:text-red-600">
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

  // ============ 练习态 ============
  return (
    <div className="min-h-screen bg-background">
      <PracticeStatusBar
        modeLabel={practiceStyleConfig[practiceStyle].label}
        stageModeLabel=""
        stats={stats}
        accuracy={accuracy}
        masteredCount={masteredCount}
        totalRootsCount={totalRoots}
        todayAttempts={todayStats.attempts}
        showHint={showHint}
        isSpeedMode={!isBeginner}
        onStop={stopPractice}
        onToggleHint={() => setPref('showHint', !showHint)}
      />

      <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">
            <RootDisplayCard
              currentRoot={currentRoot}
              keyFeedback={keyFeedback}
              feedbackType={feedbackType}
              showHint={showHint}
              firstTimeHint={firstTimeHint}
              phoneticHint={phoneticHint}
              inputRef={inputRef}
            />

            <PracticeKeyboard
              mode="roots"
              currentRoot={currentRoot}
              keyFeedback={keyFeedback}
              feedbackType={feedbackType}
              isPlaying={isPlaying}
              correctCountMap={progress.correctCountMap}
              onKeyPress={handleKeyPress}
            />
          </div>

          <StatsSidePanel
            stats={stats}
            weakRootsCount={weakestRoots.length}
            todayStats={todayStats}
            masteredCount={masteredCount}
            totalRootsCount={totalRoots}
            weakestRoots={weakestRoots}
          />
        </div>
      </div>
    </div>
  );
}
