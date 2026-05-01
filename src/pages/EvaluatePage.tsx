import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  BarChart3,
  Keyboard,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  ClipboardCopy,
  History,
  TrendingUp,
  AlertTriangle,
  Activity,
  Download,
} from 'lucide-react';
import html2canvas from 'html2canvas';

const KEYBOARD_ROWS: string[][] = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  [' ', '', '', '', '', '', '', '', '', '', '', '', ''],
];

const STANDARD_WORD_FREQ: Record<string, number> = {
  '的': 100, '是': 99, '不': 98, '了': 97, '在': 96, '有': 95, '和': 94, '人': 93,
  '这': 92, '中': 91, '大': 90, '为': 89, '上': 88, '个': 87, '国': 86, '我': 85,
  '以': 84, '要': 83, '他': 82, '时': 81, '来': 80, '用': 79, '们': 78, '生': 77,
  '到': 76, '作': 75, '地': 74, '于': 73, '出': 72, '就': 71, '分': 70, '对': 69,
  '成': 68, '会': 67, '可': 66, '主': 65, '发': 64, '年': 63, '动': 62, '同': 61,
  '工': 60, '也': 59, '能': 58, '下': 57, '过': 56, '子': 55, '说': 54, '产': 53,
  '种': 52, '面': 51, '而': 50, '方': 49, '后': 48, '多': 47, '定': 46, '行': 45,
  '学': 44, '法': 43, '所': 42, '民': 41, '得': 40, '经': 39, '十三': 38, '进': 37,
  '着': 36, '部': 35, '等': 34, '度': 33, '现': 32, '代': 31, '理': 30, '化': 29,
  '从': 28, '业': 27, '当': 26, '起': 25, '与': 24, '加': 23, '新': 22, '力': 21,
  '本': 20, '电': 19, '高': 18, '量': 17, '长': 16, '党': 15, '实': 14, '家': 13,
  '命': 12, '入': 11, '全': 10, '最': 9, '然': 8, '前': 7, '已': 6, '无': 5,
  '日': 4, '机': 3, '开': 2, '但': 1,
};

const WORD_FREQ_TIERS = {
  'high5000': { label: '高频5000词', desc: '覆盖日常用词85%+', maxRank: 5000 },
  'common15000': { label: '常用15000词', desc: '覆盖日常用词95%+', maxRank: 15000 },
  'full30000': { label: '全量30000词', desc: '接近全覆盖', maxRank: 30000 },
  'all': { label: '全部词组', desc: '码表全部词组', maxRank: Infinity },
};

const LEFT_HAND_KEYS = new Set(['q','w','e','r','t','a','s','d','f','g','z','x','c','v','b']);
const RIGHT_HAND_KEYS = new Set(['y','u','i','o','p','h','j','k','l','n','m']);

const FINGER_MAP: Record<string, string> = {
  'q': '小指', 'a': '小指', 'z': '小指',
  'w': '无名指', 's': '无名指', 'x': '无名指',
  'e': '中指', 'd': '中指', 'c': '中指',
  'r': '食指', 'f': '食指', 'v': '食指',
  't': '食指', 'g': '食指', 'b': '食指',
  'y': '食指', 'h': '食指', 'n': '食指',
  'u': '中指', 'j': '中指', 'm': '中指',
  'i': '无名指', 'k': '无名指', ',': '无名指',
  'o': '小指', 'l': '小指', '.': '小指',
  'p': '小指', ';': '小指', "'": '小指',
  ' ': '大拇指',
};

interface CodeEntry {
  char: string;
  code: string;
}

interface EvaluateResult {
  totalChars: number;
  totalCodes: number;
  uniqueCodes: number;
  duplicateCount: number;
  duplicateRate: number;
  dynamicDuplicateRate: number;
  avgCodeLength: number;
  maxCodeLength: number;
  codeLengthStdDev: number;
  codeLengthDist: Record<number, number>;
  keyFreq: Record<string, number>;
  strokeCoverage: Record<string, { count: number; rate: number }>;
  topDupes: Array<{ code: string; chars: string[]; count: number }>;
  keyUsageRate: Record<string, number>;
  leftHandRate: number;
  rightHandRate: number;
  fingerLoad: Record<string, number>;
  efficiencyScore: number;
  coverageGrade: string;
  balanceScore: number;
  ergonomicsScore: number;
  sameFingerRate: number;
  handAlternationRate: number;
  gb2312Coverage: number;
  gbkCoverage: number;
  selectionWeight: number;
  weightedAvgLength: number;
  crossRowLargeJump: number;
  crossRowSmallJump: number;
  sameKeyTriple: number;
  sameKeyQuad: number;
  sameFingerTriple: number;
  sameFingerQuad: number;
  pinkyInterference: number;
}

interface HistoryRecord {
  id: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
  result: EvaluateResult;
  rawContent?: string;
  isPK?: boolean;
  fileName2?: string;
  result2?: EvaluateResult;
  rawContent2?: string;
}

function getCharFrequencyWeight(char: string): number {
  const cp = char.codePointAt(0) ?? 0;
  if (cp < 0x4E00 || cp > 0x9FFF) return 0.1;
  const commonChars = '的一是不了在人有我这为大来上个中到说出就以地和子产于多对然那最她着他本用时没学会可你自之后着过心加行所意想如美其前而因长又年已很被情却无何要此实还点让从现动方见主呢么应些把向事里给再经才二相去机同但种面当没样关思次外话更或由打与比名明知身化物等合手回开问两间内什特因日边将果度信许部原安表接且使各立正真便教产四解条气十性目头色代入先重光白王电高公金之场分将法海门西家路东位得非选器请已活决反指九变张八认极七论确保交五若布求治转术平做六清任利受南权制据程即达式造具师界写亚象数较存德画测该证视专述台离复必管则万总断义周报际建集温计导读劳倒强党费广社配响完展求品般策质众往海技类精消称欲坚层属快判素参组据距织压讲群密态异府编获短远站移境略标致源尼例史萨丹灵察约刘陈杨黄赵吴郑王孙李周吴郑冯褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴胥能苍双闻莘党翟谭贡劳申扶堵冉宰郦雍卻璩桑桂濮牛寿通边扈燕冀郏尚农温别庄晏柴瞿阎充慕连茹习宦鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公仉督晋楚闫法汝鄢涂钦岳帅缑亢况后有琴商牟佘佴伯赏墨哈谯笪年爱阳佟言福';
  const idx = commonChars.indexOf(char);
  if (idx >= 0 && idx < 100) return 5.0 - idx * 0.04;
  if (idx >= 100 && idx < 500) return 3.0 - (idx - 100) * 0.005;
  if (idx >= 500 && idx < 2000) return 1.5 - (idx - 500) * 0.0005;
  if (cp <= 0x61A5) return 1.0;
  if (cp <= 0x7FFF) return 0.6;
  return 0.3;
}

