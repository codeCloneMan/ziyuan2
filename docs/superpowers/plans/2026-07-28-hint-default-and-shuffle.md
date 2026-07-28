# 整字首次提示默认开启 & 所有练习乱序修正 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复整字练习首次提示开关默认关闭的问题（通过版本迁移强制开启），并在所有练习模式中增强乱序性（入门模式批次内洗牌、进阶/词组模式队列回绕时重洗）。

**Architecture:** 三处独立改动：(1) `progress-store.ts` 升级版本号并在迁移函数中重置 hint 偏好；(2) `use-spaced-learning.ts` 在提升新批次时洗牌；(3) 三个练习页（PracticePage / WholeCharPracticePage / PhrasePracticePage）在队列回绕时重新洗牌。

**Tech Stack:** React + TypeScript + Zustand-like store + Vitest

---

## File Structure

- `src/store/progress-store.ts`（修改）：版本号升级 + 迁移函数补充 hint 重置
- `src/hooks/use-spaced-learning.ts`（修改）：新增 `shuffleInPlace` 工具函数 + `getNextItem` 批次内洗牌
- `src/pages/PracticePage.tsx`（修改）：`nextRoot` 进阶分支队列回绕时重洗
- `src/pages/WholeCharPracticePage.tsx`（修改）：`generateNext` 进阶分支队列回绕时重洗
- `src/pages/PhrasePracticePage.tsx`（修改）：`advancePhrase` 队列回绕时重洗
- `src/lib/spaced-record.test.ts`（修改）：新增批次内洗牌的单元测试

---

### Task 1: 版本迁移强制开启 hint 偏好

**Files:**
- Modify: `src/store/progress-store.ts:116` (CURRENT_VERSION)
- Modify: `src/store/progress-store.ts:615` (migrateFromOld return 前)
- Test: `src/lib/spaced-record.test.ts`

- [ ] **Step 1: 写失败测试 — 验证迁移后 hint 偏好为 true**

在 `src/lib/spaced-record.test.ts` 末尾新增测试块：

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/lib/spaced-record.test.ts`
Expected: FAIL — 新测试失败（因为迁移函数还没修改，version 仍是 3，hint 不会被重置）

- [ ] **Step 3: 修改 CURRENT_VERSION**

在 `src/store/progress-store.ts` 第 116 行：

```typescript
// 修改前
const CURRENT_VERSION = 3;

