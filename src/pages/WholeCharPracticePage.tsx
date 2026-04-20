import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { charCodeData, type CharCodeItem } from '@/data/charCodeData';
import { top500Chars } from '@/data/commonChars';
import type { WholeCharMode } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSpacedLearning } from '@/hooks/use-spaced-learning';
import { Play, RotateCcw, Info, Trash2, GraduationCap, Star } from 'lucide-react';

const modeConfig: Record<WholeCharMode, { label: string; icon: typeof Star; description: string }> = {
  progressive: { label: '全部汉字', icon: GraduationCap, description: '科学记忆，逐步掌握全部汉字' },
  progressive500: { label: '常用500字', icon: Star, description: '科学记忆，逐步掌握前500常用字' },
};

const allCharIds = charCodeData.map(d => d.char);

const keyboardRows = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

interface WholeCharPersistData {
  isPlaying: boolean;
  currentChar: string;
  currentCode: string;
  inputCode: string;
  stats: { totalAttempts: number; correctAttempts: number; streak: number; maxStreak: number; score: number; };
  wrongCountMap: Record<string, number>;
  totalStats: { totalAttempts: number; correctAttempts: number; maxStreak: number; totalScore: number; };
}

const defaultPersist: WholeCharPersistData = {
  isPlaying: false,
  currentChar: charCodeData[0].char,
  currentCode: charCodeData[0].code,
  inputCode: '',
  stats: { totalAttempts: 0, correctAttempts: 0, streak: 0, maxStreak: 0, score: 0 },
  wrongCountMap: {},
  totalStats: { totalAttempts: 0, correctAttempts: 0, maxStreak: 0, totalScore: 0 },
};

// 保存当前模式的key
const CURRENT_MODE_KEY = 'ziyuan-whole-char-current-mode';

