// 从 genda Article.js 生成 src/data/genda-articles.generated.ts（稳健版:括号匹配扫描字符串）
import fs from 'fs';

const raw = fs.readFileSync('scripts/Article.js', 'utf8');
const entries = [];
const entryRe = /(\w+):\s*\{\s*name:\s*'([^']*)',\s*value:\s*'([^']+)',\s*type:\s*ArticleType\.(\w+),\s*content:\s*(['"])/g;
let m;
while ((m = entryRe.exec(raw))) {
  const [, key, name, , type, quote] = m;
  // 从 quote 字符开始向后找到未转义的同类引号
  let i = entryRe.lastIndex;
  let content = '';
  while (i < raw.length) {
    const c = raw[i];
    if (c === '\\') { content += raw[i + 1]; i += 2; continue; }
    if (c === quote) break;
    content += c;
    i++;
  }
  entryRe.lastIndex = i + 1;
  entries.push({ key, name, type, content });
}

for (const e of entries) console.log(`${e.key} | ${e.name} | ${e.type} | ${[...e.content].length}字`);

const banner = `/**
 * 跟打文章与单字池（自动生成,勿手改）
 *
 * 来源：玫枫跟打器·宇浩定制版(genda.shurufa.app)内置文章库 Article.js:
 * 常用字频前/中/后 500、港臺变体、宇浩作品字频 500/次 500,
 * 以及《致有缘人》《宇浩拆分基礎教程》《冰灯》等宇浩相关文章。
 */

export interface GendaArticle {
  id: string;
  name: string;
  type: 'character' | 'article';
  text: string;
}

`;
const body = entries
  .filter(e => e.type === 'character' || e.type === 'article')
  .map(e => {
    const esc = e.content.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `  { id: '${e.key}', name: '${e.name.replace(/'/g, "\\'")}', type: '${e.type}', text: '${esc}' },`;
  })
  .join('\n');
fs.writeFileSync('src/data/genda-articles.generated.ts', banner + 'export const GENDA_ARTICLES: readonly GendaArticle[] = [\n' + body + '\n];\n', 'utf8');
console.log('WROTE src/data/genda-articles.generated.ts');
