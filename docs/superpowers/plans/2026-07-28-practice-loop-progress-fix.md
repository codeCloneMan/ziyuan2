# 练习循环与进度条修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复字根/整字/词组三个练习页的进度条显示错误、循环提前终止及相关一致性问题，使字根/整字练习能完整循环所有项目，清除/重启后进度条正确归零，完成弹窗正常渲染。

**Architecture:** 精准修复 5 个独立根因：(1) SPACED_RECORD 按 poolKey 路由正确的 correctCountMap；(2) 删除同步 dispatch 场景下的 +1 双重计数；(3) masteredPool 分支加 reviewProbability 门控；(4) step 1 就地提升整批 pending 项；(5) clearProgress/startPractice 清全局 correctCountMap + 补图标导入 + 词组进度条 off-by-one。所有修复保持现有数据结构与边界，不改架构。

**Tech Stack:** React 19 + TypeScript + Vite + Vitest + Tailwind。状态管理基于自定义 store（`progress-store.ts`）+ useRef 持有可变间隔池。

**Spec:** `docs/superpowers/specs/2026-07-28-practice-loop-progress-fix-design.md`

---

## 文件结构

| 文件 | 职责 | 改动类型 |
|------|------|---------|
| `src/store/progress-store.ts` | 全局进度 store：ROOT/WHOLE_CHAR/SPACED reducer | 修改：SPACED_RECORD 路由 + 新增 WHOLE_CHAR_RESET_MODE action + hook 暴露 resetMode |
| `src/hooks/use-spaced-learning.ts` | 间隔学习 hook：getNextItem 选择算法 | 修改：step 1 就地提升整批 + step 2 概率门控 |
| `src/pages/PracticePage.tsx` | 字根练习页 | 修改：clearProgress/startPractice 清全局 + 补 Trophy/CheckCircle2/Target 导入 |
| `src/pages/WholeCharPracticePage.tsx` | 整字练习页 | 修改：clearData/startPractice 调 resetMode + 统一完成检查计算 |
| `src/pages/PhrasePracticePage.tsx` | 词组练习页 | 修改：进度条 +1 |
| `src/lib/spaced-record.test.ts` | SPACED_RECORD reducer 单元测试 | 新建 |

---

## Task 1: SPACED_RECORD 按 poolKey 路由正确的 correctCountMap + 删除双重计数

**Files:**
- Modify: `src/store/progress-store.ts:368-372`
- Test: `src/lib/spaced-record.test.ts`（新建）

**背景**：当前 SPACED_RECORD 硬编码读 `state.root.correctCountMap`，且因注释误以为 dispatch 异步而多 `+1`。实际上 `dispatch` 同步执行（L624-L628），调用顺序为 `recordAnswer`（已更新 correctCountMap）→ `spaced.recordResult`（再读已是最新值）。两个 bug 叠加：整字练习永远无法掌握（读错 map），字根练习提前 1 次掌握（双重计数）。

- [ ] **Step 1: 新建测试文件 `src/lib/spaced-record.test.ts`，写入失败测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '@/store/progress-store';

/**
 * SPACED_RECORD reducer 行为测试
 *
 * 验证两个核心修复：
 * 1. 按 poolKey 前缀路由正确的 correctCountMap（whole: → wholeChar.modes，否则 root）
 * 2. 不再 +1 双重计数（dispatch 同步，ROOT_ANSWER 已更新）
 */
