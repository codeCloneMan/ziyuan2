import { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { charCodeData } from '@/data/charCodeData';
import { twoCharPhrases, threeCharPhrases, fourCharPhrases } from '@/data/builtinPhrases';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  Play, RotateCcw, Trophy, CheckCircle2, XCircle,
  Zap, Target, Eye, EyeOff, Keyboard, BookOpen,
} from 'lucide-react';

// 词组类型
interface PhraseItem {
  phrase: string;
  codes: string[];      // 每个字的编码
  fullCode: string;     // 完整编码（拼接）
}

// 练习模式
type PhraseMode = 'twoChar' | 'threeChar' | 'fourChar' | 'mixed' | 'sentence';

const modeConfig: Record<PhraseMode, { label: string; description: string; icon: typeof Zap }> = {
  twoChar: { label: '双字词', description: '练习常用双字词组', icon: BookOpen },
  threeChar: { label: '三字词', description: '练习常用三字词组', icon: BookOpen },
  fourChar: { label: '四字词', description: '练习四字词和成语', icon: BookOpen },
  mixed: { label: '混合词组', description: '混合练习双字和三字词', icon: Zap },
  sentence: { label: '短句练习', description: '练习常用短句', icon: Keyboard },
};

// 短句数据
const commonShortSentences: string[] = [
  '我们一起去',
  '今天天气好',
  '学习很重要',
  '工作完成了',
  '谢谢大家',
  '请问您贵姓',
  '很高兴认识',
  '请多关照',
  '祝你成功',
  '一路顺风',
  '生日快乐',
  '万事如意',
  '身体健康',
  '好好学习',
  '天天向上',
  '改革开放',
  '科学发展',
  '和谐社会',
  '美好家园',
  '共同努力',
];

// 根据汉字和编码数据生成词组的编码
function generatePhraseCodes(phrase: string): { codes: string[]; fullCode: string } {
  const codes: string[] = [];
  const charCodeMap = new Map<string, string[]>();
  
  // 构建汉字到编码的映射
  for (const item of charCodeData) {
    if (!charCodeMap.has(item.char)) {
      charCodeMap.set(item.char, []);
    }
    if (!charCodeMap.get(item.char)!.includes(item.code)) {
      charCodeMap.get(item.char)!.push(item.code);
    }
  }
  
  // 获取每个字的首选编码（最短的）
  for (const char of phrase) {
    const charCodes = charCodeMap.get(char);
    if (charCodes && charCodes.length > 0) {
      // 选择最短的编码作为首选
      const shortest = charCodes.reduce((a, b) => a.length <= b.length ? a : b);
      codes.push(shortest);
    } else {
      codes.push('?'); // 未知编码
    }
  }
  
  // 生成完整编码（取每个字编码的首字母或按规则）
  // 这里使用简化的规则：双字词取每个字全码，三字词取前两个字首码+第三字全码
  let fullCode = '';
  if (phrase.length === 2) {
    // 双字词：各取全码
    fullCode = codes.join('');
  } else if (phrase.length === 3) {
    // 三字词：取首字首码 + 次字首码 + 第三字全码（简化规则）
    fullCode = (codes[0][0] || '') + (codes[1][0] || '') + codes[2];
  } else {
    // 其他：取前两个字首码 + 最后一个字全码
    fullCode = (codes[0][0] || '') + (codes[1][0] || '') + codes[codes.length - 1];
  }
  
  return { codes, fullCode };
}

// 构建词组列表
function buildPhraseList(mode: PhraseMode): PhraseItem[] {
  const phrases: PhraseItem[] = [];
  const seen = new Set<string>();
  
  const addPhrase = (phrase: string) => {
    if (seen.has(phrase)) return;
    seen.add(phrase);
    const { codes, fullCode } = generatePhraseCodes(phrase);
    // 只添加所有字都有编码的词组
    if (!codes.includes('?')) {
      phrases.push({ phrase, codes, fullCode });
    }
  };
  
  if (mode === 'twoChar' || mode === 'mixed') {
    for (const phrase of twoCharPhrases) {
      if (phrase.length === 2) addPhrase(phrase);
    }
  }

  if (mode === 'threeChar' || mode === 'mixed') {
    for (const phrase of threeCharPhrases) {
      if (phrase.length >= 3) {
        // 对于混合模式，取前3字
        const shortPhrase = phrase.slice(0, 3);
        addPhrase(shortPhrase);
      }
    }
  }

  if (mode === 'fourChar') {
    for (const phrase of fourCharPhrases) {
      if (phrase.length >= 4) {
        addPhrase(phrase);
      }
    }
  }
  
  if (mode === 'sentence') {
    for (const sentence of commonShortSentences) {
      addPhrase(sentence);
    }
  }
  
  return phrases;
}

