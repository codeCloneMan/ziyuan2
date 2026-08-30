import { describe, it, expect } from 'vitest';
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
