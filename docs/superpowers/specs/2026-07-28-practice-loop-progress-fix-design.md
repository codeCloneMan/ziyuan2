# 练习循环与进度条修复设计

**日期**：2026-07-28
**主题**：修复三个练习页（字根 / 整字 / 词组）的进度条显示错误、循环提前终止及相关一致性问题

## 背景

用户反馈：完成一轮练习后进度条仍显示错误值；单字练习几个字后循环终止。审计发现之前的"混合概率策略"修复只改了表层，根本问题未动。本次修复精准命中 5 个独立根因。

## 目标

- 字根 / 整字练习能完整循环所有项目，不提前终止
- 进度条与全局掌握计数保持一致，清除/重启后正确归零
- 完成弹窗能正常渲染，触发时机正确
- 不破坏现有功能（词组练习、成就、统计）

## 非目标

- 不重构间隔学习为纯函数架构（YAGNI，回归风险高）
- 不调整 masteryThreshold（保持默认 3）
- 不改动成就系统、统计面板的数据源

## 架构

修复涉及 5 个文件，改动局部、互不依赖：

```
src/store/progress-store.ts      ← SPACED_RECORD 读对 correctCountMap；新增 WHOLE_CHAR_RESET_MODE
src/hooks/use-spaced-learning.ts ← masteredPool 概率门控；step 1 就地提升整批
src/pages/PracticePage.tsx       ← clearProgress/startPractice 清全局；补图标导入
src/pages/WholeCharPracticePage.tsx ← clearData/startPractice 清全局；统一完成检查
src/pages/PhrasePracticePage.tsx ← 进度条 off-by-one
```

## 详细设计

### 修复 1（P0）：SPACED_RECORD 读对 correctCountMap

**文件**：`src/store/progress-store.ts`，SPACED_RECORD reducer（约 L371）

**现状**：
```ts
const oldCorrectCount = state.root.correctCountMap[itemId] || 0;
const globalCorrectCount = isCorrect ? oldCorrectCount + 1 : oldCorrectCount;
```

**问题**：硬编码读 `state.root.correctCountMap`。整字练习的全局进度存在 `state.wholeChar.modes[modeKey].correctCountMap`，导致整字练习中 `globalCorrectCount` 永远为 1，项目永远无法掌握。

**修复**：按 `poolKey` 前缀选择正确的 map：
- `poolKey.startsWith('whole:')` → 从 `state.wholeChar.modes[poolKey]?.correctCountMap` 读取
- 否则 → 从 `state.root.correctCountMap` 读取

同时删除错误的 `+1`（见修复 2）。

### 修复 2（P1）：删除 off-by-one 双重计数

**文件**：`src/store/progress-store.ts`，SPACED_RECORD reducer（约 L369-L372）

**现状**：
```ts
// 注释声称：ROOT_ANSWER 和 SPACED_RECORD 在同一批次执行，state 未更新
const oldCorrectCount = state.root.correctCountMap[itemId] || 0;
const globalCorrectCount = isCorrect ? oldCorrectCount + 1 : oldCorrectCount;
```

**问题**：注释的假设错误。`dispatch` 是同步的（L624-L628），调用顺序为 `recordAnswer` → `spaced.recordResult`，第二步读到的已是 +1 后的值，再 `+1` 即双重计数。阈值 3 实际答对 2 次就掌握。违反 `project_memory.md` 硬约束。

**修复**：删除 `+1` 与错误注释，直接用读取到的 `oldCorrectCount`（已同步更新）作为 `globalCorrectCount`。结合修复 1，从正确的 map 读取最新值。

### 修复 3（P0）：masteredPool 分支加概率门控

**文件**：`src/hooks/use-spaced-learning.ts`，`getNextItem`（约 L92）

**现状**：
```ts
if (p.masteredPool.length > 0) {
  // ... 混合概率策略选哪个 ...
  return ...;  // 必定 return，activePool 永远被跳过
}
```

**问题**：`reviewProbability = 0.1`（设计意图：10% 概率复习已掌握项）在 `getNextItem` 中从未被引用。只要 masteredPool 非空，activePool 中的未掌握项永远不再出现。

**修复**：在 masteredPool 分支开头加门控，但区分 activePool 是否为空两种情况：
```ts
if (p.masteredPool.length > 0) {
  // activePool 有货时，按 reviewProbability 概率进入复习分支（默认 10%）
  // activePool 空时，必须从 masteredPool 选（兜底，避免无题可出）
  const shouldReviewMastered = p.activePool.length === 0 || Math.random() < p.reviewProbability;
  if (shouldReviewMastered) {
    // ... 现有 dueForReview 逻辑（到期的复习项优先）...
    if (dueForReview.length > 0) { return dueForReview[0]; }
    // ... 现有混合概率策略（30%/40%/30%）选哪个已掌握项 ...
    return ...;
  }
}
// fall through 到 activePool 分支
```

