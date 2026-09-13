import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCharCodeData } from '@/lib/data-loader';
import { buildFullCodeIndex, type FullCodeInfo } from '@/lib/full-codes';
import { buildArticleItems, isCharItem, isPunctItem } from '@/lib/article-items';
import {
  splitSegments, shuffleRangeText, shuffleFullText, type SegmentLength,
} from '@/lib/article-segments';
import {
  loadHistory, saveRecord, clearHistory, aggregateKeys, type SegmentRecord,
} from '@/lib/article-history';
import { RoundCompleteToast, ErrorItemsPanel, KeyHeatmap, ArticleHistoryTable, SwitchRow } from '@/components/practice';
import { usePracticeRound } from '@/hooks/use-practice-round';
import { useArticleProgress } from '@/store/progress-store';
import {
  DEFAULT_ARTICLES, CUSTOM_ARTICLE_KEY,
} from '@/data/articles';
import {
  RotateCcw, ArrowLeft, ArrowRight, Trash2, FileText,
  Shuffle, Repeat, Gauge, Pause,
} from 'lucide-react';

/** 跟打器式固定窗口显示的行数（每行 = 原文一行 + 紧跟其下的跟打行，当前字固定在第 ARTICLE_ROWS-1 行） */
const ARTICLE_ROWS = 4;

/** 原文行/跟打行共用的行高倍数与字格高度（2 行 × 1.45em） */
const ROW_LINE_HEIGHT = 1.45;
const CELL_EM = `${ROW_LINE_HEIGHT * 2}em`;

/** 未打过的字，下方跟打位留空但必须占位，否则行高会塌 */
const NBSP = '\u00A0';

/** 段长可选项（跟打器口径：全文即文章模式） */
const SEG_LEN_OPTIONS: { value: SegmentLength; label: string }[] = [
  { value: 'all', label: '全' },
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 15, label: '15' },
  { value: 10, label: '10' },
  { value: 5, label: '5' },
];

/** 准度门槛可选项：0 = 不设门槛，其余 = 准度达标才能进入下一段 */
const ACC_GATE_OPTIONS = [0, 90, 95, 98, 100];

/** 乱序模式：关 / 打乱本段 / 打乱全文 */
type ShuffleMode = 'off' | 'seg' | 'full';

/** 打完一段后的走向（跟打器「自动发文 / 重复模式」口径） */
type AfterSegment = 'auto-next' | 'repeat' | 'repeat-shuffle' | 'manual';

const AFTER_SEG_OPTIONS: { value: AfterSegment; label: string; hint: string }[] = [
  { value: 'auto-next', label: '自动下一段', hint: '达标后自动进入下一段' },
  { value: 'repeat', label: '重复本段', hint: '达标后自动重复打本段' },
  { value: 'repeat-shuffle', label: '乱序重复', hint: '达标后打乱本段再重复' },
  { value: 'manual', label: '手动', hint: '打完手动选下一段' },
];

/** 练习方式设置（本机记忆） */
interface ArticleSettings {
  segLen: SegmentLength;
  shuffleMode: ShuffleMode;
  afterSeg: AfterSegment;
  /** 最低准度（0 = 关） */
  accGate: number;
  /** 极简模式：隐藏左右两栏，只剩打字面板 */
  minimal: boolean;
}

const SETTINGS_KEY = 'ziyuan-article-settings-v1';

function loadSettings(): ArticleSettings {
  const fallback: ArticleSettings = { segLen: 'all', shuffleMode: 'off', afterSeg: 'auto-next', accGate: 0, minimal: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      if (localStorage.getItem('ziyuan-article-shuffle-v1') === '1') {
        return { ...fallback, shuffleMode: 'full' };
      }
      return fallback;
    }
    const saved = JSON.parse(raw) as Partial<ArticleSettings> & { autoNext?: boolean };
    const afterSeg: AfterSegment = AFTER_SEG_OPTIONS.some(o => o.value === saved.afterSeg)
      ? saved.afterSeg as AfterSegment
      : (saved.autoNext === false ? 'manual' : 'auto-next');
    return {
      segLen: SEG_LEN_OPTIONS.some(o => o.value === saved.segLen) ? (saved.segLen as SegmentLength) : 'all',
      shuffleMode: saved.shuffleMode === 'seg' || saved.shuffleMode === 'full' ? saved.shuffleMode : 'off',
      afterSeg,
      accGate: ACC_GATE_OPTIONS.includes(saved.accGate ?? 0) ? (saved.accGate ?? 0) : 0,
      minimal: saved.minimal === true,
    };
  } catch { return fallback; }
}

function saveSettings(s: ArticleSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 隐私模式忽略 */ }
}

/** 段完成后的结算面板状态 */
interface SegmentResult {
  pass: boolean;
  accuracy: number;
  /** 本段速度（字/分） */
  speed: number;
  /** 本段用时（秒） */
  seconds: number;
  /** 本段错字数 */
  wrong: number;
  /** 键准（%） */
  keyAcc: number;
  /** 自动走向提示（空 = 不自动） */
  autoLabel: string;
}

