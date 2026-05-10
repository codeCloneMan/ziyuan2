import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { charCodeData, type CharCodeItem } from '@/data/charCodeData';
import { top500Chars, top1000Chars, top1500Chars } from '@/data/commonChars';
import { practiceRootMappings, keyboardRows } from '@/data/roots';
import type { WholeCharMode } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import { Play, RotateCcw, Info, Trash2, GraduationCap, Star, Trophy, CheckCircle2, XCircle, Lightbulb, BarChart3, Target, AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, SplitSquareHorizontal, Flame } from 'lucide-react';

// ====== 模式配置 ======
const modeConfig: Record<WholeCharMode, { label: string; icon: typeof Star; description: string }> = {
  progressive: { label: '全部汉字', icon: GraduationCap, description: '科学记忆，逐步掌握全部汉字' },
  progressive500: { label: '常用500字', icon: Star, description: '科学记忆，逐步掌握前500常用字' },
};

// ====== 字频分级模式 ======
type FreqMode = 'top500' | 'top1000' | 'top1500' | 'all';
const freqModeConfig: Record<FreqMode, { label: string; description: string; count: string }> = {
  top500: { label: '常用500字', description: '最核心的高频字', count: '500' },
  top1000: { label: '常用1000字', description: '日常覆盖', count: '1000' },
  top1500: { label: '常用1500字', description: '进阶覆盖', count: '1500' },
  all: { label: '全部字集', description: '完整练习', count: '6763' },
};

