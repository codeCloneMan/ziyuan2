import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROOT_IMAGE_POOL, allImageIds, type RootImage } from '@/data/root-images';
import { ROOT_IMAGE_MANIFEST, rootMappings } from '@/data/roots';
import type { PracticeLevel } from '@/types';
import { useCharCodeData } from '@/lib/data-loader';
import { calcMasteredRootCount } from '@/lib/mastered-count';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import { usePracticeSession } from '@/hooks/use-practice-session';
import { usePracticeRound } from '@/hooks/use-practice-round';
import { useRootProgress, usePreferences, useDailyStats } from '@/store/progress-store';
import { PracticeKeyboard, StatsSidePanel, PracticeStatusBar, RootDisplayCard, RoundCompleteToast } from '@/components/practice';
import { Play, Sparkles, GraduationCap, Trash2, Trophy, CheckCircle2, Target } from 'lucide-react';

const practiceStyleConfig: Record<PracticeLevel, { label: string; icon: typeof Sparkles; description: string }> = {
  beginner: { label: '入门', icon: Sparkles, description: '所有字根图 · 科学循序渐进' },
  advanced: { label: '进阶', icon: GraduationCap, description: '所有字根图 · 高速循环反馈' },
};

/**
 * 练习题库 = 官方图集（390 张字根图）。
 * 练习单元是一张图，答案键位 = 文件名首字母（官方命名规则），
 * 统计（correctCountMap/wrongCountMap）也以图片文件名为键。
 */
const allRootIds = allImageIds;

/** file → 题目索引 */
const imageById = new Map<string, RootImage>(ROOT_IMAGE_POOL.map(i => [i.file, i]));

/** file → 码表字根（仅部分图能对应上；用于答错后的音托提示） */
const rootByFile = (() => {
  const map = new Map<string, string>();
  for (const [cpHex, file] of Object.entries(ROOT_IMAGE_MANIFEST)) {
    const root = rootMappings.find(r => r.codePoint === Number(cpHex));
    if (root && !map.has(file)) map.set(file, root.char);
  }
  return map;
})();

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
  const { progress, recordAnswer, reset: resetRootProgress } = useRootProgress();
  const { preferences, setPref } = usePreferences();
  const todayStats = useDailyStats();
  const practiceStyle: PracticeLevel = preferences.rootMode;
  const isBeginner = practiceStyle === 'beginner';

  // 轮次记录：一轮 = 390 张图每张都答过至少一次；答完自动重开下一轮
  const roundKey = `root:${practiceStyle}`;
  const { completedRounds, seenCount: roundSeen, markSeen, resetRound } = usePracticeRound(roundKey, allRootIds.length);

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
  // 解构稳定引用：spaced 对象每次渲染新建，但 getNextItem/recordResult/resetProgress 引用永久稳定，
  // 直接使用 spaced 会导致 useCallback 依赖每次渲染变化（memoization 失效）
  const spacedGetNextItem = spaced.getNextItem;
  const spacedRecordResult = spaced.recordResult;
  const spacedResetProgress = spaced.resetProgress;

  // ============================================
  // UI 状态（先声明，避免下方 nextRoot / usePracticeSession 引用未初始化变量）
  // ============================================
  const [currentImage, setCurrentImage] = useState<RootImage>(ROOT_IMAGE_POOL[0]);
  const [firstTimeHint, setFirstTimeHint] = useState<string | null>(null);
  const [phoneticHint, setPhoneticHint] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [roundToast, setRoundToast] = useState<number | null>(null);
  // 重新练习时 isPlaying 可能已是 true（完成弹窗内），setState 相同值会被 React bail out，
  // 不会触发下方首题 effect；用 nonce 强制 effect 重跑
  const [restartNonce, setRestartNonce] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  // 用户是否正在使用原生输入框（软键盘）：仅在此时切题后保持 focus，
  // 避免 Android 上每次切题强制 focus 导致软键盘反复弹出、遮挡虚拟键盘
  const nativeInputActiveRef = useRef(false);

  // 用 ref 持有最新 currentImage，避免 usePracticeSession 的 onWrong 闭包
  // 把 currentImage.file 放入 deps 导致 session 频繁重建（每次切题都会重建）
  const currentRootRef = useRef<RootImage>(currentImage);
  useEffect(() => {
    currentRootRef.current = currentImage;
  });

  // ============================================
  // 进阶模式：高速循环
  //     所有字根洗牌后匀速轮转，不判断掌握/遗忘，
  //     答对答错都立即切入下一题，追求速度和广度。
  // ============================================
  const shuffleQueueRef = useRef<string[]>([]);
  const shuffleIndexRef = useRef(0);
  // 进阶模式错题重练队列：答错的图在 3 步后重新出现
  const wrongQueueRef = useRef<{ id: string; step: number }[]>([]);

  // 切题函数：根据模式选择不同的下一题策略
  // 注意：spaced.getNextItem 通过 ref 读取 pool，引用已永久稳定
  // 完成判定用会话内池掌握数（masteredPool），不再依赖累计 correctCountMap：
  // 累计进度保留（首页/成就数据源不清零），但每轮练习从空池重新循序渐进
  const nextRoot = useCallback(() => {
    setPhoneticHint(null);

    // 检查本次会话池是否已全部掌握（入门模式；进阶模式无完成判定）
    if (isBeginner && spaced.pool.masteredPool.length === allRootIds.length) {
      setShowCompletionModal(true);
      return;
    }

    let nextId: string | null = null;

    if (isBeginner) {
      nextId = spacedGetNextItem();
    } else {
      // 优先取错题（已隔 ≥3 步）
      wrongQueueRef.current = wrongQueueRef.current.map(w => ({ ...w, step: w.step + 1 }));
      const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
      if (dueWrong) {
        wrongQueueRef.current = wrongQueueRef.current.filter(w => w !== dueWrong);
        nextId = dueWrong.id;
      } else {
        shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
        // 回绕到 0 时重新洗牌，避免每轮顺序相同导致强行记忆
        if (shuffleIndexRef.current === 0) {
          shuffleQueueRef.current = shuffleInPlace([...shuffleQueueRef.current]);
        }
        nextId = shuffleQueueRef.current[shuffleIndexRef.current];
      }
    }

    if (nextId) {
      setCurrentImage(imageById.get(nextId) ?? ROOT_IMAGE_POOL[0]);
    }
  }, [isBeginner, spacedGetNextItem, spaced.pool]); // spacedGetNextItem/pool 均稳定，仅池变化时重建

  // ============================================
  // 答错处理策略：
  //   入门+进阶：答错都切下一题，不卡在同一题上。
  //   答错后延长反馈时间（入门2.5s/进阶1.5s），给用户消化正确答案。
  //   反馈期间所有键盘输入被阻止，不会误操作。
  //   进阶模式：答错的字根加入错题重练队列，3 步后重新出现。
  // ============================================
  const session = usePracticeSession(useMemo(() => ({
    correctClearDelay: isBeginner ? 400 : 200,
    wrongClearDelay: isBeginner ? 2500 : 1500,
    onCorrect: nextRoot,
    onWrong: () => {
      // 通过 ref 读取最新 currentImage，避免闭包捕获 + 避免把 currentImage.file 放入 deps
      if (!isBeginner && currentRootRef.current.file) {
        wrongQueueRef.current.push({ id: currentRootRef.current.file, step: 0 });
      }
      nextRoot();
    },
  }), [isBeginner, nextRoot])); // nextRoot 引用稳定，仅 isBeginner 变化时重建

  const { isPlaying, start, stop, reset, submit, keyFeedback, feedbackType, stats, accuracy } = session;

  const showHint = preferences.showHint;

  // 统计已掌握字根数：
  //   按累计答对 ≥3 次统计（与首页进度/成就/键盘淡化同一口径）。
  //   只统计当前练习池内的字根——correctCountMap 是永久累计的，
  //   会残留早已移出练习池的字根（如扩展区字根调整前练过的），
  //   不剔除会让"已掌握"虚高、甚至超过池总数。
  const masteredCount = useMemo(
    () => calcMasteredRootCount(progress.correctCountMap, allRootIds),
    [progress.correctCountMap],
  );

  // 已练习字根数（至少答过一次，对或错都算）——让用户区分"练过多少"与"掌握多少"。
  // 同样只统计当前池内字根，历史残留不计。
  const practicedCount = useMemo(() => {
    const pool = new Set(allRootIds);
    const seen = new Set<string>();
    for (const c of Object.keys(progress.correctCountMap)) if (pool.has(c)) seen.add(c);
    for (const c of Object.keys(progress.wrongCountMap)) if (pool.has(c)) seen.add(c);
    return seen.size;
  }, [progress.correctCountMap, progress.wrongCountMap]);

  // 弱项字根图完整列表（按正确率升序），weakRootsCount 取总数
  const weakRootsAll = useMemo(() => {
    return ROOT_IMAGE_POOL
      .map(img => ({
        file: img.file,
        key: img.key,
        wrong: progress.wrongCountMap[img.file] || 0,
        correct: progress.correctCountMap[img.file] || 0,
      }))
      .filter(r => r.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || (a.correct / Math.max(a.correct + a.wrong, 1)) - (b.correct / Math.max(b.correct + b.wrong, 1)));
  }, [progress]); // 依赖整个 progress 对象，满足 lint 且答题时正确重算

  // 展示用：仅前 10 个最弱
  const weakestRoots = useMemo(() => weakRootsAll.slice(0, 10), [weakRootsAll]);

  // ============================================
  // 练习生命周期
  // ============================================

  const startPractice = useCallback(() => {
    // 只重置间隔学习池（会话从空池重新循序渐进），不清累计进度：
    // 首页进度/成就/键盘淡化均以累计 correctCountMap 为数据源，清空会导致数据归零
    if (isBeginner) {
      // 入门：重置间隔学习池（从头开始循序渐进）
      spacedResetProgress();
    } else {
      // 进阶：所有字根洗牌，从第 0 个开始高速循环
      shuffleQueueRef.current = shuffleInPlace([...allRootIds]);
      shuffleIndexRef.current = -1; // nextRoot 首次调用会 +1 → 0
      // 清空上一轮遗留的错题队列，避免新练习开头插入旧错题
      wrongQueueRef.current = [];
    }
    reset();
    // 新一轮练习：本轮已答集合清零（已完成轮数是持久记录，保留）
    resetRound();
    start();
    // 强制首题 effect 重跑（isPlaying 可能已是 true，start() 不触发重渲染）
    setRestartNonce(n => n + 1);
    // 首题由下方 useEffect 在渲染后生成：startPractice 内同步调用 nextRoot 会读到
    // 本次渲染的旧池（dispatch 后 store 状态在事件处理器内不更新），
    // 上一轮全部掌握时会导致立即重弹完成弹窗、无法重开练习。
  }, [isBeginner, reset, resetRound, start, spacedResetProgress]);

  const stopPractice = useCallback(() => {
    stop();
    setFirstTimeHint(null);
    setPhoneticHint(null);
  }, [stop]);

  const clearProgress = useCallback(() => {
    if (confirm('确定要清除当前模式的练习记录吗？')) {
      resetRootProgress();
      if (isBeginner) spacedResetProgress();
      stop();
      reset();
    }
  }, [isBeginner, stop, reset, resetRootProgress, spacedResetProgress]);

  // 开始练习后生成首题：必须在 SPACED_RESET dispatch 生效、组件重渲染（池已重置）后执行，
  // 否则 nextRoot 的完成判定（spaced.pool.masteredPool）读到的还是旧池
  useEffect(() => {
    if (isPlaying) nextRoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 首题生成依赖 store 重渲染后的池状态，由 restartNonce 控制重触发
  }, [isPlaying, restartNonce]);

  // 新图首次出现时，显示答案提示（仅入门模式）
  useEffect(() => {
    if (showHint && isPlaying && !feedbackType) {
      const seenCount = progress.correctCountMap[currentImage.file] || 0;
      if (seenCount === 0) {
        setFirstTimeHint(`答案是 ${currentImage.key.toUpperCase()}`);
        const timer = setTimeout(() => setFirstTimeHint(null), 3000);
        return () => clearTimeout(timer);
      }
    }
    setFirstTimeHint(null);
  }, [currentImage.file, currentImage.key, isPlaying, showHint, feedbackType, progress.correctCountMap]);

  // ============================================
  // 键盘交互
  // ============================================

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType) return;

    const current = currentRootRef.current;
    const isCorrect = key === current.key;

    // 答错时显示音托提示（仅当该图能对应到码表字根）
    if (!isCorrect) {
      const hintChar = rootByFile.get(current.file);
      const phonetic = hintChar ? phoneticHintMap[hintChar] : undefined;
      if (phonetic) setPhoneticHint(phonetic);
    }

    // 持久化进度（以图片文件名为键）
    recordAnswer(current.file, isCorrect);

    // 入门模式：同步更新间隔学习池（recordResult 引用稳定）
    if (isBeginner) {
      spacedRecordResult(current.file, isCorrect);
    }

    // 轮次：答完池内最后一张图即完成一轮 —— 记录轮次、本轮统计归零，
    // 下一题自动进入新一轮（不弹窗、不中断）。先 reset 再 submit，
    // 让这最后一题的作答计入新一轮而不是丢掉。
    const roundDone = markSeen(current.file);
    if (roundDone) {
      reset();
      setRoundToast(completedRounds + 1);
    }

    // 交由统一状态机处理反馈着色、计分与切题
    submit(isCorrect, key);
  }, [isPlaying, feedbackType, recordAnswer, isBeginner, submit, spacedRecordResult, markSeen, reset, completedRounds]);

  // 全局键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      // 中文输入法组合期间不提交（isComposing 为主，keyCode 229 为 WebView 纵深防御）
      if (e.isComposing || e.keyCode === 229) return;
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
    // 仅当用户在用原生输入（软键盘）时，切题后保持焦点；
    // 虚拟键盘用户不被强制弹软键盘
    if (isPlaying && inputRef.current && nativeInputActiveRef.current) {
      inputRef.current.focus();
    }
  }, [isPlaying, currentImage]);

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
      <div className="min-h-screen bg-background bg-mesh">
        <section className="container-page py-10 sm:py-16">
          <div className="max-w-4xl mx-auto">
            <header className="text-center mb-8 sm:mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                字根<span className="text-gradient-primary">练习</span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                {isBeginner
                  ? '每次引入 5 张新字根图，答对 3 次即掌握，遗忘自动复习'
                  : '全部字根图高速轮转，答对答错都秒切下一题'
                }
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
              {/* 左：开始 + 进度 */}
              <div className="lg:col-span-3 card-base !rounded-2xl p-6 sm:p-8 flex flex-col">
                <div className="flex-1 flex items-center justify-center py-2 mb-6">
                  <button
                    onClick={startPractice}
                    className="group inline-flex items-center gap-3 rounded-2xl bg-primary text-primary-foreground px-10 py-4 text-lg font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                    开始练习
                  </button>
                </div>

                {!isBeginner && (
                  <p className="text-center text-xs text-muted-foreground/70 mb-4">
                    {totalRoots} 张字根图随机洗牌高速轮转 · 今日已练 {todayStats.attempts} 题
                  </p>
                )}

                {(masteredCount > 0 || practicedCount > 0) && (
                  <div className={cn(
                    "rounded-xl border p-4 text-left",
                    masteredCount === totalRoots
                      ? "border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                      : "border-border/60 bg-muted/20"
                  )}>
                    <div className="flex justify-between items-center text-sm mb-2">
                      {masteredCount === totalRoots ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Trophy className="h-4 w-4" />已全部掌握
                        </span>
                      ) : (
                        <span className="text-muted-foreground">已掌握字根</span>
                      )}
                      <span className="font-bold font-mono-stat">{masteredCount}/{totalRoots}</span>
                    </div>
                    <div className="progress-base relative overflow-hidden">
                      <div className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        masteredCount === totalRoots ? "bg-emerald-500/30"
                          : practicedCount >= totalRoots ? "bg-amber-500/25"
                          : "bg-primary/20"
                      )} style={{ width: `${Math.min(100, Math.round((practicedCount / totalRoots) * 100))}%` }} />
                      <div className={cn(
                        "progress-bar-animated transition-colors relative",
                        masteredCount === totalRoots ? "bg-emerald-500" : "bg-primary"
                      )} style={{ width: `${Math.round((masteredCount / totalRoots) * 100)}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/60">
                      <span>已练习 {practicedCount}/{totalRoots}</span>
                      {masteredCount === totalRoots && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">全部掌握</span>
                      )}
                    </div>
                    {masteredCount === totalRoots && (
                      <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>太棒了！你已经掌握了所有字根</span>
                      </div>
                    )}
                  </div>
                )}

                {completedRounds > 0 && (
                  <p className="mt-3 text-center text-[11px] text-muted-foreground/60">
                    已完成 <span className="font-mono-stat font-semibold text-foreground/70">{completedRounds}</span> 轮
                    <span className="text-muted-foreground/40">（每轮 {totalRoots} 张图各答一次）</span>
                  </p>
                )}
              </div>

              {/* 右：模式与设置 */}
              <div className="lg:col-span-2 card-base !rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 font-serif">练习方式</h2>
                <div className="space-y-2 mb-5">
                  {(Object.entries(practiceStyleConfig) as [PracticeLevel, typeof practiceStyleConfig.beginner][]).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = practiceStyle === key;
                    return (
                      <button key={key} onClick={() => setPref('rootMode', key)}
                        className={cn('w-full p-3.5 rounded-xl border text-left transition-all duration-200',
                          isActive
                            ? 'border-primary/40 bg-primary/[0.05] shadow-sm'
                            : 'border-border/50 hover:border-primary/25 hover:bg-primary/[0.02]')}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                          <span className={cn('text-sm font-semibold font-serif', isActive ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</span>
                          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground/70">{config.description}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 mb-4">
                  <span className="text-xs text-muted-foreground">新字根自动显示答案提示</span>
                  <button onClick={() => setPref('showHint', !showHint)} aria-label="切换答案提示"
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
            </div>
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
        practicedCount={practicedCount}
        totalRootsCount={totalRoots}
        todayAttempts={todayStats.attempts}
        cumulativeAttempts={progress.totalAttempts}
        cumulativeAccuracy={progress.totalAttempts > 0 ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100) : undefined}
        completedRounds={completedRounds}
        roundSeen={roundSeen}
        roundTotal={totalRoots}
        showHint={showHint}
        isSpeedMode={!isBeginner}
        onStop={stopPractice}
        onToggleHint={() => setPref('showHint', !showHint)}
      />

      <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">
            <RootDisplayCard
              imageFile={currentImage.file}
              answerKey={currentImage.key}
              hintChar={rootByFile.get(currentImage.file)}
              keyFeedback={keyFeedback}
              feedbackType={feedbackType}
              showHint={showHint}
              firstTimeHint={firstTimeHint}
              phoneticHint={phoneticHint}
              inputRef={inputRef}
              onNativeInput={handleKeyPress}
              onNativeFocusChange={(f) => { nativeInputActiveRef.current = f; }}
            />

            <PracticeKeyboard
              mode="roots"
              answerKey={currentImage.key}
              currentRootChar={rootByFile.get(currentImage.file)}
              keyFeedback={keyFeedback}
              feedbackType={feedbackType}
              isPlaying={isPlaying}
              correctCountMap={progress.correctCountMap}
              onKeyPress={handleKeyPress}
            />
          </div>

          <StatsSidePanel
            stats={stats}
            todayStats={todayStats}
            masteredCount={masteredCount}
            totalRootsCount={totalRoots}
            weakestRoots={weakestRoots}
            cumulative={{ attempts: progress.totalAttempts, correct: progress.totalCorrect }}
            completedRounds={completedRounds}
            roundSeen={roundSeen}
            roundTotal={totalRoots}
          />
        </div>
      </div>

      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />

      {/* 进度完成弹窗 */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card-base p-8 max-w-sm w-full mx-4 text-center animate-fade-in">
            <div className={cn(
              "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
              masteredCount === totalRoots ? "bg-emerald-100 dark:bg-emerald-950/50" : "bg-amber-100 dark:bg-amber-950/50"
            )}>
              {masteredCount === totalRoots ? (
                <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Target className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {masteredCount === totalRoots ? "恭喜完成！🎉" : "练习完成！"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {masteredCount === totalRoots
                ? "你已经掌握了所有字根！"
                : `你已经练习完所有 ${totalRoots} 张字根图，已掌握 ${masteredCount} 张。继续加油！`}
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
                {masteredCount === totalRoots ? "重新练习" : "继续练习"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
