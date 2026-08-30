// ========================================
// 码表解析器
// 支持：
//   1. 通用格式：`字\t编码` / `编码\t字` / `编码 字 权重` / `字 编码`
//   2. Rime 格式：`编码\t字`，带标准 YAML 头（--- ... ...）
//   3. 虎码等方言头：`---config@键=值` 元数据行（可能没有 `...` 结束行）
//   4. 注释行：# （通用）、; （非 Rime）
// ========================================

export interface CodeEntry {
  char: string;
  code: string;
}

/** 编码格式判断：形码编码为字母/数字混合，纯数字串视为词频权重而非编码 */
function looksLikeCode(s: string): boolean {
  return /^[\da-z]+$/.test(s) && !/^\d+$/.test(s);
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

    // 编码格式判断：形码编码为字母/数字混合，纯数字串视为词频权重而非编码
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

    const match = trimmed.match(/^(\S+)\s+(\S+)$/);
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

    const matchRest = trimmed.match(/^(\S+)\s+(.+)$/);
    if (matchRest) {
      const code = matchRest[1].toLowerCase(), rest = matchRest[2].trim();
      if (/^[\da-z]+$/.test(code)) {
        entries.push({ char: rest, code });
      } else {
        entries.push({ char: code, code: rest.toLowerCase().split(/\s+/)[0] ?? '' });
      }
      continue;
    }

    const matchGlue = trimmed.match(/^(\S)(\S+)$/);
    if (matchGlue && /^[a-z]+$/.test(matchGlue[2])) {
      entries.push({ char: matchGlue[1], code: matchGlue[2].toLowerCase() });
    }
  }

  return entries.filter(e => e.char && e.code && e.code.length > 0);
}
