import { useState, useCallback, useRef, useEffect, useMemo, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Upload, FileText, BarChart3, Keyboard, CheckCircle2, XCircle, X,
  Loader2, Trash2, ClipboardCopy, Download, AlertTriangle, Activity,
  Award, Zap, Info, Target, Gauge, Flame, BookOpen, Maximize2, Search,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { useCharCodeData, useBuiltinPhrases, type BuiltinPhrasesData } from '@/lib/data-loader';
import { calculateCoverage } from '@/data/builtinCharSets';
import { charFrequency } from '@/data/charFrequency';
import { calcWeightedSpeedEquivalent, getSpeedEquivalent } from '@/data/speedEquivalent';
import { GB2312_CHARS, GBK_CHARS } from '@/data/standardCharsets';
import { tongguiAll } from '@/data/tongguiChars';

// ========================================
// 安全计算工具函数
// ========================================

// 安全除法，避免除以零
const safeDivide = (numerator: number, denominator: number, defaultValue = 0): number => {
  return denominator > 0 ? numerator / denominator : defaultValue;
};

// 限制百分比在 0-100 之间
const clampPercentage = (value: number): number => {
  return Math.min(100, Math.max(0, value));
};

// 四舍五入到指定小数位
const roundTo = (value: number, decimals = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// ========================================
// 常量定义
// ========================================

const KEYBOARD_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const LEFT_HAND_KEYS = new Set(['q','w','e','r','t','a','s','d','f','g','z','x','c','v','b']);
const RIGHT_HAND_KEYS = new Set(['y','u','i','o','p','h','j','k','l','n','m']);

const FINGER_MAP: Record<string, string> = {
  'q': '左小指', 'a': '左小指', 'z': '左小指',
  'w': '左无名指', 's': '左无名指', 'x': '左无名指',
  'e': '左中指', 'd': '左中指', 'c': '左中指',
  'r': '左食指', 'f': '左食指', 'v': '左食指',
  't': '左食指', 'g': '左食指', 'b': '左食指',
  'y': '右食指', 'h': '右食指', 'n': '右食指',
  'u': '右中指', 'j': '右中指', 'm': '右中指',
  'i': '右无名指', 'k': '右无名指',
  'o': '右小指', 'l': '右小指', 'p': '右小指',
};

/** 键盘行号映射（用于计算跨排行数） */
const KEY_ROW: Record<string, number> = {
  'q': 0, 'w': 0, 'e': 0, 'r': 0, 't': 0, 'y': 0, 'u': 0, 'i': 0, 'o': 0, 'p': 0,
  'a': 1, 's': 1, 'd': 1, 'f': 1, 'g': 1, 'h': 1, 'j': 1, 'k': 1, 'l': 1,
  'z': 2, 'x': 2, 'c': 2, 'v': 2, 'b': 2, 'n': 2, 'm': 2,
};

// 字频数据已迁移到 charFrequency.ts（基于 Zipf 定律的真实字频模型）

// 字频分段（匹配宇浩测评标准分段，最后一段自动延伸至覆盖全部字符）
const FREQ_TIERS = [
  { key: '1-300',     label: '1~300',     start: 0,    end: 300 },
  { key: '301-500',   label: '301~500',   start: 300,  end: 500 },
  { key: '501-1500',  label: '501~1500',  start: 500,  end: 1500 },
  { key: '1501-3000', label: '1501~3000', start: 1500, end: 3000 },
  { key: '3001-6000', label: '3001~6000', start: 3000, end: 6000 },
];

// 词组频段（匹配参考图分段）
const PHRASE_FREQ_TIERS = [
  { key: '1-2000',       label: '1~2000',       start: 0,    end: 2000 },
  { key: '2001-5000',    label: '2001~5000',    start: 2000,  end: 5000 },
  { key: '5001-10000',   label: '5001~10000',   start: 5000,  end: 10000 },
  { key: '10001-20000',  label: '10001~20000',  start: 10000, end: 20000 },
  { key: '20001-40000',  label: '20001~40000',  start: 20000, end: 40000 },
  { key: '40001-60000',  label: '40001~60000',  start: 40000, end: 60000 },
];

// 评级标准
function getGrade(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: '优秀', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' };
  if (score >= 75) return { label: '良好', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' };
  if (score >= 60) return { label: '一般', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' };
  return { label: '较差', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500' };
}

function getGradeBadge(score: number) {
  const g = getGrade(score);
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white', g.bg)}>{g.label}</span>;
}

// ========================================
// 字集过滤类型与工具
// ========================================

/** 可选的字符集过滤范围 */
type CharsetFilter = 'all' | 'gb2312' | 'gbk' | 'tonggui';

const CHARSET_OPTIONS: Array<{ value: CharsetFilter; label: string; description: string }> = [
  { value: 'all',      label: '全字库', description: '所有 Unicode CJK 汉字' },
  { value: 'gb2312',   label: 'GB2312', description: 'GB2312 一级+二级汉字 (6763字)' },
  { value: 'gbk',      label: 'GBK',    description: 'GBK 扩展汉字集 (21003字)' },
  { value: 'tonggui',  label: '通规',   description: '通用规范汉字表 (8105字)' },
];

/** 字符集 Set 缓存：避免每次过滤都对 GB2312/GBK 长字符串做 split + new Set() */
const _charsetSetCache = new Map<CharsetFilter, Set<string>>();
function getCharsetSet(charset: CharsetFilter): Set<string> | null {
  if (charset === 'all') return null;
  let cached = _charsetSetCache.get(charset);
  if (!cached) {
    const raw = charset === 'gb2312' ? GB2312_CHARS
      : charset === 'gbk' ? GBK_CHARS
      : charset === 'tonggui' ? tongguiAll
      : '';
    const charArr: string[] = typeof raw === 'string' ? raw.split('') : raw;
    cached = new Set(charArr);
    _charsetSetCache.set(charset, cached);
  }
  return cached;
}

/** 根据字集过滤码表条目（使用缓存 Set） */
function filterEntriesByCharset(entries: CodeEntry[], charset: CharsetFilter): CodeEntry[] {
  if (charset === 'all') return entries;
  const set = getCharsetSet(charset);
  if (!set) return entries;
  return entries.filter(e => set.has(e.char));
}

// ========================================
// 类型定义
// ========================================

interface CodeEntry {
  char: string;
  code: string;
}

interface EvaluateResult {
  // 基础数据
  totalChars: number;
  totalCodes: number;
  uniqueCodes: number;
  duplicateCount: number;

  // 核心指标
  weightedAvgCodeLen: number;
  fullDupRate: number;
  staticDupCount: number;
  simplifiedDupRate: number;
  dynamicSelectionRate: number;
  equivalent: number;
  speedEquivalent: number;
  compositeScore: number;

  // 原有指标
  avgCodeLength: number;
  maxCodeLength: number;
  codeLengthStdDev: number;
  codeLengthDist: Record<number, number>;
  keyFreq: Record<string, number>;
  keyUsageRate: Record<string, number>;
  leftHandRate: number;
  rightHandRate: number;
  fingerLoad: Record<string, number>;
  sameFingerRate: number;
  handAlternationRate: number;
  gb2312Coverage: number;
  gbkCoverage: number;
  tongguiCoverage: number;
  efficiencyScore: number;
  ergonomicsScore: number;
  balanceScore: number;

  // 候选项指标
  maxCandidatesPerCode: number;
  codesNeedingPage: number;
  gb2312MaxCandidates: number;
  gbkMaxCandidates: number;
  gb2312StaticDup: number;
  gbkStaticDup: number;
  weightedSameFingerRate: number;
  weightedHandAltRate: number;

  // 详细数据
  topDupes: Array<{ code: string; chars: string[]; count: number }>;
  freqTierStats: Array<{
    tier: string;
    charCount: number;
    oneCode: number;          // 1码字数
    twoCode: number;          // 2码字数
    threeCode: number;        // 3码字数
    fourCode: number;         // 4码字数
    shortDupCount: number;    // 简码重码（选重）
    fullDupCount: number;     // 全码重码
    theoreticalTwoShort: number; // 理论二简
    weightedCodeLen: number;  // 加权键长
    weightedCharEquiv: number; // 加权字均当量
    weightedKeyEquiv: number;  // 加权键均当量
    handAltCount: number;     // 左右互击
    sameFingerBigCross: number; // 同指大跨排
    sameFingerSmallCross: number; // 同指小跨排
    sameKeyTriple: number;    // 同键三连
    sameKeyQuad: number;      // 同键四连
    sameFingerTriple: number; // 同指三连
    sameFingerQuad: number;   // 同指四连
    pinkyCount: number;       // 小指干扰
    // 频率加权字段（加权比重用，与运行时返回对象一致）
    freqSum: number;
    oneCodeFreq: number;
    twoCodeFreq: number;
    threeCodeFreq: number;
    fourCodeFreq: number;
    shortDupFreq: number;
    fullDupFreq: number;
    theoreticalTwoShortFreq: number;
    pairFreqSum: number;
    handAltFreq: number;
    sfbFreq: number;
    sfsFreq: number;
    sktFreq: number;
    skqFreq: number;
    sftFreq: number;
    sfqFreq: number;
    pinkyFreq: number;
  }>;
  codeLenChartData: Array<{ name: string; count: number; percent: number }>;
  fingerChartData: Array<{ name: string; value: number; percent: number }>;

  // 词组测评指标
  phraseEval: {
    twoChar: PhraseTierResult;
    threeChar: PhraseTierResult;
    fourChar: PhraseTierResult;
    overall: PhraseTierResult;
  };
  phraseDupGroups: Array<{ code: string; phrases: Array<{ phrase: string; freq: number }> }>; // 词组重码组（用于弹窗展示）
  phraseFreqTierStats: PhraseTierStat[];  // 词组分频段统计
  topPhraseCount: number;                 // 实际评测的高频词组数
  missingCodeCharCount: number;           // 缺少全码的单字数（影响词组编码）
  missingCodeChars: string[];             // 缺少全码的单字列表（前 20 个）
}

/** 词组分段测评结果 */
interface PhraseTierResult {
  totalPhrases: number;       // 词组总数
  coveredPhrases: number;     // 码表能编码的词组数
  coverageRate: number;       // 覆盖率(%)
  avgCodeLen: number;         // 平均编码长度（码元数）
  dupRate: number;            // 重码率(%)
  selectionRate: number;      // 选重率（词频加权比值 0~1）
  selectionCount: number;      // 选重词组数
  weightedCodeEquiv: number;   // 加权词均当量
  handAltCount: number;        // 左右互击
  sameFingerBigCross: number;  // 同指大跨排
  sameFingerSmallCross: number;// 同指小跨排
  sameKeyTriple: number;       // 同键三连
  sameKeyQuad: number;         // 同键四连
  sameFingerTriple: number;    // 同指三连
  sameFingerQuad: number;      // 同指四连
  pinkyCount: number;          // 小指干扰
  keyFreq: Record<string, number>; // 词组编码的按键频次（用于热力图）
}

/** 词组频段统计行 */
interface PhraseTierStat {
  tier: string;
  totalPhrases: number;
  coveredPhrases: number;
  selectionCount: number;
  weightedCodeEquiv: number;
  handAltCount: number;
  sameFingerBigCross: number;
  sameFingerSmallCross: number;
  sameKeyTriple: number;
  sameKeyQuad: number;
  sameFingerTriple: number;
  sameFingerQuad: number;
  pinkyCount: number;
  // 频率加权字段（加权比重用）
  freqSum: number;
  selFreqSum: number;
  pairFreqSum: number;
  handAltFreq: number;
  sfbFreq: number;
  sfsFreq: number;
  sktFreq: number;
  skqFreq: number;
  sftFreq: number;
  sfqFreq: number;
  pinkyFreq: number;
}

// ========================================
// 工具函数
// ========================================

function getCharFrequencyWeight(char: string): number {
  return charFrequency[char] ?? 0.00001;
}

// ========================================
// 码表解析
// ========================================

function parseCodeTable(content: string): CodeEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: CodeEntry[] = [];
  let formatDetected = '';
  // rime 码表正文前的 YAML 头（--- ... 之间）整体跳过，
  // 避免 name:/version:/columns:/- text 等行被当成码表条目。
  // 仅识别文件开头（尚未解析任何条目）的 ---，避免普通码表正文中的 --- 分隔线误触发
  let inYamlHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('---') && entries.length === 0 && !formatDetected) { inYamlHeader = true; continue; }
    if (trimmed.startsWith('...') && !formatDetected) {
      formatDetected = 'rime';
      inYamlHeader = false;
      continue;
    }
    if (trimmed.startsWith('...')) { inYamlHeader = false; continue; }
    if (inYamlHeader) continue;
    // 注释行：# 通用（rime 与普通码表）；; 仅普通码表跳过（rime 中 ; 可能是分隔符）
    if (trimmed.startsWith('#')) continue;
    if (formatDetected !== 'rime' && trimmed.startsWith(';')) continue;

    let match: RegExpMatchArray | null = null;
    // 编码格式判断：形码编码为字母/数字混合，纯数字串视为词频权重而非编码
    const looksLikeCode = (s: string) => /^[\da-z]+$/.test(s) && !/^\d+$/.test(s);

    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      if (parts.length >= 2) {
        // 与空格分支保持一致：f1 先转小写（编码位置），f2 按编码判断时再转小写
        const f1 = parts[0].trim().toLowerCase(), f2 = parts[1].trim();
        if (looksLikeCode(f1)) {
          entries.push({ char: f2, code: f1 });
        } else if (looksLikeCode(f2.toLowerCase())) {
          entries.push({ char: f1, code: f2.toLowerCase() });
        } else if (f2) {
          // 两列都不是编码（如 `字 权重`）：无编码可评，跳过
          continue;
        }
        continue;
      }
    }

    // 空格分隔的三列及以上：`编码 字 权重`（或 `字 编码 权重`），只取前两列
    if (!trimmed.includes('\t')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        const f1 = parts[0].toLowerCase(), f2 = parts[1];
        if (looksLikeCode(f1)) {
          entries.push({ char: f2, code: f1 });
        } else if (looksLikeCode(f2)) {
          entries.push({ char: f1, code: f2.toLowerCase() });
        } else {
          // 前两列都不是编码（如 `字 权重 权重`）：无编码可评，跳过
          continue;
        }
        continue;
      }
    }

    match = trimmed.match(/^(\S+)\s+(\S+)$/);
    if (match) {
      const f1 = match[1].toLowerCase(), f2 = match[2];
      if (looksLikeCode(f1)) {
        entries.push({ char: f2, code: f1 });
      } else if (looksLikeCode(f2)) {
        // 两列：字 编码
        entries.push({ char: f1, code: f2.toLowerCase() });
      } else {
        // 两列都不是编码（如 `字 权重`）：不是可评估的码表条目，跳过
        continue;
      }
      continue;
    }

    match = trimmed.match(/^(\S+)\s+(.+)$/);
    if (match) {
      const code = match[1].toLowerCase(), rest = match[2].trim();
      if (/^[\da-z]+$/.test(code)) {
        entries.push({ char: rest, code });
      } else {
        entries.push({ char: code, code: rest.toLowerCase().split(/\s+/)[0] ?? '' });
      }
      continue;
    }

    match = trimmed.match(/^(\S)(\S+)$/);
    if (match && /^[a-z]+$/.test(match[2])) {
      entries.push({ char: match[1], code: match[2].toLowerCase() });
    }
  }

  return entries.filter(e => e.char && e.code && e.code.length > 0);
}

// ========================================
// 模块级常量：全部词组四路归并（只算一次，所有组件共享）
// ========================================
let _phrasesData: BuiltinPhrasesData | null = null;
let _allPhrasesMerged: Array<{ phrase: string; freq: number }> | null = null;
function getAllPhrasesMerged(phrasesData: BuiltinPhrasesData): Array<{ phrase: string; freq: number }> {
  if (_allPhrasesMerged) return _allPhrasesMerged;
  _phrasesData = phrasesData;
  const { twoCharPhrases, twoCharFreqs, threeCharPhrases, threeCharFreqs, fourCharPhrases, fourCharFreqs, longCharPhrases, longCharFreqs } = phrasesData;
  const items: Array<{ phrase: string; freq: number }> = [];
  let i2 = 0, i3 = 0, i4 = 0, i5 = 0;
  while (i2 < twoCharPhrases.length || i3 < threeCharPhrases.length || i4 < fourCharPhrases.length || i5 < longCharPhrases.length) {
    const f2 = i2 < twoCharFreqs.length ? twoCharFreqs[i2] : -1;
    const f3 = i3 < threeCharFreqs.length ? threeCharFreqs[i3] : -1;
    const f4 = i4 < fourCharFreqs.length ? fourCharFreqs[i4] : -1;
    const f5 = i5 < longCharFreqs.length ? longCharFreqs[i5] : -1;
    if (f2 >= f3 && f2 >= f4 && f2 >= f5) { items.push({ phrase: twoCharPhrases[i2], freq: f2 }); i2++; }
    else if (f3 >= f4 && f3 >= f5) { items.push({ phrase: threeCharPhrases[i3], freq: f3 }); i3++; }
    else if (f4 >= f5) { items.push({ phrase: fourCharPhrases[i4], freq: f4 }); i4++; }
    else { items.push({ phrase: longCharPhrases[i5], freq: f5 }); i5++; }
  }
  _allPhrasesMerged = items;
  return items;
}