export default function WholeCharPracticePage() {
  // 从localStorage恢复上次选择的模式
  const [mode, setMode] = useState<WholeCharMode>(() => {
    const saved = localStorage.getItem(CURRENT_MODE_KEY);
    if (saved === 'progressive' || saved === 'progressive500') return saved;
    return 'progressive';
  });
  const [persistData, setPersistData] = useLocalStorage<Record<WholeCharMode, WholeCharPersistData>>(
    'ziyuan-whole-char-v2',
    { progressive: defaultPersist, progressive500: defaultPersist }
  );

  const safeData: Record<WholeCharMode, WholeCharPersistData> = {
    progressive: persistData.progressive ?? defaultPersist,
    progressive500: persistData.progressive500 ?? defaultPersist,
  };
  const currentData = safeData[mode];

  // 保存当前模式到localStorage
  useEffect(() => {
    localStorage.setItem(CURRENT_MODE_KEY, mode);
  }, [mode]);

  const progressiveLearning = useSpacedLearning({
    allItemIds: allCharIds, newItemsPerRound: 5, masteryThreshold: 3,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  const isPlaying = currentData.isPlaying;
  const stats = currentData.stats;

  const getLearning = useCallback(() => {
    return mode === 'progressive500' ? progressive500Learning : progressiveLearning;
  }, [mode, progressiveLearning, progressive500Learning]);

  const updateData = useCallback((updater: (prev: WholeCharPersistData) => WholeCharPersistData) => {
    setPersistData(prev => ({ ...prev, [mode]: updater(prev[mode] ?? defaultPersist) }));
  }, [mode, setPersistData]);

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
    setKeyFeedback(null);
    setFeedbackType(null);
    setShowAnswer(false);
  }, [updateData]);

  const clearData = useCallback(() => {
    updateData(() => defaultPersist);
  }, [updateData]);

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
        updateData(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            totalAttempts: prev.stats.totalAttempts + 1,
            correctAttempts: prev.stats.correctAttempts + 1,
            streak: prev.stats.streak + 1,
            maxStreak: Math.max(prev.stats.maxStreak, prev.stats.streak + 1),
            score: prev.stats.score + 10 + prev.stats.streak,
          },
          totalStats: {
            totalAttempts: prev.totalStats.totalAttempts + 1,
            correctAttempts: prev.totalStats.correctAttempts + 1,
            maxStreak: Math.max(prev.totalStats.maxStreak, prev.stats.streak + 1),
            totalScore: prev.totalStats.totalScore + 10 + prev.stats.streak,
          },
        }));
        feedbackTimer.current = setTimeout(() => {
          setKeyFeedback(null);
          setFeedbackType(null);
          generateNext();
        }, 500);
      }
    } else {
      setKeyFeedback(key);
      setFeedbackType('wrong');
      getLearning().recordResult(currentItem.char, false);
      updateData(prev => ({
        ...prev,
        wrongCountMap: { ...prev.wrongCountMap, [currentItem.char]: (prev.wrongCountMap[currentItem.char] || 0) + 1 },
        stats: { ...prev.stats, totalAttempts: prev.stats.totalAttempts + 1, streak: 0 },
        totalStats: { ...prev.totalStats, totalAttempts: prev.totalStats.totalAttempts + 1 },
      }));
      feedbackTimer.current = setTimeout(() => {
        setKeyFeedback(null);
        setFeedbackType(null);
        setInputCode('');
        updateData(prev => ({ ...prev, inputCode: '' }));
      }, 500);
    }
  }, [isPlaying, feedbackType, inputCode, currentItem, getLearning, updateData, generateNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || feedbackType) return;
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      } else if (e.key === 'Escape') {
        stopPractice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, feedbackType, handleKeyPress, stopPractice]);

  useEffect(() => {
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, []);

  useEffect(() => {
    if (isPlaying && inputRef.current) inputRef.current.focus();
  }, [isPlaying, currentItem]);

  const accuracy = stats.totalAttempts > 0 ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0;
  const totalAccuracy = currentData.totalStats.totalAttempts > 0
    ? Math.round((currentData.totalStats.correctAttempts / currentData.totalStats.totalAttempts) * 100) : 0;
  const learningStats = getLearning().stats;
  const weakItems = Object.entries(currentData.wrongCountMap).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  if (!isPlaying) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">整字练习</h1>
          <p className="text-muted-foreground">根据汉字打出对应的编码，共 {charCodeData.length} 个编码</p>
        </div>

        {/* 模式选择 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
          {(['progressive', 'progressive500'] as WholeCharMode[]).map((m) => {
            const config = modeConfig[m];
            const Icon = config.icon;
            const isActive = mode === m;
            return (
              <Card
                key={m}
                className={cn(
                  'cursor-pointer border-2 transition-all hover:shadow-lg',
                  isActive ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card hover:border-primary/30'
                )}
                onClick={() => setMode(m)}
              >
                <CardHeader className="text-center p-4">
                  <Icon className={cn('mx-auto mb-2 h-8 w-8', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <CardTitle className={cn('text-lg', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                    {config.label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* 学习进度 */}
        <Card className="mb-6 border-border bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {mode === 'progressive' ? '全部汉字学习进度' : '常用500字学习进度'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{learningStats.mastered}</div>
                  <div className="text-xs text-muted-foreground">已掌握</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{learningStats.active}</div>
                  <div className="text-xs text-muted-foreground">学习中</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">{learningStats.pending}</div>
                  <div className="text-xs text-muted-foreground">待学习</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{learningStats.progress}%</div>
                  <div className="text-xs text-muted-foreground">完成度</div>
                </div>
              </div>
              <Progress value={learningStats.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 历史记录 */}
        {currentData.totalStats.totalAttempts > 0 && (
          <Card className="mb-6 border-border bg-card/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground">历史学习记录</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearData} className="gap-1 text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">清除记录</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{currentData.totalStats.totalAttempts}</div>
                  <div className="text-xs text-muted-foreground">累计练习</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{totalAccuracy}%</div>
                  <div className="text-xs text-muted-foreground">历史正确率</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-500">{currentData.totalStats.maxStreak}</div>
                  <div className="text-xs text-muted-foreground">历史最高连击</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{weakItems.length}</div>
                  <div className="text-xs text-muted-foreground">待强化汉字</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 开始/继续按钮 */}
        <div className="text-center flex justify-center gap-4">
          {currentData.isPlaying && currentData.stats.totalAttempts > 0 && (
            <Button size="lg" variant="outline" onClick={continuePractice} className="gap-2 px-8">
              <Play className="h-5 w-5" />
              继续练习
            </Button>
          )}
          <Button size="lg" onClick={startPractice} className="gap-2 bg-primary px-10 text-primary-foreground">
            <Play className="h-5 w-5" />
            {currentData.isPlaying ? '重新开始' : '开始练习'}
          </Button>
        </div>
      </div>
    );
  }

  // 练习中
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 顶部状态栏 */}
      <div className="mb-4 flex items-center justify-between">
        <Badge variant="outline" className="text-muted-foreground">{modeConfig[mode].label}</Badge>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">正确率 <span className="font-semibold text-foreground">{accuracy}%</span></span>
          <Button variant="ghost" size="sm" onClick={stopPractice} className="gap-1 text-muted-foreground">
            <RotateCcw className="h-4 w-4" />退出
          </Button>
        </div>
      </div>

      {/* 练习区域 */}
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="space-y-6">
            {/* 汉字展示 */}
            <div className="text-center">
              <div className="text-8xl font-bold mb-4 select-none">{currentItem.char}</div>
              {/* 输入框 */}
              <div className="flex justify-center items-center gap-4">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    readOnly
                    placeholder="输入编码"
                    className="w-48 sm:w-56 h-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono bg-muted border-2 border-primary/30 rounded-xl focus:outline-none focus:border-primary"
                    value={inputCode.toUpperCase()}
                  />
                  {!inputCode && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none animate-pulse text-2xl">
                      ▎
                    </span>
                  )}
                </div>
                {showAnswer && (
                  <Badge variant="outline" className="text-lg">正确答案: {currentItem.code.toUpperCase()}</Badge>
                )}
              </div>
            </div>

            {/* 虚拟键盘 */}
            <div className="space-y-2">
              {keyboardRows.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1">
                  {row.map((key) => {
                    const isActive = keyFeedback === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyPress(key)}
                        className={cn(
                          'w-10 h-10 rounded-lg font-mono text-lg font-semibold transition-all border-2',
                          isActive && feedbackType === 'correct' && 'bg-emerald-500 text-white border-emerald-600 scale-110',
                          isActive && feedbackType === 'wrong' && 'bg-red-500 text-white border-red-600 scale-110',
                          !isActive && 'bg-card hover:bg-accent/10 border-border'
                        )}
                      >
                        {key.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" onClick={() => setShowAnswer(!showAnswer)} className="gap-2">
                <Info className="h-4 w-4" />{showAnswer ? '隐藏答案' : '显示答案'}
              </Button>
              <Button variant="outline" onClick={generateNext} className="gap-2">
                <RotateCcw className="h-4 w-4" />跳过
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '本轮题数', value: stats.totalAttempts },
          { label: '本轮正确', value: stats.correctAttempts },
          { label: '本轮连击', value: stats.streak },
          { label: '弱项汉字', value: weakItems.length },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/80">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}