function getStrokeCount(char: string): number {
  const cp = char.codePointAt(0) ?? 0;

  if (cp >= 0x4E00 && cp <= 0x9FFF) {
    const strokeMap: Record<number, number> = {};
    const commonStrokes: [string, number][] = [
      ['一', 1], ['二', 2], ['三', 3], ['四', 5], ['五', 4], ['六', 4],
      ['七', 2], ['八', 2], ['九', 2], ['十', 2], ['百', 6], ['千', 3],
      ['人', 2], ['大', 3], ['小', 3], ['中', 4], ['日', 4], ['月', 4],
      ['水', 4], ['火', 4], ['山', 3], ['木', 4], ['金', 8], ['土', 3],
      ['天', 4], ['地', 6], ['风', 4], ['云', 4], ['雨', 8], ['电', 5],
      ['的', 8], ['是', 9], ['不', 4], ['了', 2], ['在', 6], ['有', 6],
      ['和', 8], ['这', 7], ['中', 4], ['大', 3], ['为', 4],
      ['上', 3], ['个', 3], ['国', 8], ['我', 7], ['以', 5], ['要', 9],
      ['他', 5], ['时', 7], ['来', 7], ['用', 5], ['们', 5], ['到', 8],
      ['生', 5], ['会', 6], ['作', 7], ['于', 3], ['对', 5], ['也', 3],
      ['方', 4], ['成', 6], ['多', 6], ['都', 10], ['后', 6], ['能', 10],
      ['说', 9], ['就', 12], ['年', 6], ['得', 11], ['可', 5], ['家', 10],
      ['自', 6], ['出', 5], ['那', 6], ['里', 7], ['你', 7], ['同', 6],
      ['学', 8], ['下', 3], ['看', 9], ['过', 6], ['主', 5], ['进', 7],
      ['把', 7], ['还', 7], ['从', 4], ['当', 6], ['没', 7], ['前', 9],
      ['开', 4], ['所', 8], ['面', 9], ['再', 6], ['最', 12], ['但', 7],
      ['新', 13], ['此', 6], ['因', 6], ['然', 12], ['想', 13], ['点', 9],
      ['其', 8], ['些', 8], ['现', 11], ['手', 4], ['去', 5], ['之', 3],
      ['两', 7], ['样', 10], ['长', 4], ['将', 10], ['关', 6], ['向', 6],
      ['题', 15], ['什', 4], ['么', 3], ['道', 12], ['认', 4],
      ['文', 4], ['共', 6], ['已', 3], ['使', 8], ['给', 9], '好' as [string, number],
      ['动', 6], ['打', 5], ['全', 6], ['被', 10], ['产', 6], ['化', 4],
      ['实', 8], ['种', 9], ['定', 8], ['情', 11], ['应', 7], ['心', 4],
      ['它', 5], ['又', 2], ['很', 9], ['第', 11], ['公', 4], ['或', 8],
      ['入', 2], ['加', 5], ['者', 8], ['名', 6], ['性', 8], ['高', 10],
      ['分', 4], ['能', 10], ['只', 5], ['四', 5], ['机', 6], ['重', 9],
      ['五', 4], ['民', 5], ['解', 13], ['决', 7], ['品', 9], ['起', 10],
      ['八', 2], ['六', 4], ['七', 2], ['十', 2], ['百', 6], ['千', 3],
      ['万', 3], ['零', 13], ['亿', 3], ['元', 4], ['角', 7], ['分', 4],
      ['东', 5], ['西', 6], ['南', 9], ['北', 5], ['左', 5], ['右', 5],
      ['前', 9], ['后', 6], ['内', 4], ['外', 5], ['里', 7], ['边', 5],
      ['身', 7], ['头', 5], ['眼', 11], ['耳', 6], ['口', 3], ['鼻', 14],
      ['足', 7], ['衣', 6], ['食', 9], ['住', 7], ['行', 6],
      ['红', 6], ['黄', 11], ['蓝', 13], ['绿', 11], ['白', 5], ['黑', 12],
      ['春', 9], ['夏', 10], ['秋', 9], ['冬', 5], ['花', 7], ['草', 9],
      ['树', 9], ['河', 8], ['海', 10], ['石', 5],
      ['父', 4], ['母', 5], ['兄', 5], ['弟', 7], ['姐', 8], ['妹', 8],
      ['儿', 2], ['女', 3], ['男', 7], ['老', 6], ['少', 4], ['青', 8],
    ];
    for (const [ch, strokes] of commonStrokes) {
      strokeMap[ch.codePointAt(0) ?? 0] = strokes;
    }
    return strokeMap[cp] ?? Math.floor((cp - 0x4E00) / 500) + 5;
  }

  if (cp >= 0x3400 && cp <= 0x4DBF) return Math.floor((cp - 0x3400) / 200) + 5;
  if (cp >= 0xF900 && cp <= 0xFAFF) return Math.floor((cp - 0xF900) / 100) + 5;
  if (cp >= 0x20000 && cp <= 0x2A6DF) return Math.floor((cp - 0x20000) / 1000) + 8;
  if (cp >= 0x2A700 && cp <= 0x2B73F) return Math.floor((cp - 0x2A700) / 500) + 10;

  return -1;
}

