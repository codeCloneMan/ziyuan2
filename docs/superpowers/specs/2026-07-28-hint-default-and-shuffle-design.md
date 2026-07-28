# 整字首次提示默认开启 & 所有练习乱序修正 — 设计文档

## 背景

用户反馈两个问题：

1. **整字练习的"首次提示"开关默认是关闭的**：`defaultPreferences.wholeCharShowHint = true` 在代码层面是正确的，但已经持久化到 localStorage 的旧值（`false`）会通过 `normalizeState` 保留，导致用户看到开关处于关闭状态。词组练习的 `phraseShowHint` 和字根练习的 `showHint` 同样可能受影响。

2. **所有练习模式题目顺序固定，缺乏随机性**：
   - **入门模式**：`getNextItem` 在提升新批次到 `activePool` 时，总是返回 `promoted[0]`，导致同一批 5 个新字根内部顺序固定。
   - **进阶模式（字根/整字）**：预洗牌队列走完一轮后，`(index+1) % length` 回绕到 0，但队列本身不重新洗牌，导致第二轮与第一轮顺序完全相同，用户会形成"强行记忆"。
   - **词组练习**：`phraseQueue` 同样在回绕时不重新洗牌。

## 目标

- 所有用户的"首次提示"开关默认为开启状态（一次迁移，用户仍可手动关闭）。
- 入门模式每批新字根内部顺序随机。
- 进阶模式与词组练习每轮回绕时重新洗牌，避免顺序重复。

## 非目标

- 不改变间隔学习算法的核心（仍保留 pendingPool/activePool/masteredPool 三池结构和遗忘曲线复习）。
- 不改变错题重练队列的 3 步间隔策略。
- 不引入新的 UI 元素或新增设置项。

## 设计

### 1. 默认提示开关迁移

**文件**：`src/store/progress-store.ts`

- `CURRENT_VERSION`: `3` → `4`
- `STORAGE_KEY`: 保持 `ziyuan-progress-v3`（避免数据丢失，依靠 `version` 字段触发迁移）
- 在 `migrateFromOld` 末尾、`return normalizeState(state)` 之前，显式覆盖三个偏好：
  ```ts
  state.preferences.showHint = true;
  state.preferences.wholeCharShowHint = true;
  state.preferences.phraseShowHint = true;
  ```
- `loadFromStorage` 中 `parsed.version === CURRENT_VERSION` 检查会自动识别旧 v3 数据并走迁移分支。
- `normalizeState` 中的合并逻辑 `{ ...defaults.preferences, ...partial.preferences }` 不变，因为迁移后的 `state.preferences` 已经包含 `true` 值。

### 2. 入门模式：批次内洗牌

**文件**：`src/hooks/use-spaced-learning.ts`

`getNextItem` 中提升新项到 `activePool` 的分支（约 line 88-107），在 `return promoted[0]` 之前对 `promoted` 就地洗牌：

```ts
if (p.activePool.length === 0 && p.pendingPool.length > 0) {
  const promoteCount = Math.min(p.newItemsPerRound, p.pendingPool.length);
  const promoted = p.pendingPool.slice(0, promoteCount);
  shuffleInPlace(promoted);  // ← 新增：批次内随机顺序
  p.activePool = [...p.activePool, ...promoted];
  p.pendingPool = p.pendingPool.slice(promoteCount);
  for (const id of promoted) {
    if (!p.items[id]) {
      p.items[id] = { /* ... */ };
    }
  }
  return promoted[0];  // 现在是洗牌后的第一个
}
```

需要在文件顶部新增 `shuffleInPlace` 工具函数（或从 `@/lib/utils` 导入，但当前 utils 中无此函数，为避免循环依赖，在本文件内定义一个本地版本）。

### 3. 进阶模式：队列回绕时重洗

**文件 1**：`src/pages/PracticePage.tsx`（字根进阶）

`nextRoot` 中进阶分支（约 line 122-133）：

