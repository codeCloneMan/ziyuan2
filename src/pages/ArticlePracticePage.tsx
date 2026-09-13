import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCharCodeData, useBuiltinPhrases } from '@/lib/data-loader';
import { buildFullCodeIndex, type FullCodeInfo } from '@/lib/full-codes';
import {
  buildCharsByCode, candidatesFor, resolveCommitChar, MAX_CANDIDATES,
} from '@/lib/ime-candidates';
import { buildArticleItems, isCharItem, isPunctItem } from '@/lib/article-items';
import { buildArticlePhrases, phraseAtCursor } from '@/lib/article-phrases';
import { isCompleteCodeAwaitingSpace, AUTO_COMMIT_LENGTH } from '@/lib/code-commit';
import { parseCodeTable } from '@/lib/code-table-parser';
import type { CharCodeLike } from '@/lib/full-codes';
import {
  splitSegments, shuffleRangeText, shuffleFullText, type SegmentLength,
} from '@/lib/article-segments';
import {
  loadHistory, saveRecord, clearHistory, aggregateKeys, type SegmentRecord,
} from '@/lib/article-history';
import { PracticeKeyboard, RoundCompleteToast, PracticeStatsLine, ErrorItemsPanel, KeyHeatmap, ArticleHistoryTable } from '@/components/practice';
import { usePracticeRound } from '@/hooks/use-practice-round';
import { useArticleProgress } from '@/store/progress-store';
import { charFrequency } from '@/data/charFrequency';
import {
  DEFAULT_ARTICLES, CUSTOM_ARTICLE_KEY,
} from '@/data/articles';
import {
  Play, RotateCcw, BookOpen, ArrowLeft, ArrowRight, Eye, EyeOff, Trash2, FileText, Keyboard,
  Shuffle, Repeat, ListOrdered, Gauge, ChevronsRight, Pause, AlignLeft,
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
  { value: 'all', label: '全文' },
  { value: 500, label: '500' },
  { value: 200, label: '200' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 20, label: '20' },
  { value: 10, label: '10' },
];

/** 准度门槛可选项：0 = 不设门槛，其余 = 准度达标才能进入下一段 */
const ACC_GATE_OPTIONS = [0, 90, 95, 98, 100];

/** 乱序模式：关 / 打乱本段 / 打乱全文 */
type ShuffleMode = 'off' | 'seg' | 'full';

/** 练习方式设置（本机记忆） */
interface ArticleSettings {
  segLen: SegmentLength;
  shuffleMode: ShuffleMode;
  afterSeg: AfterSegment;
  /** 最低准度（0 = 关） */
  accGate: number;
  /** 极简模式：练习中隐藏辅助信息与按钮行 */
  minimal: boolean;
}

/** 打完一段后的走向（genda「自动发文 / 重复模式」口径） */
type AfterSegment = 'auto-next' | 'repeat' | 'repeat-shuffle' | 'manual';

const AFTER_SEG_OPTIONS: { value: AfterSegment; label: string; hint: string }[] = [
  { value: 'auto-next', label: '自动下一段', hint: '达标后自动进入下一段' },
  { value: 'repeat', label: '重复本段', hint: '达标后自动重复打本段' },
  { value: 'repeat-shuffle', label: '乱序重复', hint: '达标后打乱本段再重复' },
  { value: 'manual', label: '手动', hint: '打完手动选下一段' },
];

const SETTINGS_KEY = 'ziyuan-article-settings-v1';

// ============ 码表方案（内置 / 自定义上传，支持其它输入法方案） ============
const SCHEME_KEY = 'ziyuan-article-scheme-v1';

interface CustomScheme {
  name: string;
  /** 码表原文（本机记忆，刷新后重新解析） */
  raw: string;
  entries: CharCodeLike[];
}

function loadCustomScheme(): CustomScheme | null {
  try {
    const stored = localStorage.getItem(SCHEME_KEY);
    if (!stored) return null;
    const { name, raw } = JSON.parse(stored) as { name?: string; raw?: string };
    if (!raw) return null;
    const entries = parseCodeTable(raw);
    if (entries.length === 0) return null;
    return { name: name || '自定义码表', raw, entries };
  } catch { return null; }
}

function saveCustomScheme(name: string, raw: string) {
  try { localStorage.setItem(SCHEME_KEY, JSON.stringify({ name, raw })); } catch { /* 超出配额等忽略 */ }
}

function clearCustomScheme() {
  try { localStorage.removeItem(SCHEME_KEY); } catch { /* 忽略 */ }
}