// 打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 统计信息类型
interface PhraseStats {
  totalAttempts: number;
  correctAttempts: number;
  wrongChars: Record<string, number>;
  startTime: number;
  totalCharsTyped: number;   // 总输入字数（用于速度计算）
  totalInputTime: number;    // 总输入时间（ms）
}

export default function PhrasePracticePage() {
  const [mode, setMode] = useLocalStorage<PhraseMode>('phrase-mode', 'twoChar');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState<PhraseItem | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PhraseStats>({
    totalAttempts: 0,
    correctAttempts: 0,
    wrongChars: {},
    startTime: 0,
    totalCharsTyped: 0,
    totalInputTime: 0,
  });
  const [sessionResults, setSessionResults] = useState<Array<{ phrase: string; correct: boolean; input: string; time: number }>>([]);
  const [showStats, setShowStats] = useState(false);
  const [phraseQueue, setPhraseQueue] = useState<PhraseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  
  // 构建词组池
  const phrasePool = useMemo(() => buildPhraseList(mode), [mode]);
  
  // 开始练习
  const startPractice = useCallback(() => {
    if (phrasePool.length === 0) return;
    const shuffled = shuffleArray(phrasePool).slice(0, 20); // 每次练习20个
    setPhraseQueue(shuffled);
    setCurrentIndex(0);
    setCurrentPhrase(shuffled[0]);
    setIsPlaying(true);
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setSessionResults([]);
    setStats(prev => ({ ...prev, startTime: Date.now() }));
    startTimeRef.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [phrasePool]);
  
  // 下一题
  const nextPhrase = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < phraseQueue.length) {
      setCurrentIndex(nextIndex);
      setCurrentPhrase(phraseQueue[nextIndex]);
      setUserInput('');
      setShowAnswer(false);
      setIsCorrect(null);
      startTimeRef.current = Date.now();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // 练习结束
      setIsPlaying(false);
      setShowStats(true);
    }
  }, [currentIndex, phraseQueue]);
  
  // 检查答案
  const checkAnswer = useCallback(() => {
    if (!currentPhrase || !userInput.trim()) return;
    
    const input = userInput.trim().toLowerCase();
    const correct = input === currentPhrase.fullCode.toLowerCase();
    const time = Date.now() - startTimeRef.current;
    
    setIsCorrect(correct);
    setShowAnswer(true);
    
    setStats(prev => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
      correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
      totalCharsTyped: prev.totalCharsTyped + currentPhrase.phrase.length,
      totalInputTime: prev.totalInputTime + time,
    }));
    
    setSessionResults(prev => [...prev, {
      phrase: currentPhrase.phrase,
      correct,
      input,
      time,
    }]);
    
    // 自动下一题（延迟1.5秒）
    setTimeout(() => {
      nextPhrase();
    }, 1500);
  }, [currentPhrase, userInput, nextPhrase]);
  
  // 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!showAnswer) {
        checkAnswer();
      }
    }
  }, [showAnswer, checkAnswer]);
  
  // 正确率
  const accuracy = stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
    : 0;
  
  // 打字速度（字/分钟）
  const typingSpeed = stats.totalInputTime > 0
    ? Math.round((stats.totalCharsTyped / stats.totalInputTime) * 60000)
    : 0;

  // 错误率
  const errorRate = stats.totalAttempts > 0
    ? Math.round(((stats.totalAttempts - stats.correctAttempts) / stats.totalAttempts) * 100)
    : 0;

  // 平均用时（毫秒）
  const avgTime = stats.totalAttempts > 0
    ? Math.round(stats.totalInputTime / stats.totalAttempts)
    : 0;
  
  // 当前进度
  const progress = phraseQueue.length > 0
    ? (currentIndex / phraseQueue.length) * 100
    : 0;
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 标题区 */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">词组练习</h1>
        <Badge variant="secondary">{phrasePool.length} 个词组可用</Badge>
      </div>
      
      {/* 模式选择 */}
      {!isPlaying && !showStats && (
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
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Icon className={cn('h-5 w-5 mb-2', mode === m ? 'text-primary' : 'text-muted-foreground')} />
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{config.description}</div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* 开始按钮或练习区 */}
      {!isPlaying && !showStats && (
        <div className="text-center py-8">
          <Button size="lg" onClick={startPractice} className="gap-2">
            <Play className="h-5 w-5" />
            开始练习
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            当前模式：{modeConfig[mode].label}，共 {phrasePool.length} 个词组
          </p>
        </div>
      )}
      
      {/* 练习区域 */}
      {isPlaying && currentPhrase && (
        <div className="space-y-6">
          {/* 进度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>进度 {currentIndex + 1} / {phraseQueue.length}</span>
              <span>正确率 {accuracy}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* 词组显示 */}
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl font-bold tracking-wider">
              {currentPhrase.phrase}
            </div>
            
            {/* 单字编码提示 */}
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              {currentPhrase.phrase.split('').map((char, i) => (
                <div key={i} className="text-center">
                  <div className="font-medium">{char}</div>
                  <div className={cn(
                    'font-mono transition-opacity',
                    showAnswer ? 'opacity-100' : 'opacity-0'
                  )}>
                    {currentPhrase.codes[i]}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 完整编码显示 */}
            {showAnswer && (
              <div className={cn(
                'text-2xl font-mono font-bold py-2 px-4 rounded-lg inline-block',
                isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              )}>
                {currentPhrase.fullCode}
                {isCorrect ? (
                  <CheckCircle2 className="inline h-5 w-5 ml-2" />
                ) : (
                  <XCircle className="inline h-5 w-5 ml-2" />
                )}
              </div>
            )}
          </div>
          
          {/* 输入区 */}
          <div className="max-w-md mx-auto space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.toLowerCase())}
                onKeyDown={handleKeyDown}
                placeholder="输入词组编码..."
                disabled={showAnswer}
                className={cn(
                  'w-full px-4 py-3 text-lg font-mono text-center border-2 rounded-lg outline-none transition-colors',
                  showAnswer
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-border focus:border-primary'
                )}
              />
            </div>
            
            <div className="flex gap-2 justify-center">
              {!showAnswer ? (
                <Button onClick={checkAnswer} className="gap-2">
                  <Target className="h-4 w-4" />
                  确认 (Enter)
                </Button>
              ) : (
                <Button onClick={nextPhrase} variant="outline" className="gap-2">
                  <Zap className="h-4 w-4" />
                  下一题
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAnswer(!showAnswer)}
                title="显示/隐藏答案"
              >
                {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* 提示 */}
          <div className="text-center text-xs text-muted-foreground">
            <p>提示：双字词一般取各字全码，三字词取首尾规则</p>
          </div>
        </div>
      )}
      
      {/* 统计结果 */}
      {showStats && (
        <div className="space-y-6">
          <div className="text-center py-6">
            <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold">练习完成！</h2>
            <p className="text-muted-foreground mt-1">
              共完成 {sessionResults.length} 个词组
            </p>
          </div>
          
          {/* 统计卡片 */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="p-4 rounded-xl bg-muted text-center">
              <div className="text-2xl font-bold text-emerald-600">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">正确率</div>
            </div>
            <div className="p-4 rounded-xl bg-muted text-center">
              <div className="text-2xl font-bold text-blue-600">{typingSpeed}</div>
              <div className="text-xs text-muted-foreground">字/分钟</div>
            </div>
            <div className="p-4 rounded-xl bg-muted text-center">
              <div className="text-2xl font-bold text-amber-600">{errorRate}%</div>
              <div className="text-xs text-muted-foreground">错误率</div>
            </div>
            <div className="p-4 rounded-xl bg-muted text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(avgTime / 1000).toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">平均用时</div>
            </div>
          </div>
          
          {/* 详细结果 */}
          <div className="border rounded-xl overflow-hidden">
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
                  <span className="text-muted-foreground w-6">{i + 1}</span>
                  <span className="font-medium w-20">{result.phrase}</span>
                  <span className={cn(
                    'font-mono',
                    result.correct ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {result.input}
                  </span>
                  {!result.correct && (
                    <span className="text-xs text-muted-foreground">
                      (正确答案：{phraseQueue[i]?.fullCode})
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round(result.time / 1000)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-3 justify-center">
            <Button onClick={startPractice} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              再来一次
            </Button>
            <Button variant="outline" onClick={() => { setShowStats(false); setIsPlaying(false); }}>
              返回模式选择
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}