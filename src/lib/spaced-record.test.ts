import { describe, it, expect } from 'vitest';
import { reducer, createDefaultState } from '@/store/progress-store';

/**
 * SPACED_RECORD reducer 行为测试
 *
 * 验证两个核心修复：
 * 1. 按 poolKey 前缀路由正确的 correctCountMap（whole: → wholeChar.modes，否则 root）
 * 2. 不再 +1 双重计数（dispatch 同步，ROOT_ANSWER 已更新）
 *
 * 直接测试 reducer 纯函数，不依赖 React hook 或 localStorage。
 */
describe('SPACED_RECORD correctCountMap 路由', () => {
  it('字根练习：ROOT_ANSWER 后 SPACED_RECORD 不再 +1 双重计数', () => {
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    let state = createDefaultState();

    // 模拟 PracticePage 调用顺序：recordAnswer → spaced.recordResult
    // 第 1 次答对
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    // correctCountMap['白'] 应为 1（ROOT_ANSWER +1，SPACED_RECORD 不再 +1）
    expect(state.root.correctCountMap[itemId]).toBe(1);

    // 第 2 次答对后不应掌握（需要 3 次，不是 2 次——修复前因 +1 双重计数会提前掌握）
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(state.root.correctCountMap[itemId]).toBe(2);
    const poolAfter2 = state.spacedPools[poolKey];
    expect(poolAfter2.masteredPool).not.toContain(itemId);

    // 第 3 次答对应触发掌握（不再提前 1 次）
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(state.root.correctCountMap[itemId]).toBe(3);

    const pool = state.spacedPools[poolKey];
    expect(pool.masteredPool).toContain(itemId);
    expect(pool.activePool).not.toContain(itemId);
  });

  it('整字练习：SPACED_RECORD 读取 wholeChar.modes 的 correctCountMap（非 root）', () => {
    const poolKey = 'whole:beginner';
    const itemId = '的';
    const allItemIds = ['的', '一', '是', '在', '不', '了'];

    let state = createDefaultState();

    // 第 1 次答对
    state = reducer(state, { type: 'WHOLE_CHAR_ANSWER', mode: 'whole:beginner', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });

    // wholeChar.modes['whole:beginner'].correctCountMap['的'] 应为 1
    expect(state.wholeChar.modes[poolKey]?.correctCountMap[itemId]).toBe(1);
    // root.correctCountMap['的'] 应保持 0（'的'不是字根）
    expect(state.root.correctCountMap[itemId] || 0).toBe(0);

    // 连续答对 3 次后应掌握
    state = reducer(state, { type: 'WHOLE_CHAR_ANSWER', mode: 'whole:beginner', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    state = reducer(state, { type: 'WHOLE_CHAR_ANSWER', mode: 'whole:beginner', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });

    const pool = state.spacedPools[poolKey];
    expect(pool.masteredPool).toContain(itemId);
  });

  it('答错时 correctCountMap 不变，SPACED_RECORD 也不变', () => {
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    let state = createDefaultState();
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: false });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: false, allItemIds });

    expect(state.root.correctCountMap[itemId] || 0).toBe(0);
  });

  it('已掌握项答错 → 降级回 activePool，重新掌握需再答对 3 次', () => {
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    let state = createDefaultState();

    // 答对 3 次掌握
    for (let i = 0; i < 3; i++) {
      state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
      state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    }
    const poolAfterMaster = state.spacedPools[poolKey];
    expect(poolAfterMaster.masteredPool).toContain(itemId);
    expect(poolAfterMaster.activePool).not.toContain(itemId);
    expect(poolAfterMaster.items[itemId].isMastered).toBe(true);
    expect(poolAfterMaster.items[itemId].downgradeBaseline).toBeUndefined();

    // 复习时答错 → 降级
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: false });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: false, allItemIds });
    const poolAfterWrong = state.spacedPools[poolKey];
    expect(poolAfterWrong.masteredPool).not.toContain(itemId);
    expect(poolAfterWrong.activePool).toContain(itemId);
    expect(poolAfterWrong.items[itemId].isMastered).toBe(false);
    expect(poolAfterWrong.items[itemId].downgradeBaseline).toBe(3); // 降级时全局计数为 3

    // 降级后答对 1 次（全局 4）→ 不应重新掌握
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(state.spacedPools[poolKey].items[itemId].isMastered).toBe(false);
    expect(state.spacedPools[poolKey].activePool).toContain(itemId);

    // 降级后答对 2 次（全局 5）→ 不应重新掌握
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(state.spacedPools[poolKey].items[itemId].isMastered).toBe(false);

    // 降级后答对 3 次（全局 6，baseline 3，6-3=3 >= 3）→ 重新掌握
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    const poolAfterReMaster = state.spacedPools[poolKey];
    expect(poolAfterReMaster.items[itemId].isMastered).toBe(true);
    expect(poolAfterReMaster.masteredPool).toContain(itemId);
    expect(poolAfterReMaster.activePool).not.toContain(itemId);
    expect(poolAfterReMaster.items[itemId].downgradeBaseline).toBeUndefined();
  });

  it('未掌握项答错 → 不降级（已在 activePool），仅重置 consecutiveCorrect', () => {
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    let state = createDefaultState();
    // 答对 1 次（未掌握）
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(state.spacedPools[poolKey].items[itemId].consecutiveCorrect).toBe(1);

    // 答错 → consecutiveCorrect 重置为 0，仍在 activePool，不设 downgradeBaseline
    state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: false });
    state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: false, allItemIds });
    const pool = state.spacedPools[poolKey];
    expect(pool.items[itemId].consecutiveCorrect).toBe(0);
    expect(pool.items[itemId].isMastered).toBe(false);
    expect(pool.activePool).toContain(itemId);
    expect(pool.masteredPool).not.toContain(itemId);
    expect(pool.items[itemId].downgradeBaseline).toBeUndefined();
  });
});

