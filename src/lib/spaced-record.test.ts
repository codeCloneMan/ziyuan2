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
});