function parseCodeTable(content: string): CodeEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: CodeEntry[] = [];
  let formatDetected = '';
  const totalLines = lines.length;
  const CHUNK_SIZE = 5000;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith('...') && !formatDetected) {
      formatDetected = 'rime';
      continue;
    }

    if (trimmed.startsWith('---') || trimmed.startsWith('...')) {
      continue;
    }

    if (formatDetected !== 'rime' && (trimmed.startsWith(';') || trimmed.startsWith('//') || trimmed.startsWith('#'))) {
      continue;
    }

    if (i > 0 && i % CHUNK_SIZE === 0) {
      console.log(`解析进度: ${Math.min(i, totalLines)} / ${totalLines} (${((i / totalLines) * 100).toFixed(1)}%)`);
    }

    let match: RegExpMatchArray | null = null;

    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      if (parts.length >= 2) {
        const field1 = parts[0].trim();
        const field2 = parts[1].trim();

        if (/^[\da-z]+$/.test(field1)) {
          const field2Trimmed = field2.trim();
          if (field2Trimmed.length > 1 && /[\u4e00-\u9fff\u3400-\u4dbf]/.test(field2Trimmed)) {
            entries.push({ char: field2Trimmed, code: field1 });
          } else {
            for (const ch of field2) {
              if (ch.trim()) entries.push({ char: ch, code: field1 });
            }
          }
        } else if (/^[\da-z]+$/.test(field2)) {
          const field1Trimmed = field1.trim();
          if (field1Trimmed.length > 1 && /[\u4e00-\u9fff\u3400-\u4dbf]/.test(field1Trimmed)) {
            entries.push({ char: field1Trimmed, code: field2 });
          } else {
            for (const ch of field1) {
              if (ch.trim()) entries.push({ char: ch, code: field2 });
            }
          }
        } else {
          entries.push({ char: field1, code: field2 });
        }
        continue;
      }
    }

    match = trimmed.match(/^(\S+)\s+(\S+)$/);
    if (match) {
      const code = match[1].toLowerCase();
      const chars = match[2];
      if (/^[\da-z]+$/.test(code)) {
        if (chars.length > 1 && /[\u4e00-\u9fff\u3400-\u4dbf]/.test(chars)) {
          entries.push({ char: chars, code });
        } else {
          for (const ch of chars) {
            entries.push({ char: ch, code });
          }
        }
      } else {
        entries.push({ char: code, code: chars.toLowerCase() });
      }
      continue;
    }

    match = trimmed.match(/^(\S+)\s+(.+)$/);
    if (match) {
      const code = match[1].toLowerCase();
      const rest = match[2].trim();
      if (/^[\da-z]+$/.test(code)) {
        if (rest.length > 1 && /[\u4e00-\u9fff\u3400-\u4dbf]/.test(rest)) {
          entries.push({ char: rest, code });
        } else {
          for (const ch of rest) {
            if (ch.trim()) entries.push({ char: ch, code });
          }
        }
        continue;
      }
      const possibleCode = rest.split(/[\s,;]+/)[0]?.toLowerCase() ?? '';
      if (possibleCode && /^[\da-z]+$/.test(possibleCode)) {
        entries.push({ char: code, code: possibleCode });
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

  console.log(`✅ 解析完成: ${entries.length} 条目`);
  return entries.filter(e => e.char && e.code && e.code.length > 0);
}

function evaluate(entries: CodeEntry[]): EvaluateResult {
  const codeToChars = new Map<string, string[]>();
  for (const entry of entries) {
    const existing = codeToChars.get(entry.code);
    if (existing) {
      if (!existing.includes(entry.char)) existing.push(entry.char);
    } else {
      codeToChars.set(entry.code, [entry.char]);
    }
  }

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
    const aWeight = a.chars.reduce((sum, ch) => sum + getCharFrequencyWeight(ch), 0);
    const bWeight = b.chars.reduce((sum, ch) => sum + getCharFrequencyWeight(ch), 0);
    return (b.count * bWeight) - (a.count * aWeight);
  });

  const codeLengthDist: Record<number, number> = {};
  const keyFreq: Record<string, number> = {};
  let totalLen = 0;
  let maxLen = 0;
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
    const squareDiffs = lengthValues.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / lengthValues.length);
  })();

  const strokeGroups: Record<string, CodeEntry[]> = {};
  for (const entry of entries) {
    const s = getStrokeCount(entry.char);
    const key = s < 0 ? '其他' : s > 26 ? '26+' : String(s);
    if (!strokeGroups[key]) strokeGroups[key] = [];
    strokeGroups[key].push(entry);
  }

  const strokeCoverage: Record<string, { count: number; rate: number }> = {};
  for (let i = 1; i <= 26; i++) {
    const group = strokeGroups[String(i)] || [];
    strokeCoverage[String(i)] = { count: group.length, rate: entries.length > 0 ? group.length / entries.length * 100 : 0 };
  }
  const otherGroup = [...(strokeGroups['其他'] || []), ...(strokeGroups['26+'] || [])];
  if (otherGroup.length > 0) {
    strokeCoverage['其他'] = { count: otherGroup.length, rate: otherGroup.length / entries.length * 100 };
  }

  const totalKeyPresses = Object.values(keyFreq).reduce((sum, f) => sum + f, 0);

  const keyUsageRate: Record<string, number> = {};
  for (const [key, freq] of Object.entries(keyFreq)) {
    keyUsageRate[key] = totalKeyPresses > 0 ? (freq / totalKeyPresses) * 100 : 0;
  }

  let leftHandPresses = 0;
  let rightHandPresses = 0;
  const fingerLoad: Record<string, number> = {};

  for (const [key, freq] of Object.entries(keyFreq)) {
    if (LEFT_HAND_KEYS.has(key)) leftHandPresses += freq;
    if (RIGHT_HAND_KEYS.has(key)) rightHandPresses += freq;

    const finger = FINGER_MAP[key];
    if (finger) {
      fingerLoad[finger] = (fingerLoad[finger] || 0) + freq;
    }
  }

  const leftHandRate = totalKeyPresses > 0 ? (leftHandPresses / totalKeyPresses) * 100 : 50;
  const rightHandRate = totalKeyPresses > 0 ? (rightHandPresses / totalKeyPresses) * 100 : 50;

  const idealBalance = 50;
  const balanceScore = Math.max(0, 100 - Math.abs(leftHandRate - idealBalance) * 2);

  const variance = Object.values(fingerLoad).length > 0
    ? Object.values(fingerLoad).reduce((sum, load, _, arr) => {
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return sum + Math.pow(load - avg, 2);
      }, 0) / Object.values(fingerLoad).length
    : 0;
  const fingerBalanceScore = Math.max(0, 100 - Math.sqrt(variance) / 10);

  const coverageCount = Object.values(strokeCoverage).filter(s => s.count > 0).length;
  let coverageGrade = 'F';
  if (coverageCount >= 24) coverageGrade = 'A+';
  else if (coverageCount >= 22) coverageGrade = 'A';
  else if (coverageCount >= 20) coverageGrade = 'B+';
  else if (coverageCount >= 18) coverageGrade = 'B';
  else if (coverageCount >= 15) coverageGrade = 'C';
  else if (coverageCount >= 12) coverageGrade = 'D';

  const duplicateRate = entries.length > 0 ? dupCount / entries.length * 100 : 0;

  let sameFingerCount = 0;
  let handAlternationCount = 0;
  let totalBigrams = 0;

  for (const entry of entries) {
    const code = entry.code.toLowerCase();
    for (let i = 0; i < code.length - 1; i++) {
      const currentKey = code[i];
      const nextKey = code[i + 1];
      if (!/[a-z]/.test(currentKey) || !/[a-z]/.test(nextKey)) continue;

      totalBigrams++;
      const currentFinger = FINGER_MAP[currentKey];
      const nextFinger = FINGER_MAP[nextKey];

      if (currentFinger && nextFinger && currentFinger === nextFinger) {
        sameFingerCount++;
      }

      const currentIsLeft = LEFT_HAND_KEYS.has(currentKey);
      const nextIsRight = RIGHT_HAND_KEYS.has(nextKey);
      const currentIsRight = RIGHT_HAND_KEYS.has(currentKey);
      const nextIsLeft = LEFT_HAND_KEYS.has(nextKey);

      if ((currentIsLeft && nextIsRight) || (currentIsRight && nextIsLeft)) {
        handAlternationCount++;
      }
    }
  }

  const sameFingerRate = totalBigrams > 0 ? (sameFingerCount / totalBigrams) * 100 : 0;
  const handAlternationRate = totalBigrams > 0 ? (handAlternationCount / totalBigrams) * 100 : 0;

  let crossRowLargeJump = 0;
  let crossRowSmallJump = 0;
  let sameKeyTriple = 0;
  let sameKeyQuad = 0;
  let sameFingerTriple = 0;
  let sameFingerQuad = 0;
  let pinkyInterference = 0;

  for (const entry of entries) {
    const code = entry.code.toLowerCase();
    for (let i = 0; i < code.length - 1; i++) {
      const currentKey = code[i];
      const nextKey = code[i + 1];
      if (!/[a-z]/.test(currentKey) || !/[a-z]/.test(nextKey)) continue;

      const currentRow = KEYBOARD_ROWS.findIndex(row => row.includes(currentKey));
      const nextRow = KEYBOARD_ROWS.findIndex(row => row.includes(nextKey));

      if (currentRow !== -1 && nextRow !== -1) {
        const rowDiff = Math.abs(currentRow - nextRow);
        if (rowDiff >= 2) {
          crossRowLargeJump++;
        } else if (rowDiff === 1) {
          crossRowSmallJump++;
        }
      }

      if (i < code.length - 2) {
        const thirdKey = code[i + 2];
        if (/[a-z]/.test(thirdKey)) {
          if (currentKey === nextKey && nextKey === thirdKey) {
            sameKeyTriple++;
          }
          const currentFinger = FINGER_MAP[currentKey];
          const nextFinger = FINGER_MAP[nextKey];
          const thirdFinger = FINGER_MAP[thirdKey];
          if (currentFinger && currentFinger === nextFinger && nextFinger === thirdFinger) {
            sameFingerTriple++;
          }
        }
      }

      if (i < code.length - 3) {
        const fourthKey = code[i + 3];
        if (/[a-z]/.test(fourthKey)) {
          if (currentKey === nextKey && nextKey === code[i + 2] && code[i + 2] === fourthKey) {
            sameKeyQuad++;
          }
          const currentFinger = FINGER_MAP[currentKey];
          const fourthFinger = FINGER_MAP[fourthKey];
          if (currentFinger && currentFinger === FINGER_MAP[nextKey] &&
              currentFinger === FINGER_MAP[code[i + 2]] && currentFinger === fourthFinger) {
            sameFingerQuad++;
          }
        }
      }
    }

    const pinkyKeys = ['q', 'a', 'z', 'p', ';', '/'];
    for (const key of code.toLowerCase()) {
      if (pinkyKeys.includes(key)) {
        pinkyInterference++;
      }
    }
  }

  const selectionWeight = entries.reduce((sum, e) => {
    const chars = codeToChars.get(e.code);
    return sum + (chars && chars.length > 1 ? chars.length - 1 : 0);
  }, 0);

  const weightedAvgLength = entries.reduce((sum, e) => sum + e.code.length, 0) / entries.length;

  const ergonomicsScore = Math.max(0, Math.min(100,
    100 -
    sameFingerRate * 1.5 +
    handAlternationRate * 0.3 -
    Math.abs(leftHandRate - 50) * 0.8 -
    (fingerBalanceScore < 80 ? (80 - fingerBalanceScore) * 0.5 : 0)
  ));

  const charSet = entries.map(e => e.char);
  const gb2312Chars = charSet.filter(ch => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp >= 0x4E00 && cp <= 0x9FA5;
  }).length;
  const gbkChars = charSet.filter(ch => {
    const cp = ch.codePointAt(0) ?? 0;
    return (cp >= 0x4E00 && cp <= 0x9FFF) ||
      (cp >= 0x3400 && cp <= 0x4DBF) ||
      (cp >= 0xF900 && cp <= 0xFAFF) ||
      (cp >= 0x20000 && cp <= 0x2A6DF);
  }).length;
  const gb2312Coverage = 6763 > 0 ? (gb2312Chars / 6763) * 100 : 0;
  const gbkCoverage = 21003 > 0 ? (gbkChars / 21003) * 100 : 0;

  const dynamicDuplicateRate = (() => {
    const highFreqChars = new Set(['的', '一', '是', '不', '了', '在', '人', '有', '我', '他',
      '这', '为', '上', '个', '到', '说', '们', '来', '会', '时', '出', '大', '以']);
    let weightedDupes = 0;
    let totalWeight = 0;

    for (const [code, chars] of codeToChars) {
      if (chars.length > 1) {
        const weight = chars.filter(c => highFreqChars.has(c)).length;
        weightedDupes += weight * (chars.length - 1);
        totalWeight += weight;
      }
    }
    return totalWeight > 0 ? (weightedDupes / totalWeight) * 100 : duplicateRate * 0.8;
  })();

  const efficiencyScore = Math.max(0, Math.min(100,
    0.42 * (1 - duplicateRate / 100) * 100 +
    0.35 * (1 - avgCodeLength / 4) * 100 +
    0.15 * balanceScore +
    0.08 * (100 - sameFingerRate)
  ));

  return {
    totalChars: entries.length,
    totalCodes: codeToChars.size,
    uniqueCodes: uniqueEntries.size,
    duplicateCount: dupCount,
    duplicateRate,
    dynamicDuplicateRate,
    avgCodeLength,
    maxCodeLength: maxLen,
    codeLengthStdDev,
    codeLengthDist,
    keyFreq,
    strokeCoverage,
    topDupes: dupeList.slice(0, 20),
    keyUsageRate,
    leftHandRate,
    rightHandRate,
    fingerLoad,
    efficiencyScore,
    coverageGrade,
    balanceScore,
    ergonomicsScore,
    sameFingerRate,
    handAlternationRate,
    gb2312Coverage,
    gbkCoverage,
    selectionWeight,
    weightedAvgLength,
    crossRowLargeJump,
    crossRowSmallJump,
    sameKeyTriple,
    sameKeyQuad,
    sameFingerTriple,
    sameFingerQuad,
    pinkyInterference,
    maxKeyFreq: Math.max(...Object.values(keyFreq), 1),
  };
}

