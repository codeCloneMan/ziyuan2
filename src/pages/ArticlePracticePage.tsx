import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCharCodeData } from '@/lib/data-loader';
import { buildFullCodeIndex, type FullCodeInfo } from '@/lib/full-codes';
import {
  buildCharsByCode, candidatesFor, resolveCommitChar,
} from '@/lib/ime-candidates';
import { buildArticleItems } from '@/lib/article-items';
import { isCompleteCodeAwaitingSpace, AUTO_COMMIT_LENGTH } from '@/lib/code-commit';
import { PracticeKeyboard, RoundCompleteToast, PracticeStatsLine, ErrorItemsPanel } from '@/components/practice';
import { usePracticeRound } from '@/hooks/use-practice-round';
import { useArticleProgress } from '@/store/progress-store';
import { charFrequency } from '@/data/charFrequency';
import {
  DEFAULT_ARTICLES, CUSTOM_ARTICLE_KEY, COMMON500_ARTICLE_ID, ARTICLE_SHUFFLE_KEY,
  shuffledCommon500Text,
} from '@/data/articles';
import {
  Play, RotateCcw, BookOpen, ArrowLeft, Eye, EyeOff, Trash2, FileText, Keyboard, Shuffle,
} from 'lucide-react';

/** 跟打器式固定窗口显示的行数（每行 = 原文一行 + 紧跟其下的跟打行，当前字固定在第 ARTICLE_ROWS-1 行） */
const ARTICLE_ROWS = 4;

/** 原文行/跟打行共用的行高倍数与字格高度（2 行 × 1.45em） */
const ROW_LINE_HEIGHT = 1.45;
const CELL_EM = `${ROW_LINE_HEIGHT * 2}em`;

/** 未打过的字，下方跟打位留空但必须占位，否则行高会塌 */
const NBSP = '\u00A0';


