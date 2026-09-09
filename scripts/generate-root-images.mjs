// 生成 src/data/root-images.generated.ts —— 字根练习的官方图集清单。
//
// 数据源：public/roots/*.png（字源官方字根图，命名规则见官方说明：
// "第一个字母为该键所在位"，即文件名首字母 = 该图的答案键位）。
//
// 规则：
//   1. 仅收录 ^[a-z] 开头的 .png；
//   2. 字节级完全相同的重复图只保留一张（优先保留不含 "(n)" 编号的简洁命名，
//      如 r.png 与 r (7).png 相同 → 保留 r.png）；
//   3. 排序按键盘行序（qwertyuiop / asdfghjkl / zxcvbnm）+ 键内自然编号；
//   4. 输出前自检：26 个键位全覆盖、无字节级重复。
//
// 图集更新后重新运行：node scripts/generate-root-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOTS_DIR = path.resolve(import.meta.dirname, '../public/roots');
const OUT_FILE = path.resolve(import.meta.dirname, '../src/data/root-images.generated.ts');
const KEY_ORDER = [...'qwertyuiopasdfghjklzxcvbnm'];

const files = fs.readdirSync(ROOTS_DIR).filter(f => /^[a-z].*\.png$/i.test(f));
const entries = files.map(file => {
  const buf = fs.readFileSync(path.join(ROOTS_DIR, file));
  return { file, key: file[0].toLowerCase(), hash: crypto.createHash('md5').update(buf).digest('hex'), buf };
});

// 字节级去重：同 hash 组内优先保留不含 "(n)" 的命名，其次保留排序靠前者
const byHash = new Map();
for (const e of entries) {
  const prev = byHash.get(e.hash);
  if (!prev) { byHash.set(e.hash, e); continue; }
  const simpler = a => (a.includes('(') ? 1 : 0);
  if (simpler(e.file) < simpler(prev.file) || (simpler(e.file) === simpler(prev.file) && e.file < prev.file)) {
    byHash.set(e.hash, e);
  }
}
const pool = [...byHash.values()];

// 排序：键盘行序 + 键内自然编号（无编号在前）
const keyRank = Object.fromEntries(KEY_ORDER.map((k, i) => [k, i]));
const naturalNum = f => {
  const m = f.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : -1;
};
pool.sort((a, b) => keyRank[a.key] - keyRank[b.key] || naturalNum(a.file) - naturalNum(b.file) || a.file.localeCompare(b.file));

// 自检
const keys = new Set(pool.map(e => e.key));
const missingKeys = KEY_ORDER.filter(k => !keys.has(k));
if (missingKeys.length) throw new Error(`键位缺失图片: ${missingKeys.join(',')}`);
const dup = pool.length !== new Set(pool.map(e => e.hash)).size;
if (dup) throw new Error('输出中仍存在字节级重复');
const badName = pool.find(e => !/^[a-z]( ?\(\d+\))?\.png$/.test(e.file));
if (badName) throw new Error(`意外文件名: ${badName.file}`);

const lines = pool.map(e => `  { file: ${JSON.stringify(e.file)}, key: ${JSON.stringify(e.key)} },`);
const out = `// 由 scripts/generate-root-images.mjs 自动生成 —— 请勿手工编辑。
// 重新生成：node scripts/generate-root-images.mjs
//
// 字根练习题库：字源官方字根图（public/roots/），共 ${pool.length} 张。
// 答案键位 = 文件名首字母（官方命名规则："第一个字母为该键所在位"）。
// 字节级完全相同的重复图已去重（保留 1 张）。

export interface RootImage {
  /** 图片文件名（相对 public/roots/） */
  file: string;
  /** 答案键位（= 文件名首字母） */
  key: string;
}

export const ROOT_IMAGE_POOL: RootImage[] = [
${lines.join('\n')}
];
`;
fs.writeFileSync(OUT_FILE, out, 'utf8');
console.log(`生成 ${OUT_FILE}`);
console.log(`图集 ${files.length} 张 → 去重后 ${pool.length} 张，26 键位覆盖 ✓`);
const excluded = files.filter(f => !pool.some(e => e.file === f));
if (excluded.length) console.log('去重排除:', excluded.join(', '));