describe('SPACED_RECORD correctCountMap 路由', () => {
  beforeEach(() => {
    localStorage.clear();
    // 通过 HYDRATE 重置 store 到干净状态
    const { dispatch } = useProgressStore();
    dispatch({ type: 'ROOT_RESET' });
  });

  it('字根练习：ROOT_ANSWER 后 SPACED_RECORD 不再 +1 双重计数', () => {
    const { state, dispatch } = useProgressStore();
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    // 模拟 PracticePage 调用顺序：recordAnswer → spaced.recordResult
    // 第 1 次答对
    dispatch({ type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    // correctCountMap['白'] 应为 1（ROOT_ANSWER +1，SPACED_RECORD 不再 +1）
    expect(useProgressStore().state.root.correctCountMap[itemId]).toBe(1);

    // 第 2 次答对
    dispatch({ type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(useProgressStore().state.root.correctCountMap[itemId]).toBe(2);

    // 第 3 次答对应触发掌握（不再提前 1 次）
    dispatch({ type: 'ROOT_ANSWER', char: itemId, isCorrect: true });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    expect(useProgressStore().state.root.correctCountMap[itemId]).toBe(3);

    const pool = useProgressStore().state.spacedPools[poolKey];
    expect(pool.masteredPool).toContain(itemId);
    expect(pool.activePool).not.toContain(itemId);
  });

  it('整字练习：SPACED_RECORD 读取 wholeChar.modes 的 correctCountMap（非 root）', () => {
    const { dispatch } = useProgressStore();
    const poolKey = 'whole:beginner';
    const itemId = '的';
    const allItemIds = ['的', '一', '是', '在', '不', '了'];

    // 第 1 次答对
    dispatch({ type: 'WHOLE_CHAR_ANSWER', mode: 'whole:beginner', char: itemId, isCorrect: true });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });

    const state = useProgressStore().state;
    // wholeChar.modes['whole:beginner'].correctCountMap['的'] 应为 1
    expect(state.wholeChar.modes[poolKey]?.correctCountMap[itemId]).toBe(1);
    // root.correctCountMap['的'] 应保持 0（'的'不是字根）
    expect(state.root.correctCountMap[itemId] || 0).toBe(0);

    // 连续答对 3 次后应掌握
    dispatch({ type: 'WHOLE_CHAR_ANSWER', mode: 'whole:beginner', char: itemId, isCorrect: true });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });
    dispatch({ type: 'WHOLE_CHAR_ANSWER', mode: 'whole:beginner', char: itemId, isCorrect: true });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: true, allItemIds });

    const pool = useProgressStore().state.spacedPools[poolKey];
    expect(pool.masteredPool).toContain(itemId);
  });

  it('答错时 correctCountMap 不变，SPACED_RECORD 也不变', () => {
    const { dispatch } = useProgressStore();
    const poolKey = 'root:beginner';
    const itemId = '白';
    const allItemIds = ['白', '日', '月', '木', '水', '火'];

    dispatch({ type: 'ROOT_ANSWER', char: itemId, isCorrect: false });
    dispatch({ type: 'SPACED_RECORD', poolKey, itemId, isCorrect: false, allItemIds });

    expect(useProgressStore().state.root.correctCountMap[itemId] || 0).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/lib/spaced-record.test.ts`
Expected: FAIL — 整字测试中 `wholeChar.modes[poolKey]?.correctCountMap[itemId]` 仍为 0（因为 SPACED_RECORD 没更新它）；字根测试中第 2 次 SPACED_RECORD 后 `correctCountMap['白']` 为 3 而非 2（双重计数）。

- [ ] **Step 3: 修改 `src/store/progress-store.ts` SPACED_RECORD reducer（约 L368-L372）**

定位现有代码（约 L368-L372）：
```typescript
      // 使用全局累计答对次数判定掌握状态，与 PracticePage/成就/进度保持一致
      // 注意：ROOT_ANSWER 和 SPACED_RECORD 在同一批次执行，state.root.correctCountMap
      // 尚未更新。需手动计算新的正确次数：旧值 + 本次是否正确
      const oldCorrectCount = state.root.correctCountMap[itemId] || 0;
      const globalCorrectCount = isCorrect ? oldCorrectCount + 1 : oldCorrectCount;
```

替换为：
```typescript
      // 使用全局累计答对次数判定掌握状态，与 PracticePage/成就/进度保持一致。
      // 注意：dispatch 是同步的，调用方先 dispatch ROOT_ANSWER/WHOLE_CHAR_ANSWER
      // （已更新 correctCountMap）再 dispatch SPACED_RECORD，因此此处读到的已是最新值，
      // 不需要 +1。按 poolKey 前缀选择正确的 correctCountMap：
      //   - 'whole:' 前缀 → 整字练习，读 state.wholeChar.modes[poolKey]
      //   - 其他 → 字根练习，读 state.root
      const globalCorrectCount = poolKey.startsWith('whole:')
        ? (state.wholeChar.modes[poolKey]?.correctCountMap[itemId] || 0)
        : (state.root.correctCountMap[itemId] || 0);
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/lib/spaced-record.test.ts`
Expected: PASS — 3 个测试全部通过。

- [ ] **Step 5: 运行全量测试确保无回归**

Run: `npm test`
Expected: PASS — 所有现有测试（count-bug.test.ts、mastered-count.test.ts）仍通过。

- [ ] **Step 6: Commit**

```bash
git add src/store/progress-store.ts src/lib/spaced-record.test.ts
git commit -m "fix: SPACED_RECORD routes correct correctCountMap by poolKey and drops +1 double-count"
```

---

## Task 2: masteredPool 分支加 reviewProbability 门控

**Files:**
- Modify: `src/hooks/use-spaced-learning.ts:86-136`

**背景**：`reviewProbability = 0.1`（设计意图：10% 概率复习已掌握项）在 `getNextItem` 中从未被引用。只要 masteredPool 非空，activePool 中的未掌握项永远不再出现。需在 masteredPool 分支加门控，但 activePool 为空时仍兜底走 masteredPool。

- [ ] **Step 1: 修改 `src/hooks/use-spaced-learning.ts` getNextItem（约 L86-L136）**

定位现有代码（约 L91-L136）：
```typescript
    // 检查已掌握池中是否有需要复习的
    if (p.masteredPool.length > 0) {
      const dueForReview: string[] = [];
      for (const id of p.masteredPool) {
        const item = p.items[id];
        if (item && calcRetention(item.lastPracticeTime, item.stability) < REVIEW_RETENTION_THRESHOLD) {
          dueForReview.push(id);
        }
      }
      if (dueForReview.length > 0) {
        dueForReview.sort((a, b) => {
          const retA = calcRetention(p.items[a].lastPracticeTime, p.items[a].stability);
          const retB = calcRetention(p.items[b].lastPracticeTime, p.items[b].stability);
          return retA - retB;
        });
        return dueForReview[0];
      }

      // 增加"最长未复习优先"机制，确保所有已掌握项都能被循环到
      // 混合概率策略：
      //   30% 概率选择最长未复习的项（保证遍历覆盖）
      //   40% 概率随机选择（保持随机性）
      //   30% 概率选择记忆强度最低的项（强化薄弱项）
      const sortedByLastPractice = [...p.masteredPool].sort((a, b) => {
        return (p.items[a].lastPracticeTime || 0) - (p.items[b].lastPracticeTime || 0);
      });

      const sortedByRetention = [...p.masteredPool].sort((a, b) => {
        const retA = calcRetention(p.items[a].lastPracticeTime, p.items[a].stability);
        const retB = calcRetention(p.items[b].lastPracticeTime, p.items[b].stability);
        return retA - retB;
      });

      const rand = Math.random();
      if (rand < 0.3) {
        // 30%：最长未复习优先，确保所有项都能被循环到
        return sortedByLastPractice[0];
      } else if (rand < 0.7) {
        // 40%：随机选择，保持练习多样性
        const randomIndex = Math.floor(Math.random() * p.masteredPool.length);
        return p.masteredPool[randomIndex];
      } else {
        // 30%：记忆强度最低优先，强化薄弱项
        return sortedByRetention[0];
      }
    }

    // 从活跃池中选择（加权随机）
```

替换为：
```typescript
    // 检查已掌握池中是否有需要复习的
    // 门控：activePool 有货时按 reviewProbability 概率进入复习分支（默认 10%）；
    //       activePool 空时必须从 masteredPool 选（兜底，避免无题可出）。
    if (p.masteredPool.length > 0) {
      const shouldReviewMastered = p.activePool.length === 0 || Math.random() < p.reviewProbability;
      if (shouldReviewMastered) {
        const dueForReview: string[] = [];
        for (const id of p.masteredPool) {
          const item = p.items[id];
          if (item && calcRetention(item.lastPracticeTime, item.stability) < REVIEW_RETENTION_THRESHOLD) {
            dueForReview.push(id);
          }
        }
        if (dueForReview.length > 0) {
          dueForReview.sort((a, b) => {
            const retA = calcRetention(p.items[a].lastPracticeTime, p.items[a].stability);
            const retB = calcRetention(p.items[b].lastPracticeTime, p.items[b].stability);
            return retA - retB;
          });
          return dueForReview[0];
        }

        // 增加"最长未复习优先"机制，确保所有已掌握项都能被循环到
        // 混合概率策略：
        //   30% 概率选择最长未复习的项（保证遍历覆盖）
        //   40% 概率随机选择（保持随机性）
        //   30% 概率选择记忆强度最低的项（强化薄弱项）
        const sortedByLastPractice = [...p.masteredPool].sort((a, b) => {
          return (p.items[a].lastPracticeTime || 0) - (p.items[b].lastPracticeTime || 0);
        });

        const sortedByRetention = [...p.masteredPool].sort((a, b) => {
          const retA = calcRetention(p.items[a].lastPracticeTime, p.items[a].stability);
          const retB = calcRetention(p.items[b].lastPracticeTime, p.items[b].stability);
          return retA - retB;
        });

        const rand = Math.random();
        if (rand < 0.3) {
          // 30%：最长未复习优先，确保所有项都能被循环到
          return sortedByLastPractice[0];
        } else if (rand < 0.7) {
          // 40%：随机选择，保持练习多样性
          const randomIndex = Math.floor(Math.random() * p.masteredPool.length);
          return p.masteredPool[randomIndex];
        } else {
          // 30%：记忆强度最低优先，强化薄弱项
          return sortedByRetention[0];
        }
      }
    }

    // 从活跃池中选择（加权随机）
```

- [ ] **Step 2: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-spaced-learning.ts
git commit -m "fix: gate masteredPool review branch by reviewProbability to unblock activePool"
```

---

## Task 3: step 1 就地提升整批 pending 项

**Files:**
- Modify: `src/hooks/use-spaced-learning.ts:86-89`

**背景**：现有 step 1 借出 1 个 pending 项不修改池，导致 SPACED_RECORD defense block 把它加入 activePool 后阻塞自动补充，其余 pending 项永远卡住。需就地提升整批到 activePool 并从 pendingPool 移除。

- [ ] **Step 1: 修改 `src/hooks/use-spaced-learning.ts` getNextItem step 1（约 L86-L89）**

定位现有代码（约 L85-L89）：
```typescript
    // 活跃池空了，补充新项目
    if (p.activePool.length === 0 && p.pendingPool.length > 0) {
      const toAdd = p.pendingPool.slice(0, p.newItemsPerRound);
      if (toAdd.length > 0) return toAdd[0];
    }
```

替换为：
```typescript
    // 活跃池空了，补充新项目（就地提升整批到 activePool，避免 SPACED_RECORD 的
    // defense block 只把单个借出项加入 activePool 而阻塞其余 pending 的提升）
    if (p.activePool.length === 0 && p.pendingPool.length > 0) {
      const promoteCount = Math.min(p.newItemsPerRound, p.pendingPool.length);
      const promoted = p.pendingPool.slice(0, promoteCount);
      p.activePool = [...p.activePool, ...promoted];
      p.pendingPool = p.pendingPool.slice(promoteCount);
      for (const id of promoted) {
        if (!p.items[id]) {
          p.items[id] = {
            id,
            consecutiveCorrect: 0,
            isMastered: false,
            lastPracticeTime: 0,
            totalAttempts: 0,
            wrongCount: 0,
            stability: 30,
          };
        }
      }
      return promoted[0];
    }
```

- [ ] **Step 2: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-spaced-learning.ts
git commit -m "fix: promote full batch of pending items in getNextItem step 1 to prevent pool starvation"
```

---

## Task 4: 新增 WHOLE_CHAR_RESET_MODE action

**Files:**
- Modify: `src/store/progress-store.ts:231-243`（ProgressAction 联合类型）
- Modify: `src/store/progress-store.ts:274-310`（reducer 新增 case）
- Modify: `src/store/progress-store.ts:684-692`（useWholeCharProgress hook）

**背景**：现有 store 只有 `ROOT_RESET` 和核弹式 `clearAllProgress`，无法只清单个 wholeChar mode 的进度。clearData 需要这个 action 来清全局 correctCountMap。

- [ ] **Step 1: 修改 `src/store/progress-store.ts` ProgressAction 联合类型（约 L231-L243）**

定位现有代码（约 L234-L235）：
```typescript
  | { type: 'WHOLE_CHAR_ANSWER'; mode: string; char: string; isCorrect: boolean }
  | { type: 'WHOLE_CHAR_SET_MODE'; mode: string }
```

在 `WHOLE_CHAR_SET_MODE` 后新增一行：
```typescript
  | { type: 'WHOLE_CHAR_ANSWER'; mode: string; char: string; isCorrect: boolean }
  | { type: 'WHOLE_CHAR_SET_MODE'; mode: string }
  | { type: 'WHOLE_CHAR_RESET_MODE'; mode: string }
```

- [ ] **Step 2: 在 reducer 中新增 `WHOLE_CHAR_RESET_MODE` case**

定位现有代码（约 L274 之后，`case 'WHOLE_CHAR_ANSWER':` 之前）：
```typescript
    case 'ROOT_RESET':
      return { ...state, root: { ...defaultRoot } };

    case 'WHOLE_CHAR_ANSWER': {
```

在 `ROOT_RESET` 和 `WHOLE_CHAR_ANSWER` 之间插入新 case：
```typescript
    case 'ROOT_RESET':
      return { ...state, root: { ...defaultRoot } };

    case 'WHOLE_CHAR_RESET_MODE': {
      // 清除单个 wholeChar mode 的进度（correctCountMap/wrongCountMap/统计）。
      // 下次 WHOLE_CHAR_ANSWER 会自动重建默认结构。
      const wholeChar = { ...state.wholeChar };
      const modes = { ...wholeChar.modes };
      delete modes[action.mode];
      wholeChar.modes = modes;
      return { ...state, wholeChar };
    }

    case 'WHOLE_CHAR_ANSWER': {
```

- [ ] **Step 3: 在 `useWholeCharProgress` hook 中暴露 `resetMode`**

定位现有代码（约 L684-L692）：
```typescript
export function useWholeCharProgress() {
  const { state, dispatch } = useProgressStore();
  return {
    progress: state.wholeChar,
    recordAnswer: (mode: string, char: string, isCorrect: boolean) =>
      dispatch({ type: 'WHOLE_CHAR_ANSWER', mode, char, isCorrect }),
    setMode: (mode: string) => dispatch({ type: 'WHOLE_CHAR_SET_MODE', mode }),
  };
}
```

替换为：
```typescript
export function useWholeCharProgress() {
  const { state, dispatch } = useProgressStore();
  return {
    progress: state.wholeChar,
    recordAnswer: (mode: string, char: string, isCorrect: boolean) =>
      dispatch({ type: 'WHOLE_CHAR_ANSWER', mode, char, isCorrect }),
    setMode: (mode: string) => dispatch({ type: 'WHOLE_CHAR_SET_MODE', mode }),
    resetMode: (mode: string) => dispatch({ type: 'WHOLE_CHAR_RESET_MODE', mode }),
  };
}
```

- [ ] **Step 4: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/store/progress-store.ts
git commit -m "feat: add WHOLE_CHAR_RESET_MODE action to reset single mode progress"
```

---

## Task 5: PracticePage clearProgress/startPractice 清全局 + 补图标导入

**Files:**
- Modify: `src/pages/PracticePage.tsx:13`（补图标导入）
- Modify: `src/pages/PracticePage.tsx:179-204`（clearProgress + startPractice）

**背景**：clearProgress/startPractice 只清间隔池不清全局 correctCountMap，导致完成全部后点"重新练习"立即触发完成检查。同时 PracticePage 第 318/345/470/472 行使用了 Trophy/CheckCircle2/Target 但未导入，完成弹窗会崩溃。

- [ ] **Step 1: 修改 `src/pages/PracticePage.tsx` 第 13 行图标导入**

定位现有代码（L13）：
```typescript
import { Play, Sparkles, GraduationCap, Trash2 } from 'lucide-react';
```

替换为：
```typescript
import { Play, Sparkles, GraduationCap, Trash2, Trophy, CheckCircle2, Target } from 'lucide-react';
```

- [ ] **Step 2: 修改 `src/pages/PracticePage.tsx` startPractice（约 L179-L190）**

定位现有代码（约 L179-L190）：
```typescript
  const startPractice = useCallback(() => {
    if (isBeginner) {
      // 入门：重置间隔学习池（从头开始循序渐进）
      spaced.resetProgress();
    } else {
      // 进阶：所有字根洗牌，从第 0 个开始高速循环
      shuffleQueueRef.current = shuffleInPlace([...allRootIds]);
      shuffleIndexRef.current = -1; // nextRoot 首次调用会 +1 → 0
    }
    reset();
    start();
  }, [isBeginner, spaced, reset, start]);
```

替换为：
```typescript
  const startPractice = useCallback(() => {
    // 清全局 correctCountMap（避免完成检查误判）+ 清间隔池
    reset(); // useRootProgress.reset() → dispatch ROOT_RESET
    if (isBeginner) {
      // 入门：重置间隔学习池（从头开始循序渐进）
      spaced.resetProgress();
    } else {
      // 进阶：所有字根洗牌，从第 0 个开始高速循环
      shuffleQueueRef.current = shuffleInPlace([...allRootIds]);
      shuffleIndexRef.current = -1; // nextRoot 首次调用会 +1 → 0
    }
    start();
  }, [isBeginner, spaced, reset, start]);
```

**说明**：`reset` 来自 `useRootProgress`（hook 返回的 `reset: () => dispatch({ type: 'ROOT_RESET' })`），清全局 `state.root`。把它移到最前面，确保后续 `spaced.resetProgress()` 读到的是已清空状态。注意此处 `reset` 是 usePracticeSession 的 reset（重置会话统计），而 `useRootProgress` 的 reset 是清全局进度——需确认 PracticePage 中的命名。

- [ ] **Step 3: 检查 PracticePage 中 reset 的来源**

Run: `npx grep -n "useRootProgress\|const.*reset" src/pages/PracticePage.tsx | head -20`
Expected: 确认 `reset` 是 `usePracticeSession` 返回的会话重置，而 `useRootProgress().reset` 才是清全局。如果 PracticePage 没有从 useRootProgress 解构 reset，需补上。

如果 PracticePage 中已有 `const { progress, recordAnswer, reset: resetRootProgress } = useRootProgress();` 类似解构，则用 `resetRootProgress()`。否则需要新增解构。

**实际修复代码**（根据检查结果调整）：
```typescript
  const { progress, recordAnswer, reset: resetRootProgress } = useRootProgress();
```

然后 startPractice 改为：
```typescript
  const startPractice = useCallback(() => {
    // 清全局 correctCountMap（避免完成检查误判）+ 清间隔池
    resetRootProgress();
    if (isBeginner) {
      spaced.resetProgress();
    } else {
      shuffleQueueRef.current = shuffleInPlace([...allRootIds]);
      shuffleIndexRef.current = -1;
    }
    reset(); // usePracticeSession.reset：重置会话统计
    start();
  }, [isBeginner, spaced, reset, resetRootProgress, start]);
```

- [ ] **Step 4: 修改 `src/pages/PracticePage.tsx` clearProgress（约 L198-L204）**

定位现有代码（约 L198-L204）：
```typescript
  const clearProgress = useCallback(() => {
    if (confirm('确定要清除当前模式的练习记录吗？')) {
      if (isBeginner) spaced.resetProgress();
      stop();
      reset();
    }
  }, [isBeginner, spaced, stop, reset]);
```

替换为：
```typescript
  const clearProgress = useCallback(() => {
    if (confirm('确定要清除当前模式的练习记录吗？')) {
      resetRootProgress();
      if (isBeginner) spaced.resetProgress();
      stop();
      reset();
    }
  }, [isBeginner, spaced, stop, reset, resetRootProgress]);
```

- [ ] **Step 5: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误（特别确认 Trophy/CheckCircle2/Target 已正确导入，resetRootProgress 类型正确）

- [ ] **Step 6: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/PracticePage.tsx
git commit -m "fix: PracticePage clearProgress/startPractice reset global correctCountMap and import missing icons"
```

---

## Task 6: WholeCharPracticePage clearData/startPractice 调 resetMode + 统一完成检查

**Files:**
- Modify: `src/pages/WholeCharPracticePage.tsx:231-256`（startPractice + clearData）
- Modify: `src/pages/WholeCharPracticePage.tsx:190-203`（generateNext 完成检查）

**背景**：clearData/startPractice 只清间隔池不清全局 correctCountMap；完成检查用 `Object.values(correctCountMap).filter(c => c >= 3).length` 统计所有历史数据，与进度条的 `learningPool.filter(...)` 不一致。

- [ ] **Step 1: 修改 `src/pages/WholeCharPracticePage.tsx` useWholeCharProgress 解构**

定位现有代码（约 L105 之前，需 grep 确认）：
```typescript
  const { progress, recordAnswer, setMode } = useWholeCharProgress();
```

替换为：
```typescript
  const { progress, recordAnswer, setMode, resetMode } = useWholeCharProgress();
```

如果当前代码没有这个解构，需添加。

- [ ] **Step 2: 修改 `src/pages/WholeCharPracticePage.tsx` startPractice（约 L231-L240）**

定位现有代码（约 L231-L240）：
```typescript
  const startPractice = useCallback(() => {
    if (isBeginner) {
      spaced.resetProgress();
    } else {
      shuffleQueueRef.current = shuffleInPlace([...learningPool]);
      shuffleIndexRef.current = -1;
    }
    reset();
    start();
  }, [isBeginner, learningPool, spaced, reset, start]);
```

替换为：
```typescript
  const startPractice = useCallback(() => {
    // 清全局 correctCountMap（避免完成检查误判）+ 清间隔池
    resetMode(modeKey);
    if (isBeginner) {
      spaced.resetProgress();
    } else {
      shuffleQueueRef.current = shuffleInPlace([...learningPool]);
      shuffleIndexRef.current = -1;
    }
    reset();
    start();
  }, [isBeginner, learningPool, modeKey, spaced, reset, resetMode, start]);
```

- [ ] **Step 3: 修改 `src/pages/WholeCharPracticePage.tsx` clearData（约 L250-L256）**

定位现有代码（约 L250-L256）：
```typescript
  const clearData = useCallback(() => {
    if (confirm('确定要清除当前模式的整字练习记录吗？')) {
      spaced.resetProgress();
      stop();
      reset();
    }
  }, [spaced, stop, reset]);
```

替换为：
```typescript
  const clearData = useCallback(() => {
    if (confirm('确定要清除当前模式的整字练习记录吗？')) {
      resetMode(modeKey);
      spaced.resetProgress();
      stop();
      reset();
    }
  }, [modeKey, spaced, stop, reset, resetMode]);
```

- [ ] **Step 4: 修改 `src/pages/WholeCharPracticePage.tsx` generateNext 完成检查（约 L193-L203）**

定位现有代码（约 L193-L203）：
```typescript
    // 检查是否已全部掌握
    const currentCorrectMap = modeProgress.correctCountMap;
    const masteredCount = Object.values(currentCorrectMap).filter(c => c >= 3).length;
    if (masteredCount === learningPool.length) {
      // 所有字都已掌握，显示完成提示
      setShowCompletionModal(true);
      setShowSplitViz(false);
      setSplitAnimationStep(0);
      setUserWrongSplit(null);
      return;
    }
```

替换为：
```typescript
    // 检查是否已全部掌握（与进度条同口径：只统计 learningPool 内的项）
    const currentCorrectMap = modeProgress.correctCountMap;
    const masteredCount = learningPool.filter(ch => (currentCorrectMap[ch] || 0) >= 3).length;
    if (masteredCount === learningPool.length) {
      // 所有字都已掌握，显示完成提示
      setShowCompletionModal(true);
      setShowSplitViz(false);
      setSplitAnimationStep(0);
      setUserWrongSplit(null);
      return;
    }
```

- [ ] **Step 5: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/WholeCharPracticePage.tsx
git commit -m "fix: WholeCharPracticePage clearData/startPractice reset global progress and unify completion check"
```

---

## Task 7: PhrasePracticePage 进度条 off-by-one

**Files:**
- Modify: `src/pages/PhrasePracticePage.tsx:274-275`

**背景**：`currentIndex / phraseQueue.length` 让第一题显示 0%，最后一题显示 95%。应为 `(currentIndex + 1) / length`。

- [ ] **Step 1: 修改 `src/pages/PhrasePracticePage.tsx` 进度条计算（约 L274-L275）**

定位现有代码（约 L274-L275）：
```typescript
  const progress = phraseQueue.length > 0
    ? (currentIndex / phraseQueue.length) * 100 : 0;
```

替换为：
```typescript
  const progress = phraseQueue.length > 0
    ? ((currentIndex + 1) / phraseQueue.length) * 100 : 0;
```

- [ ] **Step 2: 运行全量测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/PhrasePracticePage.tsx
git commit -m "fix: PhrasePracticePage progress bar off-by-one (first question shows 5% not 0%)"
```

---

## Task 8: 全量回归验证

**Files:** 无修改，仅验证

- [ ] **Step 1: 运行全量测试**

Run: `npm test`
Expected: 所有测试通过（spaced-record.test.ts、count-bug.test.ts、mastered-count.test.ts）

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功，无报错

- [ ] **Step 4: 手动验证清单（可选，需启动 dev server）**

Run: `npm run dev`

验证项：
1. **字根入门**：答对同一字根 3 次（非 2 次）才进 masteredPool；前 5 个掌握后第 6 个正常出现
2. **整字入门**：500 字能完整循环；前 5 个掌握后第 6 个正常出现
3. **清除进度**：字根/整字清除后进度条归零，可重新练习
4. **完成弹窗**：全部掌握后弹窗正常渲染（Trophy/CheckCircle2/Target 图标显示）
5. **重新练习**：从完成弹窗点"重新练习"后，进度条归零，能正常出题
6. **词组练习**：第一题显示 5%（1/20），最后一题显示 100%（20/20）

- [ ] **Step 5: 最终 commit（如有遗漏）**

如所有验证通过，无需额外 commit。如发现遗漏，修复后 commit。

---

## Self-Review 结果

### Spec 覆盖检查
- ✅ 修复 1（SPACED_RECORD 路由）→ Task 1
- ✅ 修复 2（删除 +1）→ Task 1（与修复 1 合并，因同一段代码）
- ✅ 修复 3（masteredPool 门控）→ Task 2
- ✅ 修复 4（step 1 就地提升）→ Task 3
- ✅ 修复 5（WHOLE_CHAR_RESET_MODE）→ Task 4
- ✅ 修复 6（clearProgress 清全局）→ Task 5（PracticePage）+ Task 6（WholeCharPracticePage）
- ✅ 修复 7（补图标导入）→ Task 5
- ✅ 修复 8（统一完成检查）→ Task 6
- ✅ 修复 9（词组进度条）→ Task 7

### 占位符扫描
- 无 TBD/TODO
- 每个 step 都有具体代码或具体命令

### 类型一致性
- `resetMode` 在 Task 4 定义，Task 6 使用 ✓
- `resetRootProgress` 在 Task 5 Step 3 中通过解构重命名引入，避免与 usePracticeSession 的 `reset` 冲突 ✓
- `WHOLE_CHAR_RESET_MODE` action 类型在 Task 4 定义，hook 暴露 `resetMode`，Task 6 调用 ✓

### 注意事项
- Task 5 Step 3 需要执行者先确认 PracticePage 中 reset 的命名来源（可能是 `usePracticeSession.reset` 与 `useRootProgress.reset` 命名冲突）。已在 Step 3 中显式说明，并给出实际修复代码。
