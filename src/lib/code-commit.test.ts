import { describe, it, expect } from 'vitest';
import { needsSpaceToCommit, AUTO_COMMIT_LENGTH } from './code-commit';

describe('上屏规则（needsSpaceToCommit）', () => {
  it('满 4 码命中：自动上屏，不需要空格', () => {
    expect(needsSpaceToCommit('uiyu', ['uiyu', 'uil'])).toBe(false);
  });

  it('未到 4 码命中：需要空格上屏', () => {
    expect(needsSpaceToCommit('uil', ['uiyu', 'uil'])).toBe(true);
    expect(needsSpaceToCommit('el', ['el', 'eld'])).toBe(true);
    expect(needsSpaceToCommit('k', ['kav', 'k'])).toBe(true);
  });

  it('没命中任何编码（还在输入中）：不算可上屏', () => {
    expect(needsSpaceToCommit('ui', ['uiyu', 'uil'])).toBe(false);
    expect(needsSpaceToCommit('elk', ['el', 'eld'])).toBe(false);
    expect(needsSpaceToCommit('', ['kav', 'k'])).toBe(false);
  });

  it('满码但没命中：不适用（该判错）', () => {
    expect(needsSpaceToCommit('zzzz', ['kav', 'k'])).toBe(false);
  });

  it('满码长度常量为 4', () => {
    expect(AUTO_COMMIT_LENGTH).toBe(4);
  });
});