// ========================================
// 核心评码算法
// ========================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- allPhrasesMerged 参数保留以兼容调用方签名
function evaluate(entries: CodeEntry[], charset: CharsetFilter = 'all', _allPhrasesMerged: Array<{ phrase: string; freq: number }> = [], prevResult?: EvaluateResult | null): EvaluateResult {
  // 词组数据未加载时的空词组结果：渲染处直接访问 phraseEval.* 且无 null 检查，
  // 因此必须给同结构空值而非 null，否则上传码表但词组数据未就绪时会崩溃
  const emptyPhraseTier: PhraseTierResult = {
    totalPhrases: 0, coveredPhrases: 0, coverageRate: 0, avgCodeLen: 0, dupRate: 0,
    selectionRate: 0, selectionCount: 0, weightedCodeEquiv: 0,
    handAltCount: 0, sameFingerBigCross: 0, sameFingerSmallCross: 0,
    sameKeyTriple: 0, sameKeyQuad: 0, sameFingerTriple: 0, sameFingerQuad: 0,
    pinkyCount: 0, keyFreq: {},
  };
  // 安全检查：词组数据未加载时返回与完整结果同结构的空结果，
  // 保证调用方/渲染处访问任何字段都不会得到 undefined
  if (!_phrasesData) {
    return {
      totalChars: 0, totalCodes: 0, uniqueCodes: 0, duplicateCount: 0,
      weightedAvgCodeLen: 0, fullDupRate: 0, staticDupCount: 0, simplifiedDupRate: 0,
      dynamicSelectionRate: 0, equivalent: 0, speedEquivalent: 0, compositeScore: 0,
      avgCodeLength: 0, maxCodeLength: 0, codeLengthStdDev: 0, codeLengthDist: {},
      keyFreq: {}, keyUsageRate: {}, leftHandRate: 0, rightHandRate: 0, fingerLoad: {},
      sameFingerRate: 0, handAlternationRate: 0,
      gb2312Coverage: 0, gbkCoverage: 0, tongguiCoverage: 0,
      efficiencyScore: 0, ergonomicsScore: 0, balanceScore: 0,
      maxCandidatesPerCode: 0, codesNeedingPage: 0,
      gb2312MaxCandidates: 0, gbkMaxCandidates: 0, gb2312StaticDup: 0, gbkStaticDup: 0,
      weightedSameFingerRate: 0, weightedHandAltRate: 0,
      topDupes: [], freqTierStats: [], codeLenChartData: [], fingerChartData: [],
      phraseEval: { twoChar: emptyPhraseTier, threeChar: emptyPhraseTier, fourChar: emptyPhraseTier, overall: emptyPhraseTier },
      phraseDupGroups: [], phraseFreqTierStats: [],
      topPhraseCount: 0, missingCodeCharCount: 0, missingCodeChars: [],
    };
  }
  // ★ 固定字集：始终以前6000高频字为评估基准
  // charset 参数只控制哪些字参与评估（如 gb2312 只评估6000字中的GB2312子集），
  // 不影响码表条目的查找范围（编码始终从完整码表中查找）

  // 1. 从完整码表构建 字→所有编码 映射（供词组编码和选重检测使用）
  const allCharToCodes = new Map<string, string[]>();
  for (const entry of entries) {
    const existing = allCharToCodes.get(entry.char);
    if (existing) {
      if (!existing.includes(entry.code)) existing.push(entry.code);
    } else {
      allCharToCodes.set(entry.char, [entry.code]);
    }
  }

  // 2. 确定目标字集：从字频表取前N高频字，按字集过滤
  const targetChars = Object.keys(charFrequency);
  const charsetSet = getCharsetSet(charset);
  const evalChars = charsetSet
    ? targetChars.filter(ch => charsetSet.has(ch))
    : targetChars;

  // 3. 为每个目标字查找最短编码，构建评估用的 filteredEntries
  const filteredEntries: CodeEntry[] = [];
  for (const ch of evalChars) {
    const codes = allCharToCodes.get(ch);
    if (!codes || codes.length === 0) continue;
    // 取最短编码（简码优先）
    const shortest = codes.reduce((a, b) => a.length <= b.length ? a : b);
    filteredEntries.push({ char: ch, code: shortest });
  }

  // 4. 构建编码→字映射（用于重码检测）
  const codeToChars = new Map<string, string[]>();
  for (const entry of filteredEntries) {
    const existing = codeToChars.get(entry.code);
    if (existing) {
      if (!existing.includes(entry.char)) existing.push(entry.char);
    } else {
      codeToChars.set(entry.code, [entry.char]);
    }
  }

  // 基础统计
  const uniqueEntries = new Set(filteredEntries.map(e => `${e.char}|${e.code}`));
  let dupCount = 0;
  const dupeList: Array<{ code: string; chars: string[]; count: number }> = [];

  for (const [code, chars] of codeToChars) {
    if (chars.length > 1) {
      dupCount += chars.length - 1;
      dupeList.push({ code, chars, count: chars.length });
    }
  }
  dupeList.sort((a, b) => {
    const aW = a.chars.reduce((s, ch) => s + getCharFrequencyWeight(ch), 0);
    const bW = b.chars.reduce((s, ch) => s + getCharFrequencyWeight(ch), 0);
    return (b.count * bW) - (a.count * aW);
  });

  // 码长分布
  const codeLengthDist: Record<number, number> = {};
  const keyFreq: Record<string, number> = {};
  let totalLen = 0, maxLen = 0;
  const lengthValues: number[] = [];

  for (const entry of filteredEntries) {
    const len = entry.code.length;
    codeLengthDist[len] = (codeLengthDist[len] || 0) + 1;
    totalLen += len;
    lengthValues.push(len);
    if (len > maxLen) maxLen = len;
    for (const k of entry.code.toLowerCase()) {
      if (/[a-z0-9]/.test(k)) keyFreq[k] = (keyFreq[k] || 0) + 1;
    }
  }

  const avgCodeLength = safeDivide(totalLen, filteredEntries.length);
  const codeLengthStdDev = (() => {
    if (lengthValues.length === 0) return 0;
    const mean = safeDivide(lengthValues.reduce((a, b) => a + b, 0), lengthValues.length);
    return Math.sqrt(safeDivide(lengthValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0), lengthValues.length));
  })();

  // ★ 字频加权平均码长（按字去重：同一字多编码只计入一次，取最短码长）
  let weightedLenSum = 0, freqSum = 0;
  const seenCharsForWeightedLen = new Map<string, { freq: number; minLen: number }>();
  for (const entry of filteredEntries) {
    const freq = getCharFrequencyWeight(entry.char);
    const existing = seenCharsForWeightedLen.get(entry.char);
    if (!existing) {
      seenCharsForWeightedLen.set(entry.char, { freq, minLen: entry.code.length });
    } else if (entry.code.length < existing.minLen) {
      existing.minLen = entry.code.length; // 取最短码长（简码优先）
    }
  }
  for (const { freq, minLen } of seenCharsForWeightedLen.values()) {
    weightedLenSum += freq * minLen;
    freqSum += freq;
  }
  const weightedAvgCodeLen = safeDivide(weightedLenSum, freqSum, avgCodeLength);

  // ★ 全码重码率
  const fullDupRate = clampPercentage(safeDivide(dupCount, filteredEntries.length) * 100);

  // ★ 出简重码率（出简不出全：有简码的字用简码输入，全码位让给其他字）
  // 简码定义：1-3码的编码
  // 对每个重码组，如果首选字有更短的简码，则首选字不占全码位
  const charShortCodes = new Map<string, number>();
  for (const [code, chars] of codeToChars) {
    if (code.length <= 3 && chars.length >= 1) {
      const firstChar = [...chars].sort((a, b) => getCharFrequencyWeight(b) - getCharFrequencyWeight(a))[0];
      const existing = charShortCodes.get(firstChar);
      if (existing === undefined || code.length < existing) {
        charShortCodes.set(firstChar, code.length);
      }
    }
  }

  let simplifiedDupCount = 0;
  for (const [code, chars] of codeToChars) {
    if (chars.length > 1 && code.length >= 2) {
      const sorted = [...chars].sort((a, b) => getCharFrequencyWeight(b) - getCharFrequencyWeight(a));
      const firstChar = sorted[0];
      const shortCodeLen = charShortCodes.get(firstChar);
      if (shortCodeLen !== undefined && shortCodeLen < code.length) {
        simplifiedDupCount += Math.max(0, chars.length - 2);
      } else {
        simplifiedDupCount += chars.length - 1;
      }
    }
  }
  const simplifiedDupRate = clampPercentage(safeDivide(simplifiedDupCount, filteredEntries.length) * 100);

  // ★ 动态选重率（字频加权，按字去重）
  // 分子：最短码处于重码组的字的字频之和
  // 分母：全部字的字频之和（去重）
  // 注意：用户实际只使用最短码（简码），所以只统计最短码的重码情况
  const dynamicSelectionRate = (() => {
    // 先找出每个字的最短码
    const charShortestCode = new Map<string, string>();
    for (const entry of filteredEntries) {
      const existing = charShortestCode.get(entry.char);
      if (!existing || entry.code.length < existing.length) {
        charShortestCode.set(entry.char, entry.code);
      }
    }
    // 检查每个字的最短码是否处于重码组
    let dupFreqSum = 0;
    const countedChars = new Set<string>();
    for (const [char, shortestCode] of charShortestCode) {
      if (countedChars.has(char)) continue;
      const chars = codeToChars.get(shortestCode);
      if (chars && chars.length > 1) {
        dupFreqSum += getCharFrequencyWeight(char);
      }
      countedChars.add(char);
    }
    return safeDivide(dupFreqSum, freqSum);
  })();

  // ★ 速度当量（字频加权）
  const speedEquiv = calcWeightedSpeedEquivalent(filteredEntries, charFrequency);

  // ★ 当量 = 字频加权码长 + 动态选重率（小数形式）
  const equivalent = weightedAvgCodeLen + dynamicSelectionRate;

  // ★ 综合评分（参考国标GB/T18031加权公式）
  // 各项得分 = max(0, 100 - (实际值 - 优秀值) / (较差值 - 优秀值) × 100)
  const calcScore = (val: number, excellent: number, poor: number, lowerBetter: boolean) => {
    // 除零保护：如果优秀值和较差值相同，无法计算渐变
    if (Math.abs(poor - excellent) < 0.0001) {
      return lowerBetter ? (val <= excellent ? 100 : 0) : (val >= excellent ? 100 : 0);
    }
    if (lowerBetter) {
      if (val <= excellent) return 100;
      if (val >= poor) return 0;
      return Math.max(0, Math.min(100, 100 - safeDivide(val - excellent, poor - excellent) * 100));
    } else {
      if (val >= excellent) return 100;
      if (val <= poor) return 0;
      return Math.max(0, Math.min(100, safeDivide(val - poor, excellent - poor) * 100));
    }
  };

  const codeLenScore = calcScore(weightedAvgCodeLen, 2.5, 4.5, true);
  const dupScore = calcScore(fullDupRate, 3, 15, true);
  const dynamicSelScore = calcScore(dynamicSelectionRate, 0.0005, 0.005, true);
  const speedEquivScore = calcScore(speedEquiv, 1.0, 1.5, true);

  const compositeScore = Math.max(0, Math.min(100,
    roundTo(30 * codeLenScore / 100 +
    25 * dupScore / 100 +
    25 * dynamicSelScore / 100 +
    20 * speedEquivScore / 100, 2)
  ));

  // 按键使用率
  const totalKeyPresses = Object.values(keyFreq).reduce((s, f) => s + f, 0);
  const keyUsageRate: Record<string, number> = {};
  for (const [key, freq] of Object.entries(keyFreq)) {
    keyUsageRate[key] = clampPercentage(safeDivide(freq, totalKeyPresses) * 100);
  }

  // 左右手和手指
  let leftHandPresses = 0, rightHandPresses = 0;
  const fingerLoad: Record<string, number> = {};
  for (const [key, freq] of Object.entries(keyFreq)) {
    if (LEFT_HAND_KEYS.has(key)) leftHandPresses += freq;
    if (RIGHT_HAND_KEYS.has(key)) rightHandPresses += freq;
    const finger = FINGER_MAP[key];
    if (finger) fingerLoad[finger] = (fingerLoad[finger] || 0) + freq;
  }
  const leftHandRate = clampPercentage(safeDivide(leftHandPresses, totalKeyPresses) * 100);
  const rightHandRate = clampPercentage(safeDivide(rightHandPresses, totalKeyPresses) * 100);

  // 同指连续和左右交替
  let sameFingerCount = 0, handAltCount = 0, totalBigrams = 0;
  for (const entry of filteredEntries) {
    const code = entry.code.toLowerCase();
    for (let i = 0; i < code.length - 1; i++) {
      const ck = code[i], nk = code[i + 1];
      if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
      totalBigrams++;
      if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) sameFingerCount++;
      if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) handAltCount++;
    }
  }
  const sameFingerRate = clampPercentage(safeDivide(sameFingerCount, totalBigrams) * 100);
  const handAlternationRate = clampPercentage(safeDivide(handAltCount, totalBigrams) * 100);

  // 覆盖率 - 使用国标字集计算
  const charSet = filteredEntries.map(e => e.char);
  const gb2312Result = calculateCoverage(charSet, 'gb2312');
  const gbkResult = calculateCoverage(charSet, 'gbk');
  const tongguiResult = calculateCoverage(charSet, 'tonggui');
  const gb2312Coverage = gb2312Result.percentage;
  const gbkCoverage = gbkResult.percentage;
  const tongguiCoverage = tongguiResult.percentage;

  // 候选项指标
  let maxCandidatesPerCode = 0;
  let codesNeedingPage = 0;
  for (const [, chars] of codeToChars) {
    if (chars.length > maxCandidatesPerCode) maxCandidatesPerCode = chars.length;
    if (chars.length > 9) codesNeedingPage++;
  }

  const gb2312Set = getCharsetSet('gb2312')!;
  const gbkSet = getCharsetSet('gbk')!;
  let gb2312MaxCandidates = 0, gbkMaxCandidates = 0;
  let gb2312StaticDup = 0, gbkStaticDup = 0;
  for (const [, chars] of codeToChars) {
    const gb2312Chars = chars.filter(c => gb2312Set.has(c));
    if (gb2312Chars.length > gb2312MaxCandidates) gb2312MaxCandidates = gb2312Chars.length;
    if (gb2312Chars.length > 1) gb2312StaticDup += gb2312Chars.length - 1;
    const gbkChars = chars.filter(c => gbkSet.has(c));
    if (gbkChars.length > gbkMaxCandidates) gbkMaxCandidates = gbkChars.length;
    if (gbkChars.length > 1) gbkStaticDup += gbkChars.length - 1;
  }

  // 效率和工学评分
  const balanceScore = Math.max(0, Math.min(100, 100 - Math.abs(leftHandRate - 50) * 2));

  let weightedSameFinger = 0, weightedHandAlt = 0, weightedBigramFreq = 0;
  for (const entry of filteredEntries) {
    const freq = getCharFrequencyWeight(entry.char);
    const code = entry.code.toLowerCase();
    for (let i = 0; i < code.length - 1; i++) {
      const ck = code[i], nk = code[i + 1];
      if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
      weightedBigramFreq += freq;
      if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) weightedSameFinger += freq;
      if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) weightedHandAlt += freq;
    }
  }
  const weightedSameFingerRate = safeDivide(weightedSameFinger, weightedBigramFreq) * 100;
  const weightedHandAltRate = safeDivide(weightedHandAlt, weightedBigramFreq) * 100;

  const efficiencyScore = Math.max(0, Math.min(100,
    0.35 * calcScore(fullDupRate, 3, 15, true) +
    0.30 * calcScore(weightedAvgCodeLen, 2.5, 4.5, true) +
    0.20 * calcScore(dynamicSelectionRate, 0.0005, 0.005, true) +
    0.15 * balanceScore
  ));
  const ergonomicsScore = Math.max(0, Math.min(100,
    0.35 * calcScore(weightedSameFingerRate, 10, 30, true) +
    0.30 * calcScore(weightedHandAltRate, 50, 30, false) +
    0.20 * calcScore(speedEquiv, 1.0, 1.5, true) +
    0.15 * balanceScore
  ));

  // 字频分段统计（按字频权重降序取前N个，同字条目保持相邻）
  const sortedByFreq = [...filteredEntries].sort((a, b) => {
    const fwA = getCharFrequencyWeight(a.char);
    const fwB = getCharFrequencyWeight(b.char);
    if (fwB !== fwA) return fwB - fwA;
    // 字面稳定器：同字条目必须相邻，避免跨 tier 边界
    if (a.char !== b.char) return a.char < b.char ? -1 : 1;
    return a.code.length - b.code.length; // 短码在前
  });
  // 跨 tier 共享去重集合：slice 切点可能把同一字的多个编码条目切到相邻 tier，
  // 若每个 tier 独立声明 Set，同字会在两个频段被重复计入字数/频重/加权键长。
  // 共享后同字只在其最短码（首次出现）所在 tier 计入一次。
  const tierSeenChars = new Set<string>();
  const freqTierStats = FREQ_TIERS.map(tier => {
    const tierEntries = sortedByFreq.slice(tier.start, Math.min(tier.end, sortedByFreq.length));
    const tierCodeMap = new Map<string, string[]>();
    for (const e of tierEntries) {
      const existing = tierCodeMap.get(e.code);
      if (existing) { if (!existing.includes(e.char)) existing.push(e.char); }
      else tierCodeMap.set(e.code, [e.char]);
    }

    // 简码重码（选重）：简码编码（长度<4）上存在多个字时，需要选重
    let shortDup = 0;
    // 全码重码：同一编码对应多个字
    let fullDup = 0;
    for (const [code, chars] of tierCodeMap) {
      if (chars.length > 1) {
        fullDup += chars.length - 1;
        // 简码重码：仅统计简码编码（长度<4）的重码
        if (code.length < 4) shortDup += chars.length - 1;
      }
    }

    // 理论二简：2码编码的字数
    let theoreticalTwoShort = 0;
    for (const [code, chars] of tierCodeMap) {
      if (code.length === 2 && chars.length >= 1) theoreticalTwoShort++;
    }

    // 码长分布
    let oneCode = 0, twoCode = 0, threeCode = 0, fourCode = 0;
    let tierFreqSum = 0, tierWeightedLen = 0;
    // 码长频率加权计数（加权比重用）
    let oneCodeFreq = 0, twoCodeFreq = 0, threeCodeFreq = 0, fourCodeFreq = 0;
    // 重码频率加权计数（加权比重用）
    let shortDupFreq = 0, fullDupFreq = 0, theoreticalTwoShortFreq = 0;
    // 工学指标
    let tierHandAlt = 0, tierSameFingerBig = 0, tierSameFingerSmall = 0;
    let tierSameKeyTriple = 0, tierSameKeyQuad = 0;
    let tierSameFingerTriple = 0, tierSameFingerQuad = 0;
    let tierPinky = 0;
    // 工学指标频率加权（加权比重用）
    let tierPairFreqSum = 0;
    let tierHandAltFreq = 0, tierSfbFreq = 0, tierSfsFreq = 0;
    let tierSktFreq = 0, tierSkqFreq = 0, tierSftFreq = 0, tierSfqFreq = 0, tierPinkyFreq = 0;
    // 加权字均当量 = 字频加权的（码长 + 选重罚时）
    let tierWeightedCharEquiv = 0;
    // 加权键均当量 = speed equivalent per key
    let tierWeightedKeyEquiv = 0;

    // ★ 字频去重：同一字多编码条目时，字频按最短码（简码）归入对应桶，分母只计一次
    // 排序已保证同字条目相邻且短码在前，首次遇到即为最短码；Set 跨 tier 共享避免重复

    for (const e of tierEntries) {
      const len = e.code.length;
      const f = getCharFrequencyWeight(e.char);
      const codeChars = tierCodeMap.get(e.code) || [];
      const isFirstOccurrence = !tierSeenChars.has(e.char);

      if (isFirstOccurrence) {
        // 首次遇到该字：计入码长统计和分母（取最短码）
        if (len === 1) oneCode++;
        else if (len === 2) twoCode++;
        else if (len === 3) threeCode++;
        else if (len >= 4) fourCode++;

        // 码长频率加权（每字只计一次，归入最短码桶）
        if (len === 1) oneCodeFreq += f;
        else if (len === 2) twoCodeFreq += f;
        else if (len === 3) threeCodeFreq += f;
        else if (len >= 4) fourCodeFreq += f;

        tierFreqSum += f;
        tierWeightedLen += f * len;

        // 加权字均当量：码长 + 重码选重罚时
        const dupPenalty = codeChars.length > 1 ? (codeChars.length - 1) * 0.1 : 0;
        tierWeightedCharEquiv += f * (len + dupPenalty);
        // 加权键均当量：基于最短码的 speed equivalent
        const letters = e.code.toLowerCase().split('').filter(ch => ch >= 'a' && ch <= 'z');
        if (letters.length >= 2) {
          let eqSum = 0;
          for (let i = 0; i < letters.length - 1; i++) {
            eqSum += getSpeedEquivalent(letters[i], letters[i + 1]);
          }
          tierWeightedKeyEquiv += f * (eqSum / (letters.length - 1));
        } else {
          tierWeightedKeyEquiv += f;
        }
        tierSeenChars.add(e.char);
      }
      // 重码频率加权（每个编码条目独立判断，因为不同码长的重码状态不同）
      if (codeChars.length > 1) {
        fullDupFreq += f;
        if (e.code.length < 4) shortDupFreq += f;
      }
      if (len === 2 && codeChars.length >= 1) theoreticalTwoShortFreq += f;

      // 手感指标
      const code = e.code.toLowerCase();
      const fingerSeq: string[] = [];
      for (const ch of code) { if (FINGER_MAP[ch]) fingerSeq.push(FINGER_MAP[ch]); }

      // 该字的频率加权二元组数（分母用）
      const letterPairs = Math.max(0, code.replace(/[^a-z]/g, '').length - 1);
      tierPairFreqSum += f * letterPairs;

      for (let i = 0; i < code.length - 1; i++) {
        const ck = code[i], nk = code[i + 1];
        if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
        const r1 = KEY_ROW[ck], r2 = KEY_ROW[nk];
        // 左右互击
        if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) { tierHandAlt++; tierHandAltFreq += f; }
        // 同指连续
        if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) {
          const rowDist = r1 !== undefined && r2 !== undefined ? Math.abs(r1 - r2) : 0;
          if (rowDist >= 2) { tierSameFingerBig++; tierSfbFreq += f; }
          else if (rowDist >= 1) { tierSameFingerSmall++; tierSfsFreq += f; }
          // 小指干扰
          if (FINGER_MAP[ck] === '左小指' || FINGER_MAP[ck] === '右小指') { tierPinky++; tierPinkyFreq += f; }
        }
      }

      // 同键三连/四连
      for (let i = 0; i < code.length - 2; i++) {
        if (code[i] === code[i+1] && code[i+1] === code[i+2]) {
          tierSameKeyTriple++; tierSktFreq += f;
          if (i < code.length - 3 && code[i] === code[i+3]) { tierSameKeyQuad++; tierSkqFreq += f; }
        }
      }
      // 同指三连/四连
      for (let i = 0; i < fingerSeq.length - 2; i++) {
        if (fingerSeq[i] === fingerSeq[i+1] && fingerSeq[i+1] === fingerSeq[i+2]) {
          tierSameFingerTriple++; tierSftFreq += f;
          if (i < fingerSeq.length - 3 && fingerSeq[i] === fingerSeq[i+3]) { tierSameFingerQuad++; tierSfqFreq += f; }
        }
      }
    }

    return {
      tier: tier.label,
      charCount: tierEntries.length,
      oneCode,
      twoCode,
      threeCode,
      fourCode,
      shortDupCount: shortDup,
      fullDupCount: fullDup,
      theoreticalTwoShort,
      weightedCodeLen: safeDivide(tierWeightedLen, tierFreqSum),
      weightedCharEquiv: safeDivide(tierWeightedCharEquiv, tierFreqSum),
      weightedKeyEquiv: safeDivide(tierWeightedKeyEquiv, tierFreqSum),
      handAltCount: tierHandAlt,
      sameFingerBigCross: tierSameFingerBig,
      sameFingerSmallCross: tierSameFingerSmall,
      sameKeyTriple: tierSameKeyTriple,
      sameKeyQuad: tierSameKeyQuad,
      sameFingerTriple: tierSameFingerTriple,
      sameFingerQuad: tierSameFingerQuad,
      pinkyCount: tierPinky,
      // 频率加权字段（加权比重用）
      freqSum: tierFreqSum,
      oneCodeFreq,
      twoCodeFreq,
      threeCodeFreq,
      fourCodeFreq,
      shortDupFreq,
      fullDupFreq,
      theoreticalTwoShortFreq,
      pairFreqSum: tierPairFreqSum,
      handAltFreq: tierHandAltFreq,
      sfbFreq: tierSfbFreq,
      sfsFreq: tierSfsFreq,
      sktFreq: tierSktFreq,
      skqFreq: tierSkqFreq,
      sftFreq: tierSftFreq,
      sfqFreq: tierSfqFreq,
      pinkyFreq: tierPinkyFreq,
    };
  });

  // 码长分布图表数据
  const codeLenChartData = Object.entries(codeLengthDist)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([len, count]) => ({
      name: `${len}码`,
      count,
      percent: clampPercentage(safeDivide(count, filteredEntries.length) * 100),
    }));

  // 手指分布图表数据
  const totalFingerLoad = Object.values(fingerLoad).reduce((s, v) => s + v, 0);
  const fingerChartData = Object.entries(fingerLoad)
    .map(([name, value]) => ({
      name,
      value,
      percent: clampPercentage(safeDivide(value, totalFingerLoad) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  // ★ 词组测评
  // 使用完整的字→编码映射（allCharToCodes，含全码+简码），用于词组编码
  const charToCodes = allCharToCodes;

  /**
   * 计算词组编码：按词组长度从每个字的全码中提取码元，组成四码词组码
   * - 二字词：每字取全码前2码 → 2+2=4码
   * - 三字词：前两字各取全码前1码，末字取前2码 → 1+1+2=4码
   * - 四字词：每字取全码前1码 → 1×4=4码
   * - 五字及以上：取第1、2、3字和末字的全码前1码 → 1×4=4码
   */
  function getPhraseCode(phrase: string): string | null {
    const phraseLen = phrase.length;
    // 取每个字的全码（最长编码，即全码）
    const fullCodes: string[] = [];
    for (const ch of phrase) {
      const charCodes = charToCodes.get(ch);
      if (!charCodes || charCodes.length === 0) return null;
      fullCodes.push(charCodes.reduce((a, b) => a.length >= b.length ? a : b));
    }

    let extracted = '';
    if (phraseLen === 2) {
      // 每字取前2码
      extracted = fullCodes[0].slice(0, 2) + fullCodes[1].slice(0, 2);
    } else if (phraseLen === 3) {
      // 前两字各取前1码，末字取前2码
      extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1) + fullCodes[2].slice(0, 2);
    } else if (phraseLen === 4) {
      // 每字取前1码
      extracted = fullCodes.map(c => c.slice(0, 1)).join('');
    } else {
      // 5+字：取第1、2、3字和末字的前1码
      extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1) + fullCodes[2].slice(0, 1) + fullCodes[phraseLen - 1].slice(0, 1);
    }

    return extracted.length >= 4 ? extracted : null;
  }

  // 词组编码缓存：避免 evalPhraseTier 和 phraseFreqTierStats 对同一词组重复计算
  const phraseCodeCache = new Map<string, string | null>();
  const getCachedPhraseCode = (phrase: string): string | null => {
    let code = phraseCodeCache.get(phrase);
    if (code === undefined) {
      code = getPhraseCode(phrase);
      phraseCodeCache.set(phrase, code);
    }
    return code;
  };

  /**
   * 共享指法指标计算：对一段编码序列统计左右互击、同指跨排、同键/同指连击、小指干扰
   * 被 evalPhraseTier 和 phraseFreqTierStats 共用，避免逻辑重复
   */
  function computeErgonomics(code: string, acc: {
    handAlt: number; sfb: number; sfs: number;
    skt: number; skq: number; sft: number; sfq: number; pk: number;
  }) {
    for (let i = 0; i < code.length - 1; i++) {
      const ck = code[i], nk = code[i + 1];
      if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
      if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) acc.handAlt++;
      if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) {
        const r1 = KEY_ROW[ck], r2 = KEY_ROW[nk];
        const rowDist = r1 !== undefined && r2 !== undefined ? Math.abs(r1 - r2) : 0;
        if (rowDist >= 2) acc.sfb++;
        else if (rowDist >= 1) acc.sfs++;
        if (FINGER_MAP[ck] === '左小指' || FINGER_MAP[ck] === '右小指') acc.pk++;
      }
    }
    for (let i = 0; i < code.length - 2; i++) {
      if (code[i] === code[i+1] && code[i+1] === code[i+2]) {
        acc.skt++;
        if (i < code.length - 3 && code[i] === code[i+3]) acc.skq++;
      }
    }
    const fs: string[] = [];
    for (const ch of code) { if (FINGER_MAP[ch]) fs.push(FINGER_MAP[ch]); }
    for (let i = 0; i < fs.length - 2; i++) {
      if (fs[i] === fs[i+1] && fs[i+1] === fs[i+2]) {
        acc.sft++;
        if (i < fs.length - 3 && fs[i] === fs[i+3]) acc.sfq++;
      }
    }
  }

  /** 计算单类词组测评指标 */
  function evalPhraseTier(phrases: string[], freqArr?: number[]): PhraseTierResult {
    const totalPhrases = phrases.length;
    if (totalPhrases === 0) {
      return { totalPhrases: 0, coveredPhrases: 0, coverageRate: 0, avgCodeLen: 0,
        dupRate: 0, selectionRate: 0, selectionCount: 0, weightedCodeEquiv: 0,
        handAltCount: 0, sameFingerBigCross: 0, sameFingerSmallCross: 0,
        sameKeyTriple: 0, sameKeyQuad: 0, sameFingerTriple: 0, sameFingerQuad: 0,
        pinkyCount: 0, keyFreq: {} };
    }

    // 预建索引：词组→位置索引（O(1) 查找替代 indexOf 的 O(n)）
    const phraseIndexMap = new Map<string, number>();
    for (let i = 0; i < phrases.length; i++) phraseIndexMap.set(phrases[i], i);

    // 计算编码和覆盖
    const phraseCodes: Array<{ phrase: string; code: string | null; idx: number; weight: number }> = [];
    const phraseCodeMap = new Map<string, string[]>(); // 编码→词组列表
    let coveredPhrases = 0;
    let totalCodeLen = 0;

    const getWeight = (phrase: string, idx: number): number => {
      if (freqArr && idx >= 0 && idx < freqArr.length) return freqArr[idx] / (_phrasesData?.PHRASE_FREQ_TOTAL ?? 1);
      let w = 0;
      for (const ch of phrase) w += getCharFrequencyWeight(ch);
      return w;
    };

    for (let pi = 0; pi < phrases.length; pi++) {
      const phrase = phrases[pi];
      const code = getCachedPhraseCode(phrase);
      const weight = getWeight(phrase, pi);
      phraseCodes.push({ phrase, code, idx: pi, weight });
      if (code === null) continue;
      coveredPhrases++;
      totalCodeLen += code.replace(/ /g, '').length;

      const existing = phraseCodeMap.get(code);
      if (existing) {
        if (!existing.includes(phrase)) existing.push(phrase);
      } else {
        phraseCodeMap.set(code, [phrase]);
      }
    }

    const coverageRate = clampPercentage(safeDivide(coveredPhrases, totalPhrases) * 100);
    const avgCodeLen = roundTo(safeDivide(totalCodeLen, coveredPhrases), 3);

    // 重码统计
    let dupCount = 0, selectionCount = 0;
    let phraseDupFreq = 0, phraseTotalFreq = 0;
    for (const [, plist] of phraseCodeMap) {
      if (plist.length > 1) {
        dupCount += plist.length - 1;
        const sorted = [...plist].sort((a, b) => {
          const ai = phraseIndexMap.get(a) ?? -1;
          const bi = phraseIndexMap.get(b) ?? -1;
          return getWeight(b, bi) - getWeight(a, ai);
        });
        // 分子：重码组内所有词的词频之和（含首选词）
        for (const phrase of sorted) {
          const idx = phraseIndexMap.get(phrase) ?? -1;
          phraseDupFreq += getWeight(phrase, idx);
        }
        selectionCount += sorted.length - 1;
      }
    }
    // 分母：全部词组词频之和
    for (let pi = 0; pi < phrases.length; pi++) {
      phraseTotalFreq += getWeight(phrases[pi], pi);
    }
    const dupRate = clampPercentage(safeDivide(dupCount, coveredPhrases) * 100);
    // 词频加权重码率 = 重码组内所有词的词频之和 / 全部词组词频之和（原始比值 0~1）
    const selectionRate = safeDivide(phraseDupFreq, phraseTotalFreq);

    // 加权词均当量（简化：码长 + 重码罚时）
    let weightedCodeEquiv = 0;
    for (const pc of phraseCodes) {
      if (pc.code === null) continue;
      const pureLen = pc.code.replace(/ /g, '').length;
      const codeChrs = phraseCodeMap.get(pc.code) || [];
      const dupPenalty = codeChrs.length > 1 ? (codeChrs.length - 1) * 0.1 : 0;
      weightedCodeEquiv += pc.weight * (pureLen + dupPenalty);
    }
    weightedCodeEquiv = safeDivide(weightedCodeEquiv, phraseTotalFreq);

    // 指法指标
    const ergo = { handAlt: 0, sfb: 0, sfs: 0, skt: 0, skq: 0, sft: 0, sfq: 0, pk: 0 };
    const keyFreq: Record<string, number> = {};

    for (const pc of phraseCodes) {
      if (pc.code === null) continue;
      const code = pc.code.replace(/ /g, '').toLowerCase();
      // 统计按键频次
      for (const ch of code) {
        if (/[a-z]/.test(ch)) keyFreq[ch] = (keyFreq[ch] || 0) + 1;
      }
      computeErgonomics(code, ergo);
    }

    return {
      totalPhrases, coveredPhrases, coverageRate, avgCodeLen, dupRate,
      selectionRate, selectionCount, weightedCodeEquiv,
      handAltCount: ergo.handAlt, sameFingerBigCross: ergo.sfb, sameFingerSmallCross: ergo.sfs,
      sameKeyTriple: ergo.skt, sameKeyQuad: ergo.skq, sameFingerTriple: ergo.sft, sameFingerQuad: ergo.sfq,
      pinkyCount: ergo.pk, keyFreq,
    };
  }

  // ★ 词组评测（不依赖字集过滤器，可复用上次结果）
  let phraseEval: EvaluateResult['phraseEval'];
  let phraseFreqTierStats: PhraseTierStat[];
  let topPhraseCount: number;
  let phraseDupGroups: EvaluateResult['phraseDupGroups'];

  if (prevResult) {
    // 仅切换字集时：复用缓存的词组评测结果，跳过 60K 词组合并+编码计算
    phraseEval = prevResult.phraseEval;
    phraseFreqTierStats = prevResult.phraseFreqTierStats;
    topPhraseCount = prevResult.topPhraseCount;
    phraseDupGroups = prevResult.phraseDupGroups;
  } else {
    // 全量计算：四路归并 + 60K 词组编码
    const pd = _phrasesData;
    type PhraseSource = { phrase: string; freq: number; type: '2' | '3' | '4' | '5' };
    const topItems: PhraseSource[] = [];
    {
      let i2 = 0, i3 = 0, i4 = 0, i5 = 0;
      while (i2 < pd.twoCharPhrases.length || i3 < pd.threeCharPhrases.length || i4 < pd.fourCharPhrases.length || i5 < pd.longCharPhrases.length) {
        const f2 = i2 < pd.twoCharFreqs.length ? pd.twoCharFreqs[i2] : -1;
        const f3 = i3 < pd.threeCharFreqs.length ? pd.threeCharFreqs[i3] : -1;
        const f4 = i4 < pd.fourCharFreqs.length ? pd.fourCharFreqs[i4] : -1;
        const f5 = i5 < pd.longCharFreqs.length ? pd.longCharFreqs[i5] : -1;
        let maxF = f2, maxType: PhraseSource['type'] = '2';
        if (f3 > maxF) { maxF = f3; maxType = '3'; }
        if (f4 > maxF) { maxF = f4; maxType = '4'; }
        if (f5 > maxF) { maxF = f5; maxType = '5'; }
        if (maxType === '2') { topItems.push({ phrase: pd.twoCharPhrases[i2], freq: f2, type: '2' }); i2++; }
        else if (maxType === '3') { topItems.push({ phrase: pd.threeCharPhrases[i3], freq: f3, type: '3' }); i3++; }
        else if (maxType === '4') { topItems.push({ phrase: pd.fourCharPhrases[i4], freq: f4, type: '4' }); i4++; }
        else { topItems.push({ phrase: pd.longCharPhrases[i5], freq: f5, type: '5' }); i5++; }
      }
    }

    const top2: string[] = [], top2f: number[] = [];
    const top3: string[] = [], top3f: number[] = [];
    const top4: string[] = [], top4f: number[] = [];
    for (const item of topItems) {
      if (item.type === '2') { top2.push(item.phrase); top2f.push(item.freq); }
      else if (item.type === '3') { top3.push(item.phrase); top3f.push(item.freq); }
      else if (item.type === '4') { top4.push(item.phrase); top4f.push(item.freq); }
    }

    const topAll: string[] = topItems.map(item => item.phrase);
    const topAllF: number[] = topItems.map(item => item.freq);

    phraseEval = {
      twoChar: evalPhraseTier(top2, top2f),
      threeChar: evalPhraseTier(top3, top3f),
      fourChar: evalPhraseTier(top4, top4f),
      overall: evalPhraseTier(topAll, topAllF),
    };

    // ★ 词组分频段统计
    const coveredPhraseList: Array<{ phrase: string; code: string; weight: number; idx: number }> = [];
    const phraseCodeMapOverall = new Map<string, string[]>();
    for (let pi = 0; pi < topAll.length; pi++) {
      const phrase = topAll[pi];
      const code = getCachedPhraseCode(phrase);
      if (code === null) continue;
      const weight = topAllF[pi] / (_phrasesData?.PHRASE_FREQ_TOTAL ?? 1);
      coveredPhraseList.push({ phrase, code, weight, idx: pi });
      const existing = phraseCodeMapOverall.get(code);
      if (existing) { if (!existing.includes(phrase)) existing.push(phrase); }
      else phraseCodeMapOverall.set(code, [phrase]);
    }
    coveredPhraseList.sort((a, b) => b.weight - a.weight);

    // 先建索引 Map，供后续 O(1) 查找
    const phraseIndexMapOverall = new Map<string, number>();
    for (let i = 0; i < topAll.length; i++) phraseIndexMapOverall.set(topAll[i], i);

    // 赋值给外层 let（避免 const 遮蔽导致外层变量未赋值）
    phraseDupGroups = [];
    for (const [code, phrases] of phraseCodeMapOverall) {
      if (phrases.length <= 1) continue;
      const sorted = phrases.map(p => {
        const idx = phraseIndexMapOverall.get(p) ?? -1;
        return { phrase: p, freq: idx >= 0 && idx < topAllF.length ? topAllF[idx] : 0 };
      }).sort((a, b) => b.freq - a.freq);
      phraseDupGroups.push({ code, phrases: sorted });
    }
    phraseDupGroups.sort((a, b) => b.phrases.length - a.phrases.length || b.phrases[0].freq - a.phrases[0].freq);

    topPhraseCount = topItems.length;
    phraseFreqTierStats = PHRASE_FREQ_TIERS.map(tier => {
      const tierItems = coveredPhraseList.filter(item => item.idx >= tier.start && item.idx < tier.end);
      let selCount = 0, selFreqSum = 0, wce = 0;
      let tierWeightSum = 0;
      const tierErgo = { handAlt: 0, sfb: 0, sfs: 0, skt: 0, skq: 0, sft: 0, sfq: 0, pk: 0 };
      // 频率加权工学指标
      let tierPairFreqSum = 0, tierHandAltFreq = 0, tierSfbFreq = 0, tierSfsFreq = 0;
      let tierSktFreq = 0, tierSkqFreq = 0, tierSftFreq = 0, tierSfqFreq = 0, tierPinkyFreq = 0;

      for (const item of tierItems) {
        tierWeightSum += item.weight;
        const code = item.code.replace(/ /g, '').toLowerCase();
        const pureLen = code.length;
        const codeChrs = phraseCodeMapOverall.get(item.code) || [];
        const dupPenalty = codeChrs.length > 1 ? (codeChrs.length - 1) * 0.1 : 0;
        wce += item.weight * (pureLen + dupPenalty);

        computeErgonomics(code, tierErgo);

        // 频率加权工学指标
        const letterPairs = Math.max(0, code.replace(/[^a-z]/g, '').length - 1);
        tierPairFreqSum += item.weight * letterPairs;
        for (let i = 0; i < code.length - 1; i++) {
          const ck = code[i], nk = code[i + 1];
          if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
          if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) tierHandAltFreq += item.weight;
          if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) {
            const r1 = KEY_ROW[ck], r2 = KEY_ROW[nk];
            const rowDist = r1 !== undefined && r2 !== undefined ? Math.abs(r1 - r2) : 0;
            if (rowDist >= 2) tierSfbFreq += item.weight;
            else if (rowDist >= 1) tierSfsFreq += item.weight;
            if (FINGER_MAP[ck] === '左小指' || FINGER_MAP[ck] === '右小指') tierPinkyFreq += item.weight;
          }
        }
        for (let i = 0; i < code.length - 2; i++) {
          if (code[i] === code[i+1] && code[i+1] === code[i+2]) { tierSktFreq += item.weight; if (i < code.length - 3 && code[i] === code[i+3]) tierSkqFreq += item.weight; }
        }
        const fs: string[] = [];
        for (const ch of code) { if (FINGER_MAP[ch]) fs.push(FINGER_MAP[ch]); }
        for (let i = 0; i < fs.length - 2; i++) {
          if (fs[i] === fs[i+1] && fs[i+1] === fs[i+2]) { tierSftFreq += item.weight; if (i < fs.length - 3 && fs[i] === fs[i+3]) tierSfqFreq += item.weight; }
        }

        if (codeChrs.length > 1) {
          const sorted = [...codeChrs].sort((a, b) => {
            const ai2 = phraseIndexMapOverall.get(a) ?? -1;
            const bi2 = phraseIndexMapOverall.get(b) ?? -1;
            return (bi2 >= 0 && bi2 < topAllF.length ? topAllF[bi2] : 0) - (ai2 >= 0 && ai2 < topAllF.length ? topAllF[ai2] : 0);
          });
          const posInGroup = sorted.indexOf(item.phrase);
          if (posInGroup > 0) { selCount++; selFreqSum += item.weight; }
        }
      }

      const covered = tierItems.length;
      const totalInTier = Math.min(tier.end, topAll.length) - tier.start;
      return {
        tier: tier.label,
        totalPhrases: totalInTier,
        coveredPhrases: covered,
        selectionCount: selCount,
        weightedCodeEquiv: safeDivide(wce, tierWeightSum),
        handAltCount: tierErgo.handAlt,
        sameFingerBigCross: tierErgo.sfb,
        sameFingerSmallCross: tierErgo.sfs,
        sameKeyTriple: tierErgo.skt,
        sameKeyQuad: tierErgo.skq,
        sameFingerTriple: tierErgo.sft,
        sameFingerQuad: tierErgo.sfq,
        pinkyCount: tierErgo.pk,
        // 频率加权字段
        freqSum: tierWeightSum,
        selFreqSum,
        pairFreqSum: tierPairFreqSum,
        handAltFreq: tierHandAltFreq,
        sfbFreq: tierSfbFreq,
        sfsFreq: tierSfsFreq,
        sktFreq: tierSktFreq,
        skqFreq: tierSkqFreq,
        sftFreq: tierSftFreq,
        sfqFreq: tierSfqFreq,
        pinkyFreq: tierPinkyFreq,
      };
    });
  }

  // 统计词组中缺少全码的单字（基于全量码表，不受字集过滤影响）
  const missingCodeCharSet = new Set<string>();
  {
    // 用全量 entries 构建映射（非 filteredEntries），确保检测不受字集选择影响
    const fullCharCodes = new Map<string, boolean>();
    for (const entry of entries) fullCharCodes.set(entry.char, true);
    const allPhraseChars = new Set<string>();
    for (const item of [...(_phrasesData?.twoCharPhrases ?? []), ...(_phrasesData?.threeCharPhrases ?? []), ...(_phrasesData?.fourCharPhrases ?? []), ...(_phrasesData?.longCharPhrases ?? [])]) {
      for (const ch of item) allPhraseChars.add(ch);
    }
    for (const ch of allPhraseChars) {
      // 仅检测 CJK 汉字（基本区 U+4E00~U+9FFF + 扩展A U+3400~U+4DBF），跳过拉丁字母等
      // 使用 codePointAt 正确处理 BMP 外的扩展B+字符
      const cp = ch.codePointAt(0)!;
      const isCJK = (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF);
      if (isCJK && !fullCharCodes.has(ch)) {
        missingCodeCharSet.add(ch);
      }
    }
  }

  return {
    totalChars: filteredEntries.length,
    totalCodes: codeToChars.size,
    uniqueCodes: uniqueEntries.size,
    duplicateCount: dupCount,
    weightedAvgCodeLen,
    fullDupRate,
    staticDupCount: dupCount,
    simplifiedDupRate,
    dynamicSelectionRate,
    equivalent,
    speedEquivalent: speedEquiv,
    compositeScore,
    avgCodeLength,
    maxCodeLength: maxLen,
    codeLengthStdDev,
    codeLengthDist,
    keyFreq,
    keyUsageRate,
    leftHandRate,
    rightHandRate,
    fingerLoad,
    sameFingerRate,
    handAlternationRate,
    gb2312Coverage,
    gbkCoverage,
    tongguiCoverage,
    efficiencyScore,
    ergonomicsScore,
    balanceScore,
    maxCandidatesPerCode,
    codesNeedingPage,
    gb2312MaxCandidates,
    gbkMaxCandidates,
    gb2312StaticDup,
    gbkStaticDup,
    weightedSameFingerRate,
    weightedHandAltRate,
    topDupes: dupeList.slice(0, 30),
    freqTierStats,
    codeLenChartData,
    fingerChartData,
    phraseEval,
    phraseDupGroups,
    phraseFreqTierStats,
    topPhraseCount,
    missingCodeCharCount: missingCodeCharSet.size,
    missingCodeChars: [...missingCodeCharSet].slice(0, 20),
  };
}