describe('版本迁移：hint 偏好默认开启', () => {
  it('migrateFromOld 后 showHint/wholeCharShowHint/phraseShowHint 均为 true', () => {
    // 模拟旧版本数据，其中 hint 被设为 false
    const oldState = {
      version: 3,
      preferences: {
        showHint: false,
        wholeCharShowHint: false,
        phraseShowHint: false,
        theme: 'light',
        practiceStyle: 'beginner',
        rootMode: 'beginner',
        charSetRange: 'beginner',
        phraseMode: 'beginner',
      },
      root: { correctCountMap: {}, wrongCountMap: {}, totalAttempts: 0, totalCorrect: 0, streak: 0, bestStreak: 0, lastPracticeAt: 0 },
      wholeChar: { modes: {} },
      phrase: { correctCountMap: {}, wrongCountMap: {}, totalAttempts: 0, totalCorrect: 0, streak: 0, bestStreak: 0, lastMode: 'beginner', lastPracticeAt: 0 },
      spacedPools: {},
      achievements: [],
      totalPoints: 0,
      dailyStats: {},
    };

    // 通过 reducer 的 MIGRATE action 触发迁移
    const newState = reducer(createDefaultState(), { type: 'MIGRATE', oldState });

    expect(newState.preferences.showHint).toBe(true);
    expect(newState.preferences.wholeCharShowHint).toBe(true);
    expect(newState.preferences.phraseShowHint).toBe(true);
    expect(newState.version).toBe(4);
  });
});

describe('SPACED_RESET 只重置池、保留累计进度（开始练习不再清空）', () => {
  it('SPACED_RESET 后 correctCountMap 保留，池从空重新开始', () => {
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    let state = createDefaultState();
    // 用户已练过：'白' 累计答对 3 次（掌握），并已进入 masteredPool
    for (let i = 0; i < 3; i++) {
      state = reducer(state, { type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
      state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    }
    expect(state.spacedPools[poolKey].masteredPool).toContain(itemId);

    // 点"开始练习"：只 SPACED_RESET（页面不再派发 ROOT_RESET）
    state = reducer(state, { type: 'SPACED_RESET', poolKey, allItemIds });

    // 累计进度保留（首页/成就数据源）
    expect(state.root.correctCountMap[itemId]).toBe(3);
    expect(state.root.totalAttempts).toBe(3);
    // 池从空重新开始（循序渐进）
    const pool = state.spacedPools[poolKey];
    expect(pool.masteredPool).toHaveLength(0);
    expect(pool.activePool.length).toBeGreaterThan(0);
    expect(pool.activePool.length + pool.pendingPool.length).toBe(allItemIds.length);
  });

  it('整字模式：SPACED_RESET 保留 wholeChar.modes 累计数据', () => {
    const poolKey = 'whole:beginner';
    const itemId = '的';
    const allItemIds = ['的', '一', '是', '在', '不', '了'];

    let state = createDefaultState();
    state = reducer(state, { type: 'WHOLE_CHAR_ANSWER', mode: poolKey, char: itemId, isCorrect: true });
    state = reducer(state, { type: 'WHOLE_CHAR_ANSWER', mode: poolKey, char: itemId, isCorrect: true });

    state = reducer(state, { type: 'SPACED_RESET', poolKey, allItemIds });

    expect(state.wholeChar.modes[poolKey]?.correctCountMap[itemId]).toBe(2);
    expect(state.wholeChar.modes[poolKey]?.totalAttempts).toBe(2);
    expect(state.spacedPools[poolKey].masteredPool).toHaveLength(0);
  });

  it('HYDRATE 导入缺字段 JSON 时走 normalizeState 补齐，不崩溃', () => {
    // 模拟损坏/旧版导入文件：只有 version 和部分字段。
    // 字根练习以图片文件名为键；池外的键（如旧的码点字符键）会被清洗剔除。
    const partial = { version: 4, root: { correctCountMap: { 'a (1).png': 5, '白': 5 } } };
    const newState = reducer(createDefaultState(), { type: 'HYDRATE', state: partial as never });
    expect(newState.preferences).toBeDefined();
    expect(newState.preferences.phraseMode).toBe('beginner');
    expect(newState.root.correctCountMap['a (1).png']).toBe(5);
    expect(newState.root.correctCountMap['白']).toBeUndefined();
    expect(newState.phrase.totalAttempts).toBe(0);
  });
});
