// 生成练习题库（字池 500/5000、词池 500/5000）
//
// 数据源（随仓库保存，见 src/data/source/）：
//   仙码-常用六千字频.txt  —— 字频降序（制表符：字\t频次）
//   仙码-前六万词频.txt    —— 词频降序（制表符：词\t频次）
// 编码权威：public/字源单字.txt（官方 1.32 单字码表，128852 条）
//
// 口径：
//   1. 取附件前 N 条 → 过滤掉「国标(GB2312)外字」与「码表里没有的字」；
//   2. 词：词中每个字都要合规，且能按词组取码规则拼出一条码（可能短于 4 键）；
//   3. 不补足：池就是「前 N 条里合规的那些」，保持附件字频/词频顺序。
//
// 词组取码规则（与 src/lib/phrase-codes.ts 保持一致）：
//   2 字词 = 各取 2 键；3 字词 = 1+1+2；4 字及以上 = 1+1+1+末 1
//   每个字：优先用它「恰好等于所需键数」的官方码（简码优先，如 无=hw 而非 hmo）；
//           没有恰好键数的码时，才取它更长官方码的前 N 键（如 法=cbj → cb）；
//           若该字所有码都短于 N（如 能=j），则原样用它最长的码（词码会不足 4 键）。
//
// 运行：node scripts/generate-practice-pools.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHARS_SRC = path.join(ROOT, 'src/data/source/仙码-常用六千字频.txt');
const WORDS_SRC = path.join(ROOT, 'src/data/source/仙码-前六万词频.txt');
const TABLE_SRC = path.join(ROOT, 'public/字源单字.txt');
const OUT = path.join(ROOT, 'src/data/practice-pools.generated.ts');

/** 读「字\t频次」表，返回字/词数组（保持频序） */
function readRankedList(file) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => line.split('\t')[0]);
}

/** 官方单字码表：char -> Set(全部编码) */
function readCodeTable() {
  const map = new Map();
  const lines = fs.readFileSync(TABLE_SRC, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    const [char, code] = line.split('\t');
    if (!char || !code) continue;
    if (!map.has(char)) map.set(char, new Set());
    map.get(char).add(code);
  }
  return map;
}

/** GB2312 字集（从 src/data/standardCharsets.ts 的字符串字面量中取，保持单一数据源） */
function readGb2312() {
  const ts = fs.readFileSync(path.join(ROOT, 'src/data/standardCharsets.ts'), 'utf8');
  const m = ts.match(/export const GB2312_CHARS = '([^']*)'/);
  if (!m) throw new Error('未找到 GB2312_CHARS');
  return new Set([...m[1]]);
}

const table = readCodeTable();
const gb2312 = readGb2312();

/** 该字是否可用：国标内 + 码表有条目 */
const usableChar = (ch) => gb2312.has(ch) && table.has(ch);

/** 词组取码（与 src/lib/phrase-codes.ts 同步）：返回该词全部合法码 */
function derivePhraseCodes(word) {
  const chars = [...word];
  const len = chars.length;
  if (len < 2) return [];
  // [位置, 需要键数]
  const spec = len === 2 ? [[0, 2], [1, 2]]
    : len === 3 ? [[0, 1], [1, 1], [2, 2]]
      : [[0, 1], [1, 1], [2, 1], [len - 1, 1]];

  const candidatesOf = (ch, n) => {
    const codes = [...(table.get(ch) ?? [])];
    if (codes.length === 0) return [];
    const exact = [...new Set(codes.filter(c => c.length === n))];
    if (exact.length) return exact;
    const longer = [...new Set(codes.filter(c => c.length > n).map(c => c.slice(0, n)))];
    if (longer.length) return longer;
    const maxLen = Math.max(...codes.map(c => c.length));
    return [...new Set(codes.filter(c => c.length === maxLen).map(c => c.slice(0, n)))];
  };

  let combos = [''];
  for (const [idx, n] of spec) {
    const cands = candidatesOf(chars[idx], n);
    if (cands.length === 0) return [];
    combos = combos.flatMap(prefix => cands.map(c => prefix + c));
  }
  const out = [...new Set(combos.filter(c => c.length >= 2))];
  return out.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
}

/** 取前 limit 条里合规的字 */
function buildCharPool(list, limit) {
  const out = [];
  for (const ch of list.slice(0, limit)) {
    if (usableChar(ch) && !out.includes(ch)) out.push(ch);
  }
  return out;
}

/** 取前 limit 条里合规且能拼出码的词 */
function buildPhrasePool(list, limit) {
  const out = [];
  for (const word of list.slice(0, limit)) {
    if (![...word].every(usableChar)) continue;
    if (derivePhraseCodes(word).length === 0) continue;
    if (!out.includes(word)) out.push(word);
  }
  return out;
}

const charList = readRankedList(CHARS_SRC);
const wordList = readRankedList(WORDS_SRC);

const chars500 = buildCharPool(charList, 500);
const chars5000 = buildCharPool(charList, 5000);
const phrases500 = buildPhrasePool(wordList, 500);
const phrases5000 = buildPhrasePool(wordList, 5000);

// ---- 统计（便于人工核对） ----
const rawChars5000 = charList.slice(0, 5000);
const droppedChars = rawChars5000.filter(ch => !usableChar(ch));
console.log(`[字] 前5000 条合规 ${chars5000.length} 个（剔除 ${droppedChars.length}：${droppedChars.join('')}）；前500 条 ${chars500.length} 个`);
const rawWords5000 = wordList.slice(0, 5000);
const droppedWords = rawWords5000.filter(w => ![...w].every(usableChar) || derivePhraseCodes(w).length === 0);
console.log(`[词] 前5000 条合规 ${phrases5000.length} 条（剔除 ${droppedWords.length}）；前500 条 ${phrases500.length} 条`);
const shortWords = phrases5000.filter(w => derivePhraseCodes(w).some(c => c.length < 4));
const lenDist = {};
for (const w of phrases5000) lenDist[w.length] = (lenDist[w.length] ?? 0) + 1;
console.log(`[词] 长度分布 ${JSON.stringify(lenDist)}；码不足4键的词 ${shortWords.length} 个，例：${shortWords.slice(0, 8).map(w => `${w}=${derivePhraseCodes(w)[0]}`).join(', ')}`);

/** 字符串数组 → TS 字面量（每行 20 个，避免单行过长） */
function emitArray(name, arr) {
  const rows = [];
  for (let i = 0; i < arr.length; i += 20) rows.push('  ' + arr.slice(i, i + 20).map(s => `'${s}'`).join(', ') + ',');
  return `export const ${name}: readonly string[] = [\n${rows.join('\n')}\n];\n`;
}

const banner = `// AUTO-GENERATED by scripts/generate-practice-pools.mjs — DO NOT EDIT MANUALLY
//
// 数据源：src/data/source/仙码-常用六千字频.txt / 仙码-前六万词频.txt
// 编码权威：public/字源单字.txt（官方 1.32 单字码表）
// 口径：取附件前 N 条 → 过滤国标(GB2312)外字与码表缺字 → 保持字频/词频顺序（不补足）
`;

fs.writeFileSync(OUT, `${banner}\n${emitArray('practiceChars500', chars500)}\n${emitArray('practiceChars5000', chars5000)}\n${emitArray('practicePhrases500', phrases500)}\n${emitArray('practicePhrases5000', phrases5000)}`, 'utf8');
console.log(`已写入 ${path.relative(ROOT, OUT)}`);
