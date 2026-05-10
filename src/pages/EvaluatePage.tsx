import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Upload, FileText, BarChart3, Keyboard, CheckCircle2, XCircle,
  Loader2, Trash2, ClipboardCopy, Download, AlertTriangle, Activity,
  Award, Zap, Info, Target, Gauge, Flame, BookOpen, Maximize2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { calculateCoverage } from '@/data/builtinCharSets';
import {
  twoCharPhrases, threeCharPhrases, fourCharPhrases,
  twoCharFreqs, threeCharFreqs, fourCharFreqs,
  PHRASE_FREQ_TOTAL,
} from '@/data/builtinPhrases';
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
  { key: '3001+',     label: '3001+',     start: 3000, end: Infinity },
];

// 词组频段（匹配参考图分段）
const PHRASE_FREQ_TIERS = [
  { key: '1-2000',       label: '1~2000',       start: 0,    end: 2000 },
  { key: '2001-5000',    label: '2001~5000',    start: 2000,  end: 5000 },
  { key: '5001-10000',   label: '5001~10000',   start: 5000,  end: 10000 },
  { key: '10001-20000',  label: '10001~20000',  start: 10000, end: 20000 },
  { key: '20001-40000',  label: '20001~40000',  start: 20000, end: 40000 },
  { key: '40001+',       label: '40001+',       start: 40000, end: Infinity },
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

/** 根据字集过滤码表条目 */
function filterEntriesByCharset(entries: CodeEntry[], charset: CharsetFilter): CodeEntry[] {
  if (charset === 'all') return entries;

  // GB2312_CHARS / GBK_CHARS 是长字符串，需要 split 为字符数组；tongguiAll 已经是 string[]
  const raw = charset === 'gb2312' ? GB2312_CHARS
    : charset === 'gbk' ? GBK_CHARS
    : charset === 'tonggui' ? tongguiAll
    : '';
  const charArr: string[] = typeof raw === 'string' ? raw.split('') : raw;

  const set = new Set(charArr);
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
  phraseFreqTierStats: PhraseTierStat[];  // 词组分频段统计
  topPhraseCount: number;                 // 实际评测的高频词组数
}

/** 词组分段测评结果 */
interface PhraseTierResult {
  totalPhrases: number;       // 词组总数
  coveredPhrases: number;     // 码表能编码的词组数
  coverageRate: number;       // 覆盖率(%)
  avgCodeLen: number;         // 平均编码长度（码元数）
  dupRate: number;            // 重码率(%)
  selectionRate: number;      // 选重率(‱)
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('...') && !formatDetected) { formatDetected = 'rime'; continue; }
    if (trimmed.startsWith('---') || trimmed.startsWith('...')) continue;
    if (formatDetected !== 'rime' && /^[;\/#]/.test(trimmed)) continue;

    let match: RegExpMatchArray | null = null;

    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      if (parts.length >= 2) {
        const f1 = parts[0].trim(), f2 = parts[1].trim();
        if (/^[\da-z]+$/.test(f1)) {
          entries.push({ char: f2, code: f1 });
        } else if (/^[\da-z]+$/.test(f2)) {
          entries.push({ char: f1, code: f2 });
        } else {
          entries.push({ char: f1, code: f2 });
        }
        continue;
      }
    }

    match = trimmed.match(/^(\S+)\s+(\S+)$/);
    if (match) {
      const code = match[1].toLowerCase(), chars = match[2];
      if (/^[\da-z]+$/.test(code)) {
        entries.push({ char: chars, code });
      } else {
        entries.push({ char: code, code: chars.toLowerCase() });
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
// 核心评码算法
// ========================================

function evaluate(entries: CodeEntry[], charset: CharsetFilter = 'all'): EvaluateResult {
  // ★ 字集过滤：在计算前先筛选符合目标字符集的条目
  const filteredEntries = filterEntriesByCharset(entries, charset);

  // 构建编码→字映射（使用过滤后的条目）
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

  // ★ 字频加权平均码长
  let weightedLenSum = 0, freqSum = 0;
  for (const entry of filteredEntries) {
    const freq = getCharFrequencyWeight(entry.char);
    weightedLenSum += freq * entry.code.length;
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

  // ★ 动态选重率（字频加权，宇浩公式：Nd = Σ p(zij), j≠1）
  // 对每个重码组，按字频降序排列，首选字不需选重，其余字的字频之和 / 总字频
  const dynamicSelectionRate = (() => {
    let sum = 0;
    for (const [, chars] of codeToChars) {
      if (chars.length > 1) {
        const sorted = [...chars].sort((a, b) => getCharFrequencyWeight(b) - getCharFrequencyWeight(a));
        for (let i = 1; i < sorted.length; i++) {
          sum += getCharFrequencyWeight(sorted[i]);
        }
      }
    }
    return safeDivide(sum, freqSum) * 10000;
  })();

  // ★ 速度当量（字频加权）
  const speedEquiv = calcWeightedSpeedEquivalent(filteredEntries, charFrequency);

  // ★ 当量 = 字频加权码长 + 动态选重率（小数形式）
  const equivalent = weightedAvgCodeLen + safeDivide(dynamicSelectionRate, 10000);

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
  const dynamicSelScore = calcScore(dynamicSelectionRate, 5, 50, true);
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

  const gb2312Set = new Set([...GB2312_CHARS]);
  const gbkSet = new Set([...GBK_CHARS]);
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
    0.20 * calcScore(dynamicSelectionRate, 5, 50, true) +
    0.15 * balanceScore
  ));
  const ergonomicsScore = Math.max(0, Math.min(100,
    0.35 * calcScore(weightedSameFingerRate, 10, 30, true) +
    0.30 * calcScore(weightedHandAltRate, 50, 30, false) +
    0.20 * calcScore(speedEquiv, 1.0, 1.5, true) +
    0.15 * balanceScore
  ));

  // 字频分段统计（按字频权重降序取前N个）
  const sortedByFreq = [...filteredEntries].sort((a, b) => {
    const fwA = getCharFrequencyWeight(a.char);
    const fwB = getCharFrequencyWeight(b.char);
    return fwB - fwA;
  });
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
    // 工学指标
    let tierHandAlt = 0, tierSameFingerBig = 0, tierSameFingerSmall = 0;
    let tierSameKeyTriple = 0, tierSameKeyQuad = 0;
    let tierSameFingerTriple = 0, tierSameFingerQuad = 0;
    let tierPinky = 0;
    // 加权字均当量 = 字频加权的（码长 + 选重罚时）
    let tierWeightedCharEquiv = 0;
    // 加权键均当量 = speed equivalent per key
    let tierWeightedKeyEquiv = 0;

    for (const e of tierEntries) {
      const len = e.code.length;
      if (len === 1) oneCode++;
      else if (len === 2) twoCode++;
      else if (len === 3) threeCode++;
      else if (len >= 4) fourCode++;

      const f = getCharFrequencyWeight(e.char);
      tierFreqSum += f;
      tierWeightedLen += f * len;

      // 加权字均当量：码长 + 重码选重罚时（简化：每多一个重码字 +0.1）
      const codeChars = tierCodeMap.get(e.code) || [];
      const dupPenalty = codeChars.length > 1 ? (codeChars.length - 1) * 0.1 : 0;
      tierWeightedCharEquiv += f * (len + dupPenalty);

      // 加权键均当量：基于 speed equivalent
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

      // 手感指标
      const code = e.code.toLowerCase();
      const fingerSeq: string[] = [];
      for (const ch of code) { if (FINGER_MAP[ch]) fingerSeq.push(FINGER_MAP[ch]); }

      for (let i = 0; i < code.length - 1; i++) {
        const ck = code[i], nk = code[i + 1];
        if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
        const r1 = KEY_ROW[ck], r2 = KEY_ROW[nk];
        // 左右互击
        if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) tierHandAlt++;
        // 同指连续
        if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) {
          const rowDist = r1 !== undefined && r2 !== undefined ? Math.abs(r1 - r2) : 0;
          if (rowDist >= 2) tierSameFingerBig++;
          else if (rowDist >= 1) tierSameFingerSmall++;
          // 小指干扰
          if (FINGER_MAP[ck] === '左小指' || FINGER_MAP[ck] === '右小指') tierPinky++;
        }
      }

      // 同键三连/四连
      for (let i = 0; i < code.length - 2; i++) {
        if (code[i] === code[i+1] && code[i+1] === code[i+2]) {
          tierSameKeyTriple++;
          if (i < code.length - 3 && code[i] === code[i+3]) tierSameKeyQuad++;
        }
      }
      // 同指三连/四连
      for (let i = 0; i < fingerSeq.length - 2; i++) {
        if (fingerSeq[i] === fingerSeq[i+1] && fingerSeq[i+1] === fingerSeq[i+2]) {
          tierSameFingerTriple++;
          if (i < fingerSeq.length - 3 && fingerSeq[i] === fingerSeq[i+3]) tierSameFingerQuad++;
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
  // 构建字→编码映射（用于词组编码）
  const charToCodes = new Map<string, string[]>();
  for (const entry of filteredEntries) {
    const existing = charToCodes.get(entry.char);
    if (existing) {
      if (!existing.includes(entry.code)) existing.push(entry.code);
    } else {
      charToCodes.set(entry.char, [entry.code]);
    }
  }

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
      if (freqArr && idx >= 0 && idx < freqArr.length) return freqArr[idx] / PHRASE_FREQ_TOTAL;
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
    let phraseSelectionFreq = 0, phraseTotalFreq = 0;
    for (const [, plist] of phraseCodeMap) {
      if (plist.length > 1) {
        dupCount += plist.length - 1;
        const sorted = [...plist].sort((a, b) => {
          const ai = phraseIndexMap.get(a) ?? -1;
          const bi = phraseIndexMap.get(b) ?? -1;
          return getWeight(b, bi) - getWeight(a, ai);
        });
        for (let i = 1; i < sorted.length; i++) {
          selectionCount++;
          const idx = phraseIndexMap.get(sorted[i]) ?? -1;
          phraseSelectionFreq += getWeight(sorted[i], idx);
        }
      }
    }
    for (let pi = 0; pi < phrases.length; pi++) {
      phraseTotalFreq += getWeight(phrases[pi], pi);
    }
    const dupRate = clampPercentage(safeDivide(dupCount, coveredPhrases) * 100);
    const selectionRate = safeDivide(phraseSelectionFreq, phraseTotalFreq) * 10000;

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

  // 三路归并：各分类数据已按词频降序排列，归并取前 50000 个高频词（O(50K) vs 排序 O(80K log 80K)）
  type PhraseSource = { phrase: string; freq: number; type: '2' | '3' | '4' };
  const TOP_50K = 50000;
  const topItems: PhraseSource[] = [];
  {
    let i2 = 0, i3 = 0, i4 = 0;
    while (topItems.length < TOP_50K && (i2 < twoCharPhrases.length || i3 < threeCharPhrases.length || i4 < fourCharPhrases.length)) {
      const f2 = i2 < twoCharFreqs.length ? twoCharFreqs[i2] : -1;
      const f3 = i3 < threeCharFreqs.length ? threeCharFreqs[i3] : -1;
      const f4 = i4 < fourCharFreqs.length ? fourCharFreqs[i4] : -1;
      if (f2 >= f3 && f2 >= f4) { topItems.push({ phrase: twoCharPhrases[i2], freq: f2, type: '2' }); i2++; }
      else if (f3 >= f4) { topItems.push({ phrase: threeCharPhrases[i3], freq: f3, type: '3' }); i3++; }
      else { topItems.push({ phrase: fourCharPhrases[i4], freq: f4, type: '4' }); i4++; }
    }
  }

  // 拆回各自分类（用于按类型评测）
  const top2: string[] = [], top2f: number[] = [];
  const top3: string[] = [], top3f: number[] = [];
  const top4: string[] = [], top4f: number[] = [];
  for (const item of topItems) {
    if (item.type === '2') { top2.push(item.phrase); top2f.push(item.freq); }
    else if (item.type === '3') { top3.push(item.phrase); top3f.push(item.freq); }
    else { top4.push(item.phrase); top4f.push(item.freq); }
  }

  // topAll：按频率降序排列的全部 50K 词组（用于分频段统计）
  const topAll: string[] = topItems.map(item => item.phrase);
  const topAllF: number[] = topItems.map(item => item.freq);

  const phraseEval = {
    twoChar: evalPhraseTier(top2, top2f),
    threeChar: evalPhraseTier(top3, top3f),
    fourChar: evalPhraseTier(top4, top4f),
    overall: evalPhraseTier(topAll, topAllF),
  };

  // ★ 词组分频段统计
  // 只对 top 词组进行分频段统计以提升性能
  const coveredPhraseList: Array<{ phrase: string; code: string; weight: number; idx: number }> = [];
  const phraseCodeMapOverall = new Map<string, string[]>();
  for (let pi = 0; pi < topAll.length; pi++) {
    const phrase = topAll[pi];
    const code = getCachedPhraseCode(phrase);
    if (code === null) continue;
    const weight = topAllF[pi] / PHRASE_FREQ_TOTAL;
    coveredPhraseList.push({ phrase, code, weight, idx: pi });
    const existing = phraseCodeMapOverall.get(code);
    if (existing) { if (!existing.includes(phrase)) existing.push(phrase); }
    else phraseCodeMapOverall.set(code, [phrase]);
  }
  coveredPhraseList.sort((a, b) => b.weight - a.weight);

  const phraseIndexMapOverall = new Map<string, number>();
  for (let i = 0; i < topAll.length; i++) phraseIndexMapOverall.set(topAll[i], i);

  const phraseFreqTierStats: PhraseTierStat[] = PHRASE_FREQ_TIERS.map(tier => {
    // 按原始 topAll 排行序号分频段（idx 存储了原始位置）
    const tierItems = coveredPhraseList.filter(item => item.idx >= tier.start && item.idx < tier.end);
    let selCount = 0, wce = 0;
    let tierWeightSum = 0;
    const tierErgo = { handAlt: 0, sfb: 0, sfs: 0, skt: 0, skq: 0, sft: 0, sfq: 0, pk: 0 };

    for (const item of tierItems) {
      tierWeightSum += item.weight;
      const code = item.code.replace(/ /g, '').toLowerCase();
      const pureLen = code.length;
      const codeChrs = phraseCodeMapOverall.get(item.code) || [];
      const dupPenalty = codeChrs.length > 1 ? (codeChrs.length - 1) * 0.1 : 0;
      wce += item.weight * (pureLen + dupPenalty);

      computeErgonomics(code, tierErgo);

      // 统计选重
      if (codeChrs.length > 1) {
        const sorted = [...codeChrs].sort((a, b) => {
          const ai2 = phraseIndexMapOverall.get(a) ?? -1;
          const bi2 = phraseIndexMapOverall.get(b) ?? -1;
          return (bi2 >= 0 && bi2 < topAllF.length ? topAllF[bi2] : 0) - (ai2 >= 0 && ai2 < topAllF.length ? topAllF[ai2] : 0);
        });
        const posInGroup = sorted.indexOf(item.phrase);
        if (posInGroup > 0) selCount++;
      }
    }

    const covered = tierItems.length;
    // totalPhrases 为该频段在原始 topAll 中的词组总数（含未编码的）
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
    };
  });

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
    phraseFreqTierStats,
    topPhraseCount: topItems.length,
  };
}

// ========================================
// React 组件
// ========================================

export default function EvaluatePage() {
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

  // Escape 键关闭全屏展开模式
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedSection) setExpandedSection(null);
    };
    if (expandedSection) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // 全屏时锁定背景滚动
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [expandedSection]);

  // ★ 当字集过滤器或原始条目变化时，重新计算测评结果和覆盖率
  const reEvaluate = useCallback((entries: CodeEntry[], charset: CharsetFilter) => {
    if (entries.length === 0) return;
    const filtered = filterEntriesByCharset(entries, charset);
    const res = evaluate(entries, charset);
    setResult(res);

    // 覆盖率基于过滤后的条目计算，响应字集选择
    try {
      const singleChars = filtered.filter(e => [...e.char].length === 1).map(e => e.char);
      setCharCoverage({
        gb2312: calculateCoverage(singleChars, 'gb2312'),
        gbk: calculateCoverage(singleChars, 'gbk'),
        tonggui: calculateCoverage(singleChars, 'tonggui'),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (rawEntries.length > 0 && !parsing) {
      reEvaluate(rawEntries, charsetFilter);
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
      const response = await fetch('/字源单字.txt');
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
      `动态选重率: ${result.dynamicSelectionRate.toFixed(1)}‱`,
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
  // 渲染
  // ========================================

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
              <Card className="bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
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
                      onClick={() => setCharsetFilter(opt.value)}
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

          {/* 8个核心评分卡片 */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {/* 平均码长 */}
            <ScoreCard
              icon={<Target className="h-5 w-5" />}
              title="字频加权码长"
              value={result.weightedAvgCodeLen.toFixed(3)}
              unit=""
              reference="< 3.5 优秀"
              progress={Math.max(0, Math.min(100, (1 - (result.weightedAvgCodeLen - 2) / 4) * 100))}
              score={(() => {
                if (result.weightedAvgCodeLen < 2.5) return 100;
                if (result.weightedAvgCodeLen < 3.5) return 80;
                if (result.weightedAvgCodeLen < 4.5) return 60;
                return 40;
              })()}
              colorScheme="blue"
            />
            {/* 全码重码率 */}
            <ScoreCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="全码重码率"
              value={result.fullDupRate.toFixed(2)}
              unit="%"
              reference="< 5% 优秀"
              progress={Math.max(0, Math.min(100, (1 - result.fullDupRate / 20) * 100))}
              score={(() => {
                if (result.fullDupRate < 3) return 100;
                if (result.fullDupRate < 5) return 85;
                if (result.fullDupRate < 10) return 65;
                if (result.fullDupRate < 15) return 45;
                return 25;
              })()}
              colorScheme="orange"
            />
            {/* 出简重码率 */}
            <ScoreCard
              icon={<Flame className="h-5 w-5" />}
              title="出简重码率"
              value={result.simplifiedDupRate.toFixed(2)}
              unit="%"
              reference="越低越好"
              progress={Math.max(0, Math.min(100, (1 - result.simplifiedDupRate / 20) * 100))}
              score={(() => {
                if (result.simplifiedDupRate < 2) return 100;
                if (result.simplifiedDupRate < 5) return 80;
                if (result.simplifiedDupRate < 10) return 55;
                return 30;
              })()}
              colorScheme="rose"
            />
            {/* 选重率 */}
            <ScoreCard
              icon={<Gauge className="h-5 w-5" />}
              title="动态选重率"
              value={result.dynamicSelectionRate.toFixed(1)}
              unit="‱"
              reference="< 5‱ 优秀"
              progress={Math.max(0, Math.min(100, (1 - result.dynamicSelectionRate / 50) * 100))}
              score={(() => {
                if (result.dynamicSelectionRate < 5) return 100;
                if (result.dynamicSelectionRate < 20) return 85;
                if (result.dynamicSelectionRate < 50) return 65;
                return 35;
              })()}
              colorScheme="amber"
            />
            {/* 当量 */}
            <ScoreCard
              icon={<Activity className="h-5 w-5" />}
              title="当量"
              value={result.equivalent.toFixed(3)}
              unit=""
              reference="< 1.5 优秀"
              progress={Math.max(0, Math.min(100, (1 - (result.equivalent - 1) / 5) * 100))}
              score={(() => {
                if (result.equivalent < 1.5) return 100;
                if (result.equivalent < 2.5) return 80;
                if (result.equivalent < 3.5) return 55;
                return 30;
              })()}
              colorScheme="violet"
            />
            {/* GB2312静态重码数 */}
            <ScoreCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="GB2312重码"
              value={result.gb2312StaticDup.toString()}
              unit="字"
              reference="越少越好"
              progress={Math.max(0, Math.min(100, (1 - result.gb2312StaticDup / 1000) * 100))}
              score={(() => {
                if (result.gb2312StaticDup < 200) return 100;
                if (result.gb2312StaticDup < 500) return 85;
                if (result.gb2312StaticDup < 1000) return 65;
                return 35;
              })()}
              colorScheme="cyan"
            />
            {/* 速度当量 */}
            <ScoreCard
              icon={<Zap className="h-5 w-5" />}
              title="速度当量"
              value={result.speedEquivalent.toFixed(3)}
              unit=""
              reference="< 1.2 优秀"
              progress={Math.max(0, Math.min(100, (1 - (result.speedEquivalent - 0.8) / 1.2) * 100))}
              score={(() => {
                if (result.speedEquivalent < 1.1) return 100;
                if (result.speedEquivalent < 1.2) return 85;
                if (result.speedEquivalent < 1.4) return 65;
                return 35;
              })()}
              colorScheme="indigo"
            />
            {/* 综合评分 */}
            <ScoreCard
              icon={<Award className="h-5 w-5" />}
              title="综合评分"
              value={result.compositeScore.toFixed(1)}
              unit="/100"
              reference="参考GB/T18031"
              progress={result.compositeScore}
              score={result.compositeScore}
              colorScheme="emerald"
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
                      <span className="text-xs font-semibold tabular-nums w-14 text-right">{data.percentage.toFixed(1)}%</span>
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
                <div className="-mx-6 -mt-6 mb-4 px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between sticky top-0 z-10">
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
                        };
                      };

                      const highSum = sumTier(highTiers);
                      const allSum = sumTier(tiers);

                      /** 数值单元格 */
                      const nc = (v: number) => (
                        <td className="px-2 py-1.5 text-center tabular-nums">{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}</td>
                      );
                      // 计算空格模式下，加权键长 +1
                      const wcl = (v: number) => countSpace ? v + 1 : v;

                      /** 渲染单个 tier 行 */
                      const renderTierRow = (s: typeof tiers[0]) => (
                        <tr key={s.tier} className="border-b border-border hover:bg-muted/20">
                          <td className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap sticky left-0 bg-background z-10">{s.tier}</td>
                          {nc(s.charCount)} {nc(s.oneCode)} {nc(s.twoCode)} {nc(s.threeCode)} {nc(s.fourCode)}
                          <td className={cn('px-2 py-1.5 text-center tabular-nums font-semibold', s.shortDupCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{s.shortDupCount}</td>
                          <td className={cn('px-2 py-1.5 text-center tabular-nums font-semibold', s.fullDupCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{s.fullDupCount}</td>
                          {nc(s.theoreticalTwoShort)} {nc(wcl(s.weightedCodeLen))} {nc(s.weightedCharEquiv)} {nc(s.weightedKeyEquiv)}
                          {nc(s.handAltCount)} {nc(s.sameFingerBigCross)} {nc(s.sameFingerSmallCross)}
                          {nc(s.sameKeyTriple)} {nc(s.sameKeyQuad)} {nc(s.sameFingerTriple)} {nc(s.sameFingerQuad)}
                          {nc(s.pinkyCount)}
                        </tr>
                      );

                      /** 渲染小计/总计行 */
                      const renderSumRow = (label: string, sum: ReturnType<typeof sumTier>) => (
                        <tr key={label} className="bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-border font-semibold">
                          <td className="px-2 py-1.5 text-foreground sticky left-0 bg-emerald-50/50 dark:bg-emerald-950/10 z-10">{label}</td>
                          {nc(sum.charCount)} {nc(sum.oneCode)} {nc(sum.twoCode)} {nc(sum.threeCode)} {nc(sum.fourCode)}
                          <td className="px-2 py-1.5 text-center tabular-nums text-amber-600 dark:text-amber-400">{sum.shortDupCount}</td>
                          <td className="px-2 py-1.5 text-center tabular-nums text-amber-600 dark:text-amber-400">{sum.fullDupCount}</td>
                          {nc(sum.theoreticalTwoShort)} {nc(wcl(sum.weightedCodeLen))} {nc(sum.weightedCharEquiv)} {nc(sum.weightedKeyEquiv)}
                          {nc(sum.handAltCount)} {nc(sum.sameFingerBigCross)} {nc(sum.sameFingerSmallCross)}
                          {nc(sum.sameKeyTriple)} {nc(sum.sameKeyQuad)} {nc(sum.sameFingerTriple)} {nc(sum.sameFingerQuad)}
                          {nc(sum.pinkyCount)}
                        </tr>
                      );

                      /** 渲染加权比重行（百分比） */
                      const renderPctRow = (label: string, sum: ReturnType<typeof sumTier>) => {
                        const n = sum.charCount;
                        const pct = (v: number) => n > 0 ? (v / n * 100).toFixed(1) + '%' : '0%';
                        // 手感指标用二元组数做分母（码长均值近似）
                        const avgLen = n > 0 ? (sum.oneCode + sum.twoCode * 2 + sum.threeCode * 3 + sum.fourCode * 4) / n : 1;
                        const pairCount = n * Math.max(1, avgLen - 1);
                        const pctPair = (v: number) => pairCount > 0 ? (v / pairCount * 100).toFixed(1) + '%' : '0%';
                        return (
                          <tr key={label} className="bg-blue-50/50 dark:bg-blue-950/10 border-b border-border text-muted-foreground">
                            <td className="px-2 py-1.5 font-medium sticky left-0 bg-blue-50/50 dark:bg-blue-950/10 z-10">{label}</td>
                            <td colSpan={2} className="px-2 py-1.5 text-center tabular-nums">{pct(sum.oneCode)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pct(sum.twoCode)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pct(sum.threeCode)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pct(sum.fourCode)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pct(sum.shortDupCount)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pct(sum.fullDupCount)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pct(sum.theoreticalTwoShort)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">/</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">/</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">/</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.handAltCount)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerBigCross)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerSmallCross)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.sameKeyTriple)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.sameKeyQuad)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerTriple)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerQuad)}</td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{pctPair(sum.pinkyCount)}</td>
                          </tr>
                        );
                      };

                      return (
                        <>
                          {highTiers.map(renderTierRow)}
                          {renderSumRow('小计(1~1500)', highSum)}
                          {renderPctRow('加权比重', highSum)}
                          {lowTiers.map(renderTierRow)}
                          {renderSumRow('总计', allSum)}
                          {renderPctRow('加权比重', allSum)}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ===== 键盘热力图 ===== */}
          <Card className={cn(expandedSection === 'heatmap' && "fixed inset-0 z-50 bg-background overflow-auto rounded-none border-0 shadow-2xl")}>
            <CardContent className="p-4 sm:p-6">
              {expandedSection === 'heatmap' && (
                <div className="-mx-6 -mt-6 mb-4 px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between sticky top-0 z-10">
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
              <div className={cn("flex flex-col items-center", expandedSection === 'heatmap' ? 'gap-3' : 'gap-2')}>
                {KEYBOARD_ROWS.map((row, ri) => (
                  <div key={ri} className={cn("flex", expandedSection === 'heatmap' ? 'gap-2.5' : 'gap-1.5')} style={{ paddingLeft: ri === 1 ? (expandedSection === 'heatmap' ? '40px' : '24px') : ri === 2 ? (expandedSection === 'heatmap' ? '80px' : '48px') : '0' }}>
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
                            'flex flex-col items-center justify-center rounded-lg text-xs font-mono font-bold border border-border/30 transition-all shadow-sm',
                            expandedSection === 'heatmap' ? 'h-20 w-20' : 'h-14 w-14',
                            bgColor,
                          )}
                          title={`${key.toUpperCase()}: ${freq.toLocaleString()}次 (${rate.toFixed(1)}%)`}
                        >
                          <span className={cn('font-bold leading-none', expandedSection === 'heatmap' ? 'text-xl' : 'text-base')}>{key.toUpperCase()}</span>
                          {freq > 0 && (
                            <span className={cn('leading-tight font-sans tabular-nums mt-0.5 opacity-80', expandedSection === 'heatmap' ? 'text-sm' : 'text-[10px]')}>
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
                  <div className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{result.leftHandRate.toFixed(2)}%</div>
                  <div className="text-sm text-muted-foreground">左手</div>
                </div>
                <span className="text-2xl font-bold text-muted-foreground">:</span>
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{result.rightHandRate.toFixed(2)}%</div>
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
                <div className="-mx-6 -mt-6 mb-4 px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between sticky top-0 z-10">
                  <span className="font-bold text-foreground text-base">词组测评 - 全屏查看 <span className="text-xs font-normal text-muted-foreground ml-2">按 Esc 收起</span></span>
                  <Button variant="outline" size="sm" onClick={() => setExpandedSection(null)} className="gap-1.5">收起</Button>
                </div>
              )}
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />词组测评
                <span className="text-xs font-normal text-muted-foreground ml-2">共 {result.topPhraseCount.toLocaleString()} 词（高频前5万）</span>
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
              </h3>

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
                        };
                      };

                      const highSum = sumTier(highTiers);
                      const allSum = sumTier(tiers);

                      /** 数值单元格 */
                      const nc = (v: number) => (
                        <td className="px-3 py-1.5 text-center tabular-nums">{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}</td>
                      );

                      /** 渲染单个 tier 行 */
                      const renderTierRow = (s: typeof tiers[0]) => (
                        <tr key={s.tier} className="border-b border-border hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{s.tier}</td>
                          {nc(s.selectionCount)} {nc(s.weightedCodeEquiv)}
                          {nc(s.handAltCount)} {nc(s.sameFingerBigCross)} {nc(s.sameFingerSmallCross)}
                          {nc(s.sameKeyTriple)} {nc(s.sameKeyQuad)} {nc(s.sameFingerTriple)} {nc(s.sameFingerQuad)}
                          {nc(s.pinkyCount)}
                        </tr>
                      );

                      /** 渲染小计/总计行 */
                      const renderSumRow = (label: string, sum: ReturnType<typeof sumTier>) => (
                        <tr key={label} className="bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-border font-semibold">
                          <td className="px-3 py-1.5 text-foreground">{label}</td>
                          {nc(sum.selectionCount)} {nc(sum.weightedCodeEquiv)}
                          {nc(sum.handAltCount)} {nc(sum.sameFingerBigCross)} {nc(sum.sameFingerSmallCross)}
                          {nc(sum.sameKeyTriple)} {nc(sum.sameKeyQuad)} {nc(sum.sameFingerTriple)} {nc(sum.sameFingerQuad)}
                          {nc(sum.pinkyCount)}
                        </tr>
                      );

                      /** 渲染加权比重行（百分比） */
                      const renderPctRow = (label: string, sum: ReturnType<typeof sumTier>) => {
                        const n = sum.totalPhrases;
                        const pct = (v: number) => n > 0 ? (v / n * 100).toFixed(1) + '%' : '0%';
                        // 手感指标用二元组数做分母（词组平均码长近似）
                        const avgLen = result.phraseEval.overall.avgCodeLen;
                        const pairCount = n * Math.max(1, avgLen - 1);
                        const pctPair = (v: number) => pairCount > 0 ? (v / pairCount * 100).toFixed(1) + '%' : '0%';
                        return (
                          <tr key={label} className="bg-blue-50/50 dark:bg-blue-950/10 border-b border-border text-muted-foreground">
                            <td className="px-3 py-1.5 font-medium">{label}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pct(sum.selectionCount)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">/</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.handAltCount)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerBigCross)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerSmallCross)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.sameKeyTriple)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.sameKeyQuad)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerTriple)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.sameFingerQuad)}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums">{pctPair(sum.pinkyCount)}</td>
                          </tr>
                        );
                      };

                      return (
                        <>
                          {highTiers.map(renderTierRow)}
                          {renderSumRow('小计', highSum)}
                          {renderPctRow('加权比重', highSum)}
                          {lowTiers.map(renderTierRow)}
                          {renderSumRow('总计', allSum)}
                          {renderPctRow('加权比重', allSum)}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 词组测评汇总统计 */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className={cn('text-2xl font-bold tabular-nums',
                    result.phraseEval.overall.coverageRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                    result.phraseEval.overall.coverageRate >= 70 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>{result.phraseEval.overall.coverageRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">覆盖率</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {countSpace ? (result.phraseEval.overall.avgCodeLen + 1).toFixed(2) : result.phraseEval.overall.avgCodeLen.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">平均码长</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className={cn('text-2xl font-bold tabular-nums',
                    result.phraseEval.overall.dupRate < 5 ? 'text-emerald-600 dark:text-emerald-400' :
                    result.phraseEval.overall.dupRate < 10 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>{result.phraseEval.overall.dupRate.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">重码率</div>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                    {result.phraseEval.overall.selectionRate.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">选重率（‱）</div>
                </div>
              </div>

              {/* 词组键盘热力图 */}
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-foreground mb-3">词组键位热力图（%）</h4>
                <div className={cn("flex flex-col items-center", expandedSection === 'phrase' ? 'gap-3' : 'gap-2')}>
                  {(() => {
                    const totalPhraseKeys = Object.values(result.phraseEval.overall.keyFreq).reduce((s, f) => s + f, 0);
                    return KEYBOARD_ROWS.map((row, ri) => (
                    <div key={ri} className={cn("flex", expandedSection === 'phrase' ? 'gap-2.5' : 'gap-1.5')} style={{ paddingLeft: ri === 1 ? (expandedSection === 'phrase' ? '40px' : '24px') : ri === 2 ? (expandedSection === 'phrase' ? '80px' : '48px') : '0' }}>
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
                              'flex flex-col items-center justify-center rounded-lg text-xs font-mono font-bold border border-border/30 transition-all shadow-sm',
                              expandedSection === 'phrase' ? 'h-20 w-20' : 'h-14 w-14',
                              bgColor,
                            )}
                            title={`${key.toUpperCase()}: ${freq.toLocaleString()}次 (${rate.toFixed(1)}%)`}
                          >
                            <span className={cn('font-bold leading-none', expandedSection === 'phrase' ? 'text-xl' : 'text-base')}>{key.toUpperCase()}</span>
                            {freq > 0 && (
                              <span className={cn('leading-tight font-sans tabular-nums mt-0.5 opacity-80', expandedSection === 'phrase' ? 'text-sm' : 'text-[10px]')}>
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
                          <div className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{lRate.toFixed(2)}%</div>
                          <div className="text-sm text-muted-foreground">左手</div>
                        </div>
                        <span className="text-2xl font-bold text-muted-foreground">:</span>
                        <div className="text-center">
                          <div className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{rRate.toFixed(2)}%</div>
                          <div className="text-sm text-muted-foreground">右手</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                数据来源：jieba 中文分词词典（fxsjy/jieba），基于 Liu Chinese Corpus 约 3.5 亿词次统计
              </p>
            </CardContent>
          </Card>


          {/* ===== D. 底部汇总表 ===== */}
          <Card className={cn(expandedSection === 'summary' && "fixed inset-0 z-50 bg-background overflow-auto rounded-none border-0 shadow-2xl")}>
            <CardHeader className="pb-2">
              {expandedSection === 'summary' && (
                <div className="-mx-6 -mt-6 mb-2 px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between sticky top-0 z-10">
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
                        { name: '动态选重率', value: `${result.dynamicSelectionRate.toFixed(1)}‱`, score: result.dynamicSelectionRate < 5 ? 95 : result.dynamicSelectionRate < 20 ? 75 : 40 },
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
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{item.value}</td>
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
    </div>
  );
}

// ========================================
// 子组件
// ========================================

function ScoreCard({ icon, title, value, unit, reference, progress, score, colorScheme, highlight }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit: string;
  reference: string;
  progress: number;
  score: number;
  colorScheme: string;
  highlight?: boolean;
}) {
  // 统一使用更克制的色彩系统：仅区分好坏状态，不使用 8 种颜色
  const barColor = highlight
    ? 'bg-emerald-500'
    : score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20',
      highlight && 'ring-2 ring-emerald-500/30 border-emerald-200 dark:border-emerald-800'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-muted', highlight && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')}>{icon}</div>
        <span className="text-xs font-medium text-muted-foreground leading-tight">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className={cn('text-2xl font-bold tabular-nums tracking-tight', highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden mb-2 bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{reference}</span>
        {getGradeBadge(score)}
      </div>
    </div>
  );
}
