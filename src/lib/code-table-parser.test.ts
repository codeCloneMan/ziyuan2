import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCodeTable } from './code-table-parser';

/**
 * 码表解析器测试
 *
 * 重点回归：虎码等第三方码表使用 `---config@键=值` 方言头，
 * 且【没有】标准 Rime YAML 头的 `...` 结束行。
 * 旧解析器在 `---` 后永久等待 `...`，导致全部数据行被跳过（解析出 0 条目）。
 */
describe('parseCodeTable：虎码方言头（---config@，无 ... 结束行）', () => {
  const tigerStyle = [
    '---config@码表分类=主码-系统码表',
    '---config@码表别名=常用字词',
    '的\tu',
    '一\tf',
    '是\to',
    '避\tcdnu',
  ].join('\n');

  it('数据行正常解析，不被头模式吞掉', () => {
    const entries = parseCodeTable(tigerStyle);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({ char: '的', code: 'u' });
    expect(entries[3]).toEqual({ char: '避', code: 'cdnu' });
  });

  it('字\t编码 方向自动识别（编码在第二列）', () => {
    const entries = parseCodeTable('的\tu\n是\to');
    expect(entries).toEqual([
      { char: '的', code: 'u' },
      { char: '是', code: 'o' },
    ]);
  });
});

describe('parseCodeTable：标准 Rime YAML 头（--- ... 结束）', () => {
  it('头内元数据被跳过，正文正常解析', () => {
    const rime = [
      '# Rime dictionary',
      '---',
      'name: tiger',
      'version: "1.0"',
      'columns:',
      ' - text',
      ' - code',
      '...',
      'u\t的',
      'f\t一',
    ].join('\n');
    const entries = parseCodeTable(rime);
    expect(entries).toEqual([
      { char: '的', code: 'u' },
      { char: '一', code: 'f' },
    ]);
  });
});

describe('parseCodeTable：通用格式', () => {
  it('编码 字 空格分隔（含权重列只取前两列）', () => {
    const entries = parseCodeTable('u 的 100\nf 一 90');
    expect(entries).toEqual([
      { char: '的', code: 'u' },
      { char: '一', code: 'f' },
    ]);
  });

  it('注释行（# 与非 rime 的 ;）被跳过', () => {
    const entries = parseCodeTable('# comment\n; semi comment\n的\tu');
    expect(entries).toEqual([{ char: '的', code: 'u' }]);
  });

  it('纯数字第二列视为权重而非编码，跳过', () => {
    const entries = parseCodeTable('的\t100');
    expect(entries).toHaveLength(0);
  });

  it('空行与空白容忍', () => {
    const entries = parseCodeTable('\n\n的\tu\n\n  \nf\t一\n');
    expect(entries).toHaveLength(2);
  });
});

/**
 * 上传真实码表时的「非码表内容」清理：
 * 表头行（编码\t字 / code\tchar）、方案名、条数说明、权重行、多列错位都不应变成条目。
 */
describe('parseCodeTable：编码\\t字 与表头/说明行清理', () => {
  it('表头 `编码\\t字` 不会被当成条目，正文照常解析', () => {
    const entries = parseCodeTable([
      '编码\t字',
      'aa\t的',
      'ab\t是',
    ].join('\n'));
    expect(entries).toEqual([
      { char: '的', code: 'aa' },
      { char: '是', code: 'ab' },
    ]);
  });

  it('英文表头 `code\\tchar` 与 `字\\t编码` 表头都不产生条目', () => {
    expect(parseCodeTable(['code\tchar', 'aa\t的'].join('\n'))).toEqual([{ char: '的', code: 'aa' }]);
    expect(parseCodeTable(['字\t编码', '的\taa'].join('\n'))).toEqual([{ char: '的', code: 'aa' }]);
  });

  it('方案名/条数/说明等非码表行被丢掉', () => {
    const entries = parseCodeTable([
      '字源形码 v1.32 单字码表',
      '共 128852 条',
      '说明：编码在前，字在后',
      'aa\t的',
    ].join('\n'));
    expect(entries).toEqual([{ char: '的', code: 'aa' }]);
  });

  it('字列是纯 ASCII（权重/编号/示例）的行被丢掉', () => {
    const entries = parseCodeTable([
      'aa\t100',
      'ab\t1',
      'ac\tabc',
      'ad\t的',
    ].join('\n'));
    expect(entries).toEqual([{ char: '的', code: 'ad' }]);
  });

  it('多列错位（序号 编码 字）也能取对编码与字', () => {
    const entries = parseCodeTable(['1 aa 的 100', '2 ab 是 90'].join('\n'));
    expect(entries).toEqual([
      { char: '的', code: 'aa' },
      { char: '是', code: 'ab' },
    ]);
  });

  it('逗号分隔的两列表可用（aa,的）', () => {
    const entries = parseCodeTable(['aa,的', 'ab|是'].join('\n'));
    expect(entries).toEqual([
      { char: '的', code: 'aa' },
      { char: '是', code: 'ab' },
    ]);
  });

  it('大写编码统一转小写', () => {
    expect(parseCodeTable('AA\t的')).toEqual([{ char: '的', code: 'aa' }]);
  });
});

/**
 * 真实码表回归：内置《字源单字.txt》是 128,852 行 `字\t编码`，
 * 其中夹着 6 行元数据（编码列写成 freq/id/key/no），必须被丢掉；
 * 其余条目一条都不能少——丢条会直接让测评结果失真。
 */
describe('parseCodeTable：内置字源单字码表全量解析', () => {
  const file = path.resolve(import.meta.dirname, '../../public/字源单字.txt');
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const entries = parseCodeTable(raw);

  it('只丢掉元数据行，正文条目单条不少', () => {
    const metaRows = lines.filter(l => /\t(freq|id|key|no)$/.test(l)).length;
    expect(metaRows).toBe(6);
    expect(entries.length).toBe(lines.length - metaRows);
    expect(entries.length).toBeGreaterThan(128000);
  });

  it('元数据行没有混进来', () => {
    expect(entries.some(e => ['freq', 'id', 'key', 'no'].includes(e.code))).toBe(false);
  });

  it('字与编码方向正确（好=a、毒=aa）', () => {
    expect(entries.some(e => e.char === '好' && e.code === 'a')).toBe(true);
    expect(entries.some(e => e.char === '毒' && e.code === 'aa')).toBe(true);
  });

  it('字列都不是纯 ASCII、编码都是小写字母', () => {
    expect(entries.every(e => /\P{ASCII}/u.test(e.char))).toBe(true);
    expect(entries.every(e => /^[a-z]+$/.test(e.code))).toBe(true);
  });
});
