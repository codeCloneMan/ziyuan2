import { describe, it, expect } from 'vitest';
import { commitMode, AUTO_COMMIT_LENGTH } from './code-commit';

describe('上屏规则（commitMode）', () => {
  it('打满全码（该字最长编码）→ 自动上屏', () => {
    expect(commitMode('uiyu', ['uiyu', 'uil'])).toBe('auto');
    expect(commitMode('dtj', ['dtj'])).toBe('auto');   // 攥：全码只有 3 码也要自动走
    expect(commitMode('lye', ['l', 'lye'])).toBe('auto'); // 也
    expect(commitMode('kav', ['kav', 'k'])).toBe('auto'); // 的
    expect(commitMode('ahh', ['ahh', 'a'])).toBe('auto'); // 好
  });

  it('只打出更短的简码 → 需要空格上屏', () => {
    expect(commitMode('uil', ['uiyu', 'uil'])).toBe('space'); // 乐：短的那条算简码
    expect(commitMode('k', ['kav', 'k'])).toBe('space');
    expect(commitMode('a', ['ahh', 'a'])).toBe('space');
    expect(commitMode('l', ['l', 'lye'])).toBe('space');
    expect(commitMode('el', ['el', 'eld'])).toBe('space');
  });

  it('等长多全码都算全码 → 都自动上屏', () => {
    expect(commitMode('hle', ['hle', 'hli', 'h'])).toBe('auto');
    expect(commitMode('hli', ['hle', 'hli', 'h'])).toBe('auto');
    expect(commitMode('h', ['hle', 'hli', 'h'])).toBe('space');
  });

  it('还没打完 / 打错 → none', () => {
    expect(commitMode('ui', ['uiyu', 'uil'])).toBe('none');
    expect(commitMode('elk', ['el', 'eld'])).toBe('none');
    expect(commitMode('', ['kav', 'k'])).toBe('none');
    expect(commitMode('zzzz', ['kav', 'k'])).toBe('none');
  });

  it('编码键盘位数常量为 4', () => {
    expect(AUTO_COMMIT_LENGTH).toBe(4);
  });
});