// ========================================
// React 组件
// ========================================

/** 词频一览面板（虚拟滚动，只渲染可视行） */
const PhraseFreqPanel = ({
  allPhrases,
  phraseSearch,
  setPhraseSearch,
  onClose,
}: {
  allPhrases: Array<{ phrase: string; freq: number }>;
  phraseSearch: string;
  setPhraseSearch: (v: string) => void;
  onClose: () => void;
}) => {
  const ROW_H = 28; // 固定行高 px
  const BUFFER = 10; // 可视区域外额外渲染行数
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 防抖搜索：200ms 延迟
  const [debouncedQuery, setDebouncedQuery] = useState(phraseSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(phraseSearch), 200);
    return () => clearTimeout(t);
  }, [phraseSearch]);

  // 过滤结果（仅在防抖值变化时重新计算）
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return allPhrases;
    return allPhrases.filter(item => item.phrase.toLowerCase().includes(q));
  }, [allPhrases, debouncedQuery]);

  // 预编译高亮正则
  const highlightRe = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return null;
    return new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  }, [debouncedQuery]);

  const totalH = filtered.length * ROW_H;
  const containerH = typeof window !== 'undefined' ? window.innerHeight - 128 : 600; // 减去顶部高度
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER);
  const endIdx = Math.min(filtered.length, Math.ceil((scrollTop + containerH) / ROW_H) + BUFFER);
  const visible = filtered.slice(startIdx, endIdx);

  const onScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  // 高亮文本渲染（仅对可见行执行）
  const renderPhrase = (phrase: string) => {
    if (!highlightRe) return phrase;
    const parts = phrase.split(highlightRe);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded-sm px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 z-[55] w-80 bg-card border-l border-border shadow-2xl flex flex-col animate-slideInRight">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <h3 className="font-bold text-sm text-foreground">词频一览</h3>
          <p className="text-[10px] text-muted-foreground">
            {debouncedQuery
              ? `${filtered.length.toLocaleString()} / ${allPhrases.length.toLocaleString()} 个词组`
              : `${allPhrases.length.toLocaleString()} 个词组`}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      {/* 搜索框 */}
      <div className="px-4 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={phraseSearch}
            onChange={e => setPhraseSearch(e.target.value)}
            placeholder="搜索词组..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {phraseSearch && (
            <button onClick={() => setPhraseSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      {/* 虚拟滚动区域 */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Search className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">未找到匹配的词组</p>
        </div>
      ) : (
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto text-xs font-mono">
          <div style={{ height: totalH, position: 'relative' }}>
            {visible.map((item, vi) => {
              const idx = startIdx + vi;
              return (
                <div
                  key={item.phrase}
                  className={cn(
                    'absolute left-0 right-0 flex items-center justify-between px-4 hover:bg-muted/30 transition-colors',
                    idx % 2 === 0 && 'bg-muted/10'
                  )}
                  style={{ top: idx * ROW_H, height: ROW_H }}
                >
                  <span className="text-muted-foreground font-mono-stat w-8 text-right mr-2 tabular-nums">{idx + 1}</span>
                  <span className="flex-1 text-foreground truncate">{renderPhrase(item.phrase)}</span>
                  <span className="text-muted-foreground font-mono-stat tabular-nums ml-2">{item.freq.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground text-center">
        序号 · 词组 · 频次
      </div>
    </div>
  );
};

/** 单字一览面板（虚拟滚动，支持字集过滤+搜索） */
const CharFreqPanel = ({
  entries,
  charsetFilter,
  charSearch,
  setCharSearch,
  onClose,
}: {
  entries: CodeEntry[];
  charsetFilter: CharsetFilter;
  charSearch: string;
  setCharSearch: (v: string) => void;
  onClose: () => void;
}) => {
  const ROW_H = 28;
  const BUFFER = 10;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 字集过滤
  const charsetEntries = useMemo(() => filterEntriesByCharset(entries, charsetFilter), [entries, charsetFilter]);

  // 按字分组（保留所有编码）
  const charMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of charsetEntries) {
      const existing = map.get(e.char);
      if (existing) { if (!existing.includes(e.code)) existing.push(e.code); }
      else map.set(e.char, [e.code]);
    }
    // 按编码长度降序排列（全码在前）
    return [...map.entries()].map(([ch, codes]) => ({
      char: ch,
      codes: codes.sort((a, b) => b.length - a.length),
      fullCode: codes.reduce((a, b) => a.length >= b.length ? a : b),
    }));
  }, [charsetEntries]);

  // 防抖搜索
  const [debouncedQuery, setDebouncedQuery] = useState(charSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(charSearch), 200);
    return () => clearTimeout(t);
  }, [charSearch]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return charMap;
    return charMap.filter(item =>
      item.char.includes(q) || item.codes.some(c => c.toLowerCase().includes(q.toLowerCase()))
    );
  }, [charMap, debouncedQuery]);

  const highlightRe = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return null;
    return new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  }, [debouncedQuery]);

  const totalH = filtered.length * ROW_H;
  const containerH = typeof window !== 'undefined' ? window.innerHeight - 128 : 600;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER);
  const endIdx = Math.min(filtered.length, Math.ceil((scrollTop + containerH) / ROW_H) + BUFFER);
  const visible = filtered.slice(startIdx, endIdx);

  const onScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  const renderText = (text: string) => {
    if (!highlightRe) return text;
    const parts = text.split(highlightRe);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded-sm px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 z-[55] w-80 bg-card border-l border-border shadow-2xl flex flex-col animate-slideInRight">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <h3 className="font-bold text-sm text-foreground">单字一览</h3>
          <p className="text-[10px] text-muted-foreground">
            {debouncedQuery
              ? `${filtered.length.toLocaleString()} / ${charMap.length.toLocaleString()} 个单字`
              : `${charMap.length.toLocaleString()} 个单字`}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      {/* 搜索框 */}
      <div className="px-4 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={charSearch}
            onChange={e => setCharSearch(e.target.value)}
            placeholder="搜索字或编码..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {charSearch && (
            <button onClick={() => setCharSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      {/* 虚拟滚动区域 */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Search className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">未找到匹配的单字</p>
        </div>
      ) : (
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto text-xs font-mono">
          <div style={{ height: totalH, position: 'relative' }}>
            {visible.map((item, vi) => {
              const idx = startIdx + vi;
              return (
                <div
                  key={item.char}
                  className={cn(
                    'absolute left-0 right-0 flex items-center px-4 hover:bg-muted/30 transition-colors gap-2',
                    idx % 2 === 0 && 'bg-muted/10'
                  )}
                  style={{ top: idx * ROW_H, height: ROW_H }}
                >
                  <span className="text-foreground font-bold text-sm w-7 text-center shrink-0">{renderText(item.char)}</span>
                  <span className="flex-1 text-muted-foreground truncate">{renderText(item.fullCode)}</span>
                  <span className="text-[10px] text-muted-foreground font-mono-stat tabular-nums shrink-0">{item.fullCode.length}码</span>
                  {item.codes.length > 1 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0" title={`共 ${item.codes.length} 码: ${item.codes.join(', ')}`}>
                      ×{item.codes.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground text-center">
        字 · 全码 · 码长 · 重码数
      </div>
    </div>
  );
};

export default function EvaluatePage() {
  const { loading: charDataLoading } = useCharCodeData();
  const { data: phrasesData, loading: phrasesLoading } = useBuiltinPhrases();

  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [rawEntries, setRawEntries] = useState<CodeEntry[]>([]);
  const [exportingImage, setExportingImage] = useState(false);
  const [charCoverage, setCharCoverage] = useState<{
    gb2312: { covered: number; total: number; percentage: number; missing: string[] } | null;
    gbk: { covered: number; total: number; percentage: number; missing: string[] } | null;
    tonggui: { covered: number; total: number; percentage: number; missing: string[] } | null;
  } | null>(null);
  const [useBuiltin, setUseBuiltin] = useState(false);
  const [charsetFilter, setCharsetFilter] = useState<CharsetFilter>('all');
  const [countSpace, setCountSpace] = useState(false); // 计算空格模式
  const resultRef = useRef<HTMLDivElement>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDupCode, setSelectedDupCode] = useState<string | null>(null); // 词组重码弹窗
  const [showSingleCharDup, setShowSingleCharDup] = useState(false); // 单字重码弹窗
  const [showPhraseList, setShowPhraseList] = useState(false); // 词频一览面板
  const [phraseSearch, setPhraseSearch] = useState(''); // 词频搜索
  const [showCharList, setShowCharList] = useState(false); // 单字一览面板
  const [charSearch, setCharSearch] = useState(''); // 单字搜索

  // Escape 键关闭全屏展开模式或重码弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 逐层关闭：一次 Esc 只关最顶层，避免一次按键同时关掉弹窗与全屏展开
        if (selectedDupCode) setSelectedDupCode(null);
        else if (showSingleCharDup) setShowSingleCharDup(false);
        else if (expandedSection) setExpandedSection(null);
      }
    };
    // 任一弹层打开时锁定背景滚动并注册 Esc
    if (expandedSection || selectedDupCode || showSingleCharDup) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    // cleanup：始终恢复 overflow（新 effect 会按需重新锁定）
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [expandedSection, selectedDupCode, showSingleCharDup]);

  // ★ 当字集过滤器或原始条目变化时，重新计算测评结果和覆盖率
  const prevResultRef = useRef<EvaluateResult | null>(null);
  // 按字集缓存测评结果：切换字集时秒出，无需重算
  const charsetResultCache = useRef<Map<string, EvaluateResult>>(new Map());
  const charsetCoverageCache = useRef<Map<string, {
    gb2312: { covered: number; total: number; percentage: number; missing: string[] } | null;
    gbk: { covered: number; total: number; percentage: number; missing: string[] } | null;
    tonggui: { covered: number; total: number; percentage: number; missing: string[] } | null;
  }>>(new Map());
  const [, startTransition] = useTransition();

  const reEvaluate = useCallback((entries: CodeEntry[], charset: CharsetFilter, forceFull = false) => {
    if (entries.length === 0) return;

    if (forceFull) {
      // 数据变化时：清空所有字集缓存，全量重算
      charsetResultCache.current.clear();
      charsetCoverageCache.current.clear();
    }

    // 检查字集缓存（仅切换字集时命中，数据变化时跳过）
    if (!forceFull) {
      const cachedRes = charsetResultCache.current.get(charset);
      const cachedCov = charsetCoverageCache.current.get(charset);
      if (cachedRes && cachedCov) {
        prevResultRef.current = cachedRes;
        startTransition(() => {
          setResult(cachedRes);
          setCharCoverage(cachedCov);
        });
        return;
      }
    }

    // 全量计算
    const allPhrasesMerged = phrasesData ? getAllPhrasesMerged(phrasesData) : [];
    const res = evaluate(entries, charset, allPhrasesMerged, forceFull ? undefined : prevResultRef.current);
    prevResultRef.current = res;

    // 计算单字覆盖率（仅统计单字符条目，不包含多字编码）
    const emptyCov = { gb2312: null, gbk: null, tonggui: null } as const;
    let covResult = { ...emptyCov } as { gb2312: ReturnType<typeof calculateCoverage> | null; gbk: ReturnType<typeof calculateCoverage> | null; tonggui: ReturnType<typeof calculateCoverage> | null };
    try {
      const filtered = filterEntriesByCharset(entries, charset);
      const singleChars = filtered.filter(e => e.char.length === 1).map(e => e.char);
      covResult = {
        gb2312: calculateCoverage(singleChars, 'gb2312'),
        gbk: calculateCoverage(singleChars, 'gbk'),
        tonggui: calculateCoverage(singleChars, 'tonggui'),
      };
    } catch (e) { console.warn('覆盖率计算失败:', e); }

    // 写入缓存
    charsetResultCache.current.set(charset, res);
    charsetCoverageCache.current.set(charset, covResult);

    startTransition(() => {
      setResult(res);
      setCharCoverage(covResult);
    });
  }, [phrasesData]);

  // ★ 版本号计数器：每次上传新文件递增，确保同长度不同数据也能正确触发全量重算
  const entriesVersionRef = useRef(0);
  const prevVersionRef = useRef(0);
  useEffect(() => {
    if (rawEntries.length > 0 && !parsing) {
      const entriesChanged = entriesVersionRef.current !== prevVersionRef.current;
      prevVersionRef.current = entriesVersionRef.current;
      // rawEntries 变化时全量重算，仅字集切换时复用词组缓存
      reEvaluate(rawEntries, charsetFilter, entriesChanged);
    }
  }, [charsetFilter, rawEntries, parsing, reEvaluate]);

  // 预置方案一键测评
  const handleBuiltinEvaluate = useCallback(async () => {
    setUseBuiltin(true);
    setParsing(true);
    setParseProgress(0);
    setError('');
    setResult(null);
    setFileName('字源单字方案 v1.32（内置）');

    try {
      // 与 data-loader 的 getDataUrl 保持一致，支持部署在子路径（如 GitHub Pages）
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const response = await fetch(`${base}/字源单字.txt`);
      if (!response.ok) throw new Error('加载失败');
      const text = await response.text();
      setParseProgress(10);

      setTimeout(() => {
        const entries = parseCodeTable(text);
        if (entries.length === 0) {
          setError('未能解析出有效码表数据');
          setParsing(false);
          return;
        }

        entriesVersionRef.current++;
        setRawEntries(entries);
        setParseProgress(100);
        // 由 useEffect 监听 rawEntries 变化后调用 reEvaluate 统一计算
        setParsing(false);
      }, 50);
    } catch {
      setError('加载内置码表失败，请检查网络连接');
      setParsing(false);
    }
  }, []);

  // 文件上传处理
  const handleFile = useCallback(async (file: File) => {
    setUseBuiltin(false);
    setParsing(true);
    setParseProgress(0);
    setError('');
    setResult(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setParseProgress(10);

      setTimeout(() => {
        const entries = parseCodeTable(text);
        if (entries.length === 0) {
          setError('未能解析出有效码表数据，请检查文件格式');
          setParsing(false);
          return;
        }

        entriesVersionRef.current++;
        setRawEntries(entries);
        setParseProgress(100);
        // 由 useEffect 监听 rawEntries 变化后调用 reEvaluate 统一计算
        setParsing(false);
      }, 50);
    } catch {
      setError('文件读取失败');
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // 导出图片
  const exportAsImage = async () => {
    if (!resultRef.current || !result) return;
    setExportingImage(true);
    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true, allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `码表测评_${fileName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      setError('导出图片失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally { setExportingImage(false); }
  };

  // 复制报告
  const copyResult = () => {
    if (!result) return;
    const charsetLabel = CHARSET_OPTIONS.find(o => o.value === charsetFilter)?.label ?? '全字库';
    const lines = [
      `码表测评结果 - ${fileName}`,
      `字集范围: ${charsetLabel}`,
      `总字数: ${result.totalChars}`,
      `字频加权码长: ${result.weightedAvgCodeLen.toFixed(3)}`,
      `全码重码率: ${result.fullDupRate.toFixed(2)}%`,
      `出简重码率: ${result.simplifiedDupRate.toFixed(2)}%`,
      `动态选重率: ${(result.dynamicSelectionRate * 100).toFixed(2)}%`,
      `当量: ${result.equivalent.toFixed(3)}`,
      `速度当量: ${result.speedEquivalent.toFixed(3)}`,
      `综合评分: ${result.compositeScore.toFixed(1)}/100`,
      `GB2312覆盖率: ${result.gb2312Coverage.toFixed(1)}%`,
      `通规一二级覆盖率: ${result.tongguiCoverage.toFixed(1)}%`,
      `GBK覆盖率: ${result.gbkCoverage.toFixed(1)}%`,
      `最大候选项数: ${result.maxCandidatesPerCode}`,
      `需翻页编码数: ${result.codesNeedingPage}`,
      ``,
      `词组测评:`,
      `  二字词: 覆盖${result.phraseEval.twoChar.coverageRate.toFixed(1)}% 码长${result.phraseEval.twoChar.avgCodeLen.toFixed(2)} 重码${result.phraseEval.twoChar.dupRate.toFixed(2)}%`,
      `  三字词: 覆盖${result.phraseEval.threeChar.coverageRate.toFixed(1)}% 码长${result.phraseEval.threeChar.avgCodeLen.toFixed(2)} 重码${result.phraseEval.threeChar.dupRate.toFixed(2)}%`,
      `  四字词: 覆盖${result.phraseEval.fourChar.coverageRate.toFixed(1)}% 码长${result.phraseEval.fourChar.avgCodeLen.toFixed(2)} 重码${result.phraseEval.fourChar.dupRate.toFixed(2)}%`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {
      setError('复制到剪贴板失败，请手动复制');
    });
  };

  // ========================================
  // 词频一览：合并全部词组（模块级常量，避免每次渲染重算 60K 条目）
  // ========================================
  const allPhrasesMerged = phrasesData ? getAllPhrasesMerged(phrasesData) : [];

  // 渲染
  // ========================================

  // 数据加载中
  if (charDataLoading || phrasesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">加载数据中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ===== A. 顶部操作区 ===== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                码表测评
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">上传码表或使用内置方案，自动分析核心评码指标</p>
            </div>
            {result && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyResult} className="gap-1.5 transition-colors hover:bg-primary/5">
                  <ClipboardCopy className="h-3.5 w-3.5" />复制报告
                </Button>
                <Button variant="outline" size="sm" onClick={exportAsImage} disabled={exportingImage} className="gap-1.5 transition-colors hover:bg-primary/5">
                  {exportingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {exportingImage ? '导出中...' : '导出图片'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setResult(null); setFileName(''); setRawEntries([]); setError(''); setUseBuiltin(false); setCharsetFilter('all'); }} className="gap-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />重新测评
                </Button>
              </div>
            )}
          </div>

          {!result && !parsing && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* 文件上传 */}
              <Card className="lg:col-span-2 border-dashed border-2 hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
                <CardContent className="p-6">
                  <div
                    className="flex flex-col items-center justify-center cursor-pointer py-6 rounded-lg transition-colors hover:bg-muted/30"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('evaluate-file-input')?.click()}
                  >
                    <input id="evaluate-file-input" type="file" accept=".txt,.mb,.csv,.yaml,.dict.yaml,.enc,.dat" onChange={handleInput} className="hidden" />
                    <Upload className="mb-3 h-12 w-12 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                    <p className="text-base font-medium text-foreground mb-1">点击或拖拽上传码表文件</p>
                    <p className="text-sm text-muted-foreground">支持 .txt / .mb / .csv / .yaml / .dict.yaml 等格式</p>
                  </div>
                  {error && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4" />{error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 预置方案快速测评 */}
              <Card className="bg-card border-primary/20">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">预置方案测评</h3>
                  <p className="text-sm text-muted-foreground mb-4">使用字源单字完整码表<br/>一键查看测评结果</p>
                  <Button onClick={handleBuiltinEvaluate} className="gap-2">
                    <Zap className="h-4 w-4" />快速测评
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 码表格式说明 */}
          {!result && !parsing && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />支持的码表格式说明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-semibold text-foreground mb-1">通用格式</div>
                    <code className="text-muted-foreground">字\t编码</code> 或 <code className="text-muted-foreground">编码 字</code>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-semibold text-foreground mb-1">Rime格式</div>
                    <code className="text-muted-foreground">编码\t字</code>（YAML头自动跳过）
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-semibold text-foreground mb-1">示例</div>
                    <code className="text-muted-foreground block">的 d<br/>是 dvi<br/>不 dh</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 解析进度 */}
        {parsing && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">{fileName}</span>
              </div>
              <Progress value={parseProgress} className="h-3" />
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {parseProgress < 10 ? '正在读取文件...' :
                 parseProgress < 50 ? '正在解析码表...' :
                 parseProgress < 100 ? '正在计算指标...' : '测评完成！'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===== B. 核心评分看板 ===== */}
        {result && (
        <section ref={resultRef} className="space-y-6">
          {/* 方案标识 */}
          <div className="flex items-center gap-3">
            {parsing ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            <span className="font-medium text-foreground">{fileName}</span>
            <Badge variant="secondary">{result.totalChars.toLocaleString()} 字</Badge>
            <Badge variant="secondary">{result.totalCodes.toLocaleString()} 编码</Badge>
            {useBuiltin && <Badge className="bg-primary/10 text-primary">内置方案</Badge>}
          </div>

          {/* ★ 字集过滤选择器 */}
          <Card className="border-primary/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">测评字集范围</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CHARSET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => startTransition(() => setCharsetFilter(opt.value))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                        charsetFilter === opt.value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                      )}
                      title={opt.description}
                    >
                      {opt.label}
                      <span className="ml-1.5 text-xs opacity-70">
                        {opt.value === 'gb2312' && '(6763字)'}
                        {opt.value === 'gbk' && '(21003字)'}
                        {opt.value === 'tonggui' && '(8105字)'}
                        {opt.value === 'all' && `(${rawEntries.length.toLocaleString()}字)`}
                      </span>
                    </button>
                  ))}
                </div>
                {charsetFilter !== 'all' && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    过滤后 {result.totalChars.toLocaleString()} 字
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 8个核心评分卡片 - 单行展示 */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            {/* 平均码长 */}
            <ScoreCard
              icon={<Target className="h-4 w-4" />}
              title="字频加权码长"
              value={result.weightedAvgCodeLen.toFixed(3)}
              unit=""
              score={(() => {
                if (result.weightedAvgCodeLen < 2.5) return 100;
                if (result.weightedAvgCodeLen < 3.5) return 80;
                if (result.weightedAvgCodeLen < 4.5) return 60;
                return 40;
              })()}
            />
            {/* 全码重码率 */}
            <ScoreCard
              icon={<AlertTriangle className="h-4 w-4" />}
              title="全码重码率"
              value={result.fullDupRate.toFixed(2)}
              unit="%"
              score={(() => {
                if (result.fullDupRate < 3) return 100;
                if (result.fullDupRate < 5) return 85;
                if (result.fullDupRate < 10) return 65;
                if (result.fullDupRate < 15) return 45;
                return 25;
              })()}
            />
            {/* 出简重码率 */}
            <ScoreCard
              icon={<Flame className="h-4 w-4" />}
              title="出简重码率"
              value={result.simplifiedDupRate.toFixed(2)}
              unit="%"
              score={(() => {
                if (result.simplifiedDupRate < 2) return 100;
                if (result.simplifiedDupRate < 5) return 80;
                if (result.simplifiedDupRate < 10) return 55;
                return 30;
              })()}
            />
            {/* 选重率 */}
            <ScoreCard
              icon={<Gauge className="h-4 w-4" />}
              title="动态选重率"
              value={(result.dynamicSelectionRate * 100).toFixed(2)}
              unit="%"
              score={(() => {
                if (result.dynamicSelectionRate < 0.0005) return 100;
                if (result.dynamicSelectionRate < 0.002) return 85;
                if (result.dynamicSelectionRate < 0.005) return 65;
                return 35;
              })()}
            />
            {/* 当量 */}
            <ScoreCard
              icon={<Activity className="h-4 w-4" />}
              title="当量"
              value={result.equivalent.toFixed(3)}
              unit=""
              score={(() => {
                if (result.equivalent < 1.5) return 100;
                if (result.equivalent < 2.5) return 80;
                if (result.equivalent < 3.5) return 55;
                return 30;
              })()}
            />
            {/* GB2312静态重码数 */}
            <ScoreCard
              icon={<AlertTriangle className="h-4 w-4" />}
              title="GB2312重码"
              value={result.gb2312StaticDup.toString()}
              unit="字"
              score={(() => {
                if (result.gb2312StaticDup < 200) return 100;
                if (result.gb2312StaticDup < 500) return 85;
                if (result.gb2312StaticDup < 1000) return 65;
                return 35;
              })()}
            />
            {/* 速度当量 */}
            <ScoreCard
              icon={<Zap className="h-4 w-4" />}
              title="速度当量"
              value={result.speedEquivalent.toFixed(3)}
              unit=""
              score={(() => {
                if (result.speedEquivalent < 1.1) return 100;
                if (result.speedEquivalent < 1.2) return 85;
                if (result.speedEquivalent < 1.4) return 65;
                return 35;
              })()}
            />
            {/* 综合评分 */}
            <ScoreCard
              icon={<Award className="h-4 w-4" />}
              title="综合评分"
              value={result.compositeScore.toFixed(1)}
              unit="/100"
              score={result.compositeScore}
              highlight
            />
          </div>

          {/* ===== C. 字符集覆盖率 + 综合测评表 ===== */}

          {/* 字符集覆盖率（精简版） */}
          {charCoverage && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">字符集覆盖率</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([
                    { label: 'GB2312', data: charCoverage.gb2312 },
                    { label: '通规', data: charCoverage.tonggui },
                    { label: 'GBK', data: charCoverage.gbk },
                  ] as const).map(({ label, data }) => data && (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">{label}</span>
                      <div className="flex-1 h-4 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', data.percentage >= 90 ? 'bg-emerald-500' : data.percentage >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${Math.min(data.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold font-mono-stat tabular-nums w-14 text-right">{data.percentage.toFixed(1)}%</span>
                      <span className="text-[10px] text-muted-foreground">{data.covered}/{data.total}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== 单字测评综合表 ===== */}
          <Card className={cn(expandedSection === 'single-char' && "fixed inset-0 z-50 bg-background overflow-auto rounded-none border-0 shadow-2xl")}>
            <CardContent className="p-4 sm:p-6">
              {expandedSection === 'single-char' && (
                <div className="-mx-6 -mt-6 mb-4 px-6 py-3 bg-card border-b border-border flex items-center justify-between sticky top-0 z-10">
                  <span className="font-bold text-foreground text-base">单字测评 - 全屏查看 <span className="text-xs font-normal text-muted-foreground ml-2">按 Esc 收起</span></span>
                  <Button variant="outline" size="sm" onClick={() => setExpandedSection(null)} className="gap-1.5 focus-visible:ring-2 focus-visible:ring-primary">收起</Button>
                </div>
              )}
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />单字测评（{countSpace ? '计算空格' : '不计算空格'}）
                {expandedSection !== 'single-char' && (
                  <button onClick={() => setExpandedSection('single-char')} className="ml-1 p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary" title="点击放大查看（Esc 收起）">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setCountSpace(!countSpace)}
                  className={cn(
                    'ml-auto text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
                    countSpace
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {countSpace ? '计算空格 ✓' : '不计算空格'}
                </button>
                <button
                  onClick={() => { setShowCharList(!showCharList); if (!showCharList) setShowPhraseList(false); }}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
                    showCharList
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  单字一览 {showCharList ? '✓' : ''}
                </button>
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className={cn('w-full leading-normal', expandedSection === 'single-char' ? 'text-sm min-w-[1400px]' : 'text-xs min-w-[1100px]')}>
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/20 border-b border-border">
                      <th className="px-2 py-2.5 text-left font-bold text-foreground whitespace-nowrap text-sm sticky left-0 bg-emerald-50 dark:bg-emerald-950/20 z-10">范围</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground text-sm">字数</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground text-sm">1码</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground text-sm">2码</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground text-sm">3码</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground text-sm">4码</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="简码重码（选重）">简码<br/>重码</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="全码重码">全码<br/>重码</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="理论二简">理论<br/>二简</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="字频加权码长">加权<br/>键长</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="字频加权字均当量">加权<br/>字均当量</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="字频加权键均当量">加权<br/>键均当量</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="左右互击">左右<br/>互击</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="同指大跨排">同指<br/>大跨排</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="同指小跨排">同指<br/>小跨排</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="同键三连">同键<br/>三连</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="同键四连">同键<br/>四连</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="同指三连">同指<br/>三连</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="同指四连">同指<br/>四连</th>
                      <th className="px-2 py-2.5 text-center font-bold text-foreground whitespace-nowrap text-sm" title="小指干扰">小指<br/>干扰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const tiers = result.freqTierStats;
                      const highTiers = tiers.slice(0, 3);
                      const lowTiers = tiers.slice(3);

                      /** 汇总一组 tier 的所有指标 */
                      const sumTier = (arr: typeof tiers) => {
                        const totalChars = arr.reduce((s, t) => s + t.charCount, 0);
                        return {
                          charCount: totalChars,
                          oneCode: arr.reduce((s, t) => s + t.oneCode, 0),
                          twoCode: arr.reduce((s, t) => s + t.twoCode, 0),
                          threeCode: arr.reduce((s, t) => s + t.threeCode, 0),
                          fourCode: arr.reduce((s, t) => s + t.fourCode, 0),
                          shortDupCount: arr.reduce((s, t) => s + t.shortDupCount, 0),
                          fullDupCount: arr.reduce((s, t) => s + t.fullDupCount, 0),
                          theoreticalTwoShort: arr.reduce((s, t) => s + t.theoreticalTwoShort, 0),
                          weightedCodeLen: totalChars > 0 ? arr.reduce((s, t) => s + t.weightedCodeLen * t.charCount, 0) / totalChars : 0,
                          weightedCharEquiv: totalChars > 0 ? arr.reduce((s, t) => s + t.weightedCharEquiv * t.charCount, 0) / totalChars : 0,
                          weightedKeyEquiv: totalChars > 0 ? arr.reduce((s, t) => s + t.weightedKeyEquiv * t.charCount, 0) / totalChars : 0,
                          handAltCount: arr.reduce((s, t) => s + t.handAltCount, 0),
                          sameFingerBigCross: arr.reduce((s, t) => s + t.sameFingerBigCross, 0),
                          sameFingerSmallCross: arr.reduce((s, t) => s + t.sameFingerSmallCross, 0),
                          sameKeyTriple: arr.reduce((s, t) => s + t.sameKeyTriple, 0),
                          sameKeyQuad: arr.reduce((s, t) => s + t.sameKeyQuad, 0),
                          sameFingerTriple: arr.reduce((s, t) => s + t.sameFingerTriple, 0),
                          sameFingerQuad: arr.reduce((s, t) => s + t.sameFingerQuad, 0),
                          pinkyCount: arr.reduce((s, t) => s + t.pinkyCount, 0),
                          // 频率加权汇总
                          freqSum: arr.reduce((s, t) => s + t.freqSum, 0),
                          oneCodeFreq: arr.reduce((s, t) => s + t.oneCodeFreq, 0),
                          twoCodeFreq: arr.reduce((s, t) => s + t.twoCodeFreq, 0),
                          threeCodeFreq: arr.reduce((s, t) => s + t.threeCodeFreq, 0),
                          fourCodeFreq: arr.reduce((s, t) => s + t.fourCodeFreq, 0),
                          shortDupFreq: arr.reduce((s, t) => s + t.shortDupFreq, 0),
                          fullDupFreq: arr.reduce((s, t) => s + t.fullDupFreq, 0),
                          theoreticalTwoShortFreq: arr.reduce((s, t) => s + t.theoreticalTwoShortFreq, 0),
                          pairFreqSum: arr.reduce((s, t) => s + t.pairFreqSum, 0),
                          handAltFreq: arr.reduce((s, t) => s + t.handAltFreq, 0),
                          sfbFreq: arr.reduce((s, t) => s + t.sfbFreq, 0),
                          sfsFreq: arr.reduce((s, t) => s + t.sfsFreq, 0),
                          sktFreq: arr.reduce((s, t) => s + t.sktFreq, 0),
                          skqFreq: arr.reduce((s, t) => s + t.skqFreq, 0),
                          sftFreq: arr.reduce((s, t) => s + t.sftFreq, 0),
                          sfqFreq: arr.reduce((s, t) => s + t.sfqFreq, 0),
                          pinkyFreq: arr.reduce((s, t) => s + t.pinkyFreq, 0),
                        };
                      };

                      const highSum = sumTier(highTiers);
                      const allSum = sumTier(tiers);

                      /** 数值单元格 */
                      const nc = (v: number) => (
                        <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}</td>
                      );
                      // 计算空格模式下，加权键长 +1
                      const wcl = (v: number) => countSpace ? v + 1 : v;

                      /** 渲染单个 tier 行 */
                      const renderTierRow = (s: typeof tiers[0]) => (
                        <tr key={s.tier} className="border-b border-border hover:bg-muted/20">
                          <td className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap sticky left-0 bg-background z-10">{s.tier}</td>
                          {nc(s.charCount)}{nc(s.oneCode)}{nc(s.twoCode)}{nc(s.threeCode)}{nc(s.fourCode)}
                          <td className={cn('px-2 py-1.5 text-center font-mono-stat tabular-nums font-semibold', s.shortDupCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{s.shortDupCount}</td>
                          <td className={cn('px-2 py-1.5 text-center font-mono-stat tabular-nums font-semibold', s.fullDupCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{s.fullDupCount}</td>
                          {nc(s.theoreticalTwoShort)}{nc(wcl(s.weightedCodeLen))}{nc(s.weightedCharEquiv)}{nc(s.weightedKeyEquiv)}
                          {nc(s.handAltCount)}{nc(s.sameFingerBigCross)}{nc(s.sameFingerSmallCross)}
                          {nc(s.sameKeyTriple)}{nc(s.sameKeyQuad)}{nc(s.sameFingerTriple)}{nc(s.sameFingerQuad)}
                          {nc(s.pinkyCount)}
                        </tr>
                      );

                      /** 渲染小计/总计行 */
                      const renderSumRow = (label: string, sum: ReturnType<typeof sumTier>) => (
                        <tr key={label} className="bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-border font-semibold">
                          <td className="px-2 py-1.5 text-foreground sticky left-0 bg-emerald-50/50 dark:bg-emerald-950/10 z-10">{label}</td>
                          {nc(sum.charCount)}{nc(sum.oneCode)}{nc(sum.twoCode)}{nc(sum.threeCode)}{nc(sum.fourCode)}
                          <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums text-amber-600 dark:text-amber-400">{sum.shortDupCount}</td>
                          <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums text-amber-600 dark:text-amber-400">{sum.fullDupCount}</td>
                          {nc(sum.theoreticalTwoShort)}{nc(wcl(sum.weightedCodeLen))}{nc(sum.weightedCharEquiv)}{nc(sum.weightedKeyEquiv)}
                          {nc(sum.handAltCount)}{nc(sum.sameFingerBigCross)}{nc(sum.sameFingerSmallCross)}
                          {nc(sum.sameKeyTriple)}{nc(sum.sameKeyQuad)}{nc(sum.sameFingerTriple)}{nc(sum.sameFingerQuad)}
                          {nc(sum.pinkyCount)}
                        </tr>
                      );

                      /** 渲染加权比重行（字频加权百分比） */
                      const renderPctRow = (label: string, sum: ReturnType<typeof sumTier>, keySuffix: string) => {
                        const fs = sum.freqSum;
                        const pct = (v: number) => fs > 0 ? (v / fs * 100).toFixed(2) + '%' : '0%';
                        const pctPair = (v: number) => sum.pairFreqSum > 0 ? (v / sum.pairFreqSum * 100).toFixed(2) + '%' : '0%';
                        return (
                          <tr key={`pct-${keySuffix}`} className="bg-blue-50/50 dark:bg-blue-950/10 border-b border-border text-muted-foreground">
                            <td className="px-2 py-1.5 font-medium sticky left-0 bg-blue-50/50 dark:bg-blue-950/10 z-10">{label}</td>
                            <td colSpan={2} className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.oneCodeFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.twoCodeFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.threeCodeFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.fourCodeFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.shortDupFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.fullDupFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.theoreticalTwoShortFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">/</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">/</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">/</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.handAltFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sfbFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sfsFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sktFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.skqFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sftFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sfqFreq)}</td>
                            <td className="px-2 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.pinkyFreq)}</td>
                          </tr>
                        );
                      };

                      return (<>
                        {highTiers.map(renderTierRow)}
                        {renderSumRow('小计(1~1500)', highSum)}
                        {renderPctRow('加权比重', highSum, 'high')}
                        {lowTiers.map(renderTierRow)}
                        {renderSumRow('总计', allSum)}
                        {renderPctRow('加权比重', allSum, 'all')}
                      </>);
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 单字核心统计（覆盖率 / 平均码长 / 重码率 / 选重率） */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 覆盖率 */}
            {(() => {
              const cov = charCoverage
                ? (charsetFilter === 'gbk' ? charCoverage.gbk
                  : charsetFilter === 'tonggui' ? charCoverage.tonggui
                  : charCoverage.gb2312) ?? null
                : null;
              const pct = cov?.percentage ?? 0;
              return (
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className={cn('text-2xl font-bold font-mono-stat tabular-nums',
                    pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                    pct >= 70 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>{pct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">覆盖率</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">单字可编码比例</div>
                </div>
              );
            })()}
            {/* 平均码长（字频加权） */}
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-bold font-mono-stat tabular-nums text-blue-600 dark:text-blue-400">
                {result.weightedAvgCodeLen.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">平均码长</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">每字平均按键数</div>
            </div>
            {/* 重码率（全码重码率） */}
            <div
              className="rounded-lg border border-border p-3 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              title="点击查看重码单字"
              onClick={() => setShowSingleCharDup(true)}
            >
              <div className={cn('text-2xl font-bold font-mono-stat tabular-nums',
                result.fullDupRate < 5 ? 'text-emerald-600 dark:text-emerald-400' :
                result.fullDupRate < 10 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              )}>{result.fullDupRate.toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground mt-1">重码率 <span className="text-[10px] text-primary">点击查看</span></div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">重码编码占比</div>
            </div>
            {/* 选重率（字频加权） */}
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-bold font-mono-stat tabular-nums text-purple-600 dark:text-purple-400">
                {(result.dynamicSelectionRate * 100).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">选重率（%）</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">字频加权重码占比</div>
            </div>
          </div>

          {/* ===== 键盘热力图 ===== */}
          <Card className={cn(expandedSection === 'heatmap' && "fixed inset-0 z-50 bg-background overflow-auto rounded-none border-0 shadow-2xl")}>
            <CardContent className="p-4 sm:p-6">
              {expandedSection === 'heatmap' && (
                <div className="-mx-6 -mt-6 mb-4 px-6 py-3 bg-card border-b border-border flex items-center justify-between sticky top-0 z-10">
                  <span className="font-bold text-foreground text-base">键位热力图 - 全屏查看 <span className="text-xs font-normal text-muted-foreground ml-2">按 Esc 收起</span></span>
                  <Button variant="outline" size="sm" onClick={() => setExpandedSection(null)} className="gap-1.5">收起</Button>
                </div>
              )}
              <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />键位热力图（单位：%）
                {expandedSection !== 'heatmap' && (
                  <button onClick={() => setExpandedSection('heatmap')} className="ml-1 p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary" title="点击放大查看（Esc 收起）">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </h3>
              <div className={cn("flex flex-col items-center", expandedSection === 'heatmap' ? 'gap-3' : 'gap-1 sm:gap-2')}>
                {KEYBOARD_ROWS.map((row, ri) => (
                  <div key={ri} className={cn("flex w-full", expandedSection === 'heatmap' ? 'gap-2.5' : 'gap-1 sm:gap-1.5')} style={{ paddingLeft: ri === 1 ? (expandedSection === 'heatmap' ? '40px' : '12px sm:24px') : ri === 2 ? (expandedSection === 'heatmap' ? '80px' : '24px sm:48px') : '0' }}>
                    {row.map((key) => {
                      const rate = result.keyUsageRate[key] || 0;
                      const freq = result.keyFreq[key] || 0;
                      // 根据使用率设置背景色强度
                      const bgIntensity = Math.min(rate / 7, 1); // 7% 为最大参考值
                      const bgColor = freq === 0
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                        : bgIntensity < 0.2 ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300'
                        : bgIntensity < 0.4 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                        : bgIntensity < 0.6 ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-900 dark:text-orange-100'
                        : bgIntensity < 0.8 ? 'bg-orange-300 dark:bg-orange-700/60 text-orange-900 dark:text-white'
                        : 'bg-orange-400 dark:bg-orange-600 text-white';
                      return (
                        <div
                          key={key}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-lg text-xs font-mono font-bold border border-border transition-colors shadow-sm',
                            expandedSection === 'heatmap'
                              ? 'h-20 w-20'
                              : 'flex-1 min-w-0 aspect-square sm:flex-none sm:w-14 sm:h-14',
                            bgColor,
                          )}
                          title={`${key.toUpperCase()}: ${freq.toLocaleString()}次 (${rate.toFixed(1)}%)`}
                        >
                          <span className={cn('font-bold leading-none', expandedSection === 'heatmap' ? 'text-xl' : 'text-sm sm:text-base')}>{key.toUpperCase()}</span>
                          {freq > 0 && (
                            <span className={cn('leading-tight font-sans font-mono-stat tabular-nums mt-0.5 opacity-80', expandedSection === 'heatmap' ? 'text-sm' : 'text-[9px] sm:text-[10px]')}>
                              {rate.toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* 左右手比例 */}
              <div className="mt-5 flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono-stat tabular-nums text-blue-600 dark:text-blue-400">{result.leftHandRate.toFixed(2)}%</div>
                  <div className="text-sm text-muted-foreground">左手</div>
                </div>
                <span className="text-2xl font-bold text-muted-foreground">:</span>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono-stat tabular-nums text-purple-600 dark:text-purple-400">{result.rightHandRate.toFixed(2)}%</div>
                  <div className="text-sm text-muted-foreground">右手</div>
                </div>
              </div>
              {/* 手指负担分布 */}
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 text-center">各手指负担分布</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.fingerChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={72} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString()}次`, '按键次数']} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {result.fingerChartData.map((_, i) => (
                          <Cell key={i} fill={['#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6'][i % 10]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== 词组测评 ===== */}
          <Card className={cn(expandedSection === 'phrase' && "fixed inset-0 z-50 bg-background overflow-auto rounded-none border-0 shadow-2xl")}>
            <CardContent className="p-4 sm:p-6">
              {expandedSection === 'phrase' && (
                <div className="-mx-6 -mt-6 mb-4 px-6 py-3 bg-card border-b border-border flex items-center justify-between sticky top-0 z-10">
                  <span className="font-bold text-foreground text-base">词组测评 - 全屏查看 <span className="text-xs font-normal text-muted-foreground ml-2">按 Esc 收起</span></span>
                  <Button variant="outline" size="sm" onClick={() => setExpandedSection(null)} className="gap-1.5">收起</Button>
                </div>
              )}
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />词组测评
                <span className="text-xs font-normal text-muted-foreground ml-2">共 {result.topPhraseCount.toLocaleString()} 词</span>
                {expandedSection !== 'phrase' && (
                  <button onClick={() => setExpandedSection('phrase')} className="ml-1 p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary" title="点击放大查看（Esc 收起）">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setCountSpace(!countSpace)}
                  className={cn(
                    'ml-auto text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
                    countSpace
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {countSpace ? '计算空格 ✓' : '不计算空格'}
                </button>
                <button
                  onClick={() => { setShowPhraseList(!showPhraseList); if (!showPhraseList) setShowCharList(false); }}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
                    showPhraseList
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  词频一览 {showPhraseList ? '✓' : ''}
                </button>
              </h3>

              {/* 缺少全码警告 */}
              {result.missingCodeCharCount > 0 && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">注意：</span>
                      码表中有 <span className="font-bold">{result.missingCodeCharCount}</span> 个单字缺少全码，这些字参与的词组可能无法编码，词组测评结果可能偏低。
                      {result.missingCodeChars.length > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                         （如：{result.missingCodeChars.join('、')}）
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 词组分频段统计表 */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className={cn('w-full leading-normal', expandedSection === 'phrase' ? 'text-sm min-w-[1200px]' : 'text-xs min-w-[900px]')}>
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/20 border-b border-border">
                      <th className="px-3 py-2.5 text-left font-bold text-foreground">统计范围</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">选重</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">加权词均当量</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">左右互击</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">同指大跨排</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">同指小跨排</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">同键三连</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">同键四连</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">同指三连</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">同指四连</th>
                      <th className="px-3 py-2.5 text-center font-bold text-foreground">小指干扰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const tiers = result.phraseFreqTierStats;
                      const highTiers = tiers.slice(0, 3);
                      const lowTiers = tiers.slice(3);

                      /** 汇总一组 tier 的所有指标 */
                      const sumTier = (arr: typeof tiers) => {
                        const totalPhrases = arr.reduce((s, t) => s + t.totalPhrases, 0);
                        return {
                          totalPhrases,
                          selectionCount: arr.reduce((s, t) => s + t.selectionCount, 0),
                          weightedCodeEquiv: totalPhrases > 0 ? arr.reduce((s, t) => s + t.weightedCodeEquiv * t.totalPhrases, 0) / totalPhrases : 0,
                          handAltCount: arr.reduce((s, t) => s + t.handAltCount, 0),
                          sameFingerBigCross: arr.reduce((s, t) => s + t.sameFingerBigCross, 0),
                          sameFingerSmallCross: arr.reduce((s, t) => s + t.sameFingerSmallCross, 0),
                          sameKeyTriple: arr.reduce((s, t) => s + t.sameKeyTriple, 0),
                          sameKeyQuad: arr.reduce((s, t) => s + t.sameKeyQuad, 0),
                          sameFingerTriple: arr.reduce((s, t) => s + t.sameFingerTriple, 0),
                          sameFingerQuad: arr.reduce((s, t) => s + t.sameFingerQuad, 0),
                          pinkyCount: arr.reduce((s, t) => s + t.pinkyCount, 0),
                          // 频率加权汇总
                          freqSum: arr.reduce((s, t) => s + t.freqSum, 0),
                          selFreqSum: arr.reduce((s, t) => s + t.selFreqSum, 0),
                          pairFreqSum: arr.reduce((s, t) => s + t.pairFreqSum, 0),
                          handAltFreq: arr.reduce((s, t) => s + t.handAltFreq, 0),
                          sfbFreq: arr.reduce((s, t) => s + t.sfbFreq, 0),
                          sfsFreq: arr.reduce((s, t) => s + t.sfsFreq, 0),
                          sktFreq: arr.reduce((s, t) => s + t.sktFreq, 0),
                          skqFreq: arr.reduce((s, t) => s + t.skqFreq, 0),
                          sftFreq: arr.reduce((s, t) => s + t.sftFreq, 0),
                          sfqFreq: arr.reduce((s, t) => s + t.sfqFreq, 0),
                          pinkyFreq: arr.reduce((s, t) => s + t.pinkyFreq, 0),
                        };
                      };

                      const highSum = sumTier(highTiers);
                      const allSum = sumTier(tiers);

                      /** 数值单元格 */
                      const nc = (v: number) => (
                        <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}</td>
                      );

                      /** 渲染单个 tier 行 */
                      const renderTierRow = (s: typeof tiers[0]) => (
                        <tr key={s.tier} className="border-b border-border hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{s.tier}</td>
                          {nc(s.selectionCount)}{nc(s.weightedCodeEquiv)}
                          {nc(s.handAltCount)}{nc(s.sameFingerBigCross)}{nc(s.sameFingerSmallCross)}
                          {nc(s.sameKeyTriple)}{nc(s.sameKeyQuad)}{nc(s.sameFingerTriple)}{nc(s.sameFingerQuad)}
                          {nc(s.pinkyCount)}
                        </tr>
                      );

                      /** 渲染小计/总计行 */
                      const renderSumRow = (label: string, sum: ReturnType<typeof sumTier>) => (
                        <tr key={label} className="bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-border font-semibold">
                          <td className="px-3 py-1.5 text-foreground">{label}</td>
                          {nc(sum.selectionCount)}{nc(sum.weightedCodeEquiv)}
                          {nc(sum.handAltCount)}{nc(sum.sameFingerBigCross)}{nc(sum.sameFingerSmallCross)}
                          {nc(sum.sameKeyTriple)}{nc(sum.sameKeyQuad)}{nc(sum.sameFingerTriple)}{nc(sum.sameFingerQuad)}
                          {nc(sum.pinkyCount)}
                        </tr>
                      );

                      /** 渲染加权比重行（词频加权百分比） */
                      const renderPctRow = (label: string, sum: ReturnType<typeof sumTier>, keySuffix: string) => {
                        const fs = sum.freqSum;
                        const pct = (v: number) => fs > 0 ? (v / fs * 100).toFixed(2) + '%' : '0%';
                        const pctPair = (v: number) => sum.pairFreqSum > 0 ? (v / sum.pairFreqSum * 100).toFixed(2) + '%' : '0%';
                        return (
                          <tr key={`pct-${keySuffix}`} className="bg-blue-50/50 dark:bg-blue-950/10 border-b border-border text-muted-foreground">
                            <td className="px-3 py-1.5 font-medium">{label}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pct(sum.selFreqSum)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">/</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.handAltFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sfbFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sfsFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sktFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.skqFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sftFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.sfqFreq)}</td>
                            <td className="px-3 py-1.5 text-center font-mono-stat tabular-nums">{pctPair(sum.pinkyFreq)}</td>
                          </tr>
                        );
                      };

                      return (<>
                        {highTiers.map(renderTierRow)}
                        {renderSumRow('小计', highSum)}
                        {renderPctRow('加权比重', highSum, 'high')}
                        {lowTiers.map(renderTierRow)}
                        {renderSumRow('总计', allSum)}
                        {renderPctRow('加权比重', allSum, 'all')}
                      </>);
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 词组测评汇总统计 */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3 text-center" title="能编码的词组数 / 总词组数 × 100%">
                  <div className={cn('text-2xl font-bold font-mono-stat tabular-nums',
                    result.phraseEval.overall.coverageRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                    result.phraseEval.overall.coverageRate >= 70 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>{result.phraseEval.overall.coverageRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">覆盖率</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">词组可编码比例</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center" title="所有词组编码的平均键数（词频加权）">
                  <div className="text-2xl font-bold font-mono-stat tabular-nums text-blue-600 dark:text-blue-400">
                    {countSpace ? (result.phraseEval.overall.avgCodeLen + 1).toFixed(2) : result.phraseEval.overall.avgCodeLen.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">平均码长</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">每词平均按键数</div>
                </div>
                <div
                  className="rounded-lg border border-border p-3 text-center cursor-pointer hover:bg-muted/30 transition-colors" title="存在重码的词组占比（按编码数计）—— 点击查看重码词组"
                  onClick={() => (result?.phraseDupGroups?.length ?? 0) > 0 && setSelectedDupCode(result!.phraseDupGroups![0].code)}
                >
                  <div className={cn('text-2xl font-bold font-mono-stat tabular-nums',
                    result.phraseEval.overall.dupRate < 5 ? 'text-emerald-600 dark:text-emerald-400' :
                    result.phraseEval.overall.dupRate < 10 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>{result.phraseEval.overall.dupRate.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">重码率 <span className="text-[10px] text-primary">点击查看</span></div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">重码编码占比</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center" title="因重码需按数字键选重的比例（词频加权）">
                  <div className="text-2xl font-bold font-mono-stat tabular-nums text-purple-600 dark:text-purple-400">
                    {(result.phraseEval.overall.selectionRate * 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">选重率（%）</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">词频加权重码占比</div>
                </div>
              </div>

              {/* 词组键盘热力图 */}
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-foreground mb-3">词组键位热力图（%）</h4>
                <div className={cn("flex flex-col items-center", expandedSection === 'phrase' ? 'gap-3' : 'gap-1 sm:gap-2')}>
                  {(() => {
                    const totalPhraseKeys = Object.values(result.phraseEval.overall.keyFreq).reduce((s, f) => s + f, 0);
                    return KEYBOARD_ROWS.map((row, ri) => (
                    <div key={ri} className={cn("flex w-full", expandedSection === 'phrase' ? 'gap-2.5' : 'gap-1 sm:gap-1.5')} style={{ paddingLeft: ri === 1 ? (expandedSection === 'phrase' ? '40px' : '12px sm:24px') : ri === 2 ? (expandedSection === 'phrase' ? '80px' : '24px sm:48px') : '0' }}>
                      {row.map((key) => {
                        const freq = result.phraseEval.overall.keyFreq[key] || 0;
                        const rate = totalPhraseKeys > 0 ? (freq / totalPhraseKeys * 100) : 0;
                        const bgIntensity = Math.min(rate / 7, 1);
                        const bgColor = freq === 0
                          ? 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                          : bgIntensity < 0.2 ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300'
                          : bgIntensity < 0.4 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                          : bgIntensity < 0.6 ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-900 dark:text-orange-100'
                          : bgIntensity < 0.8 ? 'bg-orange-300 dark:bg-orange-700/60 text-orange-900 dark:text-white'
                          : 'bg-orange-400 dark:bg-orange-600 text-white';
                        return (
                          <div
                            key={key}
                            className={cn(
                              'flex flex-col items-center justify-center rounded-lg text-xs font-mono font-bold border border-border transition-colors shadow-sm',
                              expandedSection === 'phrase'
                                ? 'h-20 w-20'
                                : 'flex-1 min-w-0 aspect-square sm:flex-none sm:w-14 sm:h-14',
                              bgColor,
                            )}
                            title={`${key.toUpperCase()}: ${freq.toLocaleString()}次 (${rate.toFixed(1)}%)`}
                          >
                            <span className={cn('font-bold leading-none', expandedSection === 'phrase' ? 'text-xl' : 'text-sm sm:text-base')}>{key.toUpperCase()}</span>
                            {freq > 0 && (
                              <span className={cn('leading-tight font-sans font-mono-stat tabular-nums mt-0.5 opacity-80', expandedSection === 'phrase' ? 'text-sm' : 'text-[9px] sm:text-[10px]')}>
                                {rate.toFixed(1)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))})()}
                </div>
                {/* 词组输入左右手比例 */}
                <div className="mt-4 flex items-center justify-center gap-6">
                  {(() => {
                    const kf = result.phraseEval.overall.keyFreq;
                    const total = Object.values(kf).reduce((s, f) => s + f, 0);
                    let leftSum = 0, rightSum = 0;
                    for (const [k, v] of Object.entries(kf)) {
                      if (LEFT_HAND_KEYS.has(k)) leftSum += v;
                      else if (RIGHT_HAND_KEYS.has(k)) rightSum += v;
                    }
                    const lRate = total > 0 ? (leftSum / total * 100) : 0;
                    const rRate = total > 0 ? (rightSum / total * 100) : 0;
                    return (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono-stat tabular-nums text-blue-600 dark:text-blue-400">{lRate.toFixed(2)}%</div>
                          <div className="text-sm text-muted-foreground">左手</div>
                        </div>
                        <span className="text-2xl font-bold text-muted-foreground">:</span>
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono-stat tabular-nums text-purple-600 dark:text-purple-400">{rRate.toFixed(2)}%</div>
                          <div className="text-sm text-muted-foreground">右手</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                数据来源：测评6万词词频表，基于大规模语料库统计
              </p>
            </CardContent>
          </Card>


          {/* ===== D. 底部汇总表 ===== */}
          <Card className={cn(expandedSection === 'summary' && "fixed inset-0 z-50 bg-background overflow-auto rounded-none border-0 shadow-2xl")}>
            <CardHeader className="pb-2">
              {expandedSection === 'summary' && (
                <div className="-mx-6 -mt-6 mb-2 px-6 py-3 bg-card border-b border-border flex items-center justify-between sticky top-0 z-10">
                  <span className="font-bold text-foreground text-base">完整统计指标汇总 - 全屏查看 <span className="text-xs font-normal text-muted-foreground ml-2">按 Esc 收起</span></span>
                  <Button variant="outline" size="sm" onClick={() => setExpandedSection(null)} className="gap-1.5">收起</Button>
                </div>
              )}
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />完整统计指标汇总
                {expandedSection !== 'summary' && (
                  <button onClick={() => setExpandedSection('summary')} className="ml-2 p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary" title="点击放大查看（Esc 收起）">
                    <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b-2 border-border">
                      <th className="px-3 py-2.5 text-left font-bold w-32">分类</th>
                      <th className="px-3 py-2.5 text-left font-bold">指标</th>
                      <th className="px-3 py-2.5 text-right font-bold">值</th>
                      <th className="px-3 py-2.5 text-center font-bold">评级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { category: '基础数据', items: [
                        { name: '总字数', value: result.totalChars.toLocaleString(), score: -1 },
                        { name: '总编码数', value: result.totalCodes.toLocaleString(), score: -1 },
                        { name: '重码字数', value: result.duplicateCount.toLocaleString(), score: -1 },
                      ]},
                      { category: '核心指标', items: [
                        { name: '字频加权码长', value: result.weightedAvgCodeLen.toFixed(3), score: result.weightedAvgCodeLen < 3.5 ? 90 : result.weightedAvgCodeLen < 4.5 ? 65 : 40 },
                        { name: '全码重码率', value: `${result.fullDupRate.toFixed(2)}%（${result.staticDupCount}字）`, score: result.fullDupRate < 5 ? 90 : result.fullDupRate < 10 ? 65 : 35 },
                        { name: '出简重码率', value: `${result.simplifiedDupRate.toFixed(2)}%`, score: result.simplifiedDupRate < 5 ? 90 : result.simplifiedDupRate < 10 ? 65 : 35 },
                        { name: '动态选重率', value: `${(result.dynamicSelectionRate * 100).toFixed(2)}%`, score: result.dynamicSelectionRate < 0.0005 ? 95 : result.dynamicSelectionRate < 0.002 ? 75 : 40 },
                        { name: '当量', value: result.equivalent.toFixed(3), score: result.equivalent < 1.5 ? 95 : result.equivalent < 2.5 ? 70 : 40 },
                        { name: '速度当量', value: result.speedEquivalent.toFixed(3), score: result.speedEquivalent < 1.1 ? 95 : result.speedEquivalent < 1.3 ? 75 : 40 },
                        { name: '综合评分', value: `${result.compositeScore.toFixed(1)}/100`, score: result.compositeScore },
                      ]},
                      { category: '覆盖率', items: [
                        { name: 'GB2312覆盖率', value: `${result.gb2312Coverage.toFixed(1)}%`, score: result.gb2312Coverage >= 90 ? 90 : result.gb2312Coverage >= 70 ? 65 : 35 },
                        { name: '通规一二级覆盖率', value: `${result.tongguiCoverage.toFixed(1)}%`, score: result.tongguiCoverage >= 90 ? 90 : result.tongguiCoverage >= 70 ? 65 : 35 },
                        { name: 'GBK覆盖率', value: `${result.gbkCoverage.toFixed(1)}%`, score: result.gbkCoverage >= 70 ? 90 : result.gbkCoverage >= 50 ? 65 : 35 },
                      ]},
                      { category: '检字效率', items: [
                        { name: '最大候选项数', value: result.maxCandidatesPerCode.toString(), score: result.maxCandidatesPerCode <= 9 ? 95 : result.maxCandidatesPerCode <= 18 ? 70 : 35 },
                        { name: '需翻页编码数', value: result.codesNeedingPage.toString(), score: result.codesNeedingPage === 0 ? 95 : result.codesNeedingPage < 10 ? 70 : 35 },
                        { name: 'GB2312最大候选项', value: result.gb2312MaxCandidates.toString(), score: result.gb2312MaxCandidates <= 9 ? 95 : result.gb2312MaxCandidates <= 18 ? 70 : 35 },
                        { name: 'GBK最大候选项', value: result.gbkMaxCandidates.toString(), score: result.gbkMaxCandidates <= 9 ? 95 : result.gbkMaxCandidates <= 18 ? 70 : 35 },
                        { name: 'GB2312静态重码数', value: result.gb2312StaticDup.toString(), score: result.gb2312StaticDup < 300 ? 95 : result.gb2312StaticDup < 600 ? 70 : 35 },
                        { name: 'GBK静态重码数', value: result.gbkStaticDup.toString(), score: result.gbkStaticDup < 3000 ? 95 : result.gbkStaticDup < 6000 ? 70 : 35 },
                      ]},
                      { category: '人体工学', items: [
                        { name: '同指连续率', value: `${result.sameFingerRate.toFixed(1)}%`, score: result.sameFingerRate < 15 ? 90 : result.sameFingerRate < 25 ? 65 : 35 },
                        { name: '左右手交替率', value: `${result.handAlternationRate.toFixed(1)}%`, score: result.handAlternationRate >= 40 ? 90 : result.handAlternationRate >= 30 ? 65 : 35 },
                        { name: '字频加权同指率', value: `${result.weightedSameFingerRate.toFixed(1)}%`, score: result.weightedSameFingerRate < 10 ? 90 : result.weightedSameFingerRate < 20 ? 65 : 35 },
                        { name: '字频加权交替率', value: `${result.weightedHandAltRate.toFixed(1)}%`, score: result.weightedHandAltRate >= 50 ? 90 : result.weightedHandAltRate >= 35 ? 65 : 35 },
                        { name: '左手使用率', value: `${result.leftHandRate.toFixed(1)}%`, score: Math.abs(result.leftHandRate - 50) <= 5 ? 95 : Math.abs(result.leftHandRate - 50) <= 10 ? 75 : 50 },
                        { name: '右手使用率', value: `${result.rightHandRate.toFixed(1)}%`, score: -1 },
                        { name: '效率评分', value: result.efficiencyScore.toFixed(1), score: result.efficiencyScore },
                        { name: '工学评分', value: result.ergonomicsScore.toFixed(1), score: result.ergonomicsScore },
                        { name: '平衡评分', value: result.balanceScore.toFixed(1), score: result.balanceScore },
                      ]},
                      { category: '词组测评', items: [
                        { name: '二字词覆盖率', value: `${result.phraseEval.twoChar.coverageRate.toFixed(1)}%`, score: result.phraseEval.twoChar.coverageRate >= 90 ? 90 : result.phraseEval.twoChar.coverageRate >= 70 ? 65 : 35 },
                        { name: '二字词重码率', value: `${result.phraseEval.twoChar.dupRate.toFixed(2)}%`, score: result.phraseEval.twoChar.dupRate < 5 ? 90 : result.phraseEval.twoChar.dupRate < 10 ? 65 : 35 },
                        { name: '三字词覆盖率', value: `${result.phraseEval.threeChar.coverageRate.toFixed(1)}%`, score: result.phraseEval.threeChar.coverageRate >= 90 ? 90 : result.phraseEval.threeChar.coverageRate >= 70 ? 65 : 35 },
                        { name: '四字词覆盖率', value: `${result.phraseEval.fourChar.coverageRate.toFixed(1)}%`, score: result.phraseEval.fourChar.coverageRate >= 90 ? 90 : result.phraseEval.fourChar.coverageRate >= 70 ? 65 : 35 },
                        { name: '词组平均码长', value: result.phraseEval.overall.avgCodeLen.toFixed(2), score: result.phraseEval.overall.avgCodeLen < 6 ? 90 : result.phraseEval.overall.avgCodeLen < 10 ? 65 : 35 },
                        { name: '词组重码率', value: `${result.phraseEval.overall.dupRate.toFixed(2)}%`, score: result.phraseEval.overall.dupRate < 5 ? 90 : result.phraseEval.overall.dupRate < 10 ? 65 : 35 },
                      ]},
                    ].map((group) => (
                      group.items.map((item, idx) => (
                        <tr key={`${group.category}-${item.name}`} className={cn('border-b border-border hover:bg-accent/5', idx === 0 && 'border-t border-border')}>
                          {idx === 0 && <td className="px-3 py-2 font-semibold text-foreground bg-muted/20" rowSpan={group.items.length}>{group.category}</td>}
                          <td className="px-3 py-2 text-foreground">{item.name}</td>
                          <td className="px-3 py-2 text-right font-mono-stat tabular-nums font-medium">{item.value}</td>
                          <td className="px-3 py-2 text-center">{item.score >= 0 ? getGradeBadge(item.score) : <span className="text-xs text-muted-foreground">-</span>}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
        )}
      </div>

      {/* ===== 词频一览面板（虚拟滚动） ===== */}
      {showPhraseList && <PhraseFreqPanel
        allPhrases={allPhrasesMerged}
        phraseSearch={phraseSearch}
        setPhraseSearch={setPhraseSearch}
        onClose={() => setShowPhraseList(false)}
      />}

      {/* ===== 单字一览面板（虚拟滚动） ===== */}
      {showCharList && rawEntries.length > 0 && <CharFreqPanel
        entries={rawEntries}
        charsetFilter={charsetFilter}
        charSearch={charSearch}
        setCharSearch={setCharSearch}
        onClose={() => setShowCharList(false)}
      />}

      {/* ===== 重码词组弹窗 ===== */}
      {selectedDupCode && result?.phraseDupGroups && (() => {
        const dupGroups = result.phraseDupGroups!;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedDupCode(null)}>
            <div className="w-full max-w-2xl max-h-[85vh] bg-card rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col animate-slideInUp" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <div>
                  <h3 className="font-bold text-foreground">重码词组</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    共 {dupGroups.length} 组重码编码，涉及 {dupGroups.reduce((s, g) => s + g.phrases.length, 0)} 个词组
                  </p>
                </div>
                <button onClick={() => setSelectedDupCode(null)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {dupGroups.slice(0, 50).map((g, gi) => (
                  <div key={g.code} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{gi + 1}</span>
                        <span className="font-mono text-sm font-semibold text-primary">{g.code}</span>
                        <span className="text-xs text-muted-foreground">({g.phrases.length}个词)</span>
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      {g.phrases.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className={cn('font-medium', idx === 0 ? 'text-foreground' : 'text-muted-foreground')}>{item.phrase}</span>
                          <span className="text-xs font-mono font-mono-stat text-muted-foreground tabular-nums">{item.freq.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {dupGroups.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">仅显示频次最高的 50 组</p>
                )}
              </div>
              <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground text-center">
                按重码词组数降序排列 · 按 Esc 关闭
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== 单字重码弹窗 ===== */}
      {showSingleCharDup && result && (() => {
        const dupes = result.topDupes;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowSingleCharDup(false)}>
            <div className="w-full max-w-2xl max-h-[85vh] bg-card rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col animate-slideInUp" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <div>
                  <h3 className="font-bold text-foreground">单字重码</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    共 {result.staticDupCount} 个重码字（{dupes.length} 组），全码重码率 {result.fullDupRate.toFixed(2)}%
                  </p>
                </div>
                <button onClick={() => setShowSingleCharDup(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {dupes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">无重码数据</p>
                ) : dupes.map((g, gi) => (
                  <div key={g.code} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{gi + 1}</span>
                        <span className="font-mono text-sm font-semibold text-primary">{g.code}</span>
                        <span className="text-xs text-muted-foreground">({g.count}个字)</span>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {g.chars.map((ch, idx) => (
                          <div key={idx} className={cn(
                            'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-sm',
                            idx === 0 ? 'border-primary/30 bg-primary/5 font-medium' : 'border-border bg-card text-muted-foreground'
                          )}>
                            <span className="text-base">{ch}</span>
                            <span className="text-[10px] font-mono font-mono-stat text-muted-foreground">
                              {(charFrequency[ch] ?? 0).toFixed(4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground text-center">
                按重码字数降序排列 · 高频字在前 · 按 Esc 关闭
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ========================================
// 子组件
// ========================================

function ScoreCard({ icon, title, value, unit, score, highlight }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit: string;
  score: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card px-2.5 py-2 transition-colors duration-200',
      highlight && 'ring-1 ring-emerald-500/30 border-emerald-200 dark:border-emerald-800'
    )}>
      <div className="flex items-center gap-1 mb-1.5">
        <div className={cn('w-5 h-5 rounded flex items-center justify-center shrink-0', highlight ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted')}>{icon}</div>
        <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">{title}</span>
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <div className="flex items-baseline gap-0.5 min-w-0">
          <span className={cn('text-base sm:text-lg font-bold font-mono-stat tabular-nums truncate', highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>{value}</span>
          {unit && <span className="text-[10px] text-muted-foreground shrink-0">{unit}</span>}
        </div>
        {getGradeBadge(score)}
      </div>
    </div>
  );
}