// ====== 编码规则类型 ======
type CodeRule = 'A' | 'AB' | 'ABb' | 'ABCc' | 'ABCD' | 'ABCZ';
function getCodeRule(code: string): CodeRule {
  const len = code.length;
  if (len === 1) return 'A';
  if (len === 2) return 'AB';
  if (len === 3) return 'ABb';
  if (len === 4) return 'ABCD';
  return 'ABCZ'; // 超过4个用Z结尾
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

// ====== 拆分可视化辅助函数 ======
// 从编码推断拆分字根（基于字源码的编码结构）
function inferSplitFromCode(char: string, code: string): string[] {
  // 简化拆分：根据编码长度和字符推断
  // 这里使用一个简化策略：从字根表中查找可能的字根组合
  const rootChars: string[] = [];
  const len = code.length;

  if (len === 1) {
    rootChars.push(char);
  } else {
    // 尝试从字符中提取可能的字根
    // 使用字根表中的字根匹配
    const availableRoots = practiceRootMappings.map(r => r.char);
    const sortedRoots = [...availableRoots].sort((a, b) => b.length - a.length); // 长字根优先匹配

    let remaining = char;
    for (const root of sortedRoots) {
      if (remaining.includes(root)) {
        rootChars.push(root);
        remaining = remaining.replace(root, '');
      }
      if (!remaining) break;
    }
    // 如果还有剩余字符，按单字符拆分
    if (remaining) {
      for (const c of remaining) {
        rootChars.push(c);
      }
    }
  }

  return rootChars.length > 0 ? rootChars : [char];
}

// ====== 判断是否为必拆字（拆分非直觉的汉字） ======
function isMustSplitChar(char: string): boolean {
  // 一些典型的必拆字（拆分不直观的常见字）
  const mustSplitChars = new Set([
    '我', '或', '事', '重', '身', '面', '里', '长', '门', '问',
    '间', '闻', '阔', '关', '合', '会', '全', '令', '命', '今',
    '食', '饮', '饱', '饭', '馆', '首', '道', '送', '还', '进',
    '那', '都', '部', '陪', '阵', '防', '阳', '阶', '际', '院',
    '除', '随', '难', '雌', '雄', '只', '双', '对', '树', '村',
    '本', '未', '末', '果', '林', '森', '查', '杏', '呆', '束',
    '必', '心', '思', '想', '念', '意', '息', '悉', '急', '愿',
    '为', '办', '力', '功', '加', '动', '助', '努', '励', '劲',
    '发', '友', '拔', '拨', '废', '泼', '活', '阔', '括', '适',
    '出', '击', '函', '凿', '巨', '臣', '卧', '临', '师', '归',
  ]);
  return mustSplitChars.has(char);
}

// ====== 获取必拆字列表 ======
function getMustSplitChars(): string[] {
  return charCodeData.filter(d => isMustSplitChar(d.char)).map(d => d.char);
}

// ====== 生成字频段数据 ======
const allCharIds = charCodeData.map(d => d.char);

interface WholeCharPersistData {
  isPlaying: boolean;
  currentChar: string;
  currentCode: string;
  inputCode: string;
  stats: { totalAttempts: number; correctAttempts: number; streak: number; maxStreak: number; score: number; };
  wrongCountMap: Record<string, number>;
  totalStats: { totalAttempts: number; correctAttempts: number; maxStreak: number; totalScore: number; };
  // 新增：首次出现标记
  firstSeenMap: Record<string, number>; // char -> 出现次数
  // 新增：每日统计
  dailyStats: Record<string, { attempts: number; correct: number; score: number }>;
  // 新增：总积分
  totalPoints: number;
  // 新增：字频模式
  freqMode: FreqMode;
  // 新增：必拆字模式
  mustSplitMode: boolean;
}

const defaultPersist: WholeCharPersistData = {
  isPlaying: false,
  currentChar: charCodeData[0].char,
  currentCode: charCodeData[0].code,
  inputCode: '',
  stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
  wrongCountMap: {},
  totalStats: { totalAttempts: 0, correctAttempts: 0, maxStreak: 0, totalScore: 0 },
  firstSeenMap: {},
  dailyStats: {},
  totalPoints: 0,
  freqMode: 'all',
  mustSplitMode: false,
};

const CURRENT_MODE_KEY = 'ziyuan-whole-char-current-mode';

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export default function WholeCharPracticePage() {
  const [mode, setMode] = useState<WholeCharMode>(() => {
    const saved = localStorage.getItem(CURRENT_MODE_KEY);
    if (saved === 'progressive' || saved === 'progressive500') return saved;
    return 'progressive';
  });
  const [persistData, setPersistData] = useLocalStorage<Record<WholeCharMode, WholeCharPersistData>>(
    'ziyuan-whole-char-v3',
    { progressive: defaultPersist, progressive500: defaultPersist }
  );

  const safeData: Record<WholeCharMode, WholeCharPersistData> = {
    progressive: persistData.progressive ?? defaultPersist,
    progressive500: persistData.progressive500 ?? defaultPersist,
  };
  const currentData = safeData[mode];

  useEffect(() => { localStorage.setItem(CURRENT_MODE_KEY, mode); }, [mode]);

  // ====== 根据字频模式和必拆字模式决定学习池 ======
  const learningPool = useMemo(() => {
    if (currentData.mustSplitMode) {
      const mustSplit = getMustSplitChars();
      return mustSplit.length > 0 ? mustSplit : allCharIds;
    }
    switch (currentData.freqMode) {
      case 'top500': return top500Chars;
      case 'top1000': return top1000Chars;
      case 'top1500': return top1500Chars;
      default: return allCharIds;
    }
  }, [currentData.freqMode, currentData.mustSplitMode]);

  const progressiveLearning = useSpacedLearning({
    allItemIds: learningPool, newItemsPerRound: 5, masteryThreshold: 3,
    reviewProbability: 0.1, storageKey: 'ziyuan-whole-char-progressive',
  });
  const progressive500Learning = useSpacedLearning({
    allItemIds: top500Chars, newItemsPerRound: 5, masteryThreshold: 3,
    reviewProbability: 0.1, storageKey: 'ziyuan-whole-char-progressive-500',
  });

  const [currentItem, setCurrentItem] = useState<CharCodeItem>(() => ({
    char: currentData.currentChar, code: currentData.currentCode,
  }));
  const [inputCode, setInputCode] = useState(currentData.inputCode);
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSplitViz, setShowSplitViz] = useState(false);
  const [splitAnimationStep, setSplitAnimationStep] = useState(0);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [userWrongSplit, setUserWrongSplit] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();
  const splitAnimTimer = useRef<ReturnType<typeof setTimeout>>();
  const [showHint, setShowHint] = useState<boolean>(() => {
    const saved = localStorage.getItem('ziyuan-whole-char-show-hint');
    return saved === 'true';
  });

  // 持久化提示开关状态
  useEffect(() => { localStorage.setItem('ziyuan-whole-char-show-hint', String(showHint)); }, [showHint]);

  const isPlaying = currentData.isPlaying;
  const stats = currentData.stats;

  const getLearning = useCallback(() => {
    return mode === 'progressive500' ? progressive500Learning : progressiveLearning;
  }, [mode, progressiveLearning, progressive500Learning]);

  const updateData = useCallback((updater: (prev: WholeCharPersistData) => WholeCharPersistData) => {
    setPersistData(prev => ({ ...prev, [mode]: updater(prev[mode] ?? defaultPersist) }));
  }, [mode, setPersistData]);

  // ====== 拆分可视化数据 ======
  const splitParts = useMemo(() => {
    return inferSplitFromCode(currentItem.char, currentItem.code);
  }, [currentItem.char, currentItem.code]);

  // ====== 编码规则 ======
  const codeRule = useMemo(() => getCodeRule(currentItem.code), [currentItem.code]);

  // ====== 提示系统（首次/二次/三次+） ======
  const hintLevel = useMemo(() => {
    const seen = currentData.firstSeenMap[currentItem.char] || 0;
    if (seen === 0) return 2; // 首次：显示完整拆分+编码
    if (seen === 1) return 1; // 第二次：只显示拆分
    return 0; // 第三次+：不显示提示
  }, [currentData.firstSeenMap, currentItem.char]);

  // ====== 最弱字 TOP10 ======
  const weakestChars = useMemo(() => {
    return charCodeData
      .filter(d => (currentData.wrongCountMap[d.char] || 0) > 0)
      .map(d => ({ char: d.char, code: d.code, wrong: currentData.wrongCountMap[d.char] || 0 }))
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 10);
  }, [currentData.wrongCountMap]);

  // ====== 今日统计 ======
  const todayStats = useMemo(() => {
    const today = getTodayKey();
    return currentData.dailyStats[today] || { attempts: 0, correct: 0, score: 0 };
  }, [currentData.dailyStats]);

  // ====== 已练习字数 ======
  const practicedCount = useMemo(() => {
    return Object.keys(currentData.firstSeenMap).length;
  }, [currentData.firstSeenMap]);

  const generateNext = useCallback(() => {
    const learning = getLearning();
    const nextId = learning.getNextItem();
    if (nextId) {
      const found = charCodeData.find(d => d.char === nextId) ?? charCodeData[0];
      setCurrentItem(found);
      setInputCode('');
      updateData(prev => ({ ...prev, currentChar: found.char, currentCode: found.code, inputCode: '' }));
    }
    setKeyFeedback(null);
    setFeedbackType(null);
    setShowAnswer(false);
    setShowSplitViz(false);
    setSplitAnimationStep(0);
    setUserWrongSplit(null);
  }, [getLearning, updateData]);

  const startPractice = useCallback(() => {
    updateData(prev => ({
      ...prev, isPlaying: true,
      stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
    }));
    generateNext();
  }, [generateNext, updateData]);

  const continuePractice = useCallback(() => {
    const found = charCodeData.find(d => d.char === currentData.currentChar) ?? charCodeData[0];
    setCurrentItem(found);
    setInputCode(currentData.inputCode);
  }, [currentData.currentChar, currentData.inputCode]);

  const stopPractice = useCallback(() => {
    updateData(prev => ({
      ...prev, isPlaying: false,
      stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
      inputCode: '',
    }));
    setKeyFeedback(null); setFeedbackType(null); setShowAnswer(false);
    setShowSplitViz(false); setSplitAnimationStep(0); setUserWrongSplit(null);
  }, [updateData]);

  const clearData = useCallback(() => { updateData(() => defaultPersist); }, [updateData]);

  // ====== 拆分动画 ======
  useEffect(() => {
    if (showSplitViz && splitAnimationStep < splitParts.length) {
      splitAnimTimer.current = setTimeout(() => {
        setSplitAnimationStep(prev => prev + 1);
      }, 300);
      return () => { if (splitAnimTimer.current) clearTimeout(splitAnimTimer.current); };
    }
  }, [showSplitViz, splitAnimationStep, splitParts.length]);

  // ====== 处理按键输入 ======
  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || feedbackType) return;
    const newCode = inputCode + key;
    setInputCode(newCode);
    updateData(prev => ({ ...prev, inputCode: newCode }));

    const correctCode = currentItem.code;
    if (correctCode.startsWith(newCode)) {
      if (newCode === correctCode) {
        setKeyFeedback(key);
        setFeedbackType('correct');
        getLearning().recordResult(currentItem.char, true);
        const today = getTodayKey();
        const streakBonus = Math.min(stats.streak, 10);
        const points = 10 + streakBonus;

        updateData(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            totalAttempts: prev.stats.totalAttempts + 1,
            correctAttempts: prev.stats.correctAttempts + 1,
            streak: prev.stats.streak + 1,
            maxStreak: Math.max(prev.stats.maxStreak, prev.stats.streak + 1),
            score: prev.stats.score + points,
          },
          totalStats: {
            totalAttempts: prev.totalStats.totalAttempts + 1,
            correctAttempts: prev.totalStats.correctAttempts + 1,
            maxStreak: Math.max(prev.totalStats.maxStreak, prev.stats.streak + 1),
            totalScore: prev.totalStats.totalScore + points,
          },
          firstSeenMap: { ...prev.firstSeenMap, [currentItem.char]: (prev.firstSeenMap[currentItem.char] || 0) + 1 },
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
        feedbackTimer.current = setTimeout(() => {
          setKeyFeedback(null); setFeedbackType(null); generateNext();
        }, 500);
      }
    } else {
      setKeyFeedback(key);
      setFeedbackType('wrong');
      getLearning().recordResult(currentItem.char, false);
      const today = getTodayKey();

      // 记录用户的错误编码
      setUserWrongSplit(newCode);
      setShowSplitViz(true);
      setSplitAnimationStep(splitParts.length); // 直接显示完整拆分

      updateData(prev => ({
        ...prev,
        wrongCountMap: { ...prev.wrongCountMap, [currentItem.char]: (prev.wrongCountMap[currentItem.char] || 0) + 1 },
        stats: { ...prev.stats, totalAttempts: prev.stats.totalAttempts + 1, streak: 0 },
        totalStats: { ...prev.totalStats, totalAttempts: prev.totalStats.totalAttempts + 1 },
        firstSeenMap: { ...prev.firstSeenMap, [currentItem.char]: (prev.firstSeenMap[currentItem.char] || 0) + 1 },
        dailyStats: {
          ...prev.dailyStats,
          [today]: {
            attempts: (prev.dailyStats[today]?.attempts || 0) + 1,
            correct: prev.dailyStats[today]?.correct || 0,
            score: (prev.dailyStats[today]?.score || 0) - 5,
          }
        },
      }));
      feedbackTimer.current = setTimeout(() => {
        setKeyFeedback(null); setFeedbackType(null);
        setInputCode('');
        updateData(prev => ({ ...prev, inputCode: '' }));
      }, 1500);
    }
  }, [isPlaying, feedbackType, inputCode, currentItem, getLearning, updateData, generateNext, stats.streak, splitParts.length]);

  // 空格键获取提示（仅提示开启时有效）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || feedbackType) return;
      if (e.key === 'Escape') { stopPractice(); return; }
      if (e.key === ' ') {
        e.preventDefault();
        // 有输入时 Space 显示拆分提示并标记答错
        if (showHint && inputCode.length > 0) {
          setShowSplitViz(true);
          setSplitAnimationStep(splitParts.length);
          handleKeyPress(' ');
        } else {
          setShowHint(prev => !prev);
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (inputCode.length > 0) {
          const newCode = inputCode.slice(0, -1);
          setInputCode(newCode);
          updateData(prev => ({ ...prev, inputCode: newCode }));
        }
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
  }, [isPlaying, feedbackType, handleKeyPress, stopPractice, splitParts.length, showHint, inputCode, updateData]);

  useEffect(() => { return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }; }, []);
  useEffect(() => { if (isPlaying && inputRef.current) inputRef.current.focus(); }, [isPlaying, currentItem]);

  const accuracy = stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0;
  const totalAccuracy = currentData.totalStats.totalAttempts > 0
    ? Math.round((currentData.totalStats.correctAttempts / currentData.totalStats.totalAttempts) * 100) : 0;
  const learningStats = getLearning().stats;
  const weakItems = Object.entries(currentData.wrongCountMap).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  // ====== 编码大小码颜色标注 ======
  const renderCodeWithColor = (code: string) => {
    const rule = getCodeRule(code);
    return code.split('').map((c, i) => {
      let colorClass = 'text-foreground'; // 默认
      // 大码位置
      if (rule === 'A') colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'AB') colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABb' && i < 2) colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABb' && i === 2) colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold'; // 小码
      else if (rule === 'ABCc' && i < 3) colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABCc' && i === 3) colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold'; // 小码
      else if (rule === 'ABCD') colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABCZ' && i < 3) colorClass = 'text-blue-600 dark:text-blue-400 font-bold';
      else if (rule === 'ABCZ' && i === 3) colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
      return <span key={i} className={cn('font-mono text-lg', colorClass)}>{c.toUpperCase()}</span>;
    });
  };

  // ====== 未开始：模式选择界面 ======
  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero区 */}
        <section className="py-16 sm:py-20">
          <div className="container-page text-center max-w-4xl">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
              <Info className="h-4 w-4 mr-1.5" />整字编码练习系统
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
              整字
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent"> 练习</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              根据汉字打出对应的编码，支持拆分可视化和编码规则教学
              <br className="hidden sm:block" />共 <span className="font-bold text-foreground">{charCodeData.length}</span> 个编码
            </p>
          </div>
        </section>

        {/* 模式选择 */}
        <section className="pb-8 sm:pb-12">
          <div className="container-page max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-6">选择你的练习模式</h2>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              {(['progressive', 'progressive500'] as WholeCharMode[]).map((m, idx) => {
                const config = modeConfig[m];
                const Icon = config.icon;
                const isActive = mode === m;
                return (
                  <button key={m} onClick={() => setMode(m)}
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
                          <Star className="h-4 w-4" fill="currentColor" />已选择
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 字频分级选择 */}
        <section className="pb-8">
          <div className="container-page max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-center mb-4">字频分级练习</h2>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              {(Object.entries(freqModeConfig) as [FreqMode, typeof freqModeConfig.top500][]).map(([key, config]) => {
                const isActive = currentData.freqMode === key;
                return (
                  <button key={key} onClick={() => updateData(prev => ({ ...prev, freqMode: key }))}
                    className={cn(
                      'rounded-xl border-2 p-3 text-center transition-all duration-200',
                      isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-primary/30'
                    )}>
                    <div className={cn('text-sm font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>{config.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{config.description}</div>
                    <div className="text-xs font-bold text-primary mt-1">{config.count}字</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 必拆字专项 */}
        <section className="pb-8">
          <div className="container-page max-w-3xl mx-auto">
            <div className={cn(
              'card-base p-4 cursor-pointer transition-all',
              currentData.mustSplitMode ? 'border-primary ring-2 ring-primary/20' : ''
            )} onClick={() => updateData(prev => ({ ...prev, mustSplitMode: !prev.mustSplitMode }))}>
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', currentData.mustSplitMode ? 'bg-amber-500/15' : 'bg-muted/80')}>
                  <SplitSquareHorizontal className={cn('h-5 w-5', currentData.mustSplitMode ? 'text-amber-500' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1">
                  <h3 className={cn('font-bold', currentData.mustSplitMode ? 'text-foreground' : 'text-muted-foreground')}>必拆字专项练习</h3>
                  <p className="text-xs text-muted-foreground">专门练习拆分非直觉的常见汉字，这些字容易拆错</p>
                </div>
                <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  currentData.mustSplitMode ? 'bg-primary border-primary' : 'border-border'
                )}>
                  {currentData.mustSplitMode && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 进度看板 */}
        <section className="pb-8 sm:pb-12 bg-muted/30">
          <div className="container-page max-w-3xl mx-auto">
            <div className="card-stats">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">练习进度看板</h2>
                  <p className="text-sm text-muted-foreground">已练习: {practicedCount} / {learningPool.length}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-3 rounded-xl bg-background/60 border border-border/40">
                  <div className="stat-number text-primary text-2xl">{learningStats.mastered}</div>
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
              <div className="progress-base">
                <div className="progress-bar-animated bg-gradient-to-r from-primary to-emerald-500"
                  style={{ width: `${learningStats.progress}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* 最弱字 TOP10 */}
        {weakestChars.length > 0 && (
          <section className="pb-8">
            <div className="container-page max-w-3xl mx-auto">
              <div className="card-base">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2 className="font-bold text-lg">拆分错误率最高的字 TOP10</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {weakestChars.map((r, i) => (
                    <div key={r.char} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-lg">{r.char}</span>
                      <span className="text-xs text-muted-foreground font-mono ml-auto">{r.code.toUpperCase()}</span>
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
                  <Button variant="ghost" size="sm" onClick={clearData} className="gap-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" />清除记录
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number">{currentData.totalStats.totalAttempts}</div><div className="stat-label">累计练习</div></div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number">{totalAccuracy}%</div><div className="stat-label">历史正确率</div></div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number text-warning">{currentData.totalStats.maxStreak}</div><div className="stat-label">最高连击</div></div>
                  <div className="text-center p-4 rounded-xl bg-background border border-border/60"><div className="stat-number">{weakItems.length}</div><div className="stat-label">待强化</div></div>
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
      {/* 顶部状态栏 */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container-page max-w-5xl py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium px-3 py-1.5 text-xs">
                {modeConfig[mode].label}
              </Badge>
              {currentData.mustSplitMode && (
                <Badge variant="outline" className="text-xs px-2 py-1 border-amber-500/30 text-amber-600">
                  必拆字
                </Badge>
              )}
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
                <span className={cn('font-bold', stats.streak >= 10 ? 'text-orange-500' : '')}>{stats.streak}x</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-muted-foreground">正确率</span>
                <span className="font-bold">{accuracy}%</span>
              </div>
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>已练习 {practicedCount}/{learningPool.length}</span>
              <span>今日 {todayStats.attempts}题</span>
            </div>
            <div className="progress-base h-1.5">
              <div className="progress-bar-animated bg-gradient-to-r from-primary to-emerald-500"
                style={{ width: `${Math.round((practicedCount / learningPool.length) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 主练习区 */}
      <div className="container-page max-w-5xl py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：练习区域（3列） */}
          <div className="lg:col-span-3 space-y-4">
            {/* 汉字展示卡片 */}
            <div className={cn(
              "card-base p-6 sm:p-8 transition-all duration-300",
              feedbackType === 'correct' && "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
              feedbackType === 'wrong' && "border-red-400 bg-red-50/50 dark:bg-red-950/20"
            )}>
              <div className="space-y-4">
                {/* 编码规则标注 */}
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400">
                    {codeRuleLabels[codeRule]}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{codeRuleDescriptions[codeRule]}</span>
                </div>

                {/* 汉字展示 */}
                <div className="text-center">
                  <div className={cn(
                    "text-7xl sm:text-8xl font-bold mb-4 select-none transition-all duration-300",
                    feedbackType === 'correct' && "text-emerald-600 dark:text-emerald-400 scale-110",
                    feedbackType === 'wrong' && "text-red-600 dark:text-red-400 scale-95"
                  )}>
                    {currentItem.char}
                  </div>

                  {/* 拆分可视化（提示开启时或答错后显示） */}
                  {(showHint || feedbackType === 'wrong') && showSplitViz && splitParts.length > 1 && (
                    <div className="mb-4 animate-fadeIn">
                      <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl">
                        <span className="text-muted-foreground text-sm mr-1">{currentItem.char} →</span>
                        {splitParts.map((part, i) => (
                          <span key={i} className={cn(
                            "inline-flex items-center justify-center px-2 py-1 rounded-lg transition-all duration-300",
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

                  {/* 编码颜色标注（答对后或提示开启时显示） */}
                  {(feedbackType === 'correct' || (showHint && hintLevel >= 2 && !feedbackType)) && (
                    <div className="mb-4 flex items-center justify-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">编码：</span>
                      {renderCodeWithColor(currentItem.code)}
                    </div>
                  )}

                  {/* 输入框 */}
                  <div className="flex justify-center items-center gap-4">
                    <div className="relative">
                      <input ref={inputRef} type="text" readOnly placeholder="输入编码"
                        className={cn(
                          "w-48 sm:w-56 h-12 sm:h-14 text-center text-2xl sm:text-3xl font-mono bg-muted border-2 rounded-xl focus:outline-none transition-all",
                          keyFeedback && feedbackType === 'correct' && "border-emerald-400 bg-emerald-50 text-emerald-600",
                          keyFeedback && feedbackType === 'wrong' && "border-red-400 bg-red-50 text-red-600",
                          !keyFeedback && "border-primary/30"
                        )}
                        value={inputCode.toUpperCase()} />
                      {!inputCode && !feedbackType && (
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none animate-pulse text-2xl">▎</span>
                      )}
                    </div>
                  </div>

                  {/* 提示信息 */}
                  {feedbackType === 'correct' && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-5 w-5" /><span>正确！🎉</span>
                    </div>
                  )}

                  {/* 正误对比（答错时） */}
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

                  {/* 首次提示（仅提示开启时显示） */}
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

            {/* 虚拟键盘 */}
            <div className="card-base p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">编码键盘</span>
                {isMustSplitChar(currentItem.char) && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/30 text-amber-600">
                    必拆字
                  </Badge>
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5">
                {keyboardRows.map((row, ri) => (
                  <div key={ri} className="flex gap-1 sm:gap-1.5" style={{ paddingLeft: `${ri * 12}px` }}>
                    {row.map((key) => {
                      const isActive = keyFeedback === key;
                      return (
                        <button key={key} onClick={() => handleKeyPress(key)}
                          className={cn(
                            'h-10 w-9 sm:h-11 sm:w-10 rounded-lg font-mono text-sm font-semibold transition-all border-2',
                            isActive && feedbackType === 'correct' && 'bg-emerald-500 text-white border-emerald-600 scale-110',
                            isActive && feedbackType === 'wrong' && 'bg-red-500 text-white border-red-600 scale-110',
                            !isActive && 'bg-card hover:bg-accent/10 border-border'
                          )}>
                          {key.toUpperCase()}
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
                  { label: '弱项', value: weakItems.length, icon: AlertTriangle },
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

            {/* 编码规则说明 */}
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

            {/* 快捷键提示 */}
            <div className="card-base p-3">
              <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />快捷键
              </h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">A-Z</kbd>
                  <span className="text-muted-foreground">逐字母输入完整编码（自动校验）</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">Esc</kbd>
                  <span className="text-muted-foreground">退出当前练习</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">Backspace</kbd>
                  <span className="text-muted-foreground">删除最后一个输入字母</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono min-w-[2rem] text-center">Space</kbd>
                  <span className="text-muted-foreground">查看拆分提示（标记为答错）</span>
                </div>
                <div className="flex items-start gap-2 mt-1 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">大码 <span className="text-blue-600 dark:text-blue-400 font-semibold">蓝</span>，小码 <span className="text-emerald-600 dark:text-emerald-400 font-semibold">绿</span></span>
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