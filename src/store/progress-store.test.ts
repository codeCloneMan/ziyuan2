import { describe, it, expect } from 'vitest';
import { importProgressFromJSON, exportProgress, createDefaultState } from './progress-store';

/**
 * normalizeState 防御性测试
 *
 * 背景：导入的进度文件可能来自其他工具或已损坏（字段类型错误、缺字段）。
 * normalizeState 必须把非 plain object 的分段回退为默认值，
 * 否则下游 Object.entries/.filter 等调用会直接崩溃。
 */
describe('progress-store 导入防御', () => {
  it('正常导入：有效字段被保留', () => {
    const valid = {
      ...createDefaultState(),
      totalPoints: 42,
      achievements: ['first_practice'],
    };
    const result = importProgressFromJSON(JSON.stringify(valid));
    expect(result.success).toBe(true);

    const imported = JSON.parse(exportProgress());
    expect(imported.totalPoints).toBe(42);
    expect(imported.achievements).toEqual(['first_practice']);
  });

  it('损坏导入：root 段为字符串时回退默认值，不崩溃', () => {
    const corrupt = { version: 4, root: 'garbage', wholeChar: 123, phrase: true };
    const result = importProgressFromJSON(JSON.stringify(corrupt));
    expect(result.success).toBe(true);

    const imported = JSON.parse(exportProgress());
    expect(typeof imported.root).toBe('object');
    expect(imported.root.correctCountMap).toEqual({});
    expect(imported.root.totalAttempts).toBe(0);
    expect(typeof imported.wholeChar).toBe('object');
    expect(imported.wholeChar.modes).toEqual({});
    expect(typeof imported.phrase).toBe('object');
  });

  it('损坏导入：spacedPools / dailyStats / achievements 类型非法时回退默认值', () => {
    const corrupt = {
      version: 4,
      spacedPools: 'bad',
      dailyStats: ['bad'],
      achievements: 'bad',
      totalPoints: 'bad',
    };
    const result = importProgressFromJSON(JSON.stringify(corrupt));
    expect(result.success).toBe(true);

    const imported = JSON.parse(exportProgress());
    expect(typeof imported.spacedPools).toBe('object');
    expect(Array.isArray(imported.dailyStats)).toBe(false);
    expect(Array.isArray(imported.achievements)).toBe(true);
    expect(imported.achievements).toEqual([]);
    expect(imported.totalPoints).toBe(0);
  });

  it('损坏导入：非法 level 偏好回退 beginner', () => {
    const corrupt = {
      version: 4,
      preferences: { rootMode: 'ultra', charSetRange: null, phraseShowHint: false },
    };
    const result = importProgressFromJSON(JSON.stringify(corrupt));
    expect(result.success).toBe(true);

    const imported = JSON.parse(exportProgress());
    expect(imported.preferences.rootMode).toBe('beginner');
    expect(imported.preferences.charSetRange).toBe('beginner');
    // 合法字段照常合并
    expect(imported.preferences.phraseShowHint).toBe(false);
  });

  it('缺 version 字段的文件被拒绝', () => {
    const result = importProgressFromJSON(JSON.stringify({ root: {} }));
    expect(result.success).toBe(false);
  });

  it('轮次记录：合法轮数保留，非法值被清洗', () => {
    const withRounds = {
      ...createDefaultState(),
      rounds: { 'root:beginner': 2, 'whole:advanced': 1, bad: -3, worse: 'x' },
    };
    const result = importProgressFromJSON(JSON.stringify(withRounds));
    expect(result.success).toBe(true);

    const imported = JSON.parse(exportProgress());
    expect(imported.rounds).toEqual({ 'root:beginner': 2, 'whole:advanced': 1 });
  });

  it('轮次记录缺失或损坏时回退空对象，不崩溃', () => {
    const result = importProgressFromJSON(JSON.stringify({ version: 4, rounds: 'bad' }));
    expect(result.success).toBe(true);
    expect(JSON.parse(exportProgress()).rounds).toEqual({});
  });
});