// 修改后
const CURRENT_VERSION = 4;
```

- [ ] **Step 4: 在 migrateFromOld 末尾添加 hint 重置**

在 `src/store/progress-store.ts` 的 `migrateFromOld` 函数中，`return normalizeState(state);` 之前（约第 615 行）添加：

```typescript
  // ============================================
  // v4 迁移：强制开启所有"首次提示"开关
  // 旧版本中部分用户的 hint 偏好被持久化为 false，
  // 导致默认看不到首次提示。迁移时统一重置为 true。
  // ============================================
  state.preferences.showHint = true;
  state.preferences.wholeCharShowHint = true;
  state.preferences.phraseShowHint = true;

  return normalizeState(state);
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx vitest run src/lib/spaced-record.test.ts`
Expected: PASS — 所有测试通过

- [ ] **Step 6: 提交**

```bash
git add src/store/progress-store.ts src/lib/spaced-record.test.ts
git commit -m "fix: 版本迁移强制开启首次提示开关 (v3→v4)"
```

---

### Task 2: 入门模式批次内洗牌

**Files:**
- Modify: `src/hooks/use-spaced-learning.ts:1-15` (新增 shuffleInPlace)
- Modify: `src/hooks/use-spaced-learning.ts:88-107` (getNextItem 提升新批次分支)
- Test: `src/lib/spaced-record.test.ts`

- [ ] **Step 1: 写失败测试 — 验证批次提升时返回的字根在多次运行中有差异**

在 `src/lib/spaced-record.test.ts` 末尾新增测试块：

```typescript
describe('入门模式批次内洗牌', () => {
  it('提升新批次时返回的第一个字根在多次运行中存在差异（随机性验证）', () => {
    // 准备一个足够大的 allItemIds，使多次随机抽样能产生不同结果
    const allItemIds = Array.from({ length: 50 }, (_, i) => `字${i}`);
    const poolKey = 'test:shuffle';

    let state = createDefaultState();

    // 初始化池（SPACED_RESET 会创建默认池，前5个进 activePool，其余进 pendingPool）
    state = reducer(state, { type: 'SPACED_RESET', poolKey, allItemIds });

    // 把 activePool 清空（模拟所有活跃项都掌握了），触发 getNextItem 走"提升新批次"分支
    // 通过连续答对 3 次让前 5 项全部掌握
    const pool = state.spacedPools[poolKey];
    const initialActive = [...pool.activePool];
    for (const id of initialActive) {
      state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId: id, isCorrect: true, allItemIds });
      state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId: id, isCorrect: true, allItemIds });
      state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId: id, isCorrect: true, allItemIds });
    }

    // 此时 activePool 应为空，pendingPool 应有 45 项
    const poolAfterMaster = state.spacedPools[poolKey];
    expect(poolAfterMaster.activePool.length).toBe(0);
    expect(poolAfterMaster.pendingPool.length).toBe(45);

    // 直接测试 createDefaultPool 的洗牌行为（因为 getNextItem 在 hook 中，无法直接调用）
    // 这里验证 SPACED_RESET 多次执行后，activePool 的第一个元素存在差异
    const firstItems = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const s = reducer(createDefaultState(), { type: 'SPACED_RESET', poolKey, allItemIds });
      firstItems.add(s.spacedPools[poolKey].activePool[0]);
    }
    // 20 次随机洗牌后，第一个元素应该至少有 2 种不同的值
    // （理论上 50 选 1，20 次几乎不可能全相同）
    expect(firstItems.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: 运行测试验证现状**

Run: `npx vitest run src/lib/spaced-record.test.ts`
Expected: 可能 PASS（因为 `createDefaultPool` 已经有洗牌）。如果 PASS，说明 `createDefaultPool` 的洗牌已生效，但 `getNextItem` 中提升新批次时的 `promoted[0]` 仍然是 `pendingPool.slice(0, 5)` 的第一个，没有再次洗牌。

调整测试为验证 `getNextItem` 的提升行为（通过模拟 activePool 清空后 SPACED_RECORD 的自动提升）：

```typescript
  it('SPACED_RECORD 自动提升新批次时，提升的 5 项在多次重置后存在顺序差异', () => {
    const allItemIds = Array.from({ length: 50 }, (_, i) => `字${i}`);
    const poolKey = 'test:shuffle2';

    // 多次重置池，观察自动提升后的 activePool 顺序
    const promotedOrders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      let state = createDefaultState();
      state = reducer(state, { type: 'SPACED_RESET', poolKey, allItemIds });

      // 把初始 activePool 全部掌握，触发 SPACED_RECORD 中的自动提升
      const pool = state.spacedPools[poolKey];
      const initialActive = [...pool.activePool];
      for (const id of initialActive) {
        state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId: id, isCorrect: true, allItemIds });
        state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId: id, isCorrect: true, allItemIds });
        state = reducer(state, { type: 'SPACED_RECORD', poolKey, itemId: id, isCorrect: true, allItemIds });
      }

      // 自动提升后的新 activePool 的拼接字符串作为"顺序指纹"
      const newActive = state.spacedPools[poolKey].activePool;
      promotedOrders.add(newActive.join(','));
    }
    // 20 次后应该至少有 2 种不同的顺序
    expect(promotedOrders.size).toBeGreaterThan(1);
  });
```

- [ ] **Step 3: 在 use-spaced-learning.ts 顶部新增 shuffleInPlace**

在 `src/hooks/use-spaced-learning.ts` 第 16 行（`MIN_COOLDOWN_MS` 定义之后）添加：

```typescript
/** 就地洗牌（Fisher-Yates），用于入门模式提升新批次时打乱顺序 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

- [ ] **Step 4: 在 getNextItem 提升新批次分支添加洗牌**

在 `src/hooks/use-spaced-learning.ts` 的 `getNextItem` 中（约第 88-107 行），修改提升新批次的代码块：

```typescript
// 修改前
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

// 修改后
if (p.activePool.length === 0 && p.pendingPool.length > 0) {
  const promoteCount = Math.min(p.newItemsPerRound, p.pendingPool.length);
  const promoted = p.pendingPool.slice(0, promoteCount);
  shuffleInPlace(promoted); // 批次内随机顺序，避免固定顺序
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

- [ ] **Step 5: 运行测试验证通过**

Run: `npx vitest run src/lib/spaced-record.test.ts`
Expected: PASS

- [ ] **Step 6: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add src/hooks/use-spaced-learning.ts src/lib/spaced-record.test.ts
git commit -m "feat: 入门模式提升新批次时洗牌，避免固定顺序"
```

---

### Task 3: 字根练习进阶模式队列回绕时重洗

**Files:**
- Modify: `src/pages/PracticePage.tsx:122-133` (nextRoot 进阶分支)

- [ ] **Step 1: 修改 nextRoot 进阶分支**

在 `src/pages/PracticePage.tsx` 的 `nextRoot` 函数中，进阶分支（约第 122-133 行），在 `shuffleIndexRef.current` 更新后添加回绕重洗：

```typescript
// 修改前
} else {
  shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
  nextChar = shuffleQueueRef.current[shuffleIndexRef.current];
}

// 修改后
} else {
  shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
  // 回绕到 0 时重新洗牌，避免每轮顺序相同导致强行记忆
  if (shuffleIndexRef.current === 0) {
    shuffleQueueRef.current = shuffleInPlace([...shuffleQueueRef.current]);
  }
  nextChar = shuffleQueueRef.current[shuffleIndexRef.current];
}
```

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/pages/PracticePage.tsx
git commit -m "feat: 字根进阶模式队列回绕时重新洗牌"
```

