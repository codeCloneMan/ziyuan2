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

describe('统计精简后的积分与清洗', () => {
  it('积分规则：答对 +1、答错 0（不再有连击加成/扣分）', async () => {
    const { calcAnswerPoints } = await import('./progress-store');
    expect(calcAnswerPoints(true)).toBe(1);
    expect(calcAnswerPoints(false)).toBe(0);
  });

  it('词组/文章的逐项错次图被清洗，偏好档位非法值回退', () => {
    const corrupt = {
      ...createDefaultState(),
      phrase: { ...createDefaultState().phrase, correctCountMap: { 无法: 'x' }, wrongCountMap: { 无法: 3, 万岁: -1 } },
      article: { correctCountMap: 5, wrongCountMap: { 的: 2 } },
      preferences: { ...createDefaultState().preferences, wholeCharCodeLen: '9', phraseWordLen: '3' },
    };
    const result = importProgressFromJSON(JSON.stringify(corrupt));
    expect(result.success).toBe(true);
    const imported = JSON.parse(exportProgress());
    expect(imported.phrase.wrongCountMap).toEqual({ 无法: 3 });
    expect(imported.phrase.correctCountMap).toEqual({});
    expect(imported.article.wrongCountMap).toEqual({ 的: 2 });
    expect(imported.article.correctCountMap).toEqual({});
    expect(imported.preferences.wholeCharCodeLen).toBe('all');
    expect(imported.preferences.phraseWordLen).toBe('all');
  });
});

/**
 * 文章练习的「退格回退改错」：回退时撤销上一次记录，按最终结果算。
 */
describe('文章练习回退（ARTICLE_RETRACT）', () => {
  it('撤销一次答错：错次、总数、当日统计一起回滚，积分不变（答错本来 0 分）', async () => {
    const { reducer } = await import('./progress-store');
    const base = createDefaultState();
    const wrong = reducer(base, { type: 'ARTICLE_ANSWER', char: '克', isCorrect: false });
    expect(wrong.article.wrongCountMap['克']).toBe(1);
    expect(wrong.article.totalAttempts).toBe(1);
    expect(wrong.totalPoints).toBe(0);
    const today = Object.keys(wrong.dailyStats)[0];
    expect(wrong.dailyStats[today].attempts).toBe(1);

    const undone = reducer(wrong, { type: 'ARTICLE_RETRACT', char: '克', isCorrect: false });
    expect(undone.article.wrongCountMap['克']).toBeUndefined();
    expect(undone.article.totalAttempts).toBe(0);
    expect(undone.totalPoints).toBe(0);
    expect(undone.dailyStats[today].attempts).toBe(0);
  });

  it('撤销一次答对：正确数、单字计数与积分一并回滚', async () => {
    const { reducer } = await import('./progress-store');
    const base = createDefaultState();
    const right = reducer(base, { type: 'ARTICLE_ANSWER', char: '马', isCorrect: true });
    expect(right.totalPoints).toBe(1);
    expect(right.article.correctCountMap['马']).toBe(1);

    const undone = reducer(right, { type: 'ARTICLE_RETRACT', char: '马', isCorrect: true });
    expect(undone.article.totalCorrect).toBe(0);
    expect(undone.article.correctCountMap['马']).toBeUndefined();
    expect(undone.totalPoints).toBe(0);
  });

  it('同一字多次答错，回退一次只减一次；减到 0 后不会出现负数', async () => {
    const { reducer } = await import('./progress-store');
    let s = createDefaultState();
    s = reducer(s, { type: 'ARTICLE_ANSWER', char: '的', isCorrect: false });
    s = reducer(s, { type: 'ARTICLE_ANSWER', char: '的', isCorrect: false });
    s = reducer(s, { type: 'ARTICLE_RETRACT', char: '的', isCorrect: false });
    expect(s.article.wrongCountMap['的']).toBe(1);
    s = reducer(s, { type: 'ARTICLE_RETRACT', char: '的', isCorrect: false });
    s = reducer(s, { type: 'ARTICLE_RETRACT', char: '的', isCorrect: false });
    expect(s.article.wrongCountMap['的']).toBeUndefined();
    expect(s.article.totalAttempts).toBe(0);
    expect(s.totalPoints).toBe(0);
  });
});