function loadSettings(): ArticleSettings {
  const fallback: ArticleSettings = { segLen: 'all', shuffleMode: 'off', afterSeg: 'auto-next', accGate: 0, minimal: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // 兼容旧版「常用字 500 乱序」开关：开过就默认全文乱序
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
  /** 自动走向的剩余提示（空 = 不自动） */
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
  /** 本轮各段速度的最低 / 平均 / 最高（跟打器口径） */
  speedMin: number;
  speedAvg: number;
  speedMax: number;
}

/** 候选框里的候选项：单个汉字，或本文里能一次上屏的官方词组 */
interface Candidate {
  /** 上屏内容（1 个字 = 单字候选；多个字 = 词组候选） */
  text: string;
  phrase: boolean;
}


export default function ArticlePracticePage() {
  const { data: charCodeData, loading: dataLoading } = useCharCodeData();
  const { data: phrasesData } = useBuiltinPhrases();

  // ============ 码表方案：默认字源形码；上传自定义码表后按该方案判定与出候选 ============
  const [customScheme, setCustomScheme] = useState<CustomScheme | null>(loadCustomScheme);
  const [schemeDraft, setSchemeDraft] = useState('');
  const [showSchemeEditor, setShowSchemeEditor] = useState(false);
  const [schemeError, setSchemeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyScheme = useCallback((name: string, raw: string) => {
    const entries = parseCodeTable(raw);
    if (entries.length === 0) {
      setSchemeError('没有解析出有效的码表条目：每行需含「编码 + 字」，如 `ma 马` 或 `马\tma`（支持 Rime / 通用码表格式）');
      return;
    }
    setSchemeError(null);
    setCustomScheme({ name: name.trim() || '自定义码表', raw, entries });
    saveCustomScheme(name.trim() || '自定义码表', raw);
  }, []);

  const clearScheme = useCallback(() => {
    setCustomScheme(null);
    setSchemeError(null);
    clearCustomScheme();
  }, []);

  const onSchemeFile = useCallback(async (file: File) => {
    const raw = await file.text();
    applyScheme(file.name.replace(/\.(txt|yaml|yml|dict|csv)$/i, ''), raw);
  }, [applyScheme]);

  // 生效码表：自定义方案优先；词组是字源官方词表取码，其它方案不启用词组
  const effectiveCodeData = customScheme ? customScheme.entries : charCodeData;
  const usingCustomScheme = !!customScheme;
  const charCodeIndex = useMemo(
    () => (effectiveCodeData ? buildFullCodeIndex(effectiveCodeData) : new Map<string, FullCodeInfo>()),
    [effectiveCodeData],
  );
  /** 当前码表的最长码长（打满即自动上屏；内置方案为 4，自定义方案按码表自适应） */
  const autoCommitLen = useMemo(() => {
    let max = 0;
    for (const info of charCodeIndex.values()) {
      if (info.fullCode.length > max) max = info.fullCode.length;
    }
    return max > 0 ? Math.min(max, 10) : AUTO_COMMIT_LENGTH;
  }, [charCodeIndex]);

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
  /** 下拉面板当前展开的标签（同页展开，不跳页）；'none' = 全部收起 */
  /** 侧栏（窄屏为抽屉）当前标签；'articles' 仅作兼容保留 */
  const [panelTab, setPanelTab] = useState<'none' | 'articles' | 'settings' | 'history' | 'heatmap'>('settings');
  /** 窄屏侧栏抽屉开关 */
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const baseText = selectedId === 'custom'
    ? customText
    : (selectedArticle?.text ?? '');
  const activeText = reviewMode ? reviewChars.join('') : baseText;
  const sourceLabel = reviewMode
    ? '易错字练习'
    : (selectedId === 'custom' ? '自定义文本' : (selectedArticle?.title ?? ''));

  // ============ 练习正文（全文乱序 / 打乱某段都在这份文本上原地改） ============
  /** 正在练习的文本；开始练习时按乱序模式生成，打乱本段时局部替换 */
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
    () => (effectiveCodeData && practiceText ? buildArticleItems(practiceText, charCodeIndex) : []),
    [effectiveCodeData, practiceText, charCodeIndex],
  );
  const itemIndexByTextIndex = useMemo(() => {
    const m = new Map<number, number>();
    items.forEach((it, i) => m.set(it.textIndex, i));
    return m;
  }, [items]);

  /** 当前段第一 / 最后一个题目的下标（items 里；段内没有可打题 = -1） */
  const segFirstItem = useMemo(() => {
    if (!currentSeg) return -1;
    return items.findIndex(it => it.textIndex >= currentSeg.start);
  }, [items, currentSeg]);
  const segLastItem = useMemo(() => {
    if (!currentSeg) return -1;
    // 从后往前找第一个落在段内的题目
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].textIndex < currentSeg.end) return i;
    }
    return -1;
  }, [items, currentSeg]);

  // 本文里能用的官方词组（词组码 → 词）；词组码来自官方词表 + 单字码表取码规则。
  // 自定义码表方案下官方词组码不再适用，不启用词组（只打单字）。
  const articlePhrases = useMemo(
    () => (charCodeData && phrasesData && practiceText && !usingCustomScheme
      ? buildArticlePhrases(practiceText, charCodeIndex, phrasesData)
      : { byCode: new Map<string, string[]>(), codesOf: new Map<string, string[]>() }),
    [charCodeData, phrasesData, practiceText, charCodeIndex, usingCustomScheme],
  );


  // ============ 练习状态 ============
  const roundKey = reviewMode ? 'article:review' : `article:${selectedId}`;
  const { completedRounds, seenCount: roundSeen, markSeen, resetRound } = usePracticeRound(roundKey, items.length);

  const [isPlaying, setIsPlaying] = useState(false);
  /** 暂停（genda 口径：暂停时计时停止、按键无效，Esc 切换） */
  const [paused, setPaused] = useState(false);
  /** 跟打历史成绩（每段一条，本机持久化） */
  const [history, setHistory] = useState<SegmentRecord[]>(loadHistory);
  /** 本段按键分布（记入成绩的 keysMap） */
  const keyStatsRef = useRef<Record<string, number>>({});
  /** 本段「理想键数」（每个上屏字按最短码长计），用于算键准 */
  const idealKeysRef = useRef(0);
  const [cursor, setCursor] = useState(0);
  const [inputCode, setInputCode] = useState('');
  const [feedback, setFeedback] = useState<'correct' | null>(null);
  /** 刚打错的字（非阻断提示，立即进位后仍能看到错的是哪个字） */
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  // 打错的字留下的「你实际打出的字」（item 下标 → 字；打不出字记 '✕'），在字下方红色常显
  const [producedChars, setProducedChars] = useState<Record<number, string>>({});
  /** 本段累计（重打本段时归零） */
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  /** 回改次数：退回去重打的次数（跟打器口径） */
  const [undoCount, setUndoCount] = useState(0);
  /** 段结算 / 全文结算面板 */
  const [segResult, setSegResult] = useState<SegmentResult | null>(null);
  const [articleDone, setArticleDone] = useState<ArticleDoneStats | null>(null);
  /** 全文累计（跨段累加，用于完成面板；speeds 记各段速度算最值） */
  const totalsRef = useRef({ chars: 0, correct: 0, wrong: 0, keys: 0, ideal: 0, ms: 0, segs: 0, speeds: [] as number[] });
  const [showHint, setShowHint] = useState(false);
  const [roundToast, setRoundToast] = useState<number | null>(null);
  // 打字工具口径：击键数（含上屏空格）与用时，用于算速度 / 击键 / 码长
  const [keyStrokes, setKeyStrokes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  // 自动下一段的倒计时句柄，切段 / 退出时要清掉
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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

  // ============ 输入法候选（单字 + 本文词组） ============
  // 码 → 字们（一个码可能对应多个字，与输入法的重码候选一致）；
  // 排序口径统一在 lib/ime-candidates：同码字按字频降序，绝不能用码表插入顺序
  const charsByCode = useMemo(() => buildCharsByCode(charCodeIndex), [charCodeIndex]);
  const sortedCodes = useMemo(() => [...charsByCode.keys()].sort(), [charsByCode]);

  /**
   * 光标起、到下一个标点为止的原文汉字（词组匹配用；取官方最长词 12 字的上限）。
   * 词组必须与它逐字一致才允许上屏——所以标点会自然打断词组。
   */
  const upcomingChars = useMemo(() => {
    const out: string[] = [];
    for (let i = cursor; i < items.length && out.length < 12; i++) {
      const it = items[i];
      if (!isCharItem(it)) break;
      out.push(it.char);
    }
    return out;
  }, [items, cursor]);

  /** 此刻的码是否刚好是一个本文词组（且落在光标处）——词组上屏与候选框共用 */
  const phraseNow = useMemo(
    () => (isPlaying && inputCode
      ? phraseAtCursor(inputCode, articlePhrases.byCode, upcomingChars)
      : null),
    [isPlaying, inputCode, articlePhrases, upcomingChars],
  );

  const candidates = useMemo<Candidate[]>(() => {
    if (!isPlaying || !inputCode) return [];
    const out: Candidate[] = [];
    // 打全某个本文词组时，词组排在第 1 位（与输入法的词组优先一致）
    if (phraseNow) out.push({ text: phraseNow, phrase: true });
    for (const ch of candidatesFor(inputCode, charsByCode, sortedCodes, charFrequency)) {
      if (out.length >= MAX_CANDIDATES) break;
      out.push({ text: ch, phrase: false });
    }
    return out;
  }, [isPlaying, inputCode, phraseNow, charsByCode, sortedCodes]);

  // 键盘事件里要读最新的候选列表（事件监听只挂一次）
  const candidatesRef = useRef<Candidate[]>([]);
  useEffect(() => { candidatesRef.current = candidates; }, [candidates]);

  const current = isPlaying ? items[cursor] : undefined;
  /** 当前题目是汉字时的信息（标点没有编码） */
  const currentChar = current && isCharItem(current) ? current : undefined;
  const awaitingCommit = !!current && !feedback && !segResult && (
    (!!currentChar && isCompleteCodeAwaitingSpace(inputCode, currentChar.codes, autoCommitLen)) || !!phraseNow
  );
  /** 本段准度（结算与门槛判定共用） */
  const accuracy = correctCount + wrongCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;
  /** 打字工具三项指标：速度（字/分）、击键（击/秒）、码长（平均每字击键数） */
  const committed = correctCount + wrongCount;
  const elapsedSec = elapsedMs / 1000;
  const speed = elapsedSec > 1 ? Math.round(committed / (elapsedSec / 60)) : 0;
  const kps = elapsedSec > 1 ? keyStrokes / elapsedSec : 0;
  const avgLen = committed > 0 ? keyStrokes / committed : 0;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
  }, []);

  // 计时：练习中每 0.5s 刷新一次用时，速度才会跟着动；段结算 / 暂停时停止
  useEffect(() => {
    if (!isPlaying || segResult || articleDone || paused) return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 500);
    return () => clearInterval(t);
  }, [isPlaying, segResult, articleDone, paused]);

  /**
   * 当前段变化（切段 / 打乱本段 / 开始练习）后，把光标对到该段第一个题目。
   * 打乱本段会原地替换 practiceText，段边界不变，这里统一对位。
   */
  useEffect(() => {
    if (!isPlaying || !currentSeg) return;
    const first = items.findIndex(it => it.textIndex >= currentSeg.start);
    setCursor(first === -1 ? 0 : first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segIndex, segNonce, practiceText, isPlaying, segLen]);

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

  /** 本段归零重新开始（不改段序） */
  const resetSegmentStats = useCallback(() => {
    setProducedChars({});
    setUndoCount(0);
    setCorrectCount(0);
    setWrongCount(0);
    setKeyStrokes(0);
    setInputCode('');
    setFeedback(null);
    setWrongFlash(null);
    setSegResult(null);
    setPaused(false);
    keyStatsRef.current = {};
    idealKeysRef.current = 0;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
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

  /** 段结算：记成绩 → 判准度门槛 → 按「完成段策略」走向（genda 自动发文口径） */
  const completeSegment = useCallback(() => {
    const segCommitted = correctCount + wrongCount;
    const segAcc = segCommitted > 0 ? Math.round((correctCount / segCommitted) * 100) : 100;
    const segSpeed = elapsedSec > 1 ? Math.round(segCommitted / (elapsedSec / 60)) : 0;
    const ideal = idealKeysRef.current;
    const keyAcc = keyStrokes > 0 ? Math.min(100, Math.round((ideal / keyStrokes) * 100)) : 100;
    const isLast = segIndex >= segments.length - 1;
    // 记一条跟打历史成绩（无论是否达标）
    setHistory(saveRecord({
      t: Date.now(),
      title: sourceLabel,
      seg: segIndex + 1,
      segTotal: segments.length,
      chars: segCommitted,
      keys: keyStrokes,
      ms: elapsedMs,
      speed: segSpeed,
      kps: elapsedSec > 0 ? keyStrokes / elapsedSec : 0,
      avgLen: segCommitted > 0 ? keyStrokes / segCommitted : 0,
      undo: undoCount,
      wrong: wrongCount,
      acc: segAcc,
      keyAcc,
      pass: !(accGate > 0 && segAcc < accGate),
      keysMap: { ...keyStatsRef.current },
    }));
    // 累计全文成绩
    totalsRef.current = {
      chars: totalsRef.current.chars + segCommitted,
      correct: totalsRef.current.correct + correctCount,
      wrong: totalsRef.current.wrong + wrongCount,
      keys: totalsRef.current.keys + keyStrokes,
      ideal: totalsRef.current.ideal + ideal,
      ms: totalsRef.current.ms + elapsedMs,
      segs: totalsRef.current.segs + 1,
      speeds: [...totalsRef.current.speeds, segSpeed],
    };
    const gated = accGate > 0 && segAcc < accGate;
    if (gated) {
      setSegResult({ pass: false, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: wrongCount, keyAcc, autoLabel: '' });
      return;
    }
    if (isLast) {
      // 全文完成：计一轮
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
    // 完成段策略：自动下一段 / 重复本段 / 乱序重复 / 手动
    const goNext = () => goToSegment(segIndex + 1);
    if (afterSeg === 'auto-next') {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: wrongCount, keyAcc, autoLabel: '即将自动进入下一段…' });
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(goNext, 1200);
    } else if (afterSeg === 'repeat') {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: wrongCount, keyAcc, autoLabel: '即将自动重复本段…' });
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => goToSegment(segIndex), 1200);
    } else if (afterSeg === 'repeat-shuffle') {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: wrongCount, keyAcc, autoLabel: '即将打乱本段重复…' });
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => goToSegment(segIndex, true), 1200);
    } else {
      setSegResult({ pass: true, accuracy: segAcc, speed: segSpeed, seconds: elapsedSec, wrong: wrongCount, keyAcc, autoLabel: '' });
    }
  }, [correctCount, wrongCount, keyStrokes, elapsedSec, elapsedMs, undoCount, accGate, segIndex, segments.length,
    afterSeg, sourceLabel, completedRounds, resetRound, goToSegment]);

  /** 进位 n 个题目（n>1 = 一次上屏了多个字的词组）；越过本段最后一个题目 = 本段完成 */
  const advance = useCallback((count = 1) => {
    const next = cursor + count;
    const last = segLastItem;
    if (next > last || last < 0) {
      // 打完本段 → 结算（门槛 / 自动下一段都在这里处理）
      completeSegment();
    } else {
      setCursor(next);
    }
    setInputCode('');
    setFeedback(null);
  }, [cursor, segLastItem, completeSegment]);

  /**
   * 上屏一次输入的结果：produced = 你实际打出的内容（1 个字，或一个多字词组；
   * 满 4 键/空格顶第 1 候选，点候选则直接是那项）。打不出字给 null（显示红叉）。
   * 判定即「打出的内容 == 原文接下来这几个位置」——与跟打器的比对方式一致。
   * typedCode = 这次上屏实际敲下的键，用于击键统计（第 4 键触发时也要算上第 4 键）。
   */
  const commitProduced = useCallback((
    produced: string | null,
    typedCode: string,
    trigger: 'keys' | 'space' | 'pick' | 'punct',
  ) => {
    if (!current || segResult || articleDone || paused) return;
    const n = produced ? [...produced].length : 1;
    const expected = items.slice(cursor, cursor + n).map(it => it.char).join('');
    const ok = produced !== null && produced === expected;
    setKeyStrokes(k => k + typedCode.length + (trigger === 'space' || trigger === 'pick' ? 1 : 0));
    // 按键分布（热图 / 键准）：这次上屏实际敲下的键 + 触发键
    for (const ch of typedCode) keyStatsRef.current[ch] = (keyStatsRef.current[ch] ?? 0) + 1;
    if (trigger === 'space' || trigger === 'pick') {
      keyStatsRef.current[' '] = (keyStatsRef.current[' '] ?? 0) + 1;
    }
    // 逐位记账：标点也是题目（计入本轮进度与正确率），但不进汉字的易错字/积分统计
    for (let k = 0; k < n; k++) {
      const it = items[cursor + k];
      if (!it) break;
      markSeen(String(it.textIndex));
      if (isCharItem(it)) recordChar(it.char, ok);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (ok) {
      // 理想键数：每个上屏字按它的最短码长计（键准 = 理想 / 实际）
      for (let k = 0; k < n; k++) {
        const it = items[cursor + k];
        if (!it) continue;
        let min = Infinity;
        if (isCharItem(it)) for (const c of it.codes) if (c.length < min) min = c.length;
        idealKeysRef.current += min === Infinity ? 1 : min;
      }
      setProducedChars(prev => {
        let changed = false;
        const next = { ...prev };
        for (let k = 0; k < n; k++) {
          if (next[cursor + k] !== undefined) { delete next[cursor + k]; changed = true; }
        }
        return changed ? next : prev;
      });
      setCorrectCount(c => c + n);
      setFeedback('correct');
      timerRef.current = setTimeout(() => advance(n), 150);
    } else {
      // 打错立即进位（模仿打字练习工具）：不阻断打字节奏，打出的内容在下方红色留痕
      setWrongCount(c => c + n);
      setProducedChars(prev => {
        const next = { ...prev };
        for (let k = 0; k < n; k++) {
          if (items[cursor + k]) next[cursor + k] = [...(produced ?? '✕')][k] ?? '✕';
        }
        return next;
      });
      setWrongFlash(current.char);
      advance(n);
      timerRef.current = setTimeout(() => setWrongFlash(null), 1200);
    }
  }, [current, cursor, items, recordChar, markSeen, advance, segResult, articleDone, paused]);

  /**
   * 满 4 键自动顶屏 / 空格上屏。两种上屏：
   * 1. 词组：这个码刚好是本文某个官方词组、且正好落在光标处 → 一次上屏整个词；
   * 2. 单字：由 lib/ime-candidates 决定——精确命中取该码第 1 候选（与候选框第 1 个一致），
   *    满 4 键且码不足 4 键时容忍多打的第 4 键，空格则只认精确码。
   */
  const commitCode = useCallback((code: string, trigger: 'keys' | 'space') => {
    const phrase = phraseAtCursor(code, articlePhrases.byCode, upcomingChars);
    if (phrase) { commitProduced(phrase, code, trigger); return; }
    commitProduced(
      resolveCommitChar(code, charsByCode, charFrequency, trigger === 'keys'),
      code,
      trigger,
    );
  }, [commitProduced, articlePhrases, upcomingChars, charsByCode]);

  /** 数字键 / 点击候选：直接选中该候选项上屏（单字或词组） */
  const pickCandidate = useCallback((candidate: Candidate) => {
    if (!isPlaying || !current || feedback === 'correct' || segResult || !inputCode) return;
    commitProduced(candidate.text, inputCode, 'pick');
  }, [isPlaying, current, feedback, inputCode, segResult, commitProduced]);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || !current || feedback === 'correct' || segResult || articleDone || paused) return;
    keyStatsRef.current[key] = (keyStatsRef.current[key] ?? 0) + 1;
    // 标点题目：按映射键（, . \ ; : " < >> [ ] ` - ^ ~ …）或输入法直接上屏的全角标点
    if (isPunctItem(current)) {
      if (key === current.key || key === current.char) commitProduced(current.char, key, 'punct');
      return;
    }
    const newCode = inputCode + key;
    if (newCode.length > autoCommitLen) return;
    setInputCode(newCode);
    if (newCode.length < autoCommitLen) return;
    commitCode(newCode, 'keys');
  }, [isPlaying, current, feedback, inputCode, autoCommitLen, segResult, articleDone, paused, commitCode, commitProduced]);

  const handleSpaceCommit = useCallback((): boolean => {
    if (!isPlaying || !current || !inputCode || feedback === 'correct' || segResult || articleDone || paused) return false;
    commitCode(inputCode, 'space');
    return true;
  }, [isPlaying, current, inputCode, feedback, segResult, articleDone, commitCode]);

  /**
   * 退格：有正在敲的码先删码；码删空后再按 → **删掉上一个已打出的字**（打对的也删），
   * 光标退回那一个字重打，并撤销那次的记录（按最终结果算），记一次「回改」。
   */
  const handleBackspace = useCallback(() => {
    if (!isPlaying || feedback === 'correct' || segResult || articleDone || paused) return;
    if (inputCode) {
      setInputCode(prev => prev.slice(0, -1));
      return;
    }
    const prevIdx = cursor - 1;
    if (prevIdx < (segFirstItem >= 0 ? segFirstItem : 0)) return;
    const item = items[prevIdx];
    if (!item) return;
    keyStatsRef.current['⌫'] = (keyStatsRef.current['⌫'] ?? 0) + 1;
    const produced = producedChars[prevIdx];
    // 打出的内容就是原文（或没有失败记录）→ 那次是答对的，回退要撤销正确记录
    const wasCorrect = produced === undefined || produced === item.char;
    // 标点只计本轮进度与正确率，不进汉字统计，所以回退也不撤销汉字记录
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
    setWrongFlash(null);
    setCursor(prevIdx);
    setInputCode('');
    setFeedback(null);
  }, [isPlaying, feedback, inputCode, cursor, items, producedChars, retractChar, segResult, articleDone, paused, segFirstItem]);

  /**
   * 开始练习（或重打全文）：按当前文章与乱序模式生成练习文本，回到第 1 段。
   * textOverride = 从其他入口（如易错字练习）带进来的文本。
   */
  const startPractice = useCallback((textOverride?: string) => {
    const sourceText = textOverride ?? activeText;
    if (!sourceText.trim() || !effectiveCodeData) return;
    const t = shuffleMode === 'full' ? shuffleFullText(sourceText) : sourceText;
    if (!t.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    totalsRef.current = { chars: 0, correct: 0, wrong: 0, keys: 0, ideal: 0, ms: 0, segs: 0, speeds: [] };
    keyStatsRef.current = {};
    idealKeysRef.current = 0;
    setPracticeText(t);
    setSegIndex(0);
    setArticleDone(null);
    setSegResult(null);
    setPaused(false);
    setProducedChars({});
    setCorrectCount(0);
    setWrongCount(0);
    setUndoCount(0);
    setKeyStrokes(0);
    setInputCode('');
    setFeedback(null);
    setWrongFlash(null);
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    resetRound();
    setIsPlaying(true);
    // 开始页内容比练习区高，浏览器滚动锚定会把窗口带偏、把顶部统计行顶到导航栏后面
    window.scrollTo({ top: 0 });
  }, [activeText, effectiveCodeData, shuffleMode, resetRound]);

  /** 选择文章 = 立即以该文开练（同页切换，不跳页） */
  const selectArticle = useCallback((id: string) => {
    if (id === 'custom') {
      if (!customText.trim()) return;
      setSelectedId('custom');
      setReviewMode(false);
      startPractice(customText);
      return;
    }
    const art = DEFAULT_ARTICLES.find(a => a.id === id);
    if (!art) return;
    setSelectedId(id);
    setReviewMode(false);
    startPractice(art.text);
  }, [customText, startPractice]);

  /** 进入页面自动开练；切换码表方案后按当前文章重开 */
  const schemeName = customScheme?.name ?? '';
  const bootRef = useRef(false);
  const prevSchemeRef = useRef(schemeName);
  useEffect(() => {
    if (bootRef.current || !effectiveCodeData || !activeText.trim()) return;
    bootRef.current = true;
    startPractice();
  }, [effectiveCodeData, activeText, startPractice]);
  useEffect(() => {
    if (prevSchemeRef.current === schemeName) return;
    prevSchemeRef.current = schemeName;
    bootRef.current = true;
    if (isPlaying && !reviewMode) startPractice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeName]);

  // 物理键盘
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || articleDone) {
        // 全文完成面板：回车 = 重打全文
        if (articleDone && e.key === 'Enter') { e.preventDefault(); startPractice(); }
        return;
      }
      // Esc：暂停 / 继续（genda 口径）；暂停中只响应 Esc / Enter
      if (e.key === 'Escape' || (paused && e.key === 'Enter')) {
        e.preventDefault();
        if (paused) {
          // 继续时把起点接回当前累计用时，计时才连续
          startedAtRef.current = Date.now() - elapsedMs;
          setPaused(false);
        } else {
          setPaused(true);
        }
        return;
      }
      if (paused) return;
      // 跟打器快捷键：上一段 / 下一段 / 打乱本段 / 重打本段
      if (e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); goToSegment(Math.max(0, segIndex - 1)); return; }
      // 准度门槛拦下时不允许跳下一段(与界面按钮一致)
      if (e.ctrlKey && e.key.toLowerCase() === 'j' && !(segResult && !segResult.pass)) { e.preventDefault(); goToSegment(Math.min(segments.length - 1, segIndex + 1)); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); goToSegment(segIndex, true); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); goToSegment(segIndex); return; }
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      if (e.key === ' ') { e.preventDefault(); handleSpaceCommit(); return; }
      // 数字键 1-9：选第 N 个候选（输入法的显式选字，可能是单字也可能是词组）
      if (/^[1-9]$/.test(e.key) && candidatesRef.current.length > 0) {
        const pick = candidatesRef.current[Number(e.key) - 1];
        if (pick) {
          e.preventDefault();
          keyStatsRef.current[e.key] = (keyStatsRef.current[e.key] ?? 0) + 1;
          pickCandidate(pick);
          return;
        }
      }
      // 标点题目：按映射键（, . \ ; : " < > [ ] ` - ^ ~ …）或输入法直接上屏的全角标点
      if (current && isPunctItem(current)) {
        if (e.key === current.key || e.key === current.char) {
          e.preventDefault();
          handleKeyPress(e.key);
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) { e.preventDefault(); handleKeyPress(key); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, current, handleKeyPress, handleSpaceCommit, handleBackspace, pickCandidate,
    goToSegment, segIndex, segments.length, articleDone, startPractice, segResult, paused, elapsedMs]);

  if (!usingCustomScheme && (dataLoading || !charCodeData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">加载码表数据...</span>
        </div>
      </div>
    );
  }

  const chars = [...practiceText];
  const itemCount = items.length;
  const segTotal = segments.length;

  /** 段完成结算面板（通过 → 绿色；被准度门槛拦下 → 红色） */
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
        <Button size="sm" className="gap-1.5 text-xs"
          onClick={() => goToSegment(segIndex)}>
          <Repeat className="h-3.5 w-3.5" />重打本段
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs"
          onClick={() => goToSegment(segIndex, true)}>
          <Shuffle className="h-3.5 w-3.5" />打乱重打
        </Button>
        {segResult.pass && segIndex < segTotal - 1 && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={() => goToSegment(segIndex + 1)}>
            下一段<ChevronsRight className="h-3.5 w-3.5" />
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
        <Button size="sm" variant="outline" className="gap-1.5 text-xs"
          onClick={() => { setArticleDone(null); setPanelTab('history'); setDrawerOpen(true); }}>
          选其他文章 / 查看历史
        </Button>
      </div>
    </div>
  );

  /** 侧边栏内容：文章 + 易错字 + 方式 / 历史 / 热图（桌面常驻右侧，窄屏抽屉） */
  const sidebarBody = (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 font-serif">文章</h3>
        <div className="space-y-1.5">
          {DEFAULT_ARTICLES.map(a => (
            <button key={a.id} onClick={() => { selectArticle(a.id); setDrawerOpen(false); }}
              className={cn('w-full px-3 py-2 rounded-lg border text-left transition-all',
                selectedId === a.id && !reviewMode
                  ? 'border-primary/40 bg-primary/[0.06]'
                  : 'border-border/50 hover:border-primary/25 hover:bg-muted/40')}>
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{a.title}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono-stat shrink-0">{[...a.text].length} 字</span>
              </div>
            </button>
          ))}
          {customText.trim() && (
            <button onClick={() => { selectArticle('custom'); setDrawerOpen(false); }}
              className={cn('w-full px-3 py-2 rounded-lg border text-left transition-all',
                selectedId === 'custom' && !reviewMode
                  ? 'border-primary/40 bg-primary/[0.06]'
                  : 'border-border/50 hover:border-primary/25 hover:bg-muted/40')}>
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">自定义文本</span>
                <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono-stat shrink-0">{[...customText].length} 字</span>
              </div>
            </button>
          )}
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
            onClick={() => setShowEditor(v => !v)}>
            <FileText className="h-3.5 w-3.5" />{showEditor ? '收起编辑框' : '粘贴自定义文本'}
          </Button>
          {showEditor && (
            <div className="pt-1">
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
                placeholder="把要练习的文章粘贴到这里（标点按对应键打，如「，」按 , 「。」按 .）"
                className="w-full text-xs p-2 rounded-lg border border-border bg-muted/40 focus:outline-none focus:border-primary/40 resize-y"
              />
              <div className="flex items-center justify-between mt-2">
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
          )}
        </div>
      </div>

      <ErrorItemsPanel
        items={errorItems}
        onDrill={reviewChars.length > 0 ? () => { setReviewMode(true); startPractice(reviewChars.join('')); setDrawerOpen(false); } : undefined}
        title="易错字（答错次数）"
      />

      <div>
        <div className="flex items-center gap-1 mb-3 border-b border-border/40">
          {([['settings', '练习方式'], ['history', '历史'], ['heatmap', '按键统计']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setPanelTab(v)}
              className={cn('px-2.5 py-1.5 text-xs -mb-px border-b-2 transition-colors',
                panelTab === v
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {label}{v === 'history' && history.length > 0 ? ` ${history.length}` : ''}
            </button>
          ))}
        </div>

        {panelTab === 'history' && (
          <ArticleHistoryTable
            records={history}
            onClear={() => { clearHistory(); setHistory([]); }}
            defaultOpen
          />
        )}
        {panelTab === 'heatmap' && (
          <div className="overflow-x-auto pb-2">
            <KeyHeatmap counts={aggregateKeys(history)} />
          </div>
        )}
        {panelTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 font-serif flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5" />码表方案
              </h3>
              <div className="flex gap-1 flex-wrap mb-1.5">
                <button onClick={clearScheme}
                  className={cn('px-2.5 py-1 rounded-lg border text-xs transition-colors',
                    !usingCustomScheme
                      ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                      : 'border-border/60 text-muted-foreground hover:border-primary/30')}>
                  字源形码 · 内置
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className={cn('px-2.5 py-1 rounded-lg border text-xs transition-colors',
                    usingCustomScheme
                      ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                      : 'border-border/60 text-muted-foreground hover:border-primary/30')}>
                  {customScheme ? `${customScheme.name}（${customScheme.entries.length} 条）` : '上传码表文件'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.yaml,.yml,.dict,.csv,text/plain"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) void onSchemeFile(f);
                  e.target.value = '';
                }}
              />
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                支持其它输入法方案（通用「编码 字」/ Rime / 虎码等，UTF-8）；
                判定、候选、最长码长按该方案来，词组仅字源方案可用。
              </p>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-1.5"
                onClick={() => {
                  setShowSchemeEditor(v => {
                    const next = !v;
                    if (next && !schemeDraft) setSchemeDraft(customScheme?.raw ?? '');
                    return next;
                  });
                  setSchemeError(null);
                }}>
                <FileText className="h-3.5 w-3.5" />
                {showSchemeEditor ? '收起码表编辑框' : (customScheme ? '查看 / 更换码表文本' : '粘贴码表文本')}
              </Button>
              {showSchemeEditor && (
                <div className="mt-2">
                  <textarea
                    value={schemeDraft}
                    onChange={e => { setSchemeDraft(e.target.value); setSchemeError(null); }}
                    rows={5}
                    placeholder={'每行一条：编码 字（或 字 编码 / Rime 格式）'}
                    className="w-full text-xs font-mono p-2 rounded-lg border border-border bg-muted/40 focus:outline-none focus:border-primary/40 resize-y"
                  />
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[11px] text-red-500 truncate">{schemeError}</span>
                    <Button size="sm" className="gap-1.5 text-xs shrink-0"
                      disabled={!schemeDraft.trim()}
                      onClick={() => applyScheme('粘贴的码表', schemeDraft)}>
                      使用此码表
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5">段长（「全文」= 文章模式）</div>
              <div className="flex gap-1 flex-wrap">
                {SEG_LEN_OPTIONS.map(o => (
                  <button key={String(o.value)}
                    onClick={() => updateSettings({ segLen: o.value })}
                    className={cn('px-2.5 py-1 rounded-lg border text-xs transition-colors',
                      segLen === o.value
                        ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                        : 'border-border/60 text-muted-foreground hover:border-primary/30')}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <Shuffle className="h-3 w-3" />乱序（开始练习时打乱）
              </div>
              <div className="flex gap-1 flex-wrap">
                {([['off', '关'], ['seg', '本段'], ['full', '全文']] as const).map(([v, label]) => (
                  <button key={v}
                    onClick={() => updateSettings({ shuffleMode: v })}
                    className={cn('px-2.5 py-1 rounded-lg border text-xs transition-colors',
                      shuffleMode === v
                        ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                        : 'border-border/60 text-muted-foreground hover:border-primary/30')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <Gauge className="h-3 w-3" />最低准度（不达标不能进下一段）
              </div>
              <div className="flex gap-1 flex-wrap">
                {ACC_GATE_OPTIONS.map(v => (
                  <button key={v}
                    onClick={() => updateSettings({ accGate: v })}
                    className={cn('px-2.5 py-1 rounded-lg border text-xs transition-colors',
                      accGate === v
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                        : 'border-border/60 text-muted-foreground hover:border-amber-500/30')}>
                    {v === 0 ? '关' : `${v}%`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <ChevronsRight className="h-3 w-3" />打完一段后（自动发文 / 重复）
              </div>
              <div className="flex gap-1 flex-wrap">
                {AFTER_SEG_OPTIONS.map(o => (
                  <button key={o.value} title={o.hint}
                    onClick={() => updateSettings({ afterSeg: o.value })}
                    className={cn('px-2.5 py-1 rounded-lg border text-xs transition-colors',
                      afterSeg === o.value
                        ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                        : 'border-border/60 text-muted-foreground hover:border-primary/30')}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40">
              <button
                onClick={() => updateSettings({ minimal: !minimal })}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors mt-2',
                  minimal
                    ? 'border-primary/40 bg-primary/[0.06] text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/25')}
              >
                <AlignLeft className="h-3.5 w-3.5" />极简模式：{minimal ? '开' : '关'}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              快捷键：<kbd className="px-1 rounded bg-muted font-mono">Esc</kbd> 暂停/继续 ·
              <kbd className="px-1 rounded bg-muted font-mono">Ctrl+U/J</kbd> 上/下一段 ·
              <kbd className="px-1 rounded bg-muted font-mono">Ctrl+Y</kbd> 重打本段 ·
              <kbd className="px-1 rounded bg-muted font-mono">Ctrl+K</kbd> 打乱本段
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1500px] lg:flex lg:items-start">
        <main className="flex-1 min-w-0">
      <section className="py-3 sm:py-6">
        <div className="max-w-3xl mx-auto lg:mx-0 px-3 sm:px-6 lg:pl-5">
            {/* 顶部：轮次 / 本轮进度 / 正确率 + 速度 / 击键 / 码长 + 暂停 / 极简 */}
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
                <span className="font-medium text-foreground">第 {Math.min(segIndex + 1, segTotal || 1)}/{segTotal || 1} 段</span>
                <span className="text-border">|</span>
                <span>速度 <span className="font-mono-stat font-semibold text-foreground">{speed}</span> 字/分</span>
                <span className="text-border">|</span>
                <span>击键 <span className="font-mono-stat font-semibold text-foreground">{kps.toFixed(2)}</span></span>
                <span className="text-border">|</span>
                <span>码长 <span className="font-mono-stat font-semibold text-foreground">{avgLen.toFixed(2)}</span></span>
                <button
                  onClick={() => {
                    if (paused) { startedAtRef.current = Date.now() - elapsedMs; setPaused(false); }
                    else setPaused(true);
                  }}
                  disabled={!!segResult || !!articleDone}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 transition-colors shrink-0 disabled:opacity-50"
                >
                  <Pause className="h-3.5 w-3.5" />{paused ? '继续' : '暂停'}
                  <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/50 rounded font-mono">Esc</kbd>
                </button>
                <button
                  onClick={() => updateSettings({ minimal: !minimal })}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0',
                    minimal
                      ? 'text-primary bg-primary/10 border-primary/40'
                      : 'text-muted-foreground bg-muted/40 hover:text-foreground border-border/60')}
                >
                  <AlignLeft className="h-3.5 w-3.5" />极简
                </button>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-foreground/80 bg-muted/50 hover:bg-muted border border-border/60 transition-colors shrink-0"
                >
                  <ListOrdered className="h-3.5 w-3.5" />文章与设置
                </button>
              </div>
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
                  // 空白 / 码表外又无按键可打的字符：只占位、不参与跟打，下方跟打位留空
                  if (itemIdx === undefined) {
                    return (
                      <span key={ti} data-cell className="inline-flex flex-col items-start text-muted-foreground/35" style={{ width: '1em', height: CELL_EM }}>
                        <span style={{ fontSize: '1em', lineHeight: ROW_LINE_HEIGHT }}>{ch}</span>
                        <span style={{ fontSize: '1em', lineHeight: ROW_LINE_HEIGHT }}>{NBSP}</span>
                      </span>
                    );
                  }
                    const item = items[itemIdx];
                    const isPunct = isPunctItem(item);
                    const isCurrent = itemIdx === cursor;
                    const isDone = itemIdx < cursor;
                    const producedChar = producedChars[itemIdx];

                    // 跟打行 = 一行正常大小的文字（和原文一样大）：
                    //   打对 → 显示该字；打错 → 显示你打出的那个字（码表里没有就红叉，说明打不出字）；
                    //   正在敲 → 像输入法那样把「正在输入的码」直接显示在这一行（带下划线），上屏后换成字。
                    //   标点 → 提示要按的那个键（如「，」按 ,、「《」按 <）。
                    let bottom: ReactNode = NBSP;
                    let bottomCls = 'text-muted-foreground/30';
                    if (isCurrent) {
                      if (feedback === 'correct') {
                        bottom = ch;
                        bottomCls = 'text-foreground/70';
                      } else if (isPunct) {
                        bottom = item.key;
                        bottomCls = 'font-mono text-amber-600 dark:text-amber-400/90 text-[0.55em]';
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
                        // 你打出（或选中）的内容；打不出字时是 ✕
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
                  {segLen !== 'all' && <>第 {segIndex + 1}/{segTotal} 段 · </>}
                  {sourceLabel} · 方案 {customScheme?.name ?? '字源形码'} · 共 {itemCount} 字 · 均码 {avgLen.toFixed(2)} · 错字 {wrongCount}
                  {undoCount > 0 && <span className="text-primary"> · 回改 {undoCount}</span>}
                  {shuffleMode !== 'off' && <span className="text-primary"> · 乱序</span>}
                  {accGate > 0 && <span className="text-amber-600 dark:text-amber-400"> · 准度 {accuracy}% / {accGate}%</span>}
                </span>
              </div>
            </div>

            {/* 段结算 / 全文完成面板 */}
            {segResultPanel}
            {articleDonePanel}

            {/* 输入法候选窗：跟随「正在敲的码」浮动在字下方（fixed 定位，见上面的 useLayoutEffect） */}
            {isPlaying && !feedback && !segResult && !articleDone && inputCode && candidates.length > 0 && (
              <div
                ref={candBoxRef}
                className="fixed z-40 flex flex-wrap items-center gap-0.5 max-w-[min(92vw,640px)] rounded-lg border border-primary/30 bg-card/98 px-2 py-1 shadow-lg shadow-black/10 backdrop-blur"
                style={{ left: -9999, top: -9999 }}
              >
                {candidates.map((c, i) => (
                  <button
                    key={`${c.phrase ? 'p' : 'c'}${c.text}`}
                    onMouseDown={(e) => { e.preventDefault(); pickCandidate(c); }}
                    title={c.phrase ? `词组：${c.text}（一次上屏）` : undefined}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors',
                      c.phrase ? 'text-base sm:text-lg' : 'text-lg sm:text-xl',
                      i === 0
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground/85 hover:bg-muted',
                    )}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
                    {c.phrase && (
                      <span className="text-[9px] px-1 rounded bg-primary/10 text-primary/90 font-medium">词</span>
                    )}
                    {c.text}
                  </button>
                ))}
              </div>
            )}

            {/* 暂停覆盖层（genda 口径：计时停、按键无效） */}
            {paused && !segResult && !articleDone && (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-5 text-center">
                <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">已暂停 · 计时停止</div>
                <div className="mt-1 text-xs text-muted-foreground">按 <kbd className="px-1 rounded bg-amber-500/10 border border-amber-500/30 font-mono">Esc</kbd> 或点击按钮继续</div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Button size="sm" className="gap-1.5 text-xs"
                    onClick={() => { startedAtRef.current = Date.now() - elapsedMs; setPaused(false); }}>
                    <Play className="h-3.5 w-3.5" />继续打字
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                    onClick={() => { setSegResult(null); setArticleDone(null); setPaused(false); setDrawerOpen(true); }}>
                    选其他文章
                  </Button>
                </div>
              </div>
            )}

            {!minimal && (
              <>
                {showHint && current && !segResult && !articleDone && (
                  <div className="text-center text-xs font-mono text-amber-600 dark:text-amber-400 mt-2">
                    {isCharItem(current)
                      ? <>{current.char} → {current.codes.map(c => c.toUpperCase()).join(' / ')}</>
                      : <>{current.char}（标点）→ 按 <kbd className="px-1 rounded bg-amber-500/10 border border-amber-500/30">{current.key}</kbd></>}
                  </div>
                )}
                {awaitingCommit && (
                  <div className="text-center text-xs font-medium text-amber-600 dark:text-amber-400 mt-2">
                    已打完整编码 · 按
                    <kbd className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-[10px]">空格</kbd>
                    上屏第 1 候选（也可数字键 / 点候选）
                    {phraseNow && <span> · 第 1 个候选是词组「{phraseNow}」，一次上屏</span>}
                  </div>
                )}
                {wrongFlash && !segResult && (
                  <div className="text-center text-xs text-red-600 dark:text-red-400 mt-2">
                    「{wrongFlash}」打错了 · 可退格回退改掉（也可继续往下打）
                  </div>
                )}
              </>
            )}
            {current && isPunctItem(current) && !feedback && !segResult && !articleDone && !paused && (
              <div className="flex items-center justify-center mt-3">
                <button
                  onClick={() => handleKeyPress(current.key)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm transition-colors hover:bg-amber-500/20"
                >
                  标点「{current.char}」· 按
                  <kbd className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-xs">{current.key}</kbd>
                  上屏
                </button>
              </div>
            )}
            {!minimal && (
              <div className="text-center text-[11px] text-muted-foreground/60 mt-2">
                退格：先删正在敲的码；码删空后再按 = 删掉上一个已打出的字（标点也算，打对的也删），回到那一个字重打
              </div>
            )}

            {!minimal && (
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => goToSegment(segIndex)} disabled={!!segResult || !!articleDone}>
                <Repeat className="h-3.5 w-3.5" />重打本段
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => goToSegment(segIndex, true)} disabled={!!segResult || !!articleDone}>
                <Shuffle className="h-3.5 w-3.5" />打乱本段
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => goToSegment(Math.max(0, segIndex - 1))} disabled={segIndex === 0}>
                <ArrowLeft className="h-3.5 w-3.5" />上一段
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => goToSegment(Math.min(segTotal - 1, segIndex + 1))}
                disabled={segIndex >= segTotal - 1 || (segResult !== null && !segResult.pass)}>
                下一段<ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => startPractice()}>
                <RotateCcw className="h-3.5 w-3.5" />从头再来
              </Button>
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
            )}
            {showKeyboard && (
              <div className="mt-3">
                <PracticeKeyboard
                  mode="codes"
                  keyFeedback={null}
                  feedbackType={feedback}
                  onKeyPress={handleKeyPress}
                  onBackspace={handleBackspace}
                  onSpace={() => { if (!feedback && !segResult) handleSpaceCommit(); }}
                  headerLeft="编码键盘"
                  headerRight={<span className="text-[10px] text-muted-foreground">{cursor + 1}/{itemCount}</span>}
                />
              </div>
            )}
          </div>
        </section>
        </main>

        {/* 右侧边栏：桌面常驻，窄屏抽屉 */}
        {!minimal && (
          <aside className="hidden lg:block w-[350px] shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-border/40 bg-card/40 px-4 py-4">
            {sidebarBody}
          </aside>
        )}
      </div>

      {/* 窄屏抽屉 */}
      {drawerOpen && !minimal && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88vw] max-w-sm bg-background shadow-xl overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">文章与设置</span>
              <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(false)}>收起</Button>
            </div>
            {sidebarBody}
          </div>
        </div>
      )}

      <RoundCompleteToast roundNo={roundToast} onClose={() => setRoundToast(null)} />
    </div>
  );
}