export default function EvaluatePage() {
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [rawEntries, setRawEntries] = useState<CodeEntry[]>([]);
  const [rawEntries2, setRawEntries2] = useState<CodeEntry[]>([]);
  const [exportingImage, setExportingImage] = useState(false);
  const [pkMode, setPkMode] = useState(false);
  const [result2, setResult2] = useState<EvaluateResult | null>(null);
  const [fileName2, setFileName2] = useState('');
  const [parsing2, setParsing2] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const [testMode, setTestMode] = useState<'char' | 'word'>('char');
  const [charRange, setCharRange] = useState('6000');
  const [wordRange, setWordRange] = useState<string>('high5000');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('evaluate-history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveToHistory = useCallback((fileName: string, fileSize: number, result: EvaluateResult, isPK?: boolean, fileName2?: string, result2?: EvaluateResult, rawContent?: string, rawContent2?: string) => {
    const optimizedResult: Partial<EvaluateResult> = {
      totalChars: result.totalChars,
      totalCodes: result.totalCodes,
      uniqueCodes: result.uniqueCodes,
      duplicateCount: result.duplicateCount,
      duplicateRate: result.duplicateRate,
      dynamicDuplicateRate: result.dynamicDuplicateRate,
      avgCodeLength: result.avgCodeLength,
      maxCodeLength: result.maxCodeLength,
      efficiencyScore: result.efficiencyScore,
      coverageGrade: result.coverageGrade,
      balanceScore: result.balanceScore,
      ergonomicsScore: result.ergonomicsScore,
      sameFingerRate: result.sameFingerRate,
      handAlternationRate: result.handAlternationRate,
      gb2312Coverage: result.gb2312Coverage,
      gbkCoverage: result.gbkCoverage,
      leftHandRate: result.leftHandRate,
      rightHandRate: result.rightHandRate,
    };

    let optimizedResult2: Partial<EvaluateResult> | undefined;
    if (isPK && result2) {
      optimizedResult2 = {
        totalChars: result2.totalChars,
        totalCodes: result2.totalCodes,
        uniqueCodes: result2.uniqueCodes,
        duplicateCount: result2.duplicateCount,
        duplicateRate: result2.duplicateRate,
        dynamicDuplicateRate: result2.dynamicDuplicateRate,
        avgCodeLength: result2.avgCodeLength,
        maxCodeLength: result2.maxCodeLength,
        efficiencyScore: result2.efficiencyScore,
        coverageGrade: result2.coverageGrade,
        balanceScore: result2.balanceScore,
        ergonomicsScore: result2.ergonomicsScore,
        sameFingerRate: result2.sameFingerRate,
        handAlternationRate: result2.handAlternationRate,
        gb2312Coverage: result2.gb2312Coverage,
        gbkCoverage: result2.gbkCoverage,
        leftHandRate: result2.leftHandRate,
        rightHandRate: result2.rightHandRate,
      };
    }

    const record: HistoryRecord = {
      id: Date.now().toString(),
      fileName,
      fileSize,
      timestamp: Date.now(),
      result: optimizedResult as EvaluateResult,
      ...(rawContent && { rawContent }),
      ...(isPK && { isPK: true, fileName2, result2: optimizedResult2 as EvaluateResult, ...(rawContent2 && { rawContent2 }) }),
    };

    setHistory(prev => {
      const filtered = prev.filter(item => item.fileName !== fileName);
      const updated = [record, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('evaluate-history', JSON.stringify(updated));
      } catch (e) {
        console.warn('保存历史记录失败，可能超出存储限制', e);
      }
      return updated;
    });
  }, []);

  const reEvaluate = useCallback(() => {
    if (rawEntries.length === 0) return;

    setParsing(true);
    setParseProgress(30);

    setTimeout(() => {
      const isWordMode = testMode === 'word';
      const wordTier = WORD_FREQ_TIERS[wordRange as keyof typeof WORD_FREQ_TIERS];
      const rangeLimit = isWordMode ? (wordTier?.maxRank ?? Infinity) : parseInt(charRange);

      let entries = [...rawEntries];

      if (isWordMode) {
        entries = entries.filter(e => e.char.length > 1);
        if (wordRange !== 'all' && wordTier) {
          entries = entries.slice(0, rangeLimit);
        }
      } else {
        entries = entries.filter(e => e.char.length === 1);
        if (charRange === 'gb2312') {
          entries = entries.filter(e => {
            const cp = e.char.codePointAt(0) ?? 0;
            return cp >= 0x4E00 && cp <= 0x9FA5;
          });
        } else if (charRange !== 'gbk') {
          entries = entries.slice(0, rangeLimit);
        }
      }

      console.log('=== 重新计算 ===');
      console.log('测试模式:', isWordMode ? '词组' : '单字');
      console.log('筛选后条目数:', entries.length);

      setParseProgress(70);

      setTimeout(() => {
        const res = evaluate(entries);
        setParseProgress(100);
        setResult(res);
        setParsing(false);
        
        // 如果在PK模式且有第二个码表数据，也重新计算第二个码表
        if (pkMode && rawEntries2.length > 0) {
          setParsing2(true);
          let entries2 = [...rawEntries2];
          
          if (isWordMode) {
            entries2 = entries2.filter(e => e.char.length > 1);
            if (wordRange !== 'all' && wordTier) {
              entries2 = entries2.slice(0, rangeLimit);
            }
          } else {
            entries2 = entries2.filter(e => e.char.length === 1);
            if (charRange === 'gb2312') {
              entries2 = entries2.filter(e => {
                const cp = e.char.codePointAt(0) ?? 0;
                return cp >= 0x4E00 && cp <= 0x9FA5;
              });
            } else if (charRange !== 'gbk') {
              entries2 = entries2.slice(0, rangeLimit);
            }
          }
          
          const res2 = evaluate(entries2);
          setResult2(res2);
          setParsing2(false);
        }
      }, 10);
    }, 50);
  }, [rawEntries, rawEntries2, pkMode, testMode, charRange, wordRange]);

  useEffect(() => {
    if (rawEntries.length > 0) {
      reEvaluate();
    }
  }, [testMode, charRange, wordRange]);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setParseProgress(0);
    setError('');
    setResult(null);
    setShowHistory(false);
    setFileName(file.name);
    setFileSize(file.size);

    try {
      const text = await file.text();
      setRawContent(text);
      setParseProgress(10);

      setTimeout(() => {
        let entries = parseCodeTable(text);
        if (entries.length === 0) {
          setError('未能解析出有效码表数据，请检查文件格式');
          setParsing(false);
          return;
        }

        setRawEntries(entries);
        setParseProgress(50);

        const isWordMode = testMode === 'word';
        const wordTier = WORD_FREQ_TIERS[wordRange as keyof typeof WORD_FREQ_TIERS];
        const rangeLimit = isWordMode ? (wordTier?.maxRank ?? Infinity) : parseInt(charRange);

        if (isWordMode) {
          entries = entries.filter(e => e.char.length > 1);
          if (wordRange !== 'all' && wordTier) {
            entries = entries.slice(0, rangeLimit);
          }
        } else {
          entries = entries.filter(e => e.char.length === 1);
          if (charRange === 'gb2312') {
            entries = entries.filter(e => {
              const cp = e.char.codePointAt(0) ?? 0;
              return cp >= 0x4E00 && cp <= 0x9FA5;
            });
          } else if (charRange !== 'gbk') {
            entries = entries.slice(0, rangeLimit);
          }
        }

        console.log('=== 码表解析调试 ===');
        console.log('测试模式:', isWordMode ? '词组' : '单字');
        console.log('范围限制:', rangeLimit);
        console.log('筛选后条目数:', entries.length);
        console.log('前10条:', entries.slice(0, 10));

        setParseProgress(70);

        setTimeout(() => {
          const res = evaluate(entries);
          setParseProgress(100);

          console.log('=== 测评结果调试 ===');
          console.log('keyFreq:', res.keyFreq);
          console.log('keyFreq keys:', Object.keys(res.keyFreq));
          console.log('totalKeyPresses:', Object.values(res.keyFreq).reduce((a, b) => a + b, 0));
          console.log('strokeCoverage:', res.strokeCoverage);
          console.log('fingerLoad:', res.fingerLoad);

          setResult(res);
          saveToHistory(file.name, file.size, res, undefined, undefined, undefined, text);
          setParsing(false);
        }, 10);
      }, 50);
    } catch {
      setError('文件读取失败');
      setParsing(false);
    }
  }, [saveToHistory, testMode, charRange, wordRange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFile2 = useCallback(async (file: File) => {
    setParsing2(true);
    setError('');
    setFileName2(file.name);

    try {
      const text = await file.text();
      let entries = parseCodeTable(text);

      if (entries.length === 0) {
        setError('未能解析出第二个码表数据');
        setParsing2(false);
        return;
      }

      setRawEntries2(entries);

      const isWordMode = testMode === 'word';
      const wordTier2 = WORD_FREQ_TIERS[wordRange as keyof typeof WORD_FREQ_TIERS];
      const rangeLimit = isWordMode ? (wordTier2?.maxRank ?? Infinity) : parseInt(charRange);

      if (isWordMode) {
        entries = entries.filter(e => e.char.length > 1);
        if (wordRange !== 'all' && wordTier2) {
          entries = entries.slice(0, rangeLimit);
        }
      } else {
        entries = entries.filter(e => e.char.length === 1);
        if (charRange === 'gb2312') {
          entries = entries.filter(e => {
            const cp = e.char.codePointAt(0) ?? 0;
            return cp >= 0x4E00 && cp <= 0x9FA5;
          });
        } else if (charRange !== 'gbk') {
          entries = entries.slice(0, rangeLimit);
        }
      }

      setTimeout(() => {
        const res = evaluate(entries);
        setResult2(res);
        setParsing2(false);
        if (result) {
          saveToHistory(fileName, fileSize, result, true, file.name, res, rawContent, text);
        }
      }, 50);
    } catch {
      setError('第二个文件读取失败');
      setParsing2(false);
    }
  }, [testMode, charRange, wordRange]);

  const handleInput2 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile2(file);
  }, [handleFile2]);

  const loadFromHistory = useCallback((record: HistoryRecord) => {
    setFileName(record.fileName);
    setFileSize(record.fileSize);

    if (record.rawContent) {
      const entries = parseCodeTable(record.rawContent);
      setRawEntries(entries);
      setRawContent(record.rawContent);
    } else {
      setRawEntries([]);
      setRawContent('');
    }

    if (record.isPK && record.result2 && record.fileName2) {
      setPkMode(true);
      setResult2(record.result2);
      setFileName2(record.fileName2);
      if (record.rawContent2) {
        const entries2 = parseCodeTable(record.rawContent2);
        setRawEntries2(entries2);
      } else {
        setRawEntries2([]);
      }
    } else {
      setPkMode(false);
      setResult2(null);
      setFileName2('');
      setRawEntries2([]);
    }
    setShowHistory(false);

    setTimeout(() => {
      reEvaluate();
    }, 100);
  }, [reEvaluate]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('evaluate-history');
    } catch {}
  }, []);

  const deleteHistoryRecord = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(record => record.id !== id);
      try {
        localStorage.setItem('evaluate-history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const maxKeyFreq = useMemo(() => {
    if (!result || !result.keyFreq) return 1;
    return Math.max(...Object.values(result.keyFreq), 1);
  }, [result]);

  const getHeatColor = useCallback((freq: number) => {
    const ratio = freq / maxKeyFreq;
    if (ratio === 0) return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-400 dark:text-slate-500', border: 'border-slate-200 dark:border-slate-700' };
    if (ratio < 0.05) return { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' };
    if (ratio < 0.1) return { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-800 dark:text-cyan-200', border: 'border-cyan-300 dark:border-cyan-700' };
    if (ratio < 0.2) return { bg: 'bg-cyan-200 dark:bg-cyan-800/60', text: 'text-cyan-900 dark:text-cyan-100', border: 'border-cyan-400 dark:border-cyan-600' };
    if (ratio < 0.35) return { bg: 'bg-blue-200 dark:bg-blue-900/60', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-300 dark:border-blue-700' };
    if (ratio < 0.5) return { bg: 'bg-blue-400 dark:bg-blue-700', text: 'text-white', border: 'border-blue-500' };
    if (ratio < 0.65) return { bg: 'bg-indigo-400 dark:bg-indigo-600', text: 'text-white', border: 'border-indigo-500' };
    if (ratio < 0.8) return { bg: 'bg-violet-500 dark:bg-violet-600', text: 'text-white', border: 'border-violet-500' };
    if (ratio < 0.95) return { bg: 'bg-purple-600 dark:bg-purple-700', text: 'text-white', border: 'border-purple-500' };
    return { bg: 'bg-fuchsia-700 dark:bg-fuchsia-800', text: 'text-white', border: 'border-fuchsia-600' };
  }, [maxKeyFreq]);

  const copyResult = () => {
    if (!result) return;
    const lines = [
      `字根测评结果`,
      `总字数: ${result.totalChars}`,
      `总编码数: ${result.totalCodes}`,
      `唯一编码: ${result.uniqueCodes}`,
      `重码字数: ${result.duplicateCount}`,
      `重码率: ${result.duplicateRate.toFixed(2)}%`,
      `平均码长: ${result.avgCodeLength.toFixed(2)}`,
      `最大码长: ${result.maxCodeLength}`,
      `效率评分: ${result.efficiencyScore.toFixed(1)}/100`,
      `覆盖率等级: ${result.coverageGrade}`,
      `左右手平衡: ${result.balanceScore.toFixed(1)}/100`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const exportAsImage = async () => {
    if (!resultRef.current || !result) return;
    
    setExportingImage(true);
    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement('a');
      link.download = `码表测评结果_${fileName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('导出图片失败:', err);
      setError('导出图片失败，请重试');
    } finally {
      setExportingImage(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧控制栏 */}
          <aside className="w-full lg:w-[320px] shrink-0 order-2 lg:order-1">
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* 标题 */}
              <div className="text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">码表测评</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">上传码表，自动分析32项专业指标</p>
              </div>

              {/* 使用说明与参数解释 */}
              <Card>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>📖 使用说明与参数解释</span>
                    <span className="text-xs">{showGuide ? '▼' : '▶'}</span>
                  </CardTitle>
                </CardHeader>
                {showGuide && (
                  <CardContent className="pt-0 space-y-3 text-sm">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1.5">📥 支持格式</h3>
                      <p className="text-xs text-muted-foreground">.txt / .mb / .csv / .yaml / .dat 等10+种，最大50MB</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1.5">🎯 测评模式</h3>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• 单字：前3000/6000字、GB2312、GBK全量</li>
                        <li>• 词组：前1万/3万/5万词组</li>
                        <li>• PK对比：双码表并排分析</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1.5">📊 核心指标</h3>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• 重码率（静态+动态加权）</li>
                        <li>• 码长分析（均值/标准差）</li>
                        <li>• 人体工学（指法负担/左右平衡）</li>
                        <li>• 效率评分 & 覆盖率等级</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1.5">✋ 手感指标</h3>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• 同指连续率（应&lt;20%）</li>
                        <li>• 左右手交替（应&gt;40%）</li>
                        <li>• 跨排大跳/同键连击</li>
                      </ul>
                    </div>
                    <div className="p-2 rounded bg-accent/10 border border-accent/20">
                      <p className="text-xs font-medium text-foreground">💡 评级参考：S≥90 · A 80-89 · B 70-79 · C 60-69 · D&lt;60</p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 测评模式选择 */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">测评模式</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTestMode('char')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          testMode === 'char'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        单字测评
                      </button>
                      <button
                        onClick={() => setTestMode('word')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          testMode === 'word'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        词组测评
                      </button>
                    </div>
                  </div>

                  {testMode === 'char' && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">单字范围</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { value: '3000', label: '前3000' },
                          { value: '6000', label: '前6000' },
                          { value: 'gb2312', label: 'GB2312' },
                          { value: 'gbk', label: 'GBK全量' },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => setCharRange(option.value)}
                            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              charRange === option.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {testMode === 'word' && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">词组范围（按词频等级）</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(WORD_FREQ_TIERS).map(([value, tier]) => (
                          <button
                            key={value}
                            onClick={() => setWordRange(value)}
                            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              wordRange === value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:bg-accent'
                            }`}
                            title={tier.desc}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        {WORD_FREQ_TIERS[wordRange as keyof typeof WORD_FREQ_TIERS]?.desc ?? ''}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkMode}
                        onChange={(e) => {
                          setPkMode(e.target.checked);
                          if (!e.target.checked) setResult2(null);
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-foreground">🆚 PK对比模式</span>
                    </label>
                  </div>

                  {rawEntries.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground">📊 总码表</span>
                        <span className="text-sm font-bold text-primary">{rawEntries.length.toLocaleString()} 条数据</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 上传码表 */}
              {!result && !parsing && (
                <Card className="border-dashed border-2 border-border bg-card/60 hover:border-primary/40 transition-colors">
                  <CardContent
                    className="flex flex-col items-center justify-center py-8 cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('evaluate-file-input')?.click()}
                  >
                    <input
                      id="evaluate-file-input"
                      type="file"
                      accept=".txt,.mb,.csv,.enc,.dict.yaml,.yaml,.txt,.dat"
                      onChange={handleInput}
                      className="hidden"
                    />
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground mb-1">点击或拖拽上传码表</p>
                    <p className="text-xs text-muted-foreground text-center">支持 .txt/.mb/.csv/.yaml 等格式</p>
                    {error && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" />
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* PK第二个码表上传 */}
              {pkMode && !result2 && !parsing2 && (
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors">
                  <CardContent
                    className="flex flex-col items-center justify-center py-6 cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFile2(file);
                    }}
                    onClick={() => document.getElementById('evaluate-file-input-2')?.click()}
                  >
                    <input
                      id="evaluate-file-input-2"
                      type="file"
                      accept=".txt,.mb,.csv,.enc,.dict.yaml,.yaml,.txt,.dat"
                      onChange={handleInput2}
                      className="hidden"
                    />
                    <Upload className="mb-2 h-8 w-8 text-primary/60" />
                    <p className="text-sm font-medium text-foreground">上传第二个码表PK</p>
                  </CardContent>
                </Card>
              )}

              {/* 历史记录 */}
              {history.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <History className="h-4 w-4" />历史记录 ({history.length})
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs text-muted-foreground hover:text-red-500 h-7 px-2">
                        清空
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {history.map(record => (
                        <div
                          key={record.id}
                          onClick={() => loadFromHistory(record)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/10 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {record.isPK && (
                                  <Badge variant="default" className="text-[9px] px-1 py-0 bg-orange-500 hover:bg-orange-600">PK</Badge>
                                )}
                                <span className="text-xs font-medium text-foreground truncate">{record.fileName}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {record.result.totalChars.toLocaleString()}字
                                {record.isPK && record.result2 && (
                                  <> vs {record.result2.totalChars.toLocaleString()}字</>
                                )}
                                {' · '}{formatTime(record.timestamp)}
                                {record.isPK && record.fileName2 && (
                                  <span className="ml-1 text-orange-600 dark:text-orange-400">· {record.fileName2}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{record.result.coverageGrade}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deleteHistoryRecord(record.id, e)}
                              className="h-6 w-6 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                              title="删除此记录"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>

          {/* 右侧主内容区 */}
          <main className="flex-1 min-w-0 order-1 lg:order-2 space-y-4 sm:space-y-6">
            {/* 操作按钮栏 - 仅在有结果时显示 */}
            {(parsing || result) && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {parsing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                  <div>
                    <span className="font-medium text-foreground">{fileName}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({(fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {result && (
                    <Button variant="outline" size="sm" onClick={copyResult} className="gap-1.5">
                      <ClipboardCopy className="h-3.5 w-3.5" />复制报告
                    </Button>
                  )}
                  {result && (
                    <Button variant="outline" size="sm" onClick={exportAsImage} disabled={exportingImage} className="gap-1.5">
                      {exportingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {exportingImage ? '导出中...' : '导出图片'}
                    </Button>
                  )}
                  {!pkMode && (
                    <Button variant="ghost" size="sm" onClick={() => { setResult(null); setFileName(''); setRawEntries([]); setPkMode(false); setError(''); }} className="gap-1.5 text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />重新上传
                    </Button>
                  )}
                  {pkMode && result && (
                    <Button variant="outline" size="sm" onClick={() => { setResult(null); setFileName(''); setRawEntries([]); setError(''); }} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                      <Trash2 className="h-3.5 w-3.5" />删除A
                    </Button>
                  )}
                  {pkMode && result2 && (
                    <Button variant="outline" size="sm" onClick={() => { setResult2(null); setFileName2(''); setError(''); }} className="gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                      <Trash2 className="h-3.5 w-3.5" />删除B
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 解析进度 */}
            {parsing && (
              <Card>
                <CardContent className="p-6">
                  <Progress value={parseProgress} className="h-3" />
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    {parseProgress < 10 ? '正在读取文件...' :
                     parseProgress < 50 ? `正在解析码表 (${parseProgress}%)` :
                     parseProgress < 70 ? '正在筛选数据 (50%)' :
                     parseProgress < 100 ? `正在计算指标 (${parseProgress}%)` :
                     '✅ 测评完成！'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 测评结果展示区 */}
            {result && (
              <div ref={resultRef} className="space-y-4 sm:space-y-6">
                {/* PK对比结果 */}
                {pkMode && result2 ? (
                  <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <TrendingUp className="h-6 w-6 text-yellow-500" />
                        🆚 码表PK对比结果
                        <Badge variant="secondary" className="ml-2">双码表分析</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                        <div className="space-y-3 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                          <h3 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <span>📊</span> 码表A: {fileName}
                          </h3>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div><span className="text-muted-foreground">总字数:</span> <strong>{result.totalChars.toLocaleString()}</strong></div>
                            <div><span className="text-muted-foreground">重码率:</span> <strong className={result.duplicateRate > 1 ? 'text-red-500' : 'text-emerald-500'}>{result.duplicateRate.toFixed(2)}%</strong></div>
                            <div><span className="text-muted-foreground">平均码长:</span> <strong>{result.avgCodeLength.toFixed(2)}</strong></div>
                            <div><span className="text-muted-foreground">效率评分:</span> <strong className={result.efficiencyScore >= 80 ? 'text-emerald-500' : result.efficiencyScore >= 60 ? 'text-amber-500' : 'text-red-500'}>{result.efficiencyScore.toFixed(1)}</strong></div>
                            <div><span className="text-muted-foreground">人体工学:</span> <strong className={result.ergonomicsScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}>{result.ergonomicsScore.toFixed(1)}</strong></div>
                            <div><span className="text-muted-foreground">左右平衡:</span> <strong>{result.balanceScore.toFixed(1)}</strong></div>
                          </div>
                        </div>

                        <div className="space-y-3 p-4 rounded-xl bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30">
                          <h3 className="font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                            <span>📈</span> 码表B: {fileName2}
                          </h3>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div><span className="text-muted-foreground">总字数:</span> <strong>{result2.totalChars.toLocaleString()}</strong></div>
                            <div><span className="text-muted-foreground">重码率:</span> <strong className={result2.duplicateRate > 1 ? 'text-red-500' : 'text-emerald-500'}>{result2.duplicateRate.toFixed(2)}%</strong></div>
                            <div><span className="text-muted-foreground">平均码长:</span> <strong>{result2.avgCodeLength.toFixed(2)}</strong></div>
                            <div><span className="text-muted-foreground">效率评分:</span> <strong className={result2.efficiencyScore >= 80 ? 'text-emerald-500' : result2.efficiencyScore >= 60 ? 'text-amber-500' : 'text-red-500'}>{result2.efficiencyScore.toFixed(1)}</strong></div>
                            <div><span className="text-muted-foreground">人体工学:</span> <strong className={result2.ergonomicsScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}>{result2.ergonomicsScore.toFixed(1)}</strong></div>
                            <div><span className="text-muted-foreground">左右平衡:</span> <strong>{result2.balanceScore.toFixed(1)}</strong></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-yellow-50/80 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-800/30">
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                          <span>⚖️</span> 对比结论
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                          {[
                            { label: '效率评分', a: result.efficiencyScore, b: result2.efficiencyScore, higherBetter: true },
                            { label: '重码率', a: result.duplicateRate, b: result2.duplicateRate, higherBetter: false },
                            { label: '平均码长', a: result.avgCodeLength, b: result2.avgCodeLength, higherBetter: false },
                            { label: '人体工学', a: result.ergonomicsScore, b: result2.ergonomicsScore, higherBetter: true },
                          ].map(item => {
                            const aWin = item.higherBetter ? item.a >= item.b : item.a <= item.b;
                            const bWin = !aWin;
                            return (
                              <div key={item.label} className={`p-2 rounded-lg ${aWin ? 'bg-blue-100/60 dark:bg-blue-900/30' : 'bg-orange-100/60 dark:bg-orange-900/30'}`}>
                                <div className="font-medium text-muted-foreground mb-1">{item.label}</div>
                                <div className="flex items-center justify-between">
                                  <span className={`font-bold ${aWin ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                                    A: {typeof item.a === 'number' ? item.a.toFixed(item.label.includes('率') || item.label === '平均码长' ? 2 : 1) : item.a}
                                  </span>
                                  <span className="text-xs text-muted-foreground">vs</span>
                                  <span className={`font-bold ${bWin ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                    B: {typeof item.b === 'number' ? item.b.toFixed(item.label.includes('率') || item.label === '平均码长' ? 2 : 1) : item.b}
                                  </span>
                                </div>
                                <div className={`text-xs mt-0.5 font-medium ${aWin ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                  {aWin ? '🏆 A胜出' : '🏆 B胜出'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* 核心指标总览 - Excel式行列矩阵 */}
                <Card className="border-border bg-card/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">📊 核心指标总览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-border">
                        <thead>
                          <tr className="bg-primary/10 border-b-2 border-border">
                            <th className="px-3 py-3 text-left font-bold text-foreground whitespace-nowrap border-r border-border bg-muted/30">📋 指标分类</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">总字数</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">总编码</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">唯一编码</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">重码字数</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">静态重码率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">动态选重率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">平均码长</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border">最大码长</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border hover:bg-accent/5 transition-colors bg-background">
                            <td className="px-3 py-3 font-semibold text-foreground border-r border-border bg-muted/20">基础数据</td>
                            <td className="px-3 py-3 text-center font-medium text-foreground tabular-nums border-r border-border">{result.totalChars.toLocaleString()}</td>
                            <td className="px-3 py-3 text-center font-medium text-foreground tabular-nums border-r border-border">{result.totalCodes.toLocaleString()}</td>
                            <td className="px-3 py-3 text-center font-medium text-foreground tabular-nums border-r border-border">{result.uniqueCodes.toLocaleString()}</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.duplicateCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{result.duplicateCount.toLocaleString()}</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.duplicateRate > 5 ? 'text-red-500' : result.duplicateRate > 1 ? 'text-amber-500' : 'text-emerald-500'}`}>{result.duplicateRate.toFixed(2)}%</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.dynamicDuplicateRate > 5 ? 'text-red-500' : result.dynamicDuplicateRate > 1 ? 'text-amber-500' : 'text-emerald-500'}`}>{result.dynamicDuplicateRate.toFixed(2)}%</td>
                            <td className="px-3 py-3 text-center font-medium text-foreground tabular-nums border-r border-border">{result.avgCodeLength.toFixed(2)}</td>
                            <td className="px-3 py-3 text-center font-medium text-foreground tabular-nums border-r border-border">{String(result.maxCodeLength)}</td>
                          </tr>

                          <tr className="border-b-2 border-border hover:bg-accent/5 transition-colors bg-muted/10">
                            <td className="px-3 py-3 font-semibold text-foreground border-r border-border bg-muted/30">📈 覆盖率评估</td>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">GB2312覆盖率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">GBK覆盖率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">同指连续率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">左右手交替</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">效率评分</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">工学评分</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">平衡分数</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">覆盖等级</th>
                          </tr>
                          <tr className="border-b border-border hover:bg-accent/5 transition-colors bg-background">
                            <td className="px-3 py-3 font-semibold text-foreground border-r border-border bg-muted/20">核心指标</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.gb2312Coverage >= 90 ? 'text-emerald-500' : result.gb2312Coverage >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{result.gb2312Coverage.toFixed(1)}%</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.gbkCoverage >= 70 ? 'text-emerald-500' : result.gbkCoverage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{result.gbkCoverage.toFixed(1)}%</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.sameFingerRate > 30 ? 'text-red-500' : result.sameFingerRate > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>{result.sameFingerRate.toFixed(1)}%</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${result.handAlternationRate >= 40 ? 'text-emerald-500' : result.handAlternationRate >= 30 ? 'text-amber-500' : 'text-red-500'}`}>{result.handAlternationRate.toFixed(1)}%</td>
                            <td className={`px-3 py-3 text-center font-bold text-lg tabular-nums border-r border-border ${result.efficiencyScore >= 80 ? 'text-emerald-500' : result.efficiencyScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{result.efficiencyScore.toFixed(1)}</td>
                            <td className={`px-3 py-3 text-center font-bold text-lg tabular-nums border-r border-border ${result.ergonomicsScore >= 75 ? 'text-emerald-500' : result.ergonomicsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{result.ergonomicsScore.toFixed(1)}</td>
                            <td className="px-3 py-3 text-center font-bold text-lg tabular-nums border-r border-border text-foreground">{result.balanceScore.toFixed(1)}</td>
                            <td className="px-3 py-3 text-center border-r border-border">
                              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${result.coverageGrade.includes('A') ? 'bg-emerald-500' : result.coverageGrade.includes('B') ? 'bg-blue-500' : result.coverageGrade.includes('C') ? 'bg-amber-500' : 'bg-red-500'}`}>
                                {result.coverageGrade}
                              </span>
                            </td>
                          </tr>

                          <tr className="border-b-2 border-border hover:bg-accent/5 transition-colors bg-muted/10">
                            <td className="px-3 py-3 font-semibold text-foreground border-r border-border bg-muted/30">⚖️ 手部平衡</td>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">左手使用率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5">右手使用率</th>
                            <th className="px-3 py-3 text-center font-bold text-foreground tabular-nums border-r border-border bg-primary/5" colSpan={6}>左右手按键分布详情</th>
                          </tr>
                          <tr className="border-b border-border hover:bg-accent/5 transition-colors bg-background">
                            <td className="px-3 py-3 font-semibold text-foreground border-r border-border bg-muted/20">分布数据</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${Math.abs(result.leftHandRate - 50) <= 5 ? 'text-emerald-500' : Math.abs(result.leftHandRate - 50) <= 10 ? 'text-amber-500' : 'text-red-500'}`} colSpan={1}>{result.leftHandRate.toFixed(1)}%</td>
                            <td className={`px-3 py-3 text-center font-bold tabular-nums border-r border-border ${Math.abs(result.rightHandRate - 50) <= 5 ? 'text-emerald-500' : Math.abs(result.rightHandRate - 50) <= 10 ? 'text-amber-500' : 'text-red-500'}`} colSpan={1}>{result.rightHandRate.toFixed(1)}%</td>
                            <td className="px-3 py-3 text-center text-muted-foreground text-[11px] border-r border-border" colSpan={6}>
                              {result.leftHandRate > result.rightHandRate ? `左手偏重 ${(result.leftHandRate - result.rightHandRate).toFixed(1)}%` : result.rightHandRate > result.leftHandRate ? `右手偏重 ${(result.rightHandRate - result.leftHandRate).toFixed(1)}%` : '双手均衡'}
                              {' | '}
                              {Math.abs(result.leftHandRate - 50) <= 5 ? '✅ 优秀均衡' : Math.abs(result.leftHandRate - 50) <= 10 ? '⚠️ 轻微偏差' : '❌ 需要优化'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                        <TrendingUp className={`h-7 w-7 ${result.efficiencyScore >= 80 ? 'text-emerald-500' : result.efficiencyScore >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                        <div>
                          <div className="text-[10px] text-muted-foreground">效率评分</div>
                          <div className={`text-xl font-bold ${result.efficiencyScore >= 80 ? 'text-emerald-500' : result.efficiencyScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{result.efficiencyScore.toFixed(1)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${result.coverageGrade.includes('A') ? 'bg-emerald-500' : result.coverageGrade.includes('B') ? 'bg-blue-500' : result.coverageGrade.includes('C') ? 'bg-amber-500' : 'bg-red-500'}`}>
                          {result.coverageGrade}
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">覆盖率等级</div>
                          <div className="text-sm font-semibold text-foreground">笔画覆盖评估</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                        <Activity className={`h-7 w-7 ${result.ergonomicsScore >= 75 ? 'text-emerald-500' : result.ergonomicsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                        <div>
                          <div className="text-[10px] text-muted-foreground">人体工学评分</div>
                          <div className={`text-xl font-bold ${result.ergonomicsScore >= 75 ? 'text-emerald-500' : result.ergonomicsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{result.ergonomicsScore.toFixed(1)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                        <Keyboard className="h-7 w-7 text-primary" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">左右手平衡</div>
                          <div className="text-xl font-bold text-foreground">{result.balanceScore.toFixed(1)}</div>
                          <div className="flex gap-2 text-[10px] text-muted-foreground">
                            <span>左{result.leftHandRate.toFixed(1)}%</span>
                            <span>右{result.rightHandRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 键盘热力图 & 笔画分布 */}
                <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
                  <Card className="border-border bg-card/80">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Keyboard className="h-4 w-4" />键盘热力图 & 按键分布
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.keyFreq ? (
                      <div className="flex flex-col items-center gap-3">
                        {KEYBOARD_ROWS.map((row, ri) => (
                          <div key={ri} className={ri === 4 ? "flex gap-1 w-full max-w-md" : "flex gap-1"} style={{ paddingLeft: ri === 0 ? '0' : ri === 3 ? '16px' : ri === 2 ? '8px' : ri === 4 ? '0' : '24px' }}>
                            {row.map((key, ki) => {
                              if (ri === 4 && ki === 0) {
                                const freq = result.keyFreq[' '] || 0;
                                const usageRate = result.keyUsageRate[' '] || 0;
                                const heatStyle = getHeatColor(freq);
                                return (
                                  <div
                                    key="space"
                                    className={`relative flex h-10 sm:h-11 flex-[13] flex-col items-center justify-center rounded-lg text-xs sm:text-sm font-mono font-semibold transition-all border ${heatStyle.bg} ${heatStyle.text} ${heatStyle.border} ${freq === 0 ? 'opacity-30' : 'shadow-sm'}`}
                                    title={`空格: ${freq.toLocaleString()}次 (${usageRate.toFixed(1)}%)`}
                                  >
                                    <span className="text-base sm:text-lg font-bold leading-none">SPACE</span>
                                    {freq > 0 && (
                                      <span className={`text-[9px] sm:text-[10px] leading-tight font-sans font-bold tabular-nums mt-0.5 px-0.5 rounded ${freq >= result.maxKeyFreq * 0.7 ? 'bg-black/20 dark:bg-white/20 text-inherit' : 'text-inherit opacity-90'}`}>
                                        {freq >= 1000000 ? `${(freq/1000000).toFixed(1)}M` :
                                         freq >= 1000 ? `${(freq/1000).toFixed(1)}k` : freq}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              if (ri === 4 && ki > 0) return null;
                              const freq = result.keyFreq[key] || 0;
                              const usageRate = result.keyUsageRate[key] || 0;
                              const isLetter = /[a-z]/.test(key);
                              const isNumber = /[0-9]/.test(key);
                              const heatStyle = getHeatColor(freq);
                              return (
                                <div
                                  key={key}
                                  className={`relative flex h-10 w-10 sm:h-11 sm:w-11 flex-col items-center justify-center rounded-lg text-xs sm:text-sm font-mono font-semibold transition-all border ${heatStyle.bg} ${heatStyle.text} ${heatStyle.border} ${(!isLetter && !isNumber) && freq === 0 ? 'opacity-30' : 'shadow-sm'}`}
                                  title={`${key === '`' ? '`' : key.toUpperCase()}: ${freq.toLocaleString()}次 (${usageRate.toFixed(1)}%)`}
                                >
                                  <span className="text-base sm:text-lg font-bold leading-none">{key === '`' ? '`' : key.toUpperCase()}</span>
                                  {(isLetter || isNumber) && freq > 0 && (
                                    <span className={`text-[9px] sm:text-[10px] leading-tight font-sans font-bold tabular-nums mt-0.5 px-0.5 rounded ${freq >= result.maxKeyFreq * 0.7 ? 'bg-black/20 dark:bg-white/20 text-inherit' : 'text-inherit opacity-90'}`}>
                                      {freq >= 1000000 ? `${(freq/1000000).toFixed(1)}M` :
                                       freq >= 1000 ? `${(freq/1000).toFixed(1)}k` : freq}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        <div className="w-full mt-4 pt-4 border-t border-border">
                          <h4 className="mb-2 text-xs font-semibold text-foreground">按键使用分布（柱状图）</h4>
                          <div className="flex items-end justify-between gap-1 h-36 px-2 overflow-x-auto">
                            {['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m',' '].map(key => {
                              const freq = result.keyFreq[key] || 0;
                              const usageRate = result.keyUsageRate[key] || 0;
                              const maxFreq = result.keyFreq ? Math.max(...Object.values(result.keyFreq), 1) : 1;
                              const heightPercent = (freq / maxFreq) * 100;
                              return (
                                <div key={key} className={`flex flex-col items-center gap-0.5 group relative ${key === ' ' ? "min-w-[36px]" : "flex-1"}`}>
                                  <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                                    <div
                                      className={`w-full max-w-[24px] rounded-t-sm transition-all hover:opacity-80 cursor-pointer ${
                                        freq >= maxFreq * 0.7 ? 'bg-fuchsia-600' :
                                        freq >= maxFreq * 0.5 ? 'bg-violet-500' :
                                        freq >= maxFreq * 0.3 ? 'bg-indigo-400' :
                                        freq >= maxFreq * 0.1 ? 'bg-blue-400' :
                                        freq > 0 ? 'bg-cyan-300' : 'bg-slate-200 dark:bg-slate-700'
                                      }`}
                                      style={{ height: `${Math.max(heightPercent, freq > 0 ? 3 : 1)}%` }}
                                      title={`${key === ' ' ? '空格' : key.toUpperCase()}: ${freq.toLocaleString()}次 (${usageRate.toFixed(1)}%)`}
                                    />
                                  </div>
                                  <div className="text-[9px] font-bold text-primary">{key === ' ' ? '␣' : key.toUpperCase()}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
                          <p className="text-sm">详细分布数据需要重新上传码表查看</p>
                          <p className="text-xs mt-1">历史记录仅保存核心指标</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 指法负担 & 手部平衡 */}
                <Card className="border-border bg-card/80">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <Activity className="h-4 w-4" />指法负担 & 手部平衡
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.fingerLoad ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-3 text-xs font-medium text-muted-foreground">各手指按键负担分布</h4>
                        <div className="space-y-2.5">
                          {[
                            { finger: '小指', keys: 'Q/A/Z, P/L/., ;/' },
                            { finger: '无名指', keys: 'W/S/X, O/K/,' },
                            { finger: '中指', keys: 'E/D/C, U/J/M' },
                            { finger: '食指', keys: 'R/F/V/T/G/B, Y/H/N' },
                            { finger: '大拇指', keys: '空格' },
                          ].map(({ finger, keys }) => {
                            const load = result.fingerLoad[finger] || 0;
                            const totalLoad = Object.values(result.fingerLoad).reduce((a, b) => a + b, 0);
                            const percent = totalLoad > 0 ? (load / totalLoad) * 100 : 0;
                            const maxFingerLoad = Math.max(...Object.values(result.fingerLoad), 1);
                            const barWidth = (load / maxFingerLoad) * 100;

                            return (
                              <div key={finger} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-foreground">{finger}</span>
                                  <span className="tabular-nums text-muted-foreground">{load.toLocaleString()}次 ({percent.toFixed(1)}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-5 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        percent >= 25 ? 'bg-red-500' :
                                        percent >= 20 ? 'bg-orange-500' :
                                        percent >= 15 ? 'bg-yellow-500' :
                                        percent >= 10 ? 'bg-green-500' : 'bg-emerald-400'
                                      }`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">{keys}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <h4 className="mb-2 text-xs font-medium text-muted-foreground">左右手使用对比</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <div className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-300">{result.leftHandRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground mt-1">左手</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                            <div className="text-lg font-bold tabular-nums text-purple-700 dark:text-purple-300">{result.rightHandRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground mt-1">右手</div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            Math.abs(result.leftHandRate - 50) <= 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            Math.abs(result.leftHandRate - 50) <= 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {Math.abs(result.leftHandRate - 50) <= 10 ? '✓ 平衡良好' :
                             Math.abs(result.leftHandRate - 50) <= 20 ? '⚠ 轻微偏重' : '✗ 严重偏重'}
                            {' '}({Math.abs(result.leftHandRate - 50) > 50 ? Math.abs(result.leftHandRate - 50) - 50 : Math.abs(result.leftHandRate - 50)}%偏差)
                          </span>
                        </div>
                      </div>
                    </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Activity className="h-10 w-10 mb-2 opacity-30" />
                        <p className="text-sm">指法负载数据需要重新上传码表查看</p>
                        <p className="text-xs mt-1">历史记录仅保存核心指标</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 码长分布 & 重码详情 */}
                <Card className="border-border bg-card/80">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <FileText className="h-4 w-4" />码长分布 & 重码详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.codeLengthDist && result.topDupes ? (
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-xs font-medium text-muted-foreground">码长分布</h4>
                        <div className="space-y-2">
                          {Object.entries(result.codeLengthDist)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([len, count]) => (
                              <div key={len} className="flex items-center gap-2 text-xs sm:text-sm">
                                <span className="w-8 text-right font-medium text-foreground">{len}码</span>
                                <div className="flex-1 h-4 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${(count / result.totalChars) * 100}%` }}
                                  />
                                </div>
                                <span className="w-20 sm:w-24 text-right tabular-nums text-muted-foreground">
                                  {count.toLocaleString()} ({(count / result.totalChars * 100).toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 text-xs font-medium text-muted-foreground">Top 重码（前20）</h4>
                        {result.topDupes.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-4">
                            <CheckCircle2 className="h-4 w-4" />无重码
                          </div>
                        ) : (
                          <div className="max-h-56 overflow-y-auto space-y-1">
                            {result.topDupes.map((dupe, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs sm:text-sm px-2 py-1 rounded hover:bg-accent/5">
                                <Badge variant="outline" className="shrink-0 font-mono text-[10px] sm:text-xs">{dupe.code}</Badge>
                                <span className="text-foreground">{dupe.chars.join(' ')}</span>
                                <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">{dupe.count}字</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-2 opacity-30" />
                        <p className="text-sm">详细分布数据需要重新上传码表查看</p>
                        <p className="text-xs mt-1">历史记录仅保存核心指标</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}