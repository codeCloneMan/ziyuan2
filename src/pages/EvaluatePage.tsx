import { useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Upload, FileText, BarChart3, Keyboard, CheckCircle2, XCircle,
  Loader2, Trash2, ClipboardCopy, Download, AlertTriangle, Activity,
  Award, Zap, Info, TrendingUp, Target, Gauge, Flame,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { charCodeData } from '@/data/charCodeData';
import { calculateCoverage } from '@/data/builtinCharSets';

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

// 字频权重（简化版，基于通用字频表）
const CHAR_FREQ: Record<string, number> = {};
const FREQ_CHARS = '的一是不了在人有我这为大来上个中到说出就以地和子产于多对然那最她着他本用时没学会可你自之后着过心加行所意想如美其前而因长又年已很被情却无何要此实还点让从现动方见主呢么应些把向事里给再经才二相去机同种面当没样关思次外话更或由打与比名明知身化物等合手回开问两间内什特因日边将果度信许部原安表接且使各立正真便教产四解条气十性目头色代入先重光白王电高公金之场分将法海门西家路东位得非选器请已活决反指九变张八认极七论确保交五若布求治转术平做六清任利受南权制据程即达式造具师界写亚象数较存德画测该证视专述台离复必管则万总断义周报际建集温计导读劳倒强党费广社配响完展求品般策质众往海技类精消称欲坚层属快判素参组据距织压讲群密态异府编获短远站移境略标致源';
for (let i = 0; i < FREQ_CHARS.length; i++) {
  CHAR_FREQ[FREQ_CHARS[i]] = Math.max(0.1, 100 - i * 0.15);
}

// 字频分段
const FREQ_TIERS = [
  { key: 'top500', label: '前500字', max: 500 },
  { key: 'top1000', label: '前1000字', max: 1000 },
  { key: 'top1500', label: '前1500字', max: 1500 },
  { key: 'top3000', label: '前3000字', max: 3000 },
  { key: 'top5000', label: '前5000字', max: 5000 },
  { key: 'all', label: '全部', max: Infinity },
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

  // 核心指标（新）
  weightedAvgCodeLen: number;    // 字频加权平均码长
  fullDupRate: number;           // 全码重码率
  simplifiedDupRate: number;     // 出简重码率
  selectionRate: number;         // 选重率（键选率）
  equivalent: number;            // 当量
  compositeScore: number;        // 综合评分

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
  efficiencyScore: number;
  ergonomicsScore: number;
  balanceScore: number;

  // 详细数据
  topDupes: Array<{ code: string; chars: string[]; count: number }>;
  freqTierStats: Array<{
    tier: string;
    charCount: number;
    dupRate: number;
    avgCodeLen: number;
    weightedCodeLen: number;
  }>;
  codeLenChartData: Array<{ name: string; count: number; percent: number }>;
  fingerChartData: Array<{ name: string; value: number; percent: number }>;
}

// ========================================
// 工具函数
// ========================================

function getCharFrequencyWeight(char: string): number {
  if (CHAR_FREQ[char]) return CHAR_FREQ[char];
  const cp = char.codePointAt(0) ?? 0;
  if (cp < 0x4E00 || cp > 0x9FFF) return 0.1;
  if (cp <= 0x61A5) return 1.0;
  if (cp <= 0x7FFF) return 0.6;
  return 0.3;
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

function evaluate(entries: CodeEntry[]): EvaluateResult {
  // 构建编码→字映射
  const codeToChars = new Map<string, string[]>();
  for (const entry of entries) {
    const existing = codeToChars.get(entry.code);
    if (existing) {
      if (!existing.includes(entry.char)) existing.push(entry.char);
    } else {
      codeToChars.set(entry.code, [entry.char]);
    }
  }

  // 基础统计
  const uniqueEntries = new Set(entries.map(e => `${e.char}|${e.code}`));
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

  for (const entry of entries) {
    const len = entry.code.length;
    codeLengthDist[len] = (codeLengthDist[len] || 0) + 1;
    totalLen += len;
    lengthValues.push(len);
    if (len > maxLen) maxLen = len;
    for (const k of entry.code.toLowerCase()) {
      if (/[a-z0-9]/.test(k)) keyFreq[k] = (keyFreq[k] || 0) + 1;
    }
  }

  const avgCodeLength = entries.length > 0 ? totalLen / entries.length : 0;
  const codeLengthStdDev = (() => {
    if (lengthValues.length === 0) return 0;
    const mean = lengthValues.reduce((a, b) => a + b, 0) / lengthValues.length;
    return Math.sqrt(lengthValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / lengthValues.length);
  })();

  // ★ 字频加权平均码长
  let weightedLenSum = 0, freqSum = 0;
  for (const entry of entries) {
    const freq = getCharFrequencyWeight(entry.char);
    weightedLenSum += freq * entry.code.length;
    freqSum += freq;
  }
  const weightedAvgCodeLen = freqSum > 0 ? weightedLenSum / freqSum : avgCodeLength;

  // ★ 全码重码率
  const fullDupRate = entries.length > 0 ? (dupCount / entries.length) * 100 : 0;

  // ★ 出简重码率（考虑简码后仍有重码的字数/总字数）
  // 简码：1-3码的编码视为简码，出简后这些字不再占用全码
  const simplifiedCodes = new Set<string>();
  for (const [code, chars] of codeToChars) {
    if (code.length <= 3 && chars.length >= 1) {
      simplifiedCodes.add(code);
    }
  }
  let simplifiedDupCount = 0;
  for (const [code, chars] of codeToChars) {
    if (chars.length > 1) {
      // 如果该编码的前缀是简码，则首字已通过简码输入，剩余字仍需选重
      const hasSimplifiedPrefix = code.length > 3 && (
        simplifiedCodes.has(code.slice(0, 1)) ||
        simplifiedCodes.has(code.slice(0, 2)) ||
        simplifiedCodes.has(code.slice(0, 3))
      );
      if (hasSimplifiedPrefix) {
        // 简码已出，全码重码中首字不再算重码
        simplifiedDupCount += chars.length - 1;
      } else {
        simplifiedDupCount += chars.length - 1;
      }
    }
  }
  const simplifiedDupRate = entries.length > 0 ? (simplifiedDupCount / entries.length) * 100 : 0;

  // ★ 选重率（键选率）= Σ(重码组中非首字的字频) / Σ(所有字频)
  let selectionFreqSum = 0;
  for (const [, chars] of codeToChars) {
    if (chars.length > 1) {
      // 非首字（需要选键的字）的字频之和
      for (let i = 1; i < chars.length; i++) {
        selectionFreqSum += getCharFrequencyWeight(chars[i]);
      }
    }
  }
  const selectionRate = freqSum > 0 ? (selectionFreqSum / freqSum) * 100 : 0;

  // ★ 当量 = 平均码长 × (1 + 选重率/100)
  const equivalent = weightedAvgCodeLen * (1 + selectionRate / 100);

  // ★ 综合评分（参考国标GB/T18031加权公式）
  // 各项得分 = max(0, 100 - (实际值 - 优秀值) / (较差值 - 优秀值) × 100)
  const calcScore = (val: number, excellent: number, poor: number, lowerBetter: boolean) => {
    if (lowerBetter) {
      if (val <= excellent) return 100;
      if (val >= poor) return 0;
      return Math.max(0, 100 - ((val - excellent) / (poor - excellent)) * 100);
    } else {
      if (val >= excellent) return 100;
      if (val <= poor) return 0;
      return Math.max(0, ((val - poor) / (excellent - poor)) * 100);
    }
  };

  const codeLenScore = calcScore(weightedAvgCodeLen, 2.5, 4.5, true);
  const dupScore = calcScore(fullDupRate, 3, 15, true);
  const selScore = calcScore(selectionRate, 2, 20, true);
  const equivScore = calcScore(equivalent, 2.5, 5.5, true);

  const compositeScore = Math.min(100, Math.max(0,
    40 * codeLenScore / 100 +
    30 * dupScore / 100 +
    20 * selScore / 100 +
    10 * equivScore / 100
  ));

  // 按键使用率
  const totalKeyPresses = Object.values(keyFreq).reduce((s, f) => s + f, 0);
  const keyUsageRate: Record<string, number> = {};
  for (const [key, freq] of Object.entries(keyFreq)) {
    keyUsageRate[key] = totalKeyPresses > 0 ? (freq / totalKeyPresses) * 100 : 0;
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
  const leftHandRate = totalKeyPresses > 0 ? (leftHandPresses / totalKeyPresses) * 100 : 50;
  const rightHandRate = totalKeyPresses > 0 ? (rightHandPresses / totalKeyPresses) * 100 : 50;

  // 同指连续和左右交替
  let sameFingerCount = 0, handAltCount = 0, totalBigrams = 0;
  for (const entry of entries) {
    const code = entry.code.toLowerCase();
    for (let i = 0; i < code.length - 1; i++) {
      const ck = code[i], nk = code[i + 1];
      if (!/[a-z]/.test(ck) || !/[a-z]/.test(nk)) continue;
      totalBigrams++;
      if (FINGER_MAP[ck] && FINGER_MAP[ck] === FINGER_MAP[nk]) sameFingerCount++;
      if ((LEFT_HAND_KEYS.has(ck) && RIGHT_HAND_KEYS.has(nk)) || (RIGHT_HAND_KEYS.has(ck) && LEFT_HAND_KEYS.has(nk))) handAltCount++;
    }
  }
  const sameFingerRate = totalBigrams > 0 ? (sameFingerCount / totalBigrams) * 100 : 0;
  const handAlternationRate = totalBigrams > 0 ? (handAltCount / totalBigrams) * 100 : 0;

  // 覆盖率
  const charSet = entries.map(e => e.char);
  const gb2312Chars = charSet.filter(ch => { const cp = ch.codePointAt(0) ?? 0; return cp >= 0x4E00 && cp <= 0x9FA5; }).length;
  const gbkChars = charSet.filter(ch => { const cp = ch.codePointAt(0) ?? 0; return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF); }).length;
  const gb2312Coverage = (gb2312Chars / 6763) * 100;
  const gbkCoverage = (gbkChars / 21003) * 100;

  // 效率和工学评分
  const balanceScore = Math.max(0, 100 - Math.abs(leftHandRate - 50) * 2);
  const efficiencyScore = Math.max(0, Math.min(100,
    0.42 * (1 - fullDupRate / 100) * 100 +
    0.35 * (1 - avgCodeLength / 4) * 100 +
    0.15 * balanceScore +
    0.08 * (100 - sameFingerRate)
  ));
  const ergonomicsScore = Math.max(0, Math.min(100,
    100 - sameFingerRate * 1.5 + handAlternationRate * 0.3 -
    Math.abs(leftHandRate - 50) * 0.8
  ));

  // 字频分段统计
  const freqTierStats = FREQ_TIERS.map(tier => {
    const tierEntries = tier.max === Infinity ? entries : entries.slice(0, tier.max);
    const tierCodeMap = new Map<string, string[]>();
    for (const e of tierEntries) {
      const existing = tierCodeMap.get(e.code);
      if (existing) { if (!existing.includes(e.char)) existing.push(e.char); }
      else tierCodeMap.set(e.code, [e.char]);
    }
    let tierDup = 0;
    for (const [, chars] of tierCodeMap) { if (chars.length > 1) tierDup += chars.length - 1; }
    const tierDupRate = tierEntries.length > 0 ? (tierDup / tierEntries.length) * 100 : 0;
    let tierLenSum = 0, tierFreqSum = 0, tierWeightedLen = 0;
    for (const e of tierEntries) {
      tierLenSum += e.code.length;
      const f = getCharFrequencyWeight(e.char);
      tierFreqSum += f;
      tierWeightedLen += f * e.code.length;
    }
    return {
      tier: tier.label,
      charCount: tierEntries.length,
      dupRate: tierDupRate,
      avgCodeLen: tierEntries.length > 0 ? tierLenSum / tierEntries.length : 0,
      weightedCodeLen: tierFreqSum > 0 ? tierWeightedLen / tierFreqSum : 0,
    };
  });

  // 码长分布图表数据
  const codeLenChartData = Object.entries(codeLengthDist)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([len, count]) => ({
      name: `${len}码`,
      count,
      percent: entries.length > 0 ? (count / entries.length) * 100 : 0,
    }));

  // 手指分布图表数据
  const totalFingerLoad = Object.values(fingerLoad).reduce((s, v) => s + v, 0);
  const fingerChartData = Object.entries(fingerLoad)
    .map(([name, value]) => ({
      name,
      value,
      percent: totalFingerLoad > 0 ? (value / totalFingerLoad) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalChars: entries.length,
    totalCodes: codeToChars.size,
    uniqueCodes: uniqueEntries.size,
    duplicateCount: dupCount,
    weightedAvgCodeLen,
    fullDupRate,
    simplifiedDupRate,
    selectionRate,
    equivalent,
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
    efficiencyScore,
    ergonomicsScore,
    balanceScore,
    topDupes: dupeList.slice(0, 30),
    freqTierStats,
    codeLenChartData,
    fingerChartData,
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
  } | null>(null);
  const [useBuiltin, setUseBuiltin] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // 预置方案一键测评
  const handleBuiltinEvaluate = useCallback(() => {
    setUseBuiltin(true);
    setParsing(true);
    setParseProgress(0);
    setError('');
    setResult(null);
    setFileName('字源131方案（内置）');

    setTimeout(() => {
      const entries: CodeEntry[] = charCodeData.map(d => ({ char: d.char, code: d.code }));
      setRawEntries(entries);
      setParseProgress(50);

      setTimeout(() => {
        const res = evaluate(entries);
        setParseProgress(100);
        setResult(res);
        setParsing(false);

        try {
          const singleChars = entries.filter(e => e.char.length === 1).map(e => e.char);
          setCharCoverage({
            gb2312: calculateCoverage(singleChars, 'gb2312'),
            gbk: calculateCoverage(singleChars, 'gbk'),
          });
        } catch {}
      }, 50);
    }, 100);
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
        setParseProgress(50);

        setTimeout(() => {
          const res = evaluate(entries);
          setParseProgress(100);
          setResult(res);
          setParsing(false);

          try {
            const singleChars = entries.filter(e => e.char.length === 1).map(e => e.char);
            setCharCoverage({
              gb2312: calculateCoverage(singleChars, 'gb2312'),
              gbk: calculateCoverage(singleChars, 'gbk'),
            });
          } catch {}
        }, 50);
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
    } catch {} finally { setExportingImage(false); }
  };

  // 复制报告
  const copyResult = () => {
    if (!result) return;
    const lines = [
      `码表测评结果 - ${fileName}`,
      `总字数: ${result.totalChars}`,
      `字频加权码长: ${result.weightedAvgCodeLen.toFixed(3)}`,
      `全码重码率: ${result.fullDupRate.toFixed(2)}%`,
      `出简重码率: ${result.simplifiedDupRate.toFixed(2)}%`,
      `选重率: ${result.selectionRate.toFixed(2)}%`,
      `当量: ${result.equivalent.toFixed(3)}`,
      `综合评分: ${result.compositeScore.toFixed(1)}/100`,
      `GB2312覆盖率: ${result.gb2312Coverage.toFixed(1)}%`,
      `GBK覆盖率: ${result.gbkCoverage.toFixed(1)}%`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const maxKeyFreq = useMemo(() => {
    if (!result || !result.keyFreq) return 1;
    return Math.max(...Object.values(result.keyFreq), 1);
  }, [result]);

  const getHeatColor = useCallback((freq: number) => {
    const ratio = freq / maxKeyFreq;
    if (ratio === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500';
    if (ratio < 0.1) return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300';
    if (ratio < 0.2) return 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200';
    if (ratio < 0.35) return 'bg-cyan-200 dark:bg-cyan-800/60 text-cyan-900 dark:text-cyan-100';
    if (ratio < 0.5) return 'bg-blue-300 dark:bg-blue-700 text-blue-900 dark:text-blue-100';
    if (ratio < 0.65) return 'bg-indigo-400 dark:bg-indigo-600 text-white';
    if (ratio < 0.8) return 'bg-violet-500 dark:bg-violet-600 text-white';
    return 'bg-purple-600 dark:bg-purple-700 text-white';
  }, [maxKeyFreq]);

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
                <Button variant="outline" size="sm" onClick={copyResult} className="gap-1.5">
                  <ClipboardCopy className="h-3.5 w-3.5" />复制报告
                </Button>
                <Button variant="outline" size="sm" onClick={exportAsImage} disabled={exportingImage} className="gap-1.5">
                  {exportingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {exportingImage ? '导出中...' : '导出图片'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setResult(null); setFileName(''); setRawEntries([]); setError(''); setUseBuiltin(false); }} className="gap-1.5 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />重新测评
                </Button>
              </div>
            )}
          </div>

          {!result && !parsing && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* 文件上传 */}
              <Card className="lg:col-span-2 border-dashed border-2 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div
                    className="flex flex-col items-center justify-center cursor-pointer py-6"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('evaluate-file-input')?.click()}
                  >
                    <input id="evaluate-file-input" type="file" accept=".txt,.mb,.csv,.yaml,.dict.yaml,.enc,.dat" onChange={handleInput} className="hidden" />
                    <Upload className="mb-3 h-12 w-12 text-muted-foreground/60" />
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
                  <p className="text-sm text-muted-foreground mb-4">使用当前字源131方案码表<br/>一键查看测评结果</p>
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

          {/* 6个核心评分卡片 */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              title="选重率"
              value={result.selectionRate.toFixed(2)}
              unit="%"
              reference="< 2% 优秀"
              progress={Math.max(0, Math.min(100, (1 - result.selectionRate / 20) * 100))}
              score={(() => {
                if (result.selectionRate < 2) return 100;
                if (result.selectionRate < 5) return 80;
                if (result.selectionRate < 10) return 55;
                return 30;
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

          {/* 字符集覆盖率 */}
          {charCoverage && (
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn(
                "px-6 py-3",
                (charCoverage.gb2312.percentage < 90 || charCoverage.gbk.percentage < 70)
                  ? "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
                  : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
              )}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-white" />
                  <h3 className="text-base font-bold text-white">字符集覆盖率检测</h3>
                  {(charCoverage.gb2312.percentage < 90 || charCoverage.gbk.percentage < 70) ? (
                    <Badge className="bg-white/20 text-white border-white/30">需关注</Badge>
                  ) : (
                    <Badge className="bg-white/20 text-white border-white/30">达标</Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CoverageBar label="GB2312" total={charCoverage.gb2312.total} covered={charCoverage.gb2312.covered} percentage={charCoverage.gb2312.percentage} missing={charCoverage.gb2312.missing} />
                  <CoverageBar label="GBK" total={charCoverage.gbk.total} covered={charCoverage.gbk.covered} percentage={charCoverage.gbk.percentage} missing={charCoverage.gbk.missing} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== C. 详细统计区（Tab标签页） ===== */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="dup" className="w-full">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="dup" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />重码分析</TabsTrigger>
                  <TabsTrigger value="codelen" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />码长分布</TabsTrigger>
                  <TabsTrigger value="keyboard" className="gap-1.5"><Keyboard className="h-3.5 w-3.5" />按键分析</TabsTrigger>
                  <TabsTrigger value="freq" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />字频分析</TabsTrigger>
                </TabsList>

                {/* Tab1: 重码分析 */}
                <TabsContent value="dup" className="mt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">按字频段统计重码</h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-3 py-2.5 text-left font-semibold">字频段</th>
                          <th className="px-3 py-2.5 text-center font-semibold">字数</th>
                          <th className="px-3 py-2.5 text-center font-semibold">重码率</th>
                          <th className="px-3 py-2.5 text-center font-semibold">平均码长</th>
                          <th className="px-3 py-2.5 text-center font-semibold">加权码长</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.freqTierStats.map((stat) => (
                          <tr key={stat.tier} className="border-b border-border hover:bg-accent/5">
                            <td className="px-3 py-2 font-medium text-foreground">{stat.tier}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{stat.charCount.toLocaleString()}</td>
                            <td className={cn('px-3 py-2 text-center tabular-nums font-semibold', stat.dupRate < 5 ? 'text-emerald-600 dark:text-emerald-400' : stat.dupRate < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                              {stat.dupRate.toFixed(2)}%
                            </td>
                            <td className="px-3 py-2 text-center tabular-nums">{stat.avgCodeLen.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{stat.weightedCodeLen.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="text-sm font-semibold text-foreground mt-4">Top 重码编码（前30）</h4>
                  {result.topDupes.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-4">
                      <CheckCircle2 className="h-4 w-4" />无重码
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {result.topDupes.map((dupe, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-accent/5">
                          <Badge variant="outline" className="shrink-0 font-mono text-xs">{dupe.code}</Badge>
                          <span className="text-foreground">{dupe.chars.join(' ')}</span>
                          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">{dupe.count}字</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab2: 码长分布 */}
                <TabsContent value="codelen" className="mt-4 space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* 柱状图 */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">码长分布柱状图</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.codeLenChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value: number) => [value.toLocaleString(), '字数']}
                              contentStyle={{ fontSize: 12 }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {result.codeLenChartData.map((_, index) => (
                                <Cell key={index} fill={['#3b82f6','#6366f1','#8b5cf6','#a855f7','#c026d3'][index % 5]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {/* 表格 */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">码长分布详情</h4>
                      <div className="space-y-2">
                        {result.codeLenChartData.map((item) => (
                          <div key={item.name} className="flex items-center gap-3">
                            <span className="w-10 text-sm font-medium text-foreground">{item.name}</span>
                            <div className="flex-1 h-5 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.percent}%` }} />
                            </div>
                            <span className="w-24 text-right text-sm tabular-nums text-muted-foreground">
                              {item.count.toLocaleString()} ({item.percent.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">平均码长</span><span className="font-semibold tabular-nums">{result.avgCodeLength.toFixed(3)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">字频加权码长</span><span className="font-semibold tabular-nums">{result.weightedAvgCodeLen.toFixed(3)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">最大码长</span><span className="font-semibold tabular-nums">{result.maxCodeLength}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">标准差</span><span className="font-semibold tabular-nums">{result.codeLengthStdDev.toFixed(3)}</span></div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab3: 按键分析 */}
                <TabsContent value="keyboard" className="mt-4 space-y-4">
                  {/* 键盘热力图 */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">26键使用频率热力图</h4>
                    <div className="flex flex-col items-center gap-2">
                      {KEYBOARD_ROWS.map((row, ri) => (
                        <div key={ri} className="flex gap-1.5" style={{ paddingLeft: ri === 1 ? '20px' : ri === 2 ? '36px' : '0' }}>
                          {row.map((key) => {
                            const freq = result.keyFreq[key] || 0;
                            const rate = result.keyUsageRate[key] || 0;
                            const heatClass = getHeatColor(freq);
                            return (
                              <div
                                key={key}
                                className={cn(
                                  'relative flex h-12 w-12 flex-col items-center justify-center rounded-lg text-sm font-mono font-semibold border border-border/50 transition-all shadow-sm',
                                  heatClass,
                                  freq === 0 && 'opacity-30'
                                )}
                                title={`${key.toUpperCase()}: ${freq.toLocaleString()}次 (${rate.toFixed(1)}%)`}
                              >
                                <span className="text-lg font-bold leading-none">{key.toUpperCase()}</span>
                                {freq > 0 && (
                                  <span className="text-[9px] leading-tight font-sans font-bold tabular-nums mt-0.5">
                                    {freq >= 1000 ? `${(freq/1000).toFixed(1)}k` : freq}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 左右手+手指分布 */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">左右手使用比例</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                          <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{result.leftHandRate.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground mt-1">左手</div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                          <div className="text-2xl font-bold tabular-nums text-purple-700 dark:text-purple-300">{result.rightHandRate.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground mt-1">右手</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                          Math.abs(result.leftHandRate - 50) <= 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        )}>
                          {Math.abs(result.leftHandRate - 50) <= 10 ? '平衡良好' : '轻微偏重'}
                          ({Math.abs(result.leftHandRate - 50).toFixed(1)}%偏差)
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">各手指负担分布</h4>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.fingerChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
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
                  </div>
                </TabsContent>

                {/* Tab4: 字频分析 */}
                <TabsContent value="freq" className="mt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">按字频排名分段统计</h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-3 py-2.5 text-left font-semibold">字频段</th>
                          <th className="px-3 py-2.5 text-center font-semibold">字数</th>
                          <th className="px-3 py-2.5 text-center font-semibold">重码率</th>
                          <th className="px-3 py-2.5 text-center font-semibold">平均码长</th>
                          <th className="px-3 py-2.5 text-center font-semibold">加权码长</th>
                          <th className="px-3 py-2.5 text-center font-semibold">编码效率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.freqTierStats.map((stat) => {
                          const efficiency = stat.weightedCodeLen > 0 ? Math.min(100, (2 / stat.weightedCodeLen) * 100) : 0;
                          return (
                            <tr key={stat.tier} className="border-b border-border hover:bg-accent/5">
                              <td className="px-3 py-2 font-medium text-foreground">{stat.tier}</td>
                              <td className="px-3 py-2 text-center tabular-nums">{stat.charCount.toLocaleString()}</td>
                              <td className={cn('px-3 py-2 text-center tabular-nums font-semibold', stat.dupRate < 5 ? 'text-emerald-600 dark:text-emerald-400' : stat.dupRate < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                                {stat.dupRate.toFixed(2)}%
                              </td>
                              <td className="px-3 py-2 text-center tabular-nums">{stat.avgCodeLen.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center tabular-nums">{stat.weightedCodeLen.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                                    <div className={cn('h-full rounded-full', efficiency > 70 ? 'bg-emerald-500' : efficiency > 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${efficiency}%` }} />
                                  </div>
                                  <span className="text-xs tabular-nums text-muted-foreground">{efficiency.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ===== D. 底部汇总表 ===== */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />完整统计指标汇总
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
                        { name: '全码重码率', value: `${result.fullDupRate.toFixed(2)}%`, score: result.fullDupRate < 5 ? 90 : result.fullDupRate < 10 ? 65 : 35 },
                        { name: '出简重码率', value: `${result.simplifiedDupRate.toFixed(2)}%`, score: result.simplifiedDupRate < 5 ? 90 : result.simplifiedDupRate < 10 ? 65 : 35 },
                        { name: '选重率', value: `${result.selectionRate.toFixed(2)}%`, score: result.selectionRate < 2 ? 95 : result.selectionRate < 5 ? 75 : 40 },
                        { name: '当量', value: result.equivalent.toFixed(3), score: result.equivalent < 1.5 ? 95 : result.equivalent < 2.5 ? 70 : 40 },
                        { name: '综合评分', value: `${result.compositeScore.toFixed(1)}/100`, score: result.compositeScore },
                      ]},
                      { category: '覆盖率', items: [
                        { name: 'GB2312覆盖率', value: `${result.gb2312Coverage.toFixed(1)}%`, score: result.gb2312Coverage >= 90 ? 90 : result.gb2312Coverage >= 70 ? 65 : 35 },
                        { name: 'GBK覆盖率', value: `${result.gbkCoverage.toFixed(1)}%`, score: result.gbkCoverage >= 70 ? 90 : result.gbkCoverage >= 50 ? 65 : 35 },
                      ]},
                      { category: '人体工学', items: [
                        { name: '同指连续率', value: `${result.sameFingerRate.toFixed(1)}%`, score: result.sameFingerRate < 15 ? 90 : result.sameFingerRate < 25 ? 65 : 35 },
                        { name: '左右手交替率', value: `${result.handAlternationRate.toFixed(1)}%`, score: result.handAlternationRate >= 40 ? 90 : result.handAlternationRate >= 30 ? 65 : 35 },
                        { name: '左手使用率', value: `${result.leftHandRate.toFixed(1)}%`, score: Math.abs(result.leftHandRate - 50) <= 5 ? 95 : Math.abs(result.leftHandRate - 50) <= 10 ? 75 : 50 },
                        { name: '右手使用率', value: `${result.rightHandRate.toFixed(1)}%`, score: -1 },
                        { name: '效率评分', value: result.efficiencyScore.toFixed(1), score: result.efficiencyScore },
                        { name: '工学评分', value: result.ergonomicsScore.toFixed(1), score: result.ergonomicsScore },
                        { name: '平衡评分', value: result.balanceScore.toFixed(1), score: result.balanceScore },
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
  const grade = getGrade(score);
  const colorMap: Record<string, { border: string; bg: string; iconBg: string; bar: string; barBg: string }> = {
    blue:    { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50/50 dark:bg-blue-950/20', iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', barBg: 'bg-blue-100 dark:bg-blue-900/40' },
    orange:  { border: 'border-orange-200 dark:border-orange-800', bg: 'bg-orange-50/50 dark:bg-orange-950/20', iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', bar: 'bg-orange-500', barBg: 'bg-orange-100 dark:bg-orange-900/40' },
    rose:    { border: 'border-rose-200 dark:border-rose-800', bg: 'bg-rose-50/50 dark:bg-rose-950/20', iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', barBg: 'bg-rose-100 dark:bg-rose-900/40' },
    amber:   { border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-50/50 dark:bg-amber-950/20', iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', barBg: 'bg-amber-100 dark:bg-amber-900/40' },
    violet:  { border: 'border-violet-200 dark:border-violet-800', bg: 'bg-violet-50/50 dark:bg-violet-950/20', iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', barBg: 'bg-violet-100 dark:bg-violet-900/40' },
    emerald: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', barBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  };
  const c = colorMap[colorScheme] || colorMap.blue;

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all hover:shadow-md',
      c.border, c.bg,
      highlight && 'ring-2 ring-emerald-500/30'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.iconBg)}>{icon}</div>
        <span className="text-xs font-medium text-muted-foreground truncate">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={cn('text-2xl font-bold tabular-nums', highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <div className={cn('w-full h-2 rounded-full overflow-hidden mb-2', c.barBg)}>
        <div className={cn('h-full rounded-full transition-all duration-700', c.bar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{reference}</span>
        {getGradeBadge(score)}
      </div>
    </div>
  );
}

function CoverageBar({ label, total, covered, percentage, missing }: {
  label: string; total: number; covered: number; percentage: number; missing: string[];
}) {
  const color = percentage >= 90 ? 'emerald' : percentage >= 70 ? 'amber' : 'red';
  return (
    <div className={cn(
      'p-4 rounded-xl border-2',
      color === 'emerald' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700' :
      color === 'amber' ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-700' :
      'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-700'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-bold text-foreground">{label}字符集</h4>
          <p className="text-xs text-muted-foreground">{total.toLocaleString()}字</p>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-xl font-black text-2xl tabular-nums text-white',
          color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
        )}>
          {percentage.toFixed(1)}%
        </div>
      </div>
      <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all', color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500')}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{covered.toLocaleString()} / {total.toLocaleString()}</span>
        {missing.length > 0 && percentage < 100 && (
          <span className="text-red-500 dark:text-red-400">缺{missing.length}字</span>
        )}
      </div>
    </div>
  );
}