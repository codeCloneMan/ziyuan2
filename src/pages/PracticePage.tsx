import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { practiceRootMappings, commonRootMappings, keyboardRows, renderableKeyGroups, PUA_ROOTS } from '@/data/roots';
import type { RootMapping } from '@/data/roots';
import type { PracticeMode, PracticeStats } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import { useCharCodeData, type CharCodeItem } from '@/lib/data-loader';
import RootCharDisplay from '@/components/RootCharDisplay';
import { Play, RotateCcw, Zap, BookOpen, Trophy, CheckCircle2, XCircle, Trash2, GraduationCap, Target, AlertTriangle, Lightbulb, Eye, EyeOff, BarChart3, Timer, ChevronDown, ChevronUp, Keyboard, Star, Flame, Sparkles } from 'lucide-react';

// ====== 模式配置 ======
const modeConfig: Record<PracticeMode, { label: string; icon: typeof Zap; description: string }> = {
  progressive: { label: '渐进学习', icon: GraduationCap, description: '科学记忆，逐步掌握全部字根' },
  weak: { label: '错题回顾', icon: Zap, description: '针对错题，查漏补缺' },
  common: { label: '简体练习', icon: BookOpen, description: '科学记忆，逐步掌握简体字根' },
};
const MODES: PracticeMode[] = ['progressive', 'weak', 'common'];
const allRootIds = practiceRootMappings.map(r => r.char);
const commonRootIds = commonRootMappings.map(r => r.char);

// ====== 分阶段模式 ======
type StageMode = 'beginner' | 'progressive' | 'fullcode' | 'weak' | 'speed';
const stageModeConfig: Record<StageMode, { label: string; icon: typeof Zap; description: string; color: string }> = {
  beginner: { label: '入门模式', icon: Sparkles, description: '每次5个新字根，全部掌握后再加入', color: 'text-emerald-500' },
  progressive: { label: '渐进模式', icon: GraduationCap, description: '按难度递增，先练高频字根', color: 'text-blue-500' },
  fullcode: { label: '全码模式', icon: Keyboard, description: '所有字根随机出题', color: 'text-purple-500' },
  weak: { label: '弱项攻坚', icon: Target, description: '专门练习错误率最高的字根', color: 'text-amber-500' },
  speed: { label: '速度挑战', icon: Timer, description: '限时答题，追求速度和连击', color: 'text-red-500' },
};

// ====== 键盘显示模式 ======
type KeyboardDisplayMode = 'roots' | 'codes' | 'blank';

// ====== 音托数据：字根读音与键位关系 ======
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

// ====== 从 charCodeData 中提取字根例字（延迟计算） ======
function getExampleCharsForRoot(rootChar: string, charCodeData: CharCodeItem[], maxCount: number = 3): { char: string; code: string }[] {
  const results: { char: string; code: string }[] = [];
  const seen = new Set<string>();
  for (const item of charCodeData) {
    if (results.length >= maxCount) break;
    if (seen.has(item.char)) continue;
    if (item.char.includes(rootChar) || item.code.includes(rootChar)) {
      seen.add(item.char);
      results.push(item);
    }
  }
  return results;
}

// ====== 获取字根在键盘上的所有字根 ======
function getRootsOnKey(key: string): RootMapping[] {
  return practiceRootMappings.filter(r => r.key === key);
}

// ====== 持久化数据结构 ======
interface ModePersistData {
  isPlaying: boolean;
  currentRootChar: string;
  stats: PracticeStats;
  wrongCountMap: Record<string, number>;
  correctCountMap: Record<string, number>;
  totalStats: { totalAttempts: number; correctAttempts: number; maxStreak: number; totalScore: number; };
  lastPracticeTime: number;
  // 新增：艾宾浩斯追踪
  rootTimingMap: Record<string, { lastTime: number; avgTime: number; count: number }>;
  // 新增：紧急复习队列
  urgentReviewQueue: string[];
  // 新增：首次出现标记
  firstSeenMap: Record<string, boolean>;
  // 新增：每日统计
  dailyStats: Record<string, { attempts: number; correct: number; score: number }>;
  // 新增：分阶段模式
  stageMode: StageMode;
  // 新增：积分
  totalPoints: number;
}

const defaultModePersist: ModePersistData = {
  isPlaying: false,
  currentRootChar: practiceRootMappings[0].char,
  stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
  wrongCountMap: {}, correctCountMap: {},
  totalStats: { totalAttempts: 0, correctAttempts: 0, maxStreak: 0, totalScore: 0 },
  lastPracticeTime: 0,
  rootTimingMap: {},
  urgentReviewQueue: [],
  firstSeenMap: {},
  dailyStats: {},
  stageMode: 'beginner',
  totalPoints: 0,
};