**关键点**：`reviewProbability` 门控同时覆盖 dueForReview 和混合概率两个子分支。activePool 为空时跳过门控（兜底），避免无题可出。

### 修复 4（P2）：step 1 就地提升整批 pending 项

**文件**：`src/hooks/use-spaced-learning.ts`，`getNextItem` step 1（约 L86-L89）

**现状**：
```ts
if (p.activePool.length === 0 && p.pendingPool.length > 0) {
  const toAdd = p.pendingPool.slice(0, p.newItemsPerRound);
  if (toAdd.length > 0) return toAdd[0];  // 只返回，不修改池
}
```

**问题**：借出 1 项不修改池 → SPACED_RECORD 的 defense block 把它加入 activePool → activePool 不为空 → 自动补充不触发 → 其余 pending 项永远卡住，且该项同时留在 pendingPool（状态腐化）。

**修复**：就地提升整批到 activePool 并从 pendingPool 移除：
```ts
if (p.activePool.length === 0 && p.pendingPool.length > 0) {
  const promoteCount = Math.min(p.newItemsPerRound, p.pendingPool.length);
  const promoted = p.pendingPool.slice(0, promoteCount);
  p.activePool = [...p.activePool, ...promoted];
  p.pendingPool = p.pendingPool.slice(promoteCount);
  for (const id of promoted) {
    if (!p.items[id]) {
      p.items[id] = { id, consecutiveCorrect: 0, isMastered: false, lastPracticeTime: 0, totalAttempts: 0, wrongCount: 0, stability: 30 };
    }
  }
  // 仍返回第一个用于本题
  return promoted[0];
}
```

注意：`poolRef.current` 是可变引用，直接修改即可触发后续读取。SPACED_RECORD 中的 defense block 保留作为兜底（万一其他路径漏提升），但因 step 1 已提升，defense block 的 `if (!item)` 分支不再触发。

### 修复 5（P1）：新增 WHOLE_CHAR_RESET_MODE action

**文件**：`src/store/progress-store.ts`

**现状**：只有 `ROOT_RESET` 和核弹式 `clearAllProgress`，无法只清单个 wholeChar mode 的进度。

**修复**：
1. `ProgressAction` 联合类型新增：`| { type: 'WHOLE_CHAR_RESET_MODE'; mode: string }`
2. reducer 新增 case：删除 `state.wholeChar.modes[mode]`（`delete modes[mode]`），下次 WHOLE_CHAR_ANSWER 会自动重建默认结构
3. hook 暴露 `resetMode: (mode: string) => dispatch({ type: 'WHOLE_CHAR_RESET_MODE', mode })`

**默认 mode 结构**（与 WHOLE_CHAR_ANSWER 中 mode 不存在时创建的一致）：
```ts
{ correctCountMap: {}, wrongCountMap: {}, totalAttempts: 0, totalCorrect: 0, streak: 0, bestStreak: 0, lastPracticeAt: 0 }
```

### 修复 6（P1）：clearProgress / startPractice 清全局 correctCountMap

**文件**：`src/pages/PracticePage.tsx`、`src/pages/WholeCharPracticePage.tsx`

**PracticePage.tsx**：
- `clearProgress`：入门模式额外 dispatch `ROOT_RESET`；进阶模式也 dispatch `ROOT_RESET`（移除 `if (isBeginner)` 条件）
- `startPractice`（从完成弹窗"重新练习"调用）：同上，dispatch `ROOT_RESET` 后再 `spaced.resetProgress()`

**WholeCharPracticePage.tsx**：
- `clearData`：dispatch `WHOLE_CHAR_RESET_MODE`（mode = `modeKey`）+ `spaced.resetProgress()`
- `startPractice`：同上

### 修复 7（P1）：PracticePage 补图标导入

**文件**：`src/pages/PracticePage.tsx` L13

**现状**：`import { Play, Sparkles, GraduationCap, Trash2 } from 'lucide-react';`

**修复**：补 `Trophy, CheckCircle2, Target`：
```ts
import { Play, Sparkles, GraduationCap, Trash2, Trophy, CheckCircle2, Target } from 'lucide-react';
```

### 修复 8（P2）：统一 WholeCharPracticePage 完成检查

**文件**：`src/pages/WholeCharPracticePage.tsx`，`generateNext`（约 L194-L195）

**现状**：完成检查用 `Object.values(correctCountMap).filter(c => c >= 3).length`，统计所有历史数据；进度条用 `learningPool.filter(ch => correctCountMap[ch] >= 3).length`，只统计 learningPool 内。