/** 全文完成后的结算面板状态 */
interface ArticleDoneStats {
  chars: number;
  correct: number;
  wrong: number;
  keys: number;
  keyAcc: number;
  seconds: number;
  segments: number;
  speedMin: number;
  speedAvg: number;
  speedMax: number;
}

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
    if (text.trim()) selectArticleRef.current?.('custom');
    setShowEditor(false);
  }, []);

  const [reviewMode, setReviewMode] = useState(false);

  // ============ 练习方式设置（分段 / 乱序 / 自动发文 / 准度门槛） ============
  const [settings, setSettings] = useState<ArticleSettings>(loadSettings);
  const { segLen, shuffleMode, afterSeg, accGate, minimal } = settings;
  const updateSettings = useCallback((patch: Partial<ArticleSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

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
  const sourceLabel = reviewMode
    ? '易错字练习'
    : (selectedId === 'custom' ? '自定义文本' : (selectedArticle?.title ?? ''));

  // ============ 练习正文（全文乱序 / 打乱某段都在这份文本上原地改） ============
  const [practiceText, setPracticeText] = useState('');
  const [segIndex, setSegIndex] = useState(0);
  /** 每次切段（含重打/重复同一段）自增，强制光标对位 effect 重新执行 */
  const [segNonce, setSegNonce] = useState(0);

  const segments = useMemo(
    () => (charCodeData ? splitSegments(practiceText, segLen) : []),
    [practiceText, segLen, charCodeData],
  );
  const currentSeg = segments[segIndex];

  // ============ 题目序列 ============
  const items = useMemo(
    () => (charCodeData && practiceText ? buildArticleItems(practiceText, charCodeIndex, { acceptAllHan: true }) : []),
    [charCodeData, practiceText, charCodeIndex],
  );
  const itemIndexByTextIndex = useMemo(() => {
    const m = new Map<number, number>();
    items.forEach((it, i) => m.set(it.textIndex, i));
    return m;
  }, [items]);

  const segFirstItem = useMemo(() => {
    if (!currentSeg) return -1;
    return items.findIndex(it => it.textIndex >= currentSeg.start);
  }, [items, currentSeg]);
  const segLastItem = useMemo(() => {
    if (!currentSeg) return -1;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].textIndex < currentSeg.end) return i;
    }
    return -1;
  }, [items, currentSeg]);

  // ============ 练习状态 ============
  const roundKey = reviewMode ? 'article:review' : `article:${selectedId}`;
  const { completedRounds, markSeen, resetRound } = usePracticeRound(roundKey, items.length);

  const [isPlaying, setIsPlaying] = useState(false);
  /** 暂停（跟打器口径：暂停时计时停止、输入无效，Esc 切换） */
  const [paused, setPaused] = useState(false);
  /** 跟打历史成绩（每段一条，本机持久化） */
  const [history, setHistory] = useState<SegmentRecord[]>(loadHistory);
  /** 本段按键分布（记入成绩的 keysMap） */
  const keyStatsRef = useRef<Record<string, number>>({});
  /** 本段「理想键数」（每个上屏字按 1 键计），用于算键准 */
  const idealKeysRef = useRef(0);
  const [cursor, setCursor] = useState(0);
  const [producedChars, setProducedChars] = useState<Record<number, string>>({});
  /** 本段累计（重打本段时归零） */
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  /** 回改次数 */
  const [undoCount, setUndoCount] = useState(0);
  const [segResult, setSegResult] = useState<SegmentResult | null>(null);
  const [articleDone, setArticleDone] = useState<ArticleDoneStats | null>(null);
  /** 全文累计（跨段累加） */
  const totalsRef = useRef({ chars: 0, correct: 0, wrong: 0, keys: 0, ideal: 0, ms: 0, segs: 0, speeds: [] as number[] });
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [roundToast, setRoundToast] = useState<number | null>(null);
  const [keyStrokes, setKeyStrokes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrongFlashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startedAtRef = useRef(0);
  const currentCellRef = useRef<HTMLSpanElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const imeInputRef = useRef<HTMLInputElement>(null);
  /** 输入框内容（ref 镜像，供组合结束时的消费循环同步读取） */
  const imeValueRef = useRef('');
  const composingRef = useRef(false);
  /** 渲染后同步的镜像（消费循环里读最新 cursor / items / 段边界） */
  const cursorRef = useRef(0);
  const itemsRef = useRef(items);
  const segLastItemRef = useRef(-1);
  const segFirstItemRef = useRef(-1);
  const blockedRef = useRef(false);
  const pausedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const elapsedMsRef = useRef(0);

  // 当前段题目信息
  const accuracy = correctCount + wrongCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;
  const committed = correctCount + wrongCount;
  const elapsedSec = elapsedMs / 1000;
  const speed = elapsedSec > 1 ? Math.round(committed / (elapsedSec / 60)) : 0;
  const kps = elapsedSec > 1 ? keyStrokes / elapsedSec : 0;
  const avgLen = committed > 0 ? keyStrokes / committed : 0;
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(Math.floor(elapsedSec % 60)).padStart(2, '0');

  /** 计时从第一个键开始：还没敲键时显示 00:00 且不走表 */
  const timerStarted = startedAtRef.current > 0;

  useEffect(() => () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
  }, []);

  // 渲染后同步镜像（供输入消费循环读取最新值）
  useEffect(() => {
    cursorRef.current = cursor;
    itemsRef.current = items;
    segLastItemRef.current = segLastItem;
    segFirstItemRef.current = segFirstItem;
    blockedRef.current = !!segResult || !!articleDone;
    pausedRef.current = paused;
    isPlayingRef.current = isPlaying;
    elapsedMsRef.current = elapsedMs;
  }, [cursor, items, segLastItem, segFirstItem, segResult, articleDone, paused, isPlaying, elapsedMs]);

  // 计时：敲下第一个键后开始，每 0.5s 刷新；段结算 / 暂停时停止
  useEffect(() => {
    if (!isPlaying || !timerStarted || segResult || articleDone || paused) return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 500);
    return () => clearInterval(t);
  }, [isPlaying, timerStarted, segResult, articleDone, paused]);

  /** 从第一个键开始计时 */
  const startTimerIfNeeded = useCallback(() => {
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();
  }, []);

  /** 继续（把计时接回当前累计，并聚焦打字框）——genda「光标回到输入区自动恢复」 */
  const resumePractice = useCallback(() => {
    setPaused(p => {
      if (!p) return p;
      startedAtRef.current = startedAtRef.current === 0 ? 0 : Date.now() - elapsedMsRef.current;
      return false;
    });
    setTimeout(() => imeInputRef.current?.focus(), 0);
  }, []);

  /** 暂停（genda「光标离开输入区自动暂停」） */
  const pausePractice = useCallback(() => {
    setPaused(p => {
      if (p || !isPlayingRef.current || blockedRef.current) return p;
      return true;
    });
  }, [isPlayingRef]);

  /**
   * 当前段变化（切段 / 打乱本段 / 开始练习）后，把光标对到该段第一个题目。
   */
  useEffect(() => {
    if (!isPlaying || !currentSeg) return;
    const first = items.findIndex(it => it.textIndex >= currentSeg.start);
    setCursor(first === -1 ? 0 : first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segIndex, segNonce, practiceText, isPlaying, segLen]);

  // 跟打器式固定窗口：面板高度 = 4 行，当前字固定在窗口内第 3 行，上下自动滚。
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

  /** 本段归零重新开始（不改段序） */
  const resetSegmentStats = useCallback(() => {
    setProducedChars({});
    setUndoCount(0);
    setCorrectCount(0);
    setWrongCount(0);
    setKeyStrokes(0);
    setWrongFlash(null);
    setSegResult(null);
    setPaused(false);
    keyStatsRef.current = {};
    idealKeysRef.current = 0;
    startedAtRef.current = 0;
    setElapsedMs(0);
    imeValueRef.current = '';
    if (imeInputRef.current) imeInputRef.current.value = '';
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
  }, []);

  /** 跳到第 i 段；reshuffle = 进入前先把该段字符打乱 */
  const goToSegment = useCallback((i: number, reshuffle = false) => {
    const target = segments[i];
    if (!target) return;
    if (reshuffle) {
      setPracticeText(prev => shuffleRangeText(prev, target.start, target.end));
    }
    setSegIndex(i);
    setSegNonce(n => n + 1);
    resetSegmentStats();
  }, [segments, resetSegmentStats]);

  /** 段结算：记成绩 → 判准度门槛 → 按「完成段策略」走向（参数显式传入，避免读到未刷新的 state） */
  const completeSegment = useCallback((segCorrect: number, segWrong: number, segKeys: number, segUndo: number) => {
    const segCommitted = segCorrect + segWrong;
    const segAcc = segCommitted > 0 ? Math.round((segCorrect / segCommitted) * 100) : 100;
    const segSpeed = elapsedSec > 1 ? Math.round(segCommitted / (elapsedSec / 60)) : 0;
    const ideal = idealKeysRef.current;
    const keyAcc = segKeys > 0 ? Math.min(100, Math.round((ideal / segKeys) * 100)) : 100;
    const isLast = segIndex >= segments.length - 1;
    setHistory(saveRecord({
      t: Date.now(),
      title: sourceLabel,
      seg: segIndex + 1,
      segTotal: segments.length,
      chars: segCommitted,
      keys: segKeys,
      ms: elapsedMs,
      speed: segSpeed,
      kps: elapsedSec > 0 ? segKeys / elapsedSec : 0,
      avgLen: segCommitted > 0 ? segKeys / segCommitted : 0,
      undo: segUndo,
      wrong: segWrong,
      acc: segAcc,
      keyAcc,
      pass: !(accGate > 0 && segAcc < accGate),
      keysMap: { ...keyStatsRef.current },
    }));
    totalsRef.current = {
      chars: totalsRef.current.chars + segCommitted,
      correct: totalsRef.current.correct + segCorrect,
      wrong: totalsRef.current.wrong + segWrong,
      keys: totalsRef.current.keys + segKeys,
      ideal: totalsRef.current.ideal + ideal,
      ms: totalsRef.current.ms + elapsedMs,
      segs: totalsRef.current.segs + 1,
      speeds: [...totalsRef.current.speeds, segSpeed],
    };
    const gated = accGate > 0 && segAcc < accGate;
    if (gated) {
      setSegResult({ pass: false, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: segWrong, keyAcc, autoLabel: '' });
      return;
    }
    if (isLast) {
      const totals = totalsRef.current;
      const speeds = totals.speeds;
      setArticleDone({
        chars: totals.chars,
        correct: totals.correct,
        wrong: totals.wrong,
        keys: totals.keys,
        keyAcc: totals.keys > 0 ? Math.min(100, Math.round((totals.ideal / totals.keys) * 100)) : 100,
        seconds: Math.round(totals.ms / 1000),
        segments: totals.segs,
        speedMin: speeds.length ? Math.min(...speeds) : 0,
        speedAvg: speeds.length ? Math.round(speeds.reduce((s, v) => s + v, 0) / speeds.length) : 0,
        speedMax: speeds.length ? Math.max(...speeds) : 0,
      });
      setRoundToast(completedRounds + 1);
      resetRound();
      return;
    }
    if (afterSeg === 'auto-next') {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: segWrong, keyAcc, autoLabel: '即将自动进入下一段…' });
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => goToSegment(segIndex + 1), 1200);
    } else if (afterSeg === 'repeat') {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: segWrong, keyAcc, autoLabel: '即将自动重复本段…' });
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => goToSegment(segIndex), 1200);
    } else if (afterSeg === 'repeat-shuffle') {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: segWrong, keyAcc, autoLabel: '即将打乱本段重复…' });
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => goToSegment(segIndex, true), 1200);
    } else {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: segWrong, keyAcc, autoLabel: '' });
    }
  }, [correctCount, wrongCount, keyStrokes, elapsedSec, elapsedMs, undoCount, accGate, segIndex, segments.length,
    afterSeg, sourceLabel, completedRounds, resetRound, goToSegment]);

  /** 完成段策略提示需要 afterSeg；结算面板里的「下一段」按钮 */
  const segResultPanel = segResult && !articleDone && (
    <div className={cn(
      'mt-3 rounded-xl border p-4 text-center',
      segResult.pass
        ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
        : 'border-red-500/40 bg-red-500/[0.06]',
    )}>
      {segResult.pass ? (
        <>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            本段完成 · 准度 {segResult.accuracy}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            速度 {segResult.speed} 字/分 · 键准 {segResult.keyAcc}% · 用时 {segResult.seconds.toFixed(1)} 秒 · 错 {segResult.wrong} 字
            {segResult.autoLabel && <span className="text-primary"> · {segResult.autoLabel}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            准度未达标 · {segResult.accuracy}%（要求 {accGate}%）
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            需要达到 {accGate}% 的准度才能进入下一段 · 速度 {segResult.speed} 字/分 · 键准 {segResult.keyAcc}% · 错 {segResult.wrong} 字
          </div>
        </>
      )}
      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => goToSegment(segIndex)}>
          <Repeat className="h-3.5 w-3.5" />重打本段
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => goToSegment(segIndex, true)}>
          <Shuffle className="h-3.5 w-3.5" />打乱重打
        </Button>
        {segResult.pass && segIndex < segments.length - 1 && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => goToSegment(segIndex + 1)}>
            下一段<ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  /** 全文完成面板 */
  const articleDonePanel = articleDone && (
    <div className="mt-3 rounded-xl border border-primary/40 bg-primary/[0.05] p-5 text-center">
      <div className="text-xl font-semibold">全文完成 🎉</div>
      <div className="mt-2 flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
        <span>共 <b className="text-foreground">{articleDone.segments}</b> 段</span>
        <span><b className="text-foreground">{articleDone.chars}</b> 字</span>
        <span>用时 <b className="text-foreground">{articleDone.seconds}</b> 秒</span>
        <span>速度 <b className="text-foreground">{articleDone.speedMin}</b> / <b className="text-foreground">{articleDone.speedAvg}</b> / <b className="text-foreground">{articleDone.speedMax}</b> 字/分（低/均/高）</span>
        <span>击键 <b className="text-foreground">{articleDone.keys}</b></span>
        <span>键准 <b className="text-foreground">{articleDone.keyAcc}%</b></span>
        <span>准度 <b className="text-foreground">
          {articleDone.chars > 0 ? Math.round((articleDone.correct / articleDone.chars) * 100) : 0}%
        </b></span>
        <span>错 <b className="text-red-500">{articleDone.wrong}</b> 字</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => startPractice()}>
          <RotateCcw className="h-3.5 w-3.5" />重打全文<kbd className="ml-1 px-1 py-0.5 text-[10px] bg-primary/15 rounded font-mono">Enter</kbd>
        </Button>
      </div>
    </div>
  );

  /**
   * 消费输入框里已上屏的字：逐字与原文比对，对 → 进位；错 → 红字留痕并进位（跟打器口径）。
   * 组合输入（拼音）在 compositionend 后一次性消费；直接输入 / 粘贴在 onChange 消费。
   * 用 ref 读最新 cursor/items/段边界，批量结算一次 setState。
   */
  const consumeInput = useCallback(() => {
    if (pausedRef.current || blockedRef.current) return;
    const val = imeValueRef.current;
    if (!val || !val.trim()) { if (val) { imeValueRef.current = ''; if (imeInputRef.current) imeInputRef.current.value = ''; } return; }
    startTimerIfNeeded();
    let idx = cursorRef.current;
    const itms = itemsRef.current;
    const last = segLastItemRef.current;
    let correct = 0, wrong = 0, consumed = 0;
    let firstWrongChar: string | null = null;
    const produced: Record<number, string> = {};
    const correctIdx: number[] = [];
    while (consumed < val.length && idx <= last && idx < itms.length) {
      const ch = val[consumed];
      if (/\s/.test(ch)) { consumed++; continue; } // 粘贴带进的空白不算题
      const it = itms[idx];
      let ok = ch === it.char;
      if (!ok && isPunctItem(it)) ok = ch === it.key; // 半角键打的标点也算对
      produced[idx] = ch;
      markSeen(String(it.textIndex));
      if (isCharItem(it)) recordChar(it.char, ok);
      if (ok) { correct++; idealKeysRef.current += 1; correctIdx.push(idx); }
      else { wrong++; if (!firstWrongChar) firstWrongChar = it.char; }
      idx++;
      consumed++;
    }
    if (consumed === 0) {
      // 输入框有内容但已越过段尾：清掉，等段切换
      imeValueRef.current = '';
      if (imeInputRef.current) imeInputRef.current.value = '';
      return;
    }
    const rest = val.slice(consumed);
    imeValueRef.current = rest;
    if (imeInputRef.current) imeInputRef.current.value = rest;
    setProducedChars(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(produced)) {
        next[Number(k)] = v;
      }
      for (const i of correctIdx) delete next[i];
      return next;
    });
    setCorrectCount(c => c + correct);
    setWrongCount(c => c + wrong);
    if (firstWrongChar) {
      setWrongFlash(firstWrongChar);
      if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
      wrongFlashTimerRef.current = setTimeout(() => setWrongFlash(null), 1200);
    }
    setCursor(idx);
    if (idx > last || last < 0) {
      completeSegment(correctCount + correct, wrongCount + wrong, keyStrokes, undoCount);
    }
  }, [markSeen, recordChar, startTimerIfNeeded, completeSegment, correctCount, wrongCount, keyStrokes, undoCount]);

  /** 退格：输入框已空时删掉上一个已打出的字（打对的也删），光标退回重打，记一次回改 */
  const undoLastChar = useCallback(() => {
    if (pausedRef.current || blockedRef.current) return;
    const prevIdx = cursorRef.current - 1;
    if (prevIdx < (segFirstItemRef.current >= 0 ? segFirstItemRef.current : 0)) return;
    const itms = itemsRef.current;
    const item = itms[prevIdx];
    if (!item) return;
    const produced = producedChars[prevIdx];
    const wasCorrect = produced === undefined || produced === item.char;
    if (isCharItem(item)) retractChar(item.char, wasCorrect);
    setProducedChars(prev => {
      if (prev[prevIdx] === undefined) return prev;
      const next = { ...prev };
      delete next[prevIdx];
      return next;
    });
    if (wasCorrect) setCorrectCount(c => Math.max(0, c - 1));
    else setWrongCount(c => Math.max(0, c - 1));
    setUndoCount(c => c + 1);
    keyStatsRef.current['⌫'] = (keyStatsRef.current['⌫'] ?? 0) + 1;
    setWrongFlash(null);
    setCursor(prevIdx);
  }, [producedChars, retractChar]);

  /** 选择文章 = 立即以该文开练（同页切换） */
  const selectArticle = useCallback((id: string) => {
    if (id === 'custom') {
      if (!customText.trim()) { setShowEditor(true); return; }
      setSelectedId('custom');
      setReviewMode(false);
      startPracticeRef.current?.(customText);
      return;
    }
    if (id === '__review') {
      if (reviewChars.length === 0) return;
      setReviewMode(true);
      startPracticeRef.current?.(reviewChars.join(''));
      return;
    }
    const art = DEFAULT_ARTICLES.find(a => a.id === id);
    if (!art) return;
    setSelectedId(id);
    setReviewMode(false);
    startPracticeRef.current?.(art.text);
  }, [customText, reviewChars]);

  const selectArticleRef = useRef<(id: string) => void>(selectArticle);
  const startPracticeRef = useRef<(text?: string) => void>(() => { /* 挂载后覆盖 */ });
  selectArticleRef.current = selectArticle;

  /** 开始练习（或重打全文） */
  const startPractice = useCallback((textOverride?: string) => {
    const sourceText = textOverride ?? activeText;
    if (!sourceText.trim() || !charCodeData) return;
    const t = shuffleMode === 'full' ? shuffleFullText(sourceText) : sourceText;
    if (!t.trim()) return;
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
    totalsRef.current = { chars: 0, correct: 0, wrong: 0, keys: 0, ideal: 0, ms: 0, segs: 0, speeds: [] };
    keyStatsRef.current = {};
    idealKeysRef.current = 0;
    setPracticeText(t);
    setSegIndex(0);
    setSegNonce(n => n + 1);
    setArticleDone(null);
    setSegResult(null);
    setProducedChars({});
    setCorrectCount(0);
    setWrongCount(0);
    setUndoCount(0);
    setKeyStrokes(0);
    setWrongFlash(null);
    setPaused(false);
    startedAtRef.current = 0;
    setElapsedMs(0);
    imeValueRef.current = '';
    if (imeInputRef.current) imeInputRef.current.value = '';
    resetRound();
    setIsPlaying(true);
    window.scrollTo({ top: 0 });
    // 打字框就位后聚焦
    setTimeout(() => imeInputRef.current?.focus(), 50);
  }, [activeText, charCodeData, shuffleMode, resetRound]);
  startPracticeRef.current = startPractice;

  /** 进入页面自动开练 */
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current || !charCodeData || !activeText.trim()) return;
    bootRef.current = true;
    startPractice();
  }, [charCodeData, activeText, startPractice]);

  // 物理键盘：Esc 暂停/继续；跟打器快捷键；其余按键只计数（打字交给系统输入法）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || articleDone) {
        if (articleDone && e.key === 'Enter') { e.preventDefault(); startPractice(); }
        return;
      }
      if (e.key === 'Escape' || (paused && e.key === 'Enter')) {
        e.preventDefault();
        if (paused) resumePractice();
        else pausePractice();
        return;
      }
      if (paused) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); goToSegment(Math.max(0, segIndex - 1)); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'j' && !(segResult && !segResult.pass)) { e.preventDefault(); goToSegment(Math.min(segments.length - 1, segIndex + 1)); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); goToSegment(segIndex, true); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); goToSegment(segIndex); return; }
      // F 键快捷键（跟打器口径:F3 重打本段 / F4 打乱本段)
      if (e.key === 'F3') { e.preventDefault(); goToSegment(segIndex); return; }
      if (e.key === 'F4') { e.preventDefault(); goToSegment(segIndex, true); return; }
      if (e.key === 'Backspace') {
        // 输入框里还有内容 → 让输入框自己删；空了 → 回退上一个已打出的字
        if (imeInputRef.current && document.activeElement === imeInputRef.current && imeInputRef.current.value.length > 0) return;
        e.preventDefault();
        undoLastChar();
        return;
      }
      // 任意可打印按键：从第一个键开始计时并计入击键 / 按键分布（打字本身交给系统输入法）
      if (e.key.length === 1 || e.key === 'Process' || e.keyCode === 229) {
        startTimerIfNeeded();
        if (e.key.length === 1) {
          setKeyStrokes(k => k + 1);
          const kk = e.key.toLowerCase();
          keyStatsRef.current[kk] = (keyStatsRef.current[kk] ?? 0) + 1;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, paused, elapsedMs, segIndex, segments.length, segResult, articleDone, goToSegment, undoLastChar, startPractice, startTimerIfNeeded, resumePractice, pausePractice]);

  if (dataLoading || !charCodeData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">加载字库数据...</span>
        </div>
      </div>
    );
  }

  const chars = [...practiceText];
  const itemCount = items.length;
  const segTotal = segments.length;

  /** 左栏：速度仪表 + 计时 + 开关组（木易 / 玫枫跟打器样式） */
  // 今日统计（木易「今日错/对」口径）；数据量小,直接算,不用 hook（避免放在早退 return 之后）
  const todayKey = new Date().toDateString();
  let todayChars = 0, todayWrong = 0, todaySegs = 0;
  for (const r of history) {
    if (new Date(r.t).toDateString() === todayKey) { todayChars += r.chars; todayWrong += r.wrong; todaySegs++; }
  }

  const leftPanel = (
    <div className="space-y-3">
      {/* 速度仪表 */}
      <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
        <div className="font-mono-stat text-[44px] leading-none font-bold tracking-wider">{speed}</div>
        <div className="text-[10px] text-muted-foreground mt-1 mb-3">速度 · 字/分</div>
        <div className="grid grid-cols-3 gap-1 border-t border-border/40 pt-2.5">
          <div className="text-center">
            <div className="font-mono-stat text-sm font-semibold">{kps.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">击键</div>
          </div>
          <div className="text-center">
            <div className="font-mono-stat text-sm font-semibold">{avgLen.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">键/字</div>
          </div>
          <div className="text-center">
            <div className={cn('font-mono-stat text-sm font-semibold', wrongCount > 0 && 'text-red-500')}>{wrongCount}</div>
            <div className="text-[10px] text-muted-foreground">错字</div>
          </div>
        </div>
      </div>

      {/* 计时：从第一个键开始 */}
      <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
        <div className={cn('font-mono-stat text-2xl font-bold tracking-widest', paused && 'text-amber-600 dark:text-amber-400')}>
          {mm}:{ss}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {paused ? '已暂停' : (timerStarted ? '本段用时' : '从第一个键开始计时')}
        </div>
      </div>

      {/* 今日统计（木易「今日错/对」口径） */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <div className="text-[10px] text-muted-foreground mb-1.5">今日</div>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <div className="font-mono-stat text-sm font-semibold">{todayChars}</div>
            <div className="text-[10px] text-muted-foreground">字数</div>
          </div>
          <div className="text-center">
            <div className={cn('font-mono-stat text-sm font-semibold', todayWrong > 0 && 'text-red-500')}>{todayWrong}</div>
            <div className="text-[10px] text-muted-foreground">错字</div>
          </div>
          <div className="text-center">
            <div className="font-mono-stat text-sm font-semibold">{todaySegs}</div>
            <div className="text-[10px] text-muted-foreground">段</div>
          </div>
        </div>
      </div>

      {/* 开关组 */}
      <div className="rounded-xl border border-border/50 bg-card px-3 py-2">
        <SwitchRow label="全文乱序" checked={shuffleMode === 'full'} title="每次开始练习打乱全文"
          onChange={() => updateSettings({ shuffleMode: shuffleMode === 'full' ? 'off' : 'full' })} />
        <SwitchRow label="本段乱序" checked={shuffleMode === 'seg'} title="练习中打乱当前段"
          onChange={() => updateSettings({ shuffleMode: shuffleMode === 'seg' ? 'off' : 'seg' })} />
        <div className="my-1.5 border-t border-border/30" />
        <SwitchRow label="自动下一段" checked={afterSeg === 'auto-next'}
          onChange={() => updateSettings({ afterSeg: afterSeg === 'auto-next' ? 'manual' : 'auto-next' })} />
        <SwitchRow label="重复：当前段" checked={afterSeg === 'repeat'}
          onChange={() => updateSettings({ afterSeg: afterSeg === 'repeat' ? 'manual' : 'repeat' })} />
        <SwitchRow label="重复：乱序" checked={afterSeg === 'repeat-shuffle'}
          onChange={() => updateSettings({ afterSeg: afterSeg === 'repeat-shuffle' ? 'manual' : 'repeat-shuffle' })} />
        <div className="my-1.5 border-t border-border/30" />
        <SwitchRow label="极简模式" checked={minimal} onChange={() => updateSettings({ minimal: !minimal })} />
      </div>

      {/* 准度门槛 */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
          <Gauge className="h-3 w-3" />最低准度 · 不达标不能进下一段
        </div>
        <div className="flex gap-1 flex-wrap">
          {ACC_GATE_OPTIONS.map(v => (
            <button key={v} onClick={() => updateSettings({ accGate: v })}
              className={cn('px-2 py-0.5 rounded-md border text-[11px] transition-colors',
                accGate === v
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                  : 'border-border/60 text-muted-foreground hover:border-amber-500/40')}>
              {v === 0 ? '关' : `${v}%`}
            </button>
          ))}
        </div>
      </div>

      {/* 段长 */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <div className="text-[10px] text-muted-foreground mb-1.5">每段字数 · 全 = 文章模式</div>
        <div className="flex gap-1 flex-wrap">
          {SEG_LEN_OPTIONS.map(o => (
            <button key={String(o.value)} onClick={() => updateSettings({ segLen: o.value })}
              className={cn('px-2 py-0.5 rounded-md border text-[11px] transition-colors',
                segLen === o.value
                  ? 'border-primary/60 bg-primary/10 text-primary font-medium'
                  : 'border-border/60 text-muted-foreground hover:border-primary/40')}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed px-1">
        用电脑自己的输入法在打字框里打字，网站只判断字的对错。快捷键：Esc 暂停/继续 · Ctrl+U/J 上/下一段 · Ctrl+Y 重打本段 · Ctrl+K 打乱本段
      </p>
    </div>
  );

  /** 右栏：自定义文本 + 易错字 + 按键统计 */
  const rightPanel = (
    <div className="space-y-3">
      {/* 自定义文本 */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 font-serif flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />自定义文本
        </h3>
        {showEditor ? (
          <div>
            <div className="flex items-center gap-1 flex-wrap mb-1.5">
              {([
                ['去换行', (s: string) => s.replace(/\n+/g, '')],
                ['去空格', (s: string) => s.replace(/[ \t\u3000]+/g, '')],
                ['标点→中文', (s: string) => s.replace(/[,.;:?!]/g, ch => ({ ',': '，', '.': '。', ';': '；', ':': '：', '?': '？', '!': '！' }[ch] ?? ch)).replace(/"/g, '“').replace(/'/g, '‘')],
                ['标点→英文', (s: string) => s.replace(/[，。；：？！]/g, ch => ({ '，': ',', '。': '.', '；': ';', '：': ':', '？': '?', '！': '!' }[ch] ?? ch))],
              ] as const).map(([label, fn]) => (
                <button key={label}
                  onClick={() => setDraftText(d => fn(d))}
                  className="px-2 py-0.5 rounded-md border border-border/60 text-[11px] text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              rows={6}
              placeholder="把要练习的文章粘贴到这里"
              className="w-full text-xs p-2 rounded-lg border border-border bg-muted/40 focus:outline-none focus:border-primary/40 resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">{[...draftText].length} 字</span>
              <div className="flex items-center gap-1.5">
                {customText.trim() && (
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-red-400 hover:text-red-600"
                    onClick={() => saveCustom('')}>
                    <Trash2 className="h-3.5 w-3.5" />清除
                  </Button>
                )}
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => saveCustom(draftText)}>
                  保存并使用
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
            onClick={() => setShowEditor(true)}>
            <FileText className="h-3.5 w-3.5" />粘贴 / 编辑文本
          </Button>
        )}
      </div>

      <ErrorItemsPanel
        items={errorItems}
        onDrill={reviewChars.length > 0 ? () => { setReviewMode(true); startPractice(reviewChars.join('')); } : undefined}
        title="易错字（答错次数）"
      />

      {/* 按键统计 */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 font-serif">按键统计</h3>
        <div className="overflow-x-auto pb-1">
          <KeyHeatmap counts={aggregateKeys(history)} />
        </div>
      </div>
    </div>
  );

  /** 工具条按钮通用小样式 */
  const toolBtn = 'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-3 lg:flex lg:items-start lg:gap-3">
        {/* 左栏：仪表与开关 */}
        {!minimal && (
          <aside className="w-full lg:w-52 shrink-0 mb-3 lg:mb-0 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
            {leftPanel}
          </aside>
        )}

        {/* 中栏：工具条 + 打字区 + 成绩表 */}
        <main className="flex-1 min-w-0">
          {/* 工具条：操作 / 段导航 / 文章下拉 */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <button
              onClick={() => { if (paused) resumePractice(); else pausePractice(); }}
              disabled={!!segResult || !!articleDone}
              className={cn(toolBtn, 'disabled:opacity-40',
                paused
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}
              title="暂停 / 继续（Esc；光标离开打字框也会自动暂停）"
            >
              <Pause className="h-3.5 w-3.5" />{paused ? '继续' : '暂停'}
            </button>
            <button
              onClick={() => {
                const pool = DEFAULT_ARTICLES.filter(a => a.id !== selectedId);
                const pick = pool[Math.floor(Math.random() * pool.length)];
                if (pick) selectArticle(pick.id);
              }}
              className={cn(toolBtn, 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}
              title="随机换一篇（木易跟打器口径）"
            >
              🎲 随机
            </button>
            <button onClick={() => goToSegment(segIndex, true)} disabled={!!segResult || !!articleDone}
              className={cn(toolBtn, 'border-border/60 bg-card text-muted-foreground hover:text-foreground disabled:opacity-40')}
              title="打乱本段（Ctrl+K）">
              <Shuffle className="h-3.5 w-3.5" />打乱
            </button>
            <button onClick={() => goToSegment(segIndex)} disabled={!!segResult || !!articleDone}
              className={cn(toolBtn, 'border-border/60 bg-card text-muted-foreground hover:text-foreground disabled:opacity-40')}
              title="重打本段（Ctrl+Y）">
              <Repeat className="h-3.5 w-3.5" />重打
            </button>
            <span className="w-px h-5 bg-border/60 mx-0.5" />
            <button onClick={() => goToSegment(Math.max(0, segIndex - 1))} disabled={segIndex === 0}
              className={cn(toolBtn, 'px-2 border-border/60 bg-card text-muted-foreground hover:text-foreground disabled:opacity-40')}
              title="上一段（Ctrl+U）">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-medium text-foreground px-1 font-mono-stat">
              第 {Math.min(segIndex + 1, segTotal || 1)}/{segTotal || 1} 段
            </span>
            <button onClick={() => goToSegment(Math.min(segTotal - 1, segIndex + 1))}
              disabled={segIndex >= segTotal - 1 || (segResult !== null && !segResult.pass)}
              className={cn(toolBtn, 'px-2 border-border/60 bg-card text-muted-foreground hover:text-foreground disabled:opacity-40')}
              title="下一段（Ctrl+J）">
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <span className="w-px h-5 bg-border/60 mx-0.5" />
            <select
              value={selectedId}
              onChange={e => selectArticle(e.target.value)}
              className="h-[26px] max-w-44 text-xs rounded-lg border border-border/60 bg-card px-2 focus:outline-none focus:border-primary/40"
              title="选择文章"
            >
              <optgroup label="文章">
                {DEFAULT_ARTICLES.filter(a => a.group !== 'char').map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </optgroup>
              <optgroup label="单字">
                {DEFAULT_ARTICLES.filter(a => a.group === 'char').map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </optgroup>
              {customText.trim() && <option value="custom">自定义文本</option>}
              {reviewChars.length > 0 && <option value="__review">易错字练习</option>}
            </select>
            <button onClick={() => startPractice()}
              className={cn(toolBtn, 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}
              title="按当前文章与乱序设置重新开始">
              <RotateCcw className="h-3.5 w-3.5" />重新开始
            </button>
          </div>

          {/* 细进度条 */}
          <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${itemCount > 0 ? Math.min(100, Math.round((committed / Math.max(1, itemCount)) * 100)) : 0}%` }}
            />
          </div>

          {/* 正文面板：跟打器式 4 行固定窗口，每个字正下方跟「打出来的字」 */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4">
              <div
                ref={boardRef}
                onClick={() => imeInputRef.current?.focus()}
                className="relative overflow-hidden flex flex-wrap content-start text-2xl sm:text-3xl cursor-text"
              >
                {chars.map((ch, ti) => {
                  if (ch === '\n') return <span key={ti} className="basis-full h-0" />;
                  const itemIdx = itemIndexByTextIndex.get(ti);
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

                  // 跟打行：打对 → 显示该字；打错 → 显示你实际打出的那个字（红字留痕）；
                  // 当前位置 → 闪烁光标。
                  let bottom: ReactNode = NBSP;
                  let bottomCls = 'text-muted-foreground/30';
                  if (isCurrent) {
                    bottom = <span className="inline-block w-[2px] h-[1em] align-middle bg-primary/70 animate-pulse" />;
                  } else if (isDone) {
                    if (producedChar !== undefined) {
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
              <span className="ml-auto truncate font-mono-stat">
                {reviewMode && <span className="text-red-500 mr-1">易错字练习 · </span>}
                {sourceLabel} · 共 {itemCount} 字 · 错字 {wrongCount}
                {undoCount > 0 && <span className="text-primary"> · 回改 {undoCount}</span>}
                {shuffleMode !== 'off' && <span className="text-primary"> · 乱序</span>}
                {accGate > 0 && <span className="text-amber-600 dark:text-amber-400"> · 准度 {accuracy}% / {accGate}%</span>}
              </span>
            </div>
          </div>

          {/* 系统输入法打字框：上屏一个字比对一个字，网站只判对错 */}
          <input
            ref={imeInputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={!!segResult || !!articleDone || paused}
            onChange={e => {
              imeValueRef.current = e.target.value;
              if (!composingRef.current) consumeInput();
            }}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={e => {
              composingRef.current = false;
              imeValueRef.current = (e.target as HTMLInputElement).value;
              consumeInput();
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') e.preventDefault();
              if (e.key === 'Backspace' && (e.target as HTMLInputElement).value.length === 0) {
                e.preventDefault();
                undoLastChar();
              }
            }}
            onBlur={() => pausePractice()}
            onFocus={() => { if (paused) resumePractice(); }}
            placeholder={paused ? '已暂停 · 按 Esc 继续' : '请用电脑自己的输入法在这里打字（对错自动判断）…'}
            className="mt-3 w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-lg focus:outline-none focus:border-primary/50 disabled:opacity-60"
          />

          {/* 段结算 / 全文完成面板 */}
          {segResultPanel}
          {articleDonePanel}

          {/* 暂停覆盖层（计时停、输入无效） */}
          {paused && !segResult && !articleDone && (
            <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-4 text-center">
              <div className="text-base font-semibold text-amber-600 dark:text-amber-400">已暂停 · 计时停止</div>
              <div className="mt-1 text-xs text-muted-foreground">
                按 <kbd className="px-1 rounded bg-amber-500/10 border border-amber-500/30 font-mono">Esc</kbd> 继续
              </div>
            </div>
          )}

          {wrongFlash && !segResult && !paused && (
            <div className="text-center text-xs text-red-600 dark:text-red-400 mt-2">
              「{wrongFlash}」打错了 · 可退格回退改掉（也可继续往下打）
            </div>
          )}
          {!minimal && (
            <div className="text-center text-[11px] text-muted-foreground/60 mt-2">
              用电脑自己的输入法（拼音 / 双拼 / 五笔…）在打字框里打字；退格删完已上屏的字后，再按 = 回退上一个字重打
            </div>
          )}

          {/* 跟打历史成绩表 */}
          {!minimal && (
            <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
              <ArticleHistoryTable records={history} onClear={() => { clearHistory(); setHistory([]); }} />
            </div>
          )}
        </main>

        {/* 右栏：自定义文本 / 易错字 / 按键统计 */}
        {!minimal && (
          <aside className="w-full lg:w-72 shrink-0 mb-3 lg:mb-0 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
            {rightPanel}
          </aside>
        )}
      </div>

      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />
    </div>
  );
}
