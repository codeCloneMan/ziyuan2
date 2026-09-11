// ========================================
// 码表解析器
// 支持：
//   1. 通用格式：`字\t编码` / `编码\t字` / `编码 字 权重` / `字 编码` / `序号 编码 字`
//   2. Rime 格式：`编码\t字`，带标准 YAML 头（--- ... ...）
//   3. 虎码等方言头：`---config@键=值` 元数据行（可能没有 `...` 结束行）
//   4. 注释行：# （通用）、; （非 Rime）
//   5. 逗号/竖线/分号分隔的两列表（如 `aa,的`）
//
// 非码表内容（表头 `编码\t字`、`code\tchar`、方案名、`共 N 条`、权重行等）
// 会被丢掉，保证上传的码表「条条可查」。
// ========================================

export interface CodeEntry {
  char: string;
  code: string;
}

/**
 * 表头/元数据关键词：真实编码不会等于这些词。
 * 命中即判定该行不是码表条目（如 `编码\t字`、`code\tchar`、`name: tiger`）。
 */
const META_WORDS = new Set([
  '编码', '全码', '简码', '码', '代码', '输入码', '编码表', '字根', '字根码', '键位', '键', '部首',
  '编号', '序号', '字', '汉字', '字符', '单字', '例字', '词', '词组', '词语', '说明', '备注', '示例', '格式',
  'code', 'codes', 'key', 'keys', 'id', 'no', 'index', 'name', 'version', 'columns', 'sort',
  'author', 'description', 'weight', 'freq', 'frequency', 'char', 'chars', 'character', 'word', 'words',
]);

/** 编码字段：字母开头，允许字母/数字/撇号/连字符/下划线（形码与 Rime 简码的常见形态） */
const CODE_FIELD = /^[a-z][a-z0-9'_-]{0,19}$/i;

/** 汉字字段：至少含一个非 ASCII 字符（汉字 / PUA 变体 / 扩展区字），纯 ASCII 是表头或说明 */
function isHanField(s: string): boolean {
  return /\P{ASCII}/u.test(s);
}

function isMetaWord(s: string): boolean {
  return META_WORDS.has(s.trim().toLowerCase());
}

/**
 * 从一行里挑出「编码」和「字」两列：
 *   编码 = 第一个像编码的字段（字母开头）；
 *   字   = 第一个含非 ASCII 字符的字段；
 * 两者必须都存在且不是同一列，否则整行丢弃。
 * 这样 `编码\t字`、`code\tchar`、`aa 1.0`、`的\t100` 之类都不会成为条目，
 * 而 `序号 编码 字` 这种多列顺序错位也能取对。
 */
function pickEntry(fields: string[]): CodeEntry | null {
  const cleaned = fields.map(f => f.trim()).filter(Boolean);
  if (cleaned.length < 2) return null;
  const codeIdx = cleaned.findIndex(f => CODE_FIELD.test(f));
  const charIdx = cleaned.findIndex(f => isHanField(f));
  if (codeIdx === -1 || charIdx === -1 || codeIdx === charIdx) return null;
  const code = cleaned[codeIdx];
  if (isMetaWord(code)) return null;
  return { char: cleaned[charIdx], code: code.toLowerCase() };
}

/**
 * YAML 头/元数据行判断（用于虎码等方言头没有 `...` 结束行的场景）：
 * `---` 开头、`...`、注释、`key: value`、`- item` 视为元数据；
 * 其余（含含 Tab 的数据行）视为码表正文，立即退出头模式。
 */
function isYamlMetaLine(trimmed: string): boolean {
  return (
    trimmed.startsWith('---') ||
    trimmed.startsWith('...') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('- ') ||
    /^[A-Za-z_][\w-]*\s*:/.test(trimmed)
  );
}

export function parseCodeTable(content: string): CodeEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: CodeEntry[] = [];
  let formatDetected = '';
  // 码表正文前的 YAML/元数据头整体跳过，
  // 避免 name:/version:/columns:/---config@= 等行被当成码表条目。
  // 仅识别文件开头（尚未解析任何条目）的 ---，避免普通码表正文中的 --- 分隔线误触发。
  // 若头没有 `...` 结束行（虎码方言），遇到第一条数据行时自动退出头模式。
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
    if (inYamlHeader) {
      // 头模式：跳过元数据行；数据行（如 `字\t编码`）退出头模式并正常解析
      if (isYamlMetaLine(trimmed)) continue;
      inYamlHeader = false;
    }
    // 注释行：# 通用（rime 与普通码表）；; 仅普通码表跳过（rime 中 ; 可能是分隔符）
    if (trimmed.startsWith('#')) continue;
    if (formatDetected !== 'rime' && trimmed.startsWith(';')) continue;

    // 制表符分隔（Rime 与多数码表）：取整行所有列，让 pickEntry 自行认列
    if (trimmed.includes('\t')) {
      const entry = pickEntry(trimmed.split('\t'));
      if (entry) entries.push(entry);
      continue;
    }

    // 逗号 / 竖线 / 分号 分隔的两列表（如 `aa,的`）：仅在没有空白分隔时启用
    if (/[,|｜]/.test(trimmed) && !/\s/.test(trimmed)) {
      const entry = pickEntry(trimmed.split(/[,|｜]+/));
      if (entry) entries.push(entry);
      continue;
    }

    // 空白分隔（可能多列：序号 / 编码 / 字 / 权重）
    const fields = trimmed.split(/\s+/);
    if (fields.length >= 2) {
      const entry = pickEntry(fields);
      if (entry) entries.push(entry);
      continue;
    }

    // 无分隔符的粘连写法（如 `字aa`）：首字符是字、其余是纯字母编码
    const matchGlue = trimmed.match(/^(\S)([a-zA-Z]{1,19})$/);
    if (matchGlue) {
      const entry = { char: matchGlue[1], code: matchGlue[2].toLowerCase() };
      if (isHanField(entry.char) && !isMetaWord(entry.code)) entries.push(entry);
    }
  }

  return entries.filter(e => e.char && e.code && e.code.length > 0);
}
