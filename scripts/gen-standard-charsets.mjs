import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const gb2312Raw = fs.readFileSync(path.join(rootDir, 'gb2312.txt'), 'utf8');
const gbkRaw = fs.readFileSync(path.join(rootDir, 'gbk.txt'), 'utf8');

const gb2312Set = new Set([...gb2312Raw].filter(c => {
  const cp = c.codePointAt(0);
  return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF);
}));
const gbkChars = [...new Set([...gbkRaw].filter(c => {
  const cp = c.codePointAt(0);
  return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF);
}))];

const gb2312ByQuwei = [];
for (let qu = 16; qu <= 87; qu++) {
  for (let wei = 1; wei <= 94; wei++) {
    const byte1 = qu + 0xA0;
    const byte2 = wei + 0xA0;
    const buf = Buffer.from([byte1, byte2]);
    try {
      const ch = iconv.decode(buf, 'gb2312');
      if (ch.length === 1 && gb2312Set.has(ch)) {
        gb2312ByQuwei.push(ch);
      }
    } catch (e) {
    }
  }
}

const gb2312Unique = [...new Set(gb2312ByQuwei)];
console.log(`GB2312 by quwei: ${gb2312Unique.length} chars`);

if (gb2312Unique.length < 6763) {
  const quweiSet = new Set(gb2312Unique);
  const missing = [...gb2312Set].filter(c => !quweiSet.has(c));
  console.log(`Missing from quwei scan: ${missing.length} chars`);
  if (missing.length > 0 && missing.length <= 50) {
    console.log('Missing chars:', missing.join(' '));
  }
  gb2312Unique.push(...missing);
}

const gb2312Level1 = gb2312Unique.slice(0, 3755);
const gb2312Level2 = gb2312Unique.slice(3755);
console.log(`Level 1 (pinyin order): ${gb2312Level1.length} chars`);
console.log(`Level 2 (radical order): ${gb2312Level2.length} chars`);
console.log(`Level 1 first 10: ${gb2312Level1.slice(0, 10).join(' ')}`);
console.log(`Level 1 last 10: ${gb2312Level1.slice(-10).join(' ')}`);
console.log(`Level 2 first 10: ${gb2312Level2.slice(0, 10).join(' ')}`);
console.log(`Level 2 last 10: ${gb2312Level2.slice(-10).join(' ')}`);

const gb2312Str = gb2312Unique.join('');
const gbkStr = gbkChars.join('');

const output = `// Auto-generated from gb2312.txt and gbk.txt
// DO NOT EDIT MANUALLY - run: node scripts/gen-standard-charsets.mjs
// GB2312: ${gb2312Unique.length} chars (sorted by GB2312 quwei: level1 16-55qu, level2 56-87qu)
// GBK: ${gbkChars.length} chars
//
// GB2312 字符按区位码顺序排列：
//   前 3755 字为一级汉字（16-55区，按拼音排序）
//   后 3008 字为二级汉字（56-87区，按部首/笔画排序）
//   因此 slice(0, 3755) 可正确获取一级汉字

export const GB2312_CHARS = '${gb2312Str}';
export const GBK_CHARS = '${gbkStr}';
`;

const outPath = path.join(rootDir, 'src', 'data', 'standardCharsets.ts');
fs.writeFileSync(outPath, output, 'utf8');
console.log(`Written to ${outPath}`);
