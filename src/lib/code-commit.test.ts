import { describe, it, expect } from 'vitest';
import {
  isAutoCommitCorrect,
  isSpaceCommitCorrect,
  isExactCode,
  isCompleteCodeAwaitingSpace,
  AUTO_COMMIT_LENGTH,
} from './code-commit';

describe('上屏判定：满4键自动判断 / 不足4键空格判断', () => {
  it('第4键自动上屏：打满4码且是码表编码 → 对', () => {
    expect(isAutoCommitCorrect('uiyu', ['uiyu', 'uil'])).toBe(true); // 乐=uiyu
    expect(isAutoCommitCorrect('qjxy', ['qj'])).toBe(true); // 到=qj，第4键多打不追究
  });

  it('第4键自动上屏：编码不足4码时，前缀命中即算对（第4键只是触发）', () => {
    expect(isAutoCommitCorrect('dtju', ['dtj'])).toBe(true);      // 攥=dtj
    expect(isAutoCommitCorrect('fxzj', ['fxz'])).toBe(true);      // 斫=fxz
    expect(isAutoCommitCorrect('kxyz', ['kav', 'k'])).toBe(true); // 的=一简k
  });

  it('第4键自动上屏：不是该字任何编码（或前缀）→ 错', () => {
    expect(isAutoCommitCorrect('fxjz', ['fxz'])).toBe(false); // 斫打fxj*
    expect(isAutoCommitCorrect('zzzz', ['kav', 'k'])).toBe(false);
  });

  it('空格上屏：输入恰好是码表里某条编码 → 对（简码全码都行）', () => {
    expect(isSpaceCommitCorrect('dtj', ['dtj'])).toBe(true);
    expect(isSpaceCommitCorrect('fxz', ['fxz'])).toBe(true);
    expect(isSpaceCommitCorrect('uil', ['uiyu', 'uil'])).toBe(true); // 乐的简码
    expect(isSpaceCommitCorrect('k', ['kav', 'k'])).toBe(true);      // 的一简
    expect(isSpaceCommitCorrect('hle', ['hle', 'hli', 'h'])).toBe(true);
    expect(isSpaceCommitCorrect('h', ['hle', 'hli', 'h'])).toBe(true);
  });

  it('空格上屏：不是完整编码 → 错（哪怕只是某条码的前缀）', () => {
    expect(isSpaceCommitCorrect('fxj', ['fxz'])).toBe(false);
    expect(isSpaceCommitCorrect('fx', ['fxz'])).toBe(false);
    expect(isSpaceCommitCorrect('ui', ['uiyu', 'uil'])).toBe(false);
    expect(isSpaceCommitCorrect('', ['k'])).toBe(false);
  });

  it('完整编码待上屏提示：不足4码且已是完整编码', () => {
    expect(isCompleteCodeAwaitingSpace('dtj', ['dtj'])).toBe(true);
    expect(isCompleteCodeAwaitingSpace('fxz', ['fxz'])).toBe(true);
    expect(isCompleteCodeAwaitingSpace('k', ['kav', 'k'])).toBe(true);
    expect(isCompleteCodeAwaitingSpace('fx', ['fxz'])).toBe(false);      // 还没打完
    expect(isSpaceCommitCorrect('uiyu', ['uiyu', 'uil'])).toBe(true);    // 满4码走空格也算对
    expect(isCompleteCodeAwaitingSpace('uiyu', ['uiyu', 'uil'])).toBe(false); // 满4码无需提示
  });

  it('码长档严格判定：只认恰好该长度的编码（isExactCode）', () => {
    expect(isExactCode('k', ['k'])).toBe(true);        // 1简档打 1 键码
    expect(isExactCode('kav', ['k'])).toBe(false);     // 1简档打全码不算对
    expect(isExactCode('kavx', ['k'])).toBe(false);    // 多打的更不算
    expect(isExactCode('hle', ['hle', 'hli'])).toBe(true);
    expect(isExactCode('', ['k'])).toBe(false);
  });

  it('编码键盘位数常量为 4', () => {
    expect(AUTO_COMMIT_LENGTH).toBe(4);
  });
});