```ts
} else {
  // 优先取错题（已隔 ≥3 步）
  wrongQueueRef.current = wrongQueueRef.current.map(w => ({ ...w, step: w.step + 1 }));
  const dueWrong = wrongQueueRef.current.find(w => w.step >= 3);
  if (dueWrong) {
    wrongQueueRef.current = wrongQueueRef.current.filter(w => w !== dueWrong);
    nextChar = dueWrong.char;
  } else {
    shuffleIndexRef.current = (shuffleIndexRef.current + 1) % shuffleQueueRef.current.length;
    // 回绕到 0 时重新洗牌，避免每轮顺序相同
    if (shuffleIndexRef.current === 0) {
      shuffleQueueRef.current = shuffleInPlace([...shuffleQueueRef.current]);
    }
    nextChar = shuffleQueueRef.current[shuffleIndexRef.current];
  }
}
```

**文件 2**：`src/pages/WholeCharPracticePage.tsx`（整字进阶）

`generateNext` 中进阶分支（约 line 219-235），同样在 `shuffleIndexRef.current` 回绕到 0 时重新洗牌。

### 4. 词组练习：队列回绕时重洗

**文件**：`src/pages/PhrasePracticePage.tsx`

`advancePhrase`（约 line 203-217）：

```ts
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

## 数据流

1. **迁移触发**：用户首次加载新版本 → `loadFromStorage` 读到 v3 数据 → `migrateFromOld` 执行 → 三个 hint 字段被强制设为 `true` → `saveToStorage` 持久化 v4 状态。
2. **入门模式切题**：`getNextItem` → 检测 `activePool` 空 → 从 `pendingPool` 取 5 项 → 就地洗牌 → 返回第一个 → 后续 4 项按权重随机出现（已有逻辑）。
3. **进阶模式切题**：`nextRoot`/`generateNext` → `shuffleIndex++` → 检测回绕到 0 → 重新洗牌队列 → 取新队列的第 0 项。
4. **词组切题**：`advancePhrase` → `nextIndex === 0` → 重新洗牌 → 设置新队列和第 0 项。

## 测试策略

1. **手动验证**：
   - 清空 localStorage 后访问应用，确认三个 hint 开关都是开启状态。
   - 在已有 localStorage 的环境（v3 数据）下刷新，确认开关被迁移为开启。
   - 入门模式练习：观察每批 5 个新字根的第一个是否每次不同。
   - 进阶模式练习：让队列走完一轮（或缩短 `learningPool` 加速验证），确认第二轮顺序与第一轮不同。
   - 词组练习：让队列走完一轮，确认第二轮顺序与第一轮不同。

2. **单元测试**（如时间允许）：
   - 在 `spaced-record.test.ts` 中添加用例：调用 `getNextItem` 多次，验证提升新批次时返回的第一个字根在多次运行中存在差异（用 `Math.random` mock 或统计分布）。

## 风险与缓解

- **风险**：版本迁移会覆盖用户手动关闭的 hint 设置。
  **缓解**：这是用户明确要求的行为；用户仍可在设置面板手动关闭。
- **风险**：进阶模式回绕时重洗可能让用户感觉"还没练完一轮就乱了"。
  **缓解**：重洗只发生在 `index === 0` 时，即一轮完整走完后才重洗，不会中途打断。
- **风险**：词组练习 `setPhraseQueue(reshuffled)` 会触发 React 重渲染。
  **缓解**：词组池最多 5000 项，重渲染成本可接受；且只在回绕时发生一次。

## 影响范围

- `src/store/progress-store.ts`：版本号、迁移函数。
- `src/hooks/use-spaced-learning.ts`：新增 `shuffleInPlace`、修改 `getNextItem`。
- `src/pages/PracticePage.tsx`：修改 `nextRoot` 进阶分支。
- `src/pages/WholeCharPracticePage.tsx`：修改 `generateNext` 进阶分支。
- `src/pages/PhrasePracticePage.tsx`：修改 `advancePhrase`。