---

### Task 4: 整字练习进阶模式队列回绕时重洗

**Files:**
- Modify: `src/pages/WholeCharPracticePage.tsx:226-234` (generateNext 进阶分支)

- [ ] **Step 1: 修改 generateNext 进阶分支**

在 `src/pages/WholeCharPracticePage.tsx` 的 `generateNext` 函数中，进阶分支（约第 226-234 行），在 `shuffleIndexRef.current` 更新后添加回绕重洗：

```typescript
// 修改前
} else {
  // 进阶：按洗牌队列顺序循环
  if (shuffleQueueRef.current.length === 0) {
    shuffleQueueRef.current = shuffleInPlace([...learningPool]);
    shuffleIndexRef.current = 0;
  } else {
    shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
  }
  nextId = shuffleQueueRef.current[shuffleIndexRef.current];
}

// 修改后
} else {
  // 进阶：按洗牌队列顺序循环
  if (shuffleQueueRef.current.length === 0) {
    shuffleQueueRef.current = shuffleInPlace([...learningPool]);
    shuffleIndexRef.current = 0;
  } else {
    shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
    // 回绕到 0 时重新洗牌，避免每轮顺序相同
    if (shuffleIndexRef.current === 0) {
      shuffleQueueRef.current = shuffleInPlace([...shuffleQueueRef.current]);
    }
  }
  nextId = shuffleQueueRef.current[shuffleIndexRef.current];
}
```

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/pages/WholeCharPracticePage.tsx
git commit -m "feat: 整字进阶模式队列回绕时重新洗牌"
```

---

### Task 5: 词组练习队列回绕时重洗

**Files:**
- Modify: `src/pages/PhrasePracticePage.tsx:203-217` (advancePhrase)

- [ ] **Step 1: 修改 advancePhrase**

在 `src/pages/PhrasePracticePage.tsx` 的 `advancePhrase` 函数中（约第 203-217 行），在 `nextIndex === 0` 时重新洗牌：

```typescript
// 修改前
const advancePhrase = useCallback(() => {
  // 优先取错题（已隔 ≥3 步）
  wrongQueueRef.current = wrongQueueRef.current.map(w => ({ ...w, step: w.step + 1 }));
  const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
  if (dueWrong) {
    wrongQueueRef.current = wrongQueueRef.current.filter(w => w !== dueWrong);
    setCurrentPhrase(dueWrong.phrase);
    setInputCode('');
    return;
  }
  const nextIndex = (currentIndex + 1) % phraseQueue.length;
  setCurrentIndex(nextIndex);
  setCurrentPhrase(phraseQueue[nextIndex]);
  setInputCode('');
}, [currentIndex, phraseQueue]);

// 修改后
const advancePhrase = useCallback(() => {
  // 优先取错题（已隔 ≥3 步）
  wrongQueueRef.current = wrongQueueRef.current.map(w => ({ ...w, step: w.step + 1 }));
  const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
  if (dueWrong) {
    wrongQueueRef.current = wrongQueueRef.current.filter(w => w !== dueWrong);
    setCurrentPhrase(dueWrong.phrase);
    setInputCode('');
    return;
  }
  const nextIndex = (currentIndex + 1) % phraseQueue.length;
  if (nextIndex === 0) {
    // 回绕时重新洗牌，避免每轮顺序相同
    const reshuffled = shuffleArray(phraseQueue);
    setPhraseQueue(reshuffled);
    setCurrentIndex(0);
    setCurrentPhrase(reshuffled[0]);
    setInputCode('');
    return;
  }
  setCurrentIndex(nextIndex);
  setCurrentPhrase(phraseQueue[nextIndex]);
  setInputCode('');
}, [currentIndex, phraseQueue]);
```

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/pages/PhrasePracticePage.tsx
git commit -m "feat: 词组练习队列回绕时重新洗牌"
```

---

### Task 6: 全量验证

- [ ] **Step 1: 运行全部测试**

Run: `npx vitest run`
Expected: 所有测试通过

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: 手动验证（可选）**

启动开发服务器，验证：
1. 清空 localStorage 后访问应用，三个 hint 开关都是开启状态
2. 在已有 localStorage 的环境下刷新，开关被迁移为开启
3. 入门模式练习：每批 5 个新字根的第一个每次不同
4. 进阶模式练习：队列走完一轮后第二轮顺序不同
5. 词组练习：队列走完一轮后第二轮顺序不同