**修复**：完成检查改用与进度条相同的计算：
```ts
const masteredCount = learningPool.filter(ch => (currentCorrectMap[ch] || 0) >= 3).length;
if (masteredCount === learningPool.length) { /* 完成弹窗 */ }
```

### 修复 9（P3）：PhrasePracticePage 进度条 off-by-one

**文件**：`src/pages/PhrasePracticePage.tsx` L274-L275

**现状**：`(currentIndex / phraseQueue.length) * 100` → 第一题 0%，最后一题 95%。

**修复**：`((currentIndex + 1) / phraseQueue.length) * 100`

## 数据流

### 答题流程（修复后）

```
用户答题
  ↓
PracticePage.handleKeyPress
  ↓
recordAnswer(char, isCorrect)        ① dispatch ROOT_ANSWER / WHOLE_CHAR_ANSWER（同步更新 correctCountMap）
  ↓
spaced.recordResult(char, isCorrect) ② dispatch SPACED_RECORD
  ↓
SPACED_RECORD reducer:
  - 按 poolKey 前缀读正确的 correctCountMap（修复 1）
  - 直接用读取值（已同步更新，不再 +1）（修复 2）
  - 判定 isNowMastered → 移动 activePool → masteredPool
  - 自动补充（activePool 空 + pendingPool 有货）
  ↓
submit(isCorrect, key) → onCorrect/onWrong → generateNext/nextRoot
  ↓
getNextItem:
  - step 1: activePool 空 + pendingPool 有货 → 就地提升整批（修复 4）
  - step 2: masteredPool 非空 && Math.random() < reviewProbability → 选已掌握项复习（修复 3）
  - step 3: 否则从 activePool 加权随机
```

### 清除/重启流程（修复后）

```
用户点"清除进度"或"重新练习"
  ↓
clearProgress / startPractice
  ↓
dispatch ROOT_RESET / WHOLE_CHAR_RESET_MODE（清全局 correctCountMap）（修复 5/6）
  ↓
spaced.resetProgress()（清间隔池）
  ↓
reset() + start()
  ↓
masteredCount === 0（不再误判完成）
  ↓
getNextItem 从 pendingPool 提升首批 → 正常练习
```

## 错误处理

- 所有修复保持现有 try/catch 边界不变
- `WHOLE_CHAR_RESET_MODE` 处理 mode 不存在的情况（no-op）
- step 1 就地提升时，若 `promoted` 为空则不修改池（避免 NaN/undefined）
- masteredPool 概率门控 fallthrough 到 activePool；若 activePool 也空，仍走 masteredPool 兜底（避免无题可出）

## 测试

### 现有测试
- `src/lib/count-bug.test.ts`：累计计数 bug
- `src/lib/mastered-count.test.ts`：掌握计数
- 运行 `npm test` 确保不回归

### 手动验证清单
1. **字根入门**：答对 3 次（非 2 次）才掌握；前 5 个字根掌握后，第 6 个字根正常出现
2. **整字入门**：500 字能完整循环；前 5 个字掌握后，第 6 个字正常出现
3. **清除进度**：字根/整字清除后进度条归零，可重新练习
4. **完成弹窗**：全部掌握后弹窗正常渲染（Trophy/CheckCircle2/Target 图标显示）
5. **重新练习**：从完成弹窗点"重新练习"后，进度条归零，能正常出题
6. **词组练习**：第一题显示 5%（1/20），最后一题显示 100%（20/20）

## 影响范围

| 文件 | 改动类型 | 回归风险 |
|------|---------|---------|
| progress-store.ts | 修 SPACED_RECORD + 新增 action | 中（核心逻辑） |
| use-spaced-learning.ts | 修 getNextItem | 中（核心逻辑） |
| PracticePage.tsx | 清全局 + 补导入 | 低 |
| WholeCharPracticePage.tsx | 清全局 + 统一完成检查 | 低 |
| PhrasePracticePage.tsx | 进度条 +1 | 极低 |

## 风险与缓解

- **风险**：修复 3（概率门控）可能让已掌握项复习频率低于预期。
  **缓解**：`reviewProbability = 0.1` 是设计意图，保持不变；dueForReview 逻辑保留，到期项仍优先复习。
- **风险**：修复 4（就地提升）修改了 `poolRef.current`，可能与 React 状态管理冲突。
  **缓解**：`poolRef` 是 useRef，本就是可变引用；现有代码也直接修改它（如 SPACED_RECORD reducer 中）。
- **风险**：修复 2（删除 +1）可能让字根练习掌握变慢。
  **缓解**：这才是正确行为——之前是 bug（答对 2 次就掌握）。