export default function ArticlePracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const charCodeIndex = useMemo(
    () => (charCodeData ? buildFullCodeIndex(charCodeData) : new Map<string, FullCodeInfo>()),
    [charCodeData],
  );
  const { progress: articleProgress, recordChar, retractChar } = useArticleProgress();

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

  // 常用字 500 的乱序开关：开启后每次开始练习重新打乱（本机记忆）
  const [shuffleOn, setShuffleOn] = useState<boolean>(() => {
    try { return localStorage.getItem(ARTICLE_SHUFFLE_KEY) === '1'; } catch { return false; }
  });
  const [shuffledText, setShuffledText] = useState('');

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
  const isCommon500 = selectedId === COMMON500_ARTICLE_ID;
  const canShuffle = !!selectedArticle?.shufflable;
  const baseText = selectedId === 'custom'
    ? customText
    : (isCommon500 && shuffleOn ? (shuffledText || selectedArticle?.text || '') : (selectedArticle?.text ?? ''));
  const activeText = reviewMode ? reviewChars.join('') : baseText;
  const sourceLabel = reviewMode
    ? '易错字练习'
    : (selectedId === 'custom' ? '自定义文本' : (selectedArticle?.title ?? ''));
  const shuffleActive = isCommon500 && shuffleOn && !reviewMode;

  /** 开/关乱序：开启时立刻打乱一次，并本机记住 */
  const toggleShuffle = useCallback(() => {
    setShuffleOn(prev => {
      const next = !prev;
      try {
        if (next) localStorage.setItem(ARTICLE_SHUFFLE_KEY, '1');
        else localStorage.removeItem(ARTICLE_SHUFFLE_KEY);
      } catch { /* 隐私模式忽略 */ }
      if (next) setShuffledText(shuffledCommon500Text());
      else setShuffledText('');
      return next;
    });
  }, []);

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
  // 打错的字留下的「你实际打出的字」（item 下标 → 字；打不出字记 '✕'），在字下方红色常显
  const [producedChars, setProducedChars] = useState<Record<number, string>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  /** 回改次数：退回去重打的次数（跟打器口径） */
  const [undoCount, setUndoCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [roundToast, setRoundToast] = useState<number | null>(null);
  // 打字工具口径：击键数（含上屏空格）与用时，用于算速度 / 击键 / 码长
  const [keyStrokes, setKeyStrokes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  // 触屏设备默认展开虚拟键盘，桌面默认收起，保持「纯打字工具」的干净版面
  const [showKeyboard, setShowKeyboard] = useState(() => {
    try {
      const saved = localStorage.getItem('ziyuan-article-keyboard');
      if (saved === '0') return false;
      if (saved === '1') return true;
    } catch { /* 隐私模式忽略 */ }
    return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startedAtRef = useRef(0);
  const currentCellRef = useRef<HTMLSpanElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const candBoxRef = useRef<HTMLDivElement>(null);

  // ============ 输入法候选 ============
  // 码 → 字们（一个码可能对应多个字，与输入法的重码候选一致）；
  // 排序口径统一在 lib/ime-candidates：同码字按字频降序，绝不能用码表插入顺序
  const charsByCode = useMemo(() => buildCharsByCode(charCodeIndex), [charCodeIndex]);
  const sortedCodes = useMemo(() => [...charsByCode.keys()].sort(), [charsByCode]);

  const candidates = useMemo(
    () => (isPlaying && inputCode
      ? candidatesFor(inputCode, charsByCode, sortedCodes, charFrequency)
      : []),
    [isPlaying, inputCode, charsByCode, sortedCodes],
  );

  // 键盘事件里要读最新的候选列表（事件监听只挂一次）
  const candidatesRef = useRef<string[]>([]);
  useEffect(() => { candidatesRef.current = candidates; }, [candidates]);

  const current = isPlaying ? items[cursor] : undefined;
  const awaitingCommit = !!current && !feedback && isCompleteCodeAwaitingSpace(inputCode, current.codes);
  const accuracy = correctCount + wrongCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;

  // 打字工具三项指标：速度（字/分）、击键（击/秒）、码长（平均每字击键数）
  const committed = correctCount + wrongCount;
  const elapsedSec = elapsedMs / 1000;
  const speed = elapsedSec > 1 ? Math.round(committed / (elapsedSec / 60)) : 0;
  const kps = elapsedSec > 1 ? keyStrokes / elapsedSec : 0;
  const avgLen = committed > 0 ? keyStrokes / committed : 0;

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // 计时：练习中每 0.5s 刷新一次用时，速度才会跟着动
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 500);
    return () => clearInterval(t);
  }, [isPlaying]);

  // 跟打器式固定窗口：面板高度 = 4 行，当前字固定在窗口内第 3 行，上下自动滚。
  // 行高与当前位置都用 getBoundingClientRect 的小数值量（offsetHeight/offsetTop 取整会累积出 1~2px 行缝）。
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const cell = (currentCellRef.current ?? board.querySelector('[data-cell]')) as HTMLElement | null;
    if (!cell) return;
    const lineH = cell.getBoundingClientRect().height;
    if (!lineH) return;
    board.style.height = `${lineH * ARTICLE_ROWS}px`;
    const cur = currentCellRef.current as HTMLElement | null;
    if (cur) {
      const curTop = cur.getBoundingClientRect().top - board.getBoundingClientRect().top + board.scrollTop;
      board.scrollTop = Math.max(0, curTop - lineH * (ARTICLE_ROWS - 2));
    }
  }, [cursor, isPlaying, items]);

  /**
   * 输入法候选窗跟随光标：锚在当前字「正在敲的码」左下方（下方放不下就翻到上方，
   * 右侧超界就整体左移）。用 position: fixed + 直接改 style，避免 setState-in-effect，
   * 同时不受正文窗口 overflow-hidden 裁切。
   */
  useLayoutEffect(() => {
    const box = candBoxRef.current;
    const cell = currentCellRef.current;
    if (!box || !cell) return;
    const place = () => {
      const r = cell.getBoundingClientRect();
      const w = box.offsetWidth;
      const h = box.offsetHeight;
      const margin = 8;
      let left = r.left;
      if (left + w > window.innerWidth - margin) left = window.innerWidth - margin - w;
      left = Math.max(margin, left);
      let top = r.bottom + 4;
      if (top + h > window.innerHeight - margin) {
        top = r.top - h - 4;
        if (top < margin) top = Math.min(window.innerHeight - margin - h, r.bottom + 4);
      }
      box.style.left = `${Math.round(left)}px`;
      box.style.top = `${Math.round(top)}px`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [inputCode, candidates, cursor, isPlaying]);

  const advance = useCallback(() => {
    const next = cursor + 1;
    if (next >= items.length) {
      // 走完全文 = 完成一轮，自动重开下一轮（速度统计同步归零重新计）
      setRoundToast(completedRounds + 1);
      resetRound();
      setProducedChars({});
      setUndoCount(0);
      setCorrectCount(0);
      setWrongCount(0);
      setKeyStrokes(0);
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setCursor(0);
    } else {
      setCursor(next);
    }
    setInputCode('');
    setFeedback(null);
  }, [cursor, items.length, completedRounds, resetRound]);

  /**
   * 上屏一个字：produced = 你实际打出的字（满 4 键/空格顶第 1 候选；点候选则直接是那个字）。
   * 判定即「打出的字 == 原文字」——与跟打器的比对方式一致；打不出字给 null（显示红叉）。
   * typedCode = 这次上屏实际敲下的码，用于击键统计（第 4 键触发时也要算上第 4 键）。
   */
  const commitChar = useCallback((produced: string | null, typedCode: string, trigger: 'keys' | 'space' | 'pick') => {
    if (!current) return;
    const ok = produced !== null && produced === current.char;
    setKeyStrokes(k => k + typedCode.length + (trigger === 'keys' ? 0 : 1));
    recordChar(current.char, ok);
    // 轮次口径：对错都算这个字答过一次
    markSeen(String(current.textIndex));
    if (timerRef.current) clearTimeout(timerRef.current);
    if (ok) {
      setProducedChars(prev => {
        if (prev[cursor] === undefined) return prev;
        const next = { ...prev };
        delete next[cursor];
        return next;
      });
      setCorrectCount(c => c + 1);
      setFeedback('correct');
      timerRef.current = setTimeout(advance, 150);
    } else {
      // 打错立即进位（模仿打字练习工具）：不阻断打字节奏，打出的那个字在下方红色留痕
      setWrongCount(c => c + 1);
      setProducedChars(prev => ({ ...prev, [cursor]: produced ?? '✕' }));
      setWrongFlash(current.char);
      advance();
      timerRef.current = setTimeout(() => setWrongFlash(null), 1200);
    }
  }, [current, cursor, recordChar, markSeen, advance]);

  /**
   * 满 4 键自动顶屏 / 空格上屏：打出的字由 lib/ime-candidates 决定——
   * 精确命中该码时取该码的**第 1 候选**（与候选框显示的第 1 个一致），
   * 满 4 键且码不足 4 键时容忍多打的第 4 键（回退到前 3 键），空格则只认精确码。
   */
  const commitCode = useCallback((code: string, trigger: 'keys' | 'space') => {
    commitChar(
      resolveCommitChar(code, charsByCode, charFrequency, trigger === 'keys'),
      code,
      trigger,
    );
  }, [commitChar, charsByCode]);

  /** 数字键 / 点击候选：直接选中该候选字上屏（输入法的显式选字） */
  const pickCandidate = useCallback((char: string) => {
    if (!isPlaying || !current || feedback === 'correct' || !inputCode) return;
    commitChar(char, inputCode, 'pick');
  }, [isPlaying, current, feedback, inputCode, commitChar]);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || !current || feedback === 'correct') return;
    const newCode = inputCode + key;
    if (newCode.length > AUTO_COMMIT_LENGTH) return;
    setInputCode(newCode);
    if (newCode.length < AUTO_COMMIT_LENGTH) return;
    commitCode(newCode, 'keys');
  }, [isPlaying, current, feedback, inputCode, commitCode]);

  const handleSpaceCommit = useCallback((): boolean => {
    if (!isPlaying || !current || !inputCode || feedback === 'correct') return false;
    commitCode(inputCode, 'space');
    return true;
  }, [isPlaying, current, inputCode, feedback, commitCode]);

  /**
   * 退格：有正在敲的码先删码；码删空后再按 → **删掉上一个已打出的字**（打对的也删），
   * 光标退回那一个字重打，并撤销那次的记录（按最终结果算），记一次「回改」。
   */
  const handleBackspace = useCallback(() => {
    if (!isPlaying || feedback === 'correct') return;
    if (inputCode) {
      setInputCode(prev => prev.slice(0, -1));
      return;
    }
    const prevIdx = cursor - 1;
    const item = items[prevIdx];
    if (!item) return;
    const produced = producedChars[prevIdx];
    // 打出的字就是原文字（或没有失败记录）→ 那次是答对的，回退要撤销正确记录
    const wasCorrect = produced === undefined || produced === item.char;
    retractChar(item.char, wasCorrect);
    setProducedChars(prev => {
      if (prev[prevIdx] === undefined) return prev;
      const next = { ...prev };
      delete next[prevIdx];
      return next;
    });
    if (wasCorrect) setCorrectCount(c => Math.max(0, c - 1));
    else setWrongCount(c => Math.max(0, c - 1));
    setUndoCount(c => c + 1);
    setWrongFlash(null);
    setCursor(prevIdx);
    setInputCode('');
    setFeedback(null);
  }, [isPlaying, feedback, inputCode, cursor, items, producedChars, retractChar]);

  // 物理键盘
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') { setIsPlaying(false); return; }
      if (e.key === ' ') { e.preventDefault(); handleSpaceCommit(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      // 数字键 1-9：选第 N 个候选字（输入法的显式选字）
      if (/^[1-9]$/.test(e.key) && candidatesRef.current.length > 0) {
        const pick = candidatesRef.current[Number(e.key) - 1];
        if (pick) { e.preventDefault(); pickCandidate(pick); return; }
      }
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) { e.preventDefault(); handleKeyPress(key); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, handleKeyPress, handleSpaceCommit, handleBackspace, pickCandidate]);

  const startPractice = useCallback((text?: string) => {
    // 乱序开启时，每次开始练习都重新打乱一次
    const t = text ?? (shuffleActive ? shuffledCommon500Text() : activeText);
    if (!t.trim() || !charCodeData) return;
    if (shuffleActive) setShuffledText(t);
    if (timerRef.current) clearTimeout(timerRef.current);
    setCursor(0);
    setInputCode('');
    setFeedback(null);
    setProducedChars({});
    setCorrectCount(0);
    setWrongCount(0);
    setUndoCount(0);
    setKeyStrokes(0);
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    resetRound();
    setIsPlaying(true);
    // 开始页内容比练习区高，浏览器滚动锚定会把窗口带偏、把顶部统计行顶到导航栏后面
    window.scrollTo({ top: 0 });
  }, [activeText, charCodeData, resetRound, shuffleActive]);

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
                  照着文章逐字打编码，没有输入框：打出的字直接跟在原文每个字的下方（打对的变浅、打错的红字留痕）。
                  满 4 键自动上屏、不足 4 键按空格；标点自动跳过，打错也会继续往下打。
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
                    {shuffleActive && <span className="ml-1 text-primary">· 乱序</span>}
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

                  {/* 常用字 500 的乱序开关（只有支持乱序的文章才显示） */}
                  {canShuffle && !reviewMode && (
                    <button
                      onClick={toggleShuffle}
                      className={cn('w-full flex items-center gap-2 p-2.5 mb-3 rounded-xl border text-left text-xs transition-colors',
                        shuffleOn
                          ? 'border-primary/40 bg-primary/[0.06] text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-primary/25')}
                    >
                      <Shuffle className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium">乱序练习</span>
                      <span className="ml-auto text-[11px] opacity-80">{shuffleOn ? '已开 · 每次开始重新打乱' : '已关 · 按字频序'}</span>
                    </button>
                  )}

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

      {/* ===== 练习区（打字工具样式：正文在上、打出的字回显在下） ===== */}
      {isPlaying && (
        <section className="py-3 sm:py-6">
          <div className="max-w-3xl mx-auto px-3 sm:px-6">
            {/* 顶部：轮次 / 本轮进度 / 正确率 + 速度 / 击键 / 码长 + 退出 */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-2">
              <PracticeStatsLine
                roundNo={completedRounds + 1}
                seen={roundSeen}
                total={itemCount}
                accuracy={accuracy}
                extra={reviewMode ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium">易错字练习</span>
                ) : undefined}
              />
              <div className="flex items-center gap-x-2 sm:gap-x-3 text-[11px] sm:text-xs text-muted-foreground">
                <span>速度 <span className="font-mono-stat font-semibold text-foreground">{speed}</span> 字/分</span>
                <span className="text-border">|</span>
                <span>击键 <span className="font-mono-stat font-semibold text-foreground">{kps.toFixed(2)}</span></span>
                <span className="text-border">|</span>
                <span>码长 <span className="font-mono-stat font-semibold text-foreground">{avgLen.toFixed(2)}</span></span>
                <button
                  onClick={() => { setIsPlaying(false); setInputCode(''); setFeedback(null); setReviewMode(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800 transition-colors shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />退出
                  <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/50 rounded font-mono">Esc</kbd>
                </button>
              </div>
            </div>

            {/* 细进度条 */}
            <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${itemCount > 0 ? Math.min(100, Math.round((committed / itemCount) * 100)) : 0}%` }}
              />
            </div>

            {/* 正文面板：跟打器式 4 行固定窗口，每个字正下方跟「打出来的字」 */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              {/* 内边距放在外层：滚动区自身正好 4 行高，滚动定位才不会被 padding 带偏 */}
              <div className="px-4 sm:px-6 py-4">
                <div
                  ref={boardRef}
                  className="relative overflow-hidden flex flex-wrap content-start text-2xl sm:text-3xl"
                >
                  {chars.map((ch, ti) => {
                    // 段落换行：撑满一行的占位块强制换行，自身不占高度
                    if (ch === '\n') return <span key={ti} className="basis-full h-0" />;
                    const itemIdx = itemIndexByTextIndex.get(ti);
                  // 标点 / 码表外的字：只占位、不参与跟打，下方跟打位留空
                  if (itemIdx === undefined) {
                    return (
                      <span key={ti} data-cell className="inline-flex flex-col items-start text-muted-foreground/35" style={{ width: '1em', height: CELL_EM }}>
                        <span style={{ fontSize: '1em', lineHeight: ROW_LINE_HEIGHT }}>{ch}</span>
                        <span style={{ fontSize: '1em', lineHeight: ROW_LINE_HEIGHT }}>{NBSP}</span>
                      </span>
                    );
                  }
                    const isCurrent = itemIdx === cursor;
                    const isDone = itemIdx < cursor;
                    const producedChar = producedChars[itemIdx];

                    // 跟打行 = 一行正常大小的文字（和原文一样大）：
                    //   打对 → 显示该字；打错 → 显示你打出的那个字（码表里没有就红叉，说明打不出字）；
                    //   正在敲 → 像输入法那样把「正在输入的码」直接显示在这一行（带下划线），上屏后换成字。
                    let bottom: ReactNode = NBSP;
                    let bottomCls = 'text-muted-foreground/30';
                    if (isCurrent) {
                      if (feedback === 'correct') {
                        bottom = ch;
                        bottomCls = 'text-foreground/70';
                      } else if (inputCode) {
                        bottom = inputCode.toUpperCase();
                        bottomCls = awaitingCommit
                          ? 'font-mono text-amber-600 dark:text-amber-400 underline underline-offset-4 decoration-amber-500/60'
                          : 'font-mono text-primary underline underline-offset-4 decoration-primary/50';
                      } else {
                        // 输入位置光标（像文本里闪烁的光标）
                        bottom = <span className="inline-block w-[2px] h-[1em] align-middle bg-primary/70 animate-pulse" />;
                      }
                    } else if (isDone) {
                      if (producedChar !== undefined) {
                        // 你打出（或选中）的那个字；打不出字时是 ✕
                        bottom = producedChar;
                        bottomCls = 'text-red-500 font-bold';
                      } else {
                        bottom = ch;
                        bottomCls = 'text-foreground/70';
                      }
                    }

                    return (
                    <span
                      key={ti}
                      data-cell
                      ref={isCurrent ? currentCellRef : undefined}
                      className="inline-flex flex-col items-start"
                      style={{ width: '1em', height: CELL_EM }}
                    >
                        <span
                          className={cn(
                            'rounded-[3px] transition-colors',
                            isCurrent && 'bg-foreground/[0.10] font-semibold',
                            isDone && producedChar !== undefined && 'text-red-600 dark:text-red-400',
                            isDone && producedChar === undefined && 'text-muted-foreground/40',
                            !isCurrent && !isDone && 'text-foreground/85',
                          )}
                          style={{ fontSize: '1em', lineHeight: ROW_LINE_HEIGHT }}
                        >
                          {ch}
                        </span>
                        <span
                          className={cn('whitespace-nowrap', bottomCls)}
                          style={{ fontSize: '1em', lineHeight: ROW_LINE_HEIGHT }}
                        >
                          {bottom}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-border/50 bg-muted/20 px-4 sm:px-6 py-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <button
                  onClick={() => setShowHint(v => !v)}
                  className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors shrink-0',
                    showHint ? 'text-amber-600 dark:text-amber-400' : 'hover:text-foreground')}
                >
                  {showHint ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showHint ? '提示开' : '提示关'}
                </button>
                <span className="ml-auto truncate font-mono-stat">
                  第 {completedRounds + 1} 段 · {sourceLabel} · 共 {itemCount} 字 · 均码 {avgLen.toFixed(2)} · 错字 {wrongCount}
                  {undoCount > 0 && <span className="text-primary"> · 回改 {undoCount}</span>}
                  {shuffleActive && <span className="text-primary"> · 乱序</span>}
                </span>
              </div>
            </div>

            {/* 输入法候选窗：跟随「正在敲的码」浮动在字下方（fixed 定位，见上面的 useLayoutEffect） */}
            {isPlaying && !feedback && inputCode && candidates.length > 0 && (
              <div
                ref={candBoxRef}
                className="fixed z-40 flex flex-wrap items-center gap-0.5 max-w-[min(92vw,640px)] rounded-lg border border-primary/30 bg-card/98 px-2 py-1 shadow-lg shadow-black/10 backdrop-blur"
                style={{ left: -9999, top: -9999 }}
              >
                {candidates.map((c, i) => (
                  <button
                    key={c}
                    onMouseDown={(e) => { e.preventDefault(); pickCandidate(c); }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-lg sm:text-xl transition-colors',
                      i === 0
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground/85 hover:bg-muted',
                    )}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {showHint && current && (
              <div className="text-center text-xs font-mono text-amber-600 dark:text-amber-400 mt-2">
                {current.char} → {current.codes.map(c => c.toUpperCase()).join(' / ')}
              </div>
            )}
            {awaitingCommit && (
              <div className="text-center text-xs font-medium text-amber-600 dark:text-amber-400 mt-2">
                已打完整编码 · 按
                <kbd className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-[10px]">空格</kbd>
                上屏第 1 候选（也可数字键 / 点候选）
              </div>
            )}
            {wrongFlash && (
              <div className="text-center text-xs text-red-600 dark:text-red-400 mt-2">
                「{wrongFlash}」打错了 · 可退格回退改掉（也可继续往下打）
              </div>
            )}
            <div className="text-center text-[11px] text-muted-foreground/60 mt-2">
              退格：先删正在敲的码；码删空后再按 = 删掉上一个已打出的字（打对的也删），回到那一个字重打
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => startPractice()}>
                <RotateCcw className="h-3.5 w-3.5" />从头再来
              </Button>
              {canShuffle && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('gap-1.5 text-xs', shuffleOn && 'border-primary/50 text-primary')}
                  onClick={() => { toggleShuffle(); startPractice(); }}
                >
                  <Shuffle className="h-3.5 w-3.5" />乱序：{shuffleOn ? '开' : '关'}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => {
                  setShowKeyboard(v => {
                    try { localStorage.setItem('ziyuan-article-keyboard', v ? '0' : '1'); } catch { /* 忽略 */ }
                    return !v;
                  });
                }}>
                <Keyboard className="h-3.5 w-3.5" />{showKeyboard ? '收起键盘' : '虚拟键盘'}
              </Button>
            </div>

            {showKeyboard && (
              <div className="mt-3">
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
              </div>
            )}
          </div>
        </section>
      )}

      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />
    </div>
  );
}
