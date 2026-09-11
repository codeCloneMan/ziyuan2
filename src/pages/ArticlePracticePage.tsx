import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCharCodeData } from '@/lib/data-loader';
import { buildFullCodeIndex, type FullCodeInfo } from '@/lib/full-codes';
import { buildArticleItems } from '@/lib/article-items';
import {
  isAutoCommitCorrect,
  isSpaceCommitCorrect,
  isCompleteCodeAwaitingSpace,
  AUTO_COMMIT_LENGTH,
} from '@/lib/code-commit';
import { PracticeKeyboard, RoundCompleteToast, PracticeStatsLine, ErrorItemsPanel } from '@/components/practice';
import { usePracticeRound } from '@/hooks/use-practice-round';
import { useArticleProgress } from '@/store/progress-store';
import { DEFAULT_ARTICLES, CUSTOM_ARTICLE_KEY } from '@/data/articles';
import {
  Play, RotateCcw, BookOpen, ArrowLeft, Eye, EyeOff, Trash2, FileText,
} from 'lucide-react';


export default function ArticlePracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const charCodeIndex = useMemo(
    () => (charCodeData ? buildFullCodeIndex(charCodeData) : new Map<string, FullCodeInfo>()),
    [charCodeData],
  );
  const { progress: articleProgress, recordChar } = useArticleProgress();

  // ============ 文章选择 / 自定义文本 ============
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_ARTICLES[0]?.id ?? 'common');
  const [customText, setCustomText] = useState<string>(() => {
    try { return localStorage.getItem(CUSTOM_ARTICLE_KEY) ?? ''; } catch { return ''; }
  });
  const [draftText, setDraftText] = useState(customText);
  const [showEditor, setShowEditor] = useState(false);

  const saveCustom = useCallback((text: string) => {
    setCustomText(text);
    setDraftText(text);
    try {
      if (text.trim()) localStorage.setItem(CUSTOM_ARTICLE_KEY, text);
      else localStorage.removeItem(CUSTOM_ARTICLE_KEY);
    } catch { /* 隐私模式等场景忽略 */ }
    if (text.trim()) setSelectedId('custom');
    setShowEditor(false);
  }, []);

  const [reviewMode, setReviewMode] = useState(false);
  // 易错字练习：聚合错次取前 20 个字
  const reviewChars = useMemo(
    () => Object.entries(articleProgress.wrongCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([ch]) => ch)
      .filter(ch => charCodeIndex.has(ch)),
    [articleProgress.wrongCountMap, charCodeIndex],
  );
  const errorItems = useMemo(
    () => Object.entries(articleProgress.wrongCountMap)
      .map(([ch, wrong]) => ({ id: ch, label: ch, wrong }))
      .sort((a, b) => b.wrong - a.wrong),
    [articleProgress.wrongCountMap],
  );

  const selectedArticle = DEFAULT_ARTICLES.find(a => a.id === selectedId);
  const baseText = selectedId === 'custom' ? customText : (selectedArticle?.text ?? '');
  const activeText = reviewMode ? reviewChars.join('') : baseText;
  const sourceLabel = reviewMode ? '易错字练习' : (selectedId === 'custom' ? '自定义文本' : (selectedArticle?.title ?? ''));

  // ============ 题目序列 ============
  const items = useMemo(
    () => (charCodeData ? buildArticleItems(activeText, charCodeIndex) : []),
    [charCodeData, activeText, charCodeIndex],
  );
  const itemIndexByTextIndex = useMemo(() => {
    const m = new Map<number, number>();
    items.forEach((it, i) => m.set(it.textIndex, i));
    return m;
  }, [items]);

  // ============ 练习状态 ============
  const roundKey = reviewMode ? 'article:review' : `article:${selectedId}`;
  const { completedRounds, seenCount: roundSeen, markSeen, resetRound } = usePracticeRound(roundKey, items.length);

  const [isPlaying, setIsPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [inputCode, setInputCode] = useState('');
  const [feedback, setFeedback] = useState<'correct' | null>(null);
  /** 刚打错的字（非阻断提示，立即进位后仍能看到错的是哪个字） */
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [wrongSet, setWrongSet] = useState<Set<number>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [roundToast, setRoundToast] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentSpanRef = useRef<HTMLSpanElement>(null);

  const current = isPlaying ? items[cursor] : undefined;
  const awaitingCommit = !!current && !feedback && isCompleteCodeAwaitingSpace(inputCode, current.codes);
  const accuracy = correctCount + wrongCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // 当前字滚动到可视区中间
  useEffect(() => {
    currentSpanRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [cursor, isPlaying]);

  const advance = useCallback(() => {
    setCursor(prev => {
      const next = prev + 1;
      if (next >= items.length) {
        // 走完全文 = 完成一轮，自动重开下一轮
        setRoundToast(completedRounds + 1);
        resetRound();
        setWrongSet(new Set());
        setCorrectCount(0);
        setWrongCount(0);
        return 0;
      }
      return next;
    });
    setInputCode('');
    setFeedback(null);
  }, [items.length, completedRounds, resetRound]);

  /** 判定当前字（满 4 键自动 / 空格上屏） */
  const judge = useCallback((code: string, trigger: 'keys' | 'space') => {
    if (!current) return;
    const ok = trigger === 'space'
      ? isSpaceCommitCorrect(code, current.codes)
      : isAutoCommitCorrect(code, current.codes);
    recordChar(current.char, ok);
    // 轮次口径：对错都算这个字答过一次
    markSeen(String(current.textIndex));
    if (timerRef.current) clearTimeout(timerRef.current);
    if (ok) {
      setCorrectCount(c => c + 1);
      setFeedback('correct');
      timerRef.current = setTimeout(advance, 150);
    } else {
      // 打错立即进位（模仿打字练习工具）：不阻断打字节奏，错误只留红痕 + 提示
      setWrongCount(c => c + 1);
      setWrongSet(prev => new Set(prev).add(cursor));
      setWrongFlash(current.char);
      advance();
      timerRef.current = setTimeout(() => setWrongFlash(null), 1200);
    }
  }, [current, cursor, recordChar, markSeen, advance]);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || !current || feedback === 'correct') return;
    const newCode = inputCode + key;
    if (newCode.length > AUTO_COMMIT_LENGTH) return;
    setInputCode(newCode);
    if (newCode.length < AUTO_COMMIT_LENGTH) return;
    judge(newCode, 'keys');
  }, [isPlaying, current, feedback, inputCode, judge]);

  const handleSpaceCommit = useCallback((): boolean => {
    if (!isPlaying || !current || !inputCode || feedback === 'correct') return false;
    judge(inputCode, 'space');
    return true;
  }, [isPlaying, current, inputCode, feedback, judge]);

  const handleBackspace = useCallback(() => {
    if (!isPlaying || feedback === 'correct') return;
    setInputCode(prev => prev.slice(0, -1));
  }, [isPlaying, feedback]);

  // 物理键盘
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') { setIsPlaying(false); return; }
      if (e.key === ' ') { e.preventDefault(); handleSpaceCommit(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) { e.preventDefault(); handleKeyPress(key); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, handleKeyPress, handleSpaceCommit, handleBackspace]);

  const startPractice = useCallback((text?: string) => {
    const t = text ?? activeText;
    if (!t.trim() || !charCodeData) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setCursor(0);
    setInputCode('');
    setFeedback(null);
    setWrongSet(new Set());
    setCorrectCount(0);
    setWrongCount(0);
    resetRound();
    setIsPlaying(true);
  }, [activeText, charCodeData, resetRound]);

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

  const chars = [...activeText];
  const itemCount = items.length;

  return (
    <div className="min-h-screen bg-background">
      {/* ===== 选择文章 ===== */}
      {!isPlaying && (
        <div className="min-h-[calc(100vh-3.5rem)] bg-mesh">
          <section className="container-page py-10 sm:py-16">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-8 sm:mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                  文章<span className="text-gradient-primary">练习</span>
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  照着文章逐字打编码：满 4 键自动上屏、不足 4 键按空格；标点自动跳过，打错也会继续往下打（错字标红留痕）
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
                <div className="lg:col-span-3 card-base !rounded-2xl p-6 sm:p-8 flex flex-col">
                  <div className="flex-1 flex items-center justify-center py-2 mb-6">
                    <button
                      onClick={() => startPractice()}
                      disabled={!baseText.trim() || itemCount === 0}
                      className="group inline-flex items-center gap-3 rounded-2xl bg-primary text-primary-foreground px-10 py-4 text-lg font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                      开始练习
                    </button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground/70 mb-4">
                    当前文章：{sourceLabel} · 可练 {itemCount} 字 · 已完成 {completedRounds} 轮
                  </p>
                  <PracticeStatsLine
                    roundNo={completedRounds + 1}
                    seen={roundSeen}
                    total={itemCount}
                    accuracy={accuracy}
                      className="mb-4"
                  />
                  <ErrorItemsPanel
                    items={errorItems}
                    onDrill={reviewChars.length > 0 ? () => { setReviewMode(true); startPractice(reviewChars.join('')); } : undefined}
                    title="易错字（答错次数）"
                  />
                </div>

                <div className="lg:col-span-2 card-base !rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-serif">选择文章</h2>
                  <div className="space-y-2 mb-5">
                    {DEFAULT_ARTICLES.map(a => (
                      <button key={a.id} onClick={() => { setSelectedId(a.id); setReviewMode(false); }}
                        className={cn('w-full p-3 rounded-xl border text-left transition-all duration-200',
                          selectedId === a.id && !reviewMode
                            ? 'border-primary/40 bg-primary/[0.05] shadow-sm'
                            : 'border-border/50 hover:border-primary/25 hover:bg-primary/[0.02]')}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          {a.title}
                        </div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5">{a.source} · {[...a.text].length} 字</div>
                      </button>
                    ))}
                    <button onClick={() => { setSelectedId('custom'); setReviewMode(false); setShowEditor(true); }}
                      disabled={!customText.trim()}
                      className={cn('w-full p-3 rounded-xl border text-left transition-all duration-200 disabled:opacity-50',
                        selectedId === 'custom' && !reviewMode
                          ? 'border-primary/40 bg-primary/[0.05] shadow-sm'
                          : 'border-border/50 hover:border-primary/25 hover:bg-primary/[0.02]')}>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        自定义文本
                      </div>
                      <div className="text-xs text-muted-foreground/70 mt-0.5">
                        {customText.trim() ? `${[...customText].length} 字` : '还没粘贴内容'}
                      </div>
                    </button>
                  </div>

                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mb-3"
                    onClick={() => setShowEditor(v => !v)}>
                    <FileText className="h-3.5 w-3.5" />{showEditor ? '收起编辑框' : '粘贴 / 编辑自定义文本'}
                  </Button>
                  {customText.trim() && (
                    <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-red-400 hover:text-red-600"
                      onClick={() => saveCustom('')}>
                      <Trash2 className="h-3.5 w-3.5" />清除自定义文本
                    </Button>
                  )}

                  {showEditor && (
                    <div className="mt-3">
                      <textarea
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                        rows={8}
                        placeholder="把要练习的文章粘贴到这里（标点会自动跳过）"
                        className="w-full text-xs p-2 rounded-lg border border-border bg-muted/40 focus:outline-none focus:border-primary/40 resize-y"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-muted-foreground">{[...draftText].length} 字</span>
                        <Button size="sm" className="gap-1.5 text-xs" onClick={() => saveCustom(draftText)}>
                          保存并使用
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ===== 练习区 ===== */}
      {isPlaying && (
        <section className="py-4 sm:py-8">
          <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center gap-2 mb-3">
              <PracticeStatsLine
                roundNo={completedRounds + 1}
                seen={roundSeen}
                total={itemCount}
                accuracy={accuracy}
                  extra={reviewMode ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium">易错字练习</span>
                ) : undefined}
              />
              <button
                onClick={() => { setIsPlaying(false); setInputCode(''); setFeedback(null); setReviewMode(false); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800 transition-colors shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />退出
                <kbd className="hidden sm:inline ml-0.5 px-1 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/50 rounded font-mono">Esc</kbd>
              </button>
            </div>

            {/* 文章正文（当前字高亮；已答/答错着色） */}
            <div className="card-base p-4 sm:p-6 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{sourceLabel}</span>
                <button onClick={() => setShowHint(v => !v)}
                  className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                    showHint ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground')}>
                  {showHint ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showHint ? '提示开' : '提示关'}
                </button>
              </div>
              <div className="max-h-[45vh] overflow-y-auto leading-loose text-lg sm:text-xl tracking-wide whitespace-pre-wrap break-all">
                {chars.map((ch, ti) => {
                  const itemIdx = itemIndexByTextIndex.get(ti);
                  if (itemIdx === undefined) {
                    return <span key={ti} className="text-muted-foreground/40">{ch}</span>;
                  }
                  const isCurrent = itemIdx === cursor;
                  const isDone = itemIdx < cursor;
                  const wasWrong = wrongSet.has(itemIdx);
                  return (
                    <span
                      key={ti}
                      ref={isCurrent ? currentSpanRef : undefined}
                      className={cn(
                        'rounded px-0.5 transition-colors',
                        isCurrent && 'bg-primary/15 text-primary font-bold ring-2 ring-primary/40',
                        isDone && wasWrong && 'text-amber-600 dark:text-amber-400',
                        isDone && !wasWrong && 'text-emerald-600 dark:text-emerald-400',
                        !isCurrent && !isDone && 'text-foreground/70',
                      )}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
              {showHint && current && (
                <div className="mt-2 text-center text-sm font-mono text-amber-600 dark:text-amber-400">
                  {current.char} → {current.codes.map(c => c.toUpperCase()).join(' / ')}
                </div>
              )}
            </div>

            {/* 输入显示 */}
            <div className="flex justify-center gap-1.5 mb-2">
              {Array.from({ length: AUTO_COMMIT_LENGTH }).map((_, i) => {
                const ch = inputCode[i];
                const isCurrent = !feedback && !ch && i === inputCode.length;
                return (
                  <div key={i} className={cn(
                    'w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center text-lg font-mono font-bold uppercase transition-all duration-150',
                    ch && 'border-primary bg-primary/5',
                    !ch && isCurrent && 'border-primary ring-2 ring-primary/40 bg-primary/[0.03]',
                    !ch && !isCurrent && 'border-border/60',
                  )}>
                    {ch ? ch.toUpperCase() : ''}
                  </div>
                );
              })}
            </div>

            {awaitingCommit && (
              <div className="text-center text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                已打完整编码 · 按
                <kbd className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-[10px]">空格</kbd>
                上屏
              </div>
            )}
            {wrongFlash && (
              <div className="text-center text-xs text-red-600 dark:text-red-400 mb-2">
                「{wrongFlash}」打错了 · 已继续往下打（错字标红留痕）
              </div>
            )}

            <PracticeKeyboard
              mode="codes"
              keyFeedback={null}
              feedbackType={feedback}
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              onSpace={() => { if (!feedback) handleSpaceCommit(); }}
              headerLeft="编码键盘"
              headerRight={<span className="text-[10px] text-muted-foreground">{cursor + 1}/{itemCount}</span>}
            />

            <div className="flex justify-center mt-3">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => startPractice()}>
                <RotateCcw className="h-3.5 w-3.5" />从头再来
              </Button>
            </div>
          </div>
        </section>
      )}

      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />
    </div>
  );
}