const KEY_COLORS: Record<string, string> = {
  correct: 'bg-emerald-500 text-white border-emerald-600',
  wrong: 'bg-red-500 text-white border-red-600',
  highlight: 'bg-amber-400 text-white border-amber-500 animate-pulse',
  default: 'bg-card text-foreground border-border hover:bg-accent/10',
};

function getRootsForMode(mode: PracticeMode): RootMapping[] {
  return mode === 'common' ? commonRootMappings : practiceRootMappings;
}

const CURRENT_MODE_KEY = 'ziyuan-practice-current-mode';

// ====== 获取今日日期字符串 ======
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export default function PracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();

  const [mode, setMode] = useState<PracticeMode>(() => {
    const saved = localStorage.getItem(CURRENT_MODE_KEY);
    if (saved === 'progressive' || saved === 'weak' || saved === 'common') return saved;
    return 'progressive';
  });
  const [modeData, setModeData] = useLocalStorage<Record<PracticeMode, ModePersistData>>(
    'ziyuan-practice-modes-v4',
    { progressive: defaultModePersist, weak: defaultModePersist, common: defaultModePersist }
  );
  const safeModeData: Record<PracticeMode, ModePersistData> = {
    progressive: modeData.progressive ?? defaultModePersist,
    weak: modeData.weak ?? defaultModePersist,
    common: modeData.common ?? defaultModePersist,
  };
  const currentData = safeModeData[mode];

  useEffect(() => { localStorage.setItem(CURRENT_MODE_KEY, mode); }, [mode]);

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
  const answerStartTime = useRef<number>(Date.now());

  // ====== 新增状态 ======
  const [keyboardDisplayMode, setKeyboardDisplayMode] = useState<KeyboardDisplayMode>('roots');
  const [selectedKeyInfo, setSelectedKeyInfo] = useState<string | null>(null);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [firstTimeHint, setFirstTimeHint] = useState<string | null>(null);
  const [firstTimeHintTimer, setFirstTimeHintTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showExampleChars, setShowExampleChars] = useState(false);
  const [phoneticHint, setPhoneticHint] = useState<string | null>(null);
  const [stageMode, setStageMode] = useState<StageMode>(currentData.stageMode || 'beginner');
  const [speedModeTimer, setSpeedModeTimer] = useState<number | null>(null);
  const [speedModeTimeLeft, setSpeedModeTimeLeft] = useState(60);
  const [showHint, setShowHint] = useState<boolean>(() => {
    const saved = localStorage.getItem('ziyuan-practice-show-hint');
    return saved === 'true';
  });

  // 持久化提示开关状态
  useEffect(() => { localStorage.setItem('ziyuan-practice-show-hint', String(showHint)); }, [showHint]);

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

  // ====== 计算已掌握字根数 ======
  const masteredCount = useMemo(() => {
    const roots = getRootsForMode(mode);
    return roots.filter(r => {
      const correct = currentData.correctCountMap[r.char] || 0;
      const wrong = currentData.wrongCountMap[r.char] || 0;
      return correct >= 3 && correct > wrong;
    }).length;
  }, [mode, currentData.correctCountMap, currentData.wrongCountMap]);

  // ====== 今日练习量 ======
  const todayStats = useMemo(() => {
    const today = getTodayKey();
    return currentData.dailyStats[today] || { attempts: 0, correct: 0, score: 0 };
  }, [currentData.dailyStats]);

  // ====== 例字计算 ======
  const exampleChars = useMemo(() => {
    if (!charCodeData) return [];
    return getExampleCharsForRoot(currentRoot.char, charCodeData, 3);
  }, [currentRoot.char, charCodeData]);

  // ====== 首次出现检测与提示 ======
  useEffect(() => {
    if (showHint && isPlaying && !currentData.firstSeenMap[currentRoot.char]) {
      // 提示开启时，首次出现该字根，显示编码提示3秒
      const hint = `答案是 ${currentRoot.key.toUpperCase()}`;
      setFirstTimeHint(hint);
      if (firstTimeHintTimer) clearTimeout(firstTimeHintTimer);
      const timer = setTimeout(() => setFirstTimeHint(null), 3000);
      setFirstTimeHintTimer(timer);
    } else {
      setFirstTimeHint(null);
    }
  }, [currentRoot.char, isPlaying, showHint]);

  // ====== 速度挑战模式倒计时 ======
  useEffect(() => {
    if (isPlaying && stageMode === 'speed' && speedModeTimeLeft > 0) {
      const timer = setInterval(() => {
        setSpeedModeTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, stageMode, speedModeTimeLeft]);

  useEffect(() => {
    if (stageMode === 'speed' && speedModeTimeLeft === 0 && isPlaying) {
      stopPractice();
    }
  }, [speedModeTimeLeft, stageMode, isPlaying]);

  // ====== 下一个字根逻辑（含紧急复习队列） ======
  const nextRoot = useCallback(() => {
    setShowAnswer(false);
    setKeyFeedback(null);
    setFeedbackType(null);
    setShowExampleChars(false);
    setPhoneticHint(null);
    answerStartTime.current = Date.now();

    // 优先检查紧急复习队列
    const urgentQueue = currentData.urgentReviewQueue;
    if (urgentQueue.length > 0 && Math.random() < 0.7) {
      const nextChar = urgentQueue[0];
      const roots = getRootsForMode(mode);
      const found = roots.find(r => r.char === nextChar) ?? roots[0];
      setCurrentRoot(found);
      updateModeData(prev => ({
        ...prev,
        currentRootChar: found.char,
        urgentReviewQueue: prev.urgentReviewQueue.slice(1),
      }));
      return;
    }

    const learning = getLearning();
    const nextCharId = learning.getNextItem();
    if (nextCharId) {
      const roots = getRootsForMode(mode);
      const found = roots.find(r => r.char === nextCharId) ?? roots[0];
      setCurrentRoot(found);
      updateModeData(prev => ({ ...prev, currentRootChar: found.char }));
    }
  }, [mode, getLearning, updateModeData, currentData.urgentReviewQueue]);

  const startPractice = useCallback(() => {
    updateModeData(prev => ({
      ...prev,
      isPlaying: true,
      stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
      stageMode,
    }));
    if (stageMode === 'speed') {
      setSpeedModeTimeLeft(60);
    }
    nextRoot();
  }, [nextRoot, updateModeData, stageMode]);

  const continuePractice = useCallback(() => {
    const found = practiceRootMappings.find(r => r.char === currentData.currentRootChar) ?? commonRootMappings.find(r => r.char === currentData.currentRootChar) ?? practiceRootMappings[0];
    setCurrentRoot(found);
  }, [currentData.currentRootChar]);

  const stopPractice = useCallback(() => {
    updateModeData(prev => ({ ...prev, isPlaying: false, stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 } }));
    setKeyFeedback(null); setFeedbackType(null); setShowAnswer(false);
    setSpeedModeTimeLeft(60);
  }, [updateModeData]);

  const clearModeData = useCallback(() => {
    setModeData(prev => ({ ...prev, [mode]: defaultModePersist }));
  }, [mode, setModeData]);

  // ====== 处理按键输入 ======
  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || keyFeedback) return;
    if (stageMode === 'speed' && speedModeTimeLeft <= 0) return;

    const isCorrect = key === currentRoot.key;
    const answerTime = Date.now() - answerStartTime.current;

    setKeyFeedback(key);
    setFeedbackType(isCorrect ? 'correct' : 'wrong');
    setShowAnswer(true);
    getLearning().recordResult(currentRoot.char, isCorrect);

    // 记录答题时间
    const timingUpdate = {
      lastTime: answerTime,
      avgTime: currentData.rootTimingMap[currentRoot.char]
        ? Math.round((currentData.rootTimingMap[currentRoot.char].avgTime * currentData.rootTimingMap[currentRoot.char].count + answerTime) / (currentData.rootTimingMap[currentRoot.char].count + 1))
        : answerTime,
      count: (currentData.rootTimingMap[currentRoot.char]?.count || 0) + 1,
    };

    const today = getTodayKey();

    if (isCorrect) {
      const newStreak = stats.streak + 1;
      const newMaxStreak = Math.max(stats.maxStreak, newStreak);
      const streakBonus = Math.min(stats.streak, 10); // 连击加倍，最多10倍
      const points = 10 + streakBonus;

      updateModeData(prev => ({
        ...prev,
        stats: { totalAttempts: prev.stats.totalAttempts + 1, correctAttempts: prev.stats.correctAttempts + 1, streak: newStreak, maxStreak: newMaxStreak, score: prev.stats.score + points },
        correctCountMap: { ...prev.correctCountMap, [currentRoot.char]: (prev.correctCountMap[currentRoot.char] || 0) + 1 },
        totalStats: { totalAttempts: prev.totalStats.totalAttempts + 1, correctAttempts: prev.totalStats.correctAttempts + 1, maxStreak: Math.max(prev.totalStats.maxStreak, newMaxStreak), totalScore: prev.totalStats.totalScore + points },
        wrongCountMap: prev.wrongCountMap[currentRoot.char] ? { ...prev.wrongCountMap, [currentRoot.char]: Math.max(0, (prev.wrongCountMap[currentRoot.char] || 0) - 1) } : prev.wrongCountMap,
        rootTimingMap: { ...prev.rootTimingMap, [currentRoot.char]: timingUpdate },
        firstSeenMap: { ...prev.firstSeenMap, [currentRoot.char]: true },
        totalPoints: prev.totalPoints + points,
        dailyStats: {
          ...prev.dailyStats,
          [today]: {
            attempts: (prev.dailyStats[today]?.attempts || 0) + 1,
            correct: (prev.dailyStats[today]?.correct || 0) + 1,
            score: (prev.dailyStats[today]?.score || 0) + points,
          }
        },
      }));
      setShowExampleChars(true);
      feedbackTimer.current = setTimeout(() => { setKeyFeedback(null); setFeedbackType(null); nextRoot(); }, 400);
    } else {
      // 答错：进入紧急复习队列
      const updatedQueue = [...currentData.urgentReviewQueue];
      // 在后续3-5题内重复出现
      const insertPos = Math.min(2 + Math.floor(Math.random() * 3), updatedQueue.length);
      updatedQueue.splice(insertPos, 0, currentRoot.char);

      // 显示音托提示
      const phonetic = phoneticHintMap[currentRoot.char];
      if (phonetic) setPhoneticHint(phonetic);

      updateModeData(prev => ({
        ...prev,
        stats: { ...prev.stats, totalAttempts: prev.stats.totalAttempts + 1, streak: 0 },
        wrongCountMap: { ...prev.wrongCountMap, [currentRoot.char]: (prev.wrongCountMap[currentRoot.char] || 0) + 1 },
        totalStats: { ...prev.totalStats, totalAttempts: prev.totalStats.totalAttempts + 1 },
        rootTimingMap: { ...prev.rootTimingMap, [currentRoot.char]: timingUpdate },
        firstSeenMap: { ...prev.firstSeenMap, [currentRoot.char]: true },
        urgentReviewQueue: updatedQueue,
        dailyStats: {
          ...prev.dailyStats,
          [today]: {
            attempts: (prev.dailyStats[today]?.attempts || 0) + 1,
            correct: prev.dailyStats[today]?.correct || 0,
            score: (prev.dailyStats[today]?.score || 0) - 5,
          }
        },
      }));
      feedbackTimer.current = setTimeout(() => { setKeyFeedback(null); setFeedbackType(null); }, 1200);
    }
  }, [isPlaying, keyFeedback, currentRoot, stats, getLearning, updateModeData, nextRoot, currentData, stageMode, speedModeTimeLeft]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === 'Escape') { stopPractice(); return; }
      if (e.key === ' ') { e.preventDefault(); setShowHint(prev => !prev); return; }
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= 'a' && key <= 'z') { e.preventDefault(); handleKeyPress(key); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handleKeyPress, stopPractice]);

  useEffect(() => { return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }; }, []);
  useEffect(() => { if (isPlaying && inputRef.current) inputRef.current.focus(); }, [isPlaying, currentRoot]);

  const accuracy = stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0;
  const totalAccuracy = currentData.totalStats.totalAttempts > 0 ? Math.round((currentData.totalStats.correctAttempts / currentData.totalStats.totalAttempts) * 100) : 0;
  const learningStats = getLearning().stats;

  // ====== 最弱字根 TOP10 ======
  const weakestRoots = useMemo(() => {
    const roots = getRootsForMode(mode);
    return roots
      .map(r => ({ char: r.char, key: r.key, wrong: currentData.wrongCountMap[r.char] || 0, correct: currentData.correctCountMap[r.char] || 0 }))
      .filter(r => r.wrong > 0)
      .sort((a, b) => {
        const rateA = a.correct / Math.max(a.correct + a.wrong, 1);
        const rateB = b.correct / Math.max(b.correct + b.wrong, 1);
        return rateA - rateB;
      })
      .slice(0, 10);
  }, [mode, currentData.wrongCountMap, currentData.correctCountMap]);

  // ====== 键盘上每个键的字根数据 ======
  const keyRootsMap = useMemo(() => {
    const map: Record<string, RootMapping[]> = {};
    for (const r of practiceRootMappings) {
      if (!map[r.key]) map[r.key] = [];
      map[r.key].push(r);
    }
    return map;
  }, []);

  // ====== 数据加载中 ======
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

  // ====== 未开始：模式选择界面 ======
  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero区 */}
        <section className="py-8 sm:py-16 lg:py-20">
          <div className="container-page text-center">
            <div className="max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
                v1.32版 · 字根练习系统
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
                选择你的
                <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent"> 练习模式</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-12 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                吸收宇浩码与虎码练习精华，科学记忆，循序渐进
              </p>
            </div>

            {/* 模式选择卡片 */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto">
              {MODES.map((modeKey, idx) => {
                const config = modeConfig[modeKey];
                const Icon = config.icon;
                const isActive = mode === modeKey;
                return (
                  <button key={modeKey} onClick={() => setMode(modeKey)}
                    className={cn('card-feature text-left stagger-item', isActive && 'border-primary ring-2 ring-primary/20')}
                    style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors', isActive ? 'bg-primary/15' : 'bg-muted/80')}>
                      <Icon className={cn('h-7 w-7 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <h3 className={cn('text-xl font-bold mb-2 transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                      {config.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
                    {isActive && (
                      <div className="mt-4 pt-4 border-t border-border/60">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" />已选择
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 分阶段练习模式选择 */}
        <section className="pb-12">
          <div className="container-page max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-6">分阶段练习路线</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
              {(Object.entries(stageModeConfig) as [StageMode, typeof stageModeConfig.beginner][]).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = stageMode === key;
                return (
                  <button key={key} onClick={() => setStageMode(key)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-center transition-all duration-200',
                      isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-primary/30 hover:bg-accent/5'
                    )}>
                    <Icon className={cn('h-5 w-5 mx-auto mb-1.5', config.color)} />
                    <div className={cn('text-sm font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{config.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 进度看板 */}
        <section className="pb-12 bg-muted/30">
          <div className="container-page max-w-4xl mx-auto">
            <div className="card-stats">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">练习进度看板</h2>
                  <p className="text-sm text-muted-foreground">已练习: {Object.keys(currentData.correctCountMap).length + Object.keys(currentData.wrongCountMap).filter(k => !currentData.correctCountMap[k]).length} / {getRootsForMode(mode).length} ({Math.round((Object.keys(currentData.correctCountMap).length / getRootsForMode(mode).length) * 100)}%)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                  <div className="stat-number text-primary text-2xl">{masteredCount}</div>
                  <div className="stat-label text-xs">已掌握</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                  <div className="stat-number text-warning text-2xl">{learningStats.active}</div>
                  <div className="stat-label text-xs">学习中</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                  <div className="stat-number text-2xl text-emerald-500">{todayStats.attempts}</div>
                  <div className="stat-label text-xs">今日练习</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                  <div className="stat-number text-2xl text-amber-500">{currentData.totalStats.maxStreak}</div>
                  <div className="stat-label text-xs">最高连击</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                  <div className="stat-number text-2xl">{currentData.totalPoints}</div>
                  <div className="stat-label text-xs">总积分</div>
                </div>
              </div>
              {/* 掌握进度条 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>掌握进度</span>
                  <span>{masteredCount} / {getRootsForMode(mode).length}</span>
                </div>
                <div className="progress-base">
                  <div className="progress-bar-animated bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${Math.round((masteredCount / getRootsForMode(mode).length) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 学习进度 (渐进/简体) */}
        {(mode === 'progressive' || mode === 'common') && (
          <section className="pb-12">
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
                  <div className="text-center"><div className="stat-number text-primary">{learningStats.mastered}</div><div className="stat-label">已掌握</div></div>
                  <div className="text-center"><div className="stat-number text-warning">{learningStats.active}</div><div className="stat-label">学习中</div></div>
                  <div className="text-center"><div className="stat-number text-muted-foreground">{learningStats.pending}</div><div className="stat-label">待学习</div></div>
                  <div className="text-center"><div className="stat-number text-success">{learningStats.progress}%</div><div className="stat-label">完成度</div></div>
                </div>
                <div className="progress-base"><div className="progress-bar-animated" style={{ width: `${learningStats.progress}%` }} /></div>
              </div>
            </div>
          </section>
        )}

        {/* 错题列表 */}
        {mode === 'weak' && weakRoots.length > 0 && (
          <section className="pb-12">
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
                    <Badge key={char} variant="secondary" className="text-base px-3 py-1.5 hover:bg-destructive/10 cursor-pointer transition-colors">
                      <span className="root-char mr-1">{char}</span>
                      <span className="text-xs text-muted-foreground ml-1">({currentData.wrongCountMap[char]}次)</span>
                    </Badge>
                  ))}
                  {weakRoots.length > 40 && <Badge variant="outline" className="px-3 py-1.5">+{weakRoots.length - 40} 更多</Badge>}
                </div>
              </div>
            </div>
          </section>
        )}

        {mode === 'weak' && weakRoots.length === 0 && (
          <div className="container-page text-center py-8">
            <div className="alert-base alert-info max-w-md mx-auto">
              <Zap className="h-5 w-5 shrink-0 mt-0.5" />
              <div><p className="font-medium">错题列表为空</p><p className="text-sm mt-1 opacity-90">请先进行练习以收集错题数据</p></div>
            </div>
          </div>
        )}

        {/* 最弱字根 TOP10 */}
        {weakestRoots.length > 0 && (
          <section className="pb-12 bg-muted/30">
            <div className="container-page max-w-3xl mx-auto">
              <div className="card-base">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2 className="font-bold text-lg">最弱字根 TOP10</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {weakestRoots.map((r, i) => (
                    <div key={r.char} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <span className="root-char text-lg">{r.char}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{r.key.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 历史记录 */}
        {currentData.totalStats.totalAttempts > 0 && (
          <section className="pb-12">
            <div className="container-page max-w-3xl mx-auto">
              <div className="card-base">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-accent" /><h2 className="font-bold text-lg">历史学习记录</h2></div>
                  <Button variant="ghost" size="sm" onClick={clearModeData} className="gap-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" />清除记录
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number">{currentData.totalStats.totalAttempts}</div><div className="stat-label">累计练习</div></div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number">{totalAccuracy}%</div><div className="stat-label">历史正确率</div></div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number text-warning">{currentData.totalStats.maxStreak}</div><div className="stat-label">最高连击</div></div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number">{weakRoots.length}</div><div className="stat-label">待强化</div></div>
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
                <Button size="lg" variant="outline" onClick={continuePractice} className="btn-secondary text-base gap-2 px-8 py-3">
                  <Play className="h-5 w-5" />继续练习
                </Button>
              )}
              <Button size="lg" onClick={startPractice} className="btn-primary text-base px-10 py-3">
                <Play className="h-5 w-5" />{currentData.isPlaying ? '重新开始' : '开始练习'}
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ====== 练习中界面 ======
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部状态栏 + 进度看板 */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container-page max-w-5xl py-2">
          {/* 第一行：模式 + 退出 + 核心数据 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium px-3 py-1.5 text-xs">
                {modeConfig[mode].label}
              </Badge>
              <Badge variant="outline" className="text-xs px-2 py-1">
                {stageModeConfig[stageMode].label}
              </Badge>
              <button onClick={stopPractice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-950/60 dark:border-red-800 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /><span>退出</span>
                <kbd className="hidden sm:inline ml-0.5 px-1 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/50 rounded font-mono">Esc</kbd>
              </button>
              <button onClick={() => setShowHint(!showHint)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-300',
                  showHint
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}>
                {showHint ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{showHint ? '提示开' : '提示关'}</span>
              </button>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-bold">{stats.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className={cn('h-3.5 w-3.5', stats.streak >= 10 ? 'text-orange-500' : 'text-muted-foreground')} />
                <span className={cn('font-bold', stats.streak >= 10 ? 'text-orange-500' : '')}>
                  {stats.streak}x{stats.streak >= 10 && <span className="text-xs ml-0.5">🔥</span>}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-muted-foreground">正确率</span>
                <span className="font-bold">{accuracy}%</span>
              </div>
              {stageMode === 'speed' && (
                <div className={cn('flex items-center gap-1 font-bold', speedModeTimeLeft <= 10 ? 'text-red-500' : 'text-foreground')}>
                  <Timer className="h-3.5 w-3.5" />{speedModeTimeLeft}s
                </div>
              )}
            </div>
          </div>
          {/* 第二行：进度条 */}
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>已掌握 {masteredCount}/{getRootsForMode(mode).length}</span>
              <span>今日 {todayStats.attempts}题</span>
            </div>
            <div className="progress-base h-1.5">
              <div className="progress-bar-animated bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${Math.round((masteredCount / getRootsForMode(mode).length) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 主练习区 */}
      <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* 左侧：字根展示 + 输入区（占3列，手机端全宽） */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">
            {/* 字根展示卡片 */}
            <div className={cn(
              "card-base p-4 sm:p-8 transition-[border-color,background-color] duration-300",
              feedbackType === 'correct' && "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
              feedbackType === 'wrong' && "border-red-400 bg-red-50/50 dark:bg-red-950/20"
            )}>
              <div className="flex flex-col items-center">
                {/* 首次提示（仅提示开启时显示） */}
                {showHint && firstTimeHint && !feedbackType && (
                  <div className="mb-4 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-medium animate-fadeIn">
                    <Lightbulb className="h-4 w-4 inline mr-1.5" />{firstTimeHint}
                  </div>
                )}

                {/* 当前字根 */}
                <div className={cn(
                  "relative flex items-center justify-center h-28 w-28 sm:h-36 sm:w-36 rounded-2xl border-4 transition-all duration-300 mb-4",
                  feedbackType === 'correct'
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 scale-110 shadow-lg shadow-emerald-200"
                    : feedbackType === 'wrong'
                    ? "border-red-400 bg-red-50 dark:bg-red-950/30 scale-95"
                    : "border-border bg-card"
                )}>
                  <RootCharDisplay root={currentRoot} size="xl" showDesc={true}
                    className={cn("border-0 bg-transparent",
                      feedbackType === 'correct' && "text-emerald-600 dark:text-emerald-400",
                      feedbackType === 'wrong' && "text-red-600 dark:text-red-400")} />
                  {feedbackType === 'correct' && (
                    <div className="absolute -top-2 -right-2 animate-bounce-in"><CheckCircle2 className="h-7 w-7 text-emerald-500" /></div>
                  )}
                  {feedbackType === 'wrong' && (
                    <div className="absolute -top-2 -right-2 animate-shake"><XCircle className="h-7 w-7 text-red-500" /></div>
                  )}
                </div>

                {/* 输入框 */}
                <div className="relative w-full max-w-xs">
                  <input ref={inputRef} type="text" readOnly placeholder="输入键位"
                    className={cn(
                      "w-full h-12 sm:h-14 text-center text-2xl sm:text-3xl font-mono font-bold",
                      "bg-muted border-2 rounded-xl focus:outline-none caret-primary transition-all duration-200",
                      keyFeedback
                        ? (feedbackType === 'correct' ? "border-emerald-400 bg-emerald-50 text-emerald-600 dark:text-emerald-400" : "border-red-400 bg-red-50 text-red-600 dark:text-red-400")
                        : "border-primary/30"
                    )}
                    value={keyFeedback?.toUpperCase() || ''} />
                  {!keyFeedback && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none animate-pulse text-lg">▎</span>
                  )}
                </div>

                {/* 反馈文字 */}
                {feedbackType && (
                  <div className={cn("mt-3 flex items-center justify-center gap-2 text-base font-semibold",
                    feedbackType === 'correct' ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {feedbackType === 'correct' ? (
                      <><CheckCircle2 className="h-5 w-5" /><span>正确！太棒了 🎉</span></>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        <span>错误，正确键位：</span>
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-red-100 dark:bg-red-900/50 font-mono text-sm font-bold text-red-700 dark:text-red-300">
                          {currentRoot.key.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* 音托提示（答错时） */}
                {phoneticHint && feedbackType === 'wrong' && (showHint || !currentData.firstSeenMap[currentRoot.char]) && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    <Lightbulb className="h-3.5 w-3.5 inline mr-1" />音托提示：{currentRoot.char} ({phoneticHint})
                  </div>
                )}

                {/* 例字区域（答对后展示） */}
                {showExampleChars && feedbackType === 'correct' && exampleChars.length > 0 && (
                  <div className="mt-3 w-full max-w-sm animate-fadeIn">
                    <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />包含此字根的例字：
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {exampleChars.map((ex, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm">
                          <span className="font-medium text-foreground">{ex.char}</span>
                          <span className="text-xs text-muted-foreground font-mono">{ex.code.toUpperCase()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ====== 交互式字根键盘 ====== */}
            <div className="sm:card-base p-1 sm:p-6">
              {/* 键盘顶部控制栏 */}
              <div className="flex items-center justify-between mb-1 sm:mb-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">字根键盘</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['roots', 'codes', 'blank'] as KeyboardDisplayMode[]).map(dm => (
                    <button key={dm} onClick={() => setKeyboardDisplayMode(dm)}
                      className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors',
                        keyboardDisplayMode === dm ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                      )}>
                      {dm === 'roots' ? '字根' : dm === 'codes' ? '编码' : '空白'}
                    </button>
                  ))}
                </div>
              </div>
              {/* 键盘布局 - 手机端 flex 撑满宽度 */}
              <div className="mobile-keyboard flex flex-col items-center gap-[3px] sm:gap-1.5">
                {keyboardRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-[3px] sm:gap-1.5 w-full" style={{ paddingLeft: `${rowIndex * 4}px` }}>
                    {row.map((key) => {
                      const isFeedback = keyFeedback === key;
                      const isCorrectKey = key === currentRoot.key;
                      const rootsOnKey = keyRootsMap[key] || [];
                      const isCurrentRootKey = isCorrectKey && !feedbackType;

                      let colorClass = KEY_COLORS.default;
                      if (isFeedback && feedbackType === 'correct') colorClass = KEY_COLORS.correct;
                      else if (isFeedback && feedbackType === 'wrong') colorClass = KEY_COLORS.wrong;
                      else if (showAnswer && isCorrectKey && feedbackType === 'wrong') colorClass = KEY_COLORS.highlight;
                      else if (isCurrentRootKey) colorClass = 'bg-transparent border-border/40';

                      // 判断该键上字根的掌握状态
                      const keyMastered = rootsOnKey.every(r => {
                        const c = currentData.correctCountMap[r.char] || 0;
                        return c >= 3;
                      });

                      return (
                        <button key={key}
                          onClick={() => {
                            if (!isPlaying || !feedbackType) handleKeyPress(key);
                            else setSelectedKeyInfo(selectedKeyInfo === key ? null : key);
                          }}
                          className={cn(
                            "flex-1 min-w-0 flex flex-col items-center justify-center rounded-lg border-2 transition-colors duration-150 cursor-pointer select-none relative",
                            "sm:flex-none sm:hover:shadow-md sm:active:scale-95 sm:transition-all",
                            "h-[52px] sm:h-16 sm:w-12",
                            colorClass,
                            keyMastered && !isCurrentRootKey && !isFeedback && 'opacity-60',
                          )}>
                          <span className="text-[11px] sm:text-sm font-bold leading-none">{key.toUpperCase()}</span>
                          {keyboardDisplayMode === 'roots' && (
                            <span className="text-[8px] sm:text-[10px] leading-tight text-center mt-0.5 line-clamp-2 text-muted-foreground">
                              {rootsOnKey.slice(0, 3).map(r => r.char).join('')}
                              {rootsOnKey.length > 3 && '…'}
                            </span>
                          )}
                          {keyboardDisplayMode === 'codes' && (
                            <span className="text-[8px] sm:text-[10px] font-mono text-muted-foreground mt-0.5">
                              {rootsOnKey.length}根
                            </span>
                          )}
                          {/* 点击键位展开详情 */}
                          {selectedKeyInfo === key && (
                            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-20 w-40 sm:w-48 p-2 rounded-lg bg-popover border border-border shadow-xl animate-fadeIn">
                              <div className="text-xs font-semibold text-foreground mb-1">{key.toUpperCase()} 键字根</div>
                              <div className="flex flex-wrap gap-1">
                                {rootsOnKey.map(r => (
                                  <span key={r.char} className={cn(
                                    'px-1.5 py-0.5 rounded text-xs',
                                    r.char === currentRoot.char ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold' : 'bg-muted text-foreground'
                                  )}>
                                    {r.isPUA && r.desc ? r.desc : r.char}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：统计面板（1列） */}
          <div className="space-y-3">
            {/* 本轮统计 */}
            <div className="card-stats p-4">
              <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />本轮统计
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '题数', value: stats.totalAttempts, icon: Target },
                  { label: '正确', value: stats.correctAttempts, icon: CheckCircle2 },
                  { label: '连击', value: stats.streak, icon: Flame },
                  { label: '弱项', value: weakRoots.length, icon: AlertTriangle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="text-center p-2 rounded-lg bg-background/60 border border-border/40">
                      <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-lg font-bold">{item.value}</div>
                      <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 积分与连击 */}
            <div className="card-base p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500" />总积分</span>
                <span className="text-lg font-bold text-primary">{currentData.totalPoints}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-500" />今日</span>
                <span className="text-sm font-bold">{todayStats.attempts}题 / {todayStats.correct}对</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-emerald-500" />已掌握</span>
                <span className="text-sm font-bold">{masteredCount}/{getRootsForMode(mode).length}</span>
              </div>
            </div>

            {/* 快捷键提示 */}
            <div className="card-base p-3">
              <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />快捷键
              </h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">A-Z</kbd>
                  <span className="text-muted-foreground">直接按键输入字根编码</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">Esc</kbd>
                  <span className="text-muted-foreground">退出当前练习</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">Space</kbd>
                  <span className="text-muted-foreground">切换是否显示键位提示</span>
                </div>
              </div>
            </div>

            {/* 统计面板按钮 */}
            <Button variant="outline" size="sm" onClick={() => setShowStatsPanel(!showStatsPanel)} className="w-full gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />{showStatsPanel ? '收起统计' : '详细统计'}
              {showStatsPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {/* 详细统计面板 */}
            {showStatsPanel && (
              <div className="card-base p-3 animate-fadeIn">
                <h4 className="font-semibold text-xs text-foreground mb-2">最弱字根</h4>
                {weakestRoots.length > 0 ? (
                  <div className="space-y-1">
                    {weakestRoots.slice(0, 5).map((r, i) => {
                      const total = r.correct + r.wrong;
                      const rate = total > 0 ? Math.round((r.correct / total) * 100) : 0;
                      return (
                        <div key={r.char} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground">{i + 1}</span>
                          <span className="root-char text-sm w-5 text-center">{r.char}</span>
                          <div className="flex-1 progress-base h-1.5">
                            <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${100 - rate}%` }} />
                          </div>
                          <span className="text-muted-foreground w-8 text-right">{rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">暂无数据</p>
                )}

                {/* 每日统计 */}
                <h4 className="font-semibold text-xs text-foreground mb-2 mt-3">近7日练习</h4>
                <div className="flex items-end gap-1 h-12">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const key = d.toISOString().split('T')[0];
                    const ds = currentData.dailyStats[key];
                    const count = ds?.attempts || 0;
                    const maxCount = Math.max(...Object.values(currentData.dailyStats).map(s => s.attempts), 1);
                    const height = Math.max(count > 0 ? Math.round((count / maxCount) * 100) : 2, 2);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full bg-primary/30 rounded-sm transition-all" style={{ height: `${height}%` }} />
                        <span className="text-[8px] text-muted-foreground">{d.getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}