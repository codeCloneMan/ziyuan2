# 字源形码练习模块重构计划

## 摘要

当前项目（`d:\code_vs\ziyuan2`）是一个基于 React + Vite + Tailwind 的字源形码学习工具，功能已比较完整，但正处于一次"统一状态层重构"的中间状态：新的 `progress-store.ts` 与 `use-learning-progress.ts` 已搭建，三个核心练习页（字根、整字、词组）尚未接入，导致数据孤岛、lint 错误堆积、练习模式逻辑混乱。本计划以"重新设计练习模式"为切入点，做一次彻底重构，目标是把应用改造成**好用、易学、好看、简洁明了**的字源形码学习工具。

重构顺序：**先修基础 bug/lint → 重设计练习模式 → 接入统一 Store → 接入成就等级 → 简化 UI/UX → 验证发布**。

## 现状分析

### 1. 统一状态层已成孤岛
- `src/store/progress-store.ts` 已定义完整 schema（root / wholeChar / phrase / spacedPools / achievements / preferences）及迁移逻辑，但：
  - `PracticePage.tsx` 仍用 `useLocalStorage('ziyuan-practice-v5', ...)` 自己存进度。
  - `WholeCharPracticePage.tsx` 仍用 `useLocalStorage('ziyuan-whole-char-v3', ...)`，且存在 `mode`、`freqMode`、`mustSplitMode` 三套互相干扰的状态。
  - `PhrasePracticePage.tsx` 完全未接入 Store，进度只保存在 `phrase-mode` 与组件本地 state。
- 结果是 `useLearningProgress()` 在首页计算出的阶段进度与真实练习数据不一致。

### 2. 练习模式逻辑不清
- **字根页**：声明了 `beginner | progressive | fullcode | weak` 四种 `PracticeStyle`，但 `getRootsForMode()` 直接返回全部字根，未做区分；`commonRootMappings` 被 import 但未用于"简体常用字根"练习。
- **整字页**：同时存在 `WholeCharMode`（progressive / progressive500）、`FreqMode`（top500 / top1000 / top1500 / all）、`mustSplitMode`，三者叠加造成学习池计算混乱，`setMode` 声明后未使用。
- **词组页**：仅有 `PhraseMode`（twoChar / threeChar / fourChar / mixed / sentence），模式本身清晰，但状态未持久化。

### 3. Lint 与运行时错误
- `npm run lint` 报 67 errors / 4 warnings，主要包括：
  - `PhrasePracticePage.tsx` 中 `exitPractice` 在声明前被使用（运行时 bug）。
  - `Layout.tsx`、`data-loader.ts`、`WholeCharPracticePage.tsx` 在 `useEffect` 内直接同步 `setState`。
  - `PracticePage.tsx` 在 render 阶段调用 `Date.now()`（`answerStartTime = useRef(Date.now())`）。
  - 大量未使用 import/变量（Badge、Progress、RootCharDisplay、Flame、Timer 等）。
- TypeScript 编译可通过，但代码处于未整理的重构中。

### 4. 成就/等级系统未接线
- `src/lib/achievements.ts` 定义了 8 级等级与 17 个成就，但全项目没有任何 import，UI 上无展示。

### 5. 数据加载与部署
- `src/lib/data-loader.ts` 使用绝对路径 `/data/charCodeData.json` 做 fetch；`vite.config.ts` 中 `base: './'`，部署在子路径时可能 404。
- 多个页面独立调用 `useCharCodeData()`，虽然内部有 cache，但缺少统一错误边界/预加载。

## 改动方案

### Phase 1：基础修复（让项目先回到可运行、可 lint 的状态）

#### 1.1 修复 lint 错误与明显 bug
**涉及文件：**
- `src/pages/PhrasePracticePage.tsx`
- `src/pages/PracticePage.tsx`
- `src/pages/WholeCharPracticePage.tsx`
- `src/components/Layout.tsx`
- `src/lib/data-loader.ts`

**做什么 & 为什么 & 怎么做：**
- **PhrasePracticePage.tsx**：`exitPractice` 在声明前被 `useEffect` 的键盘监听引用。将 `exitPractice` 声明上移到组件顶部，或把键盘监听 effect 放到声明之后。这是运行时 bug，必须先修。
- **PracticePage.tsx / WholeCharPracticePage.tsx / Layout.tsx**：`useEffect` 内直接同步 `setState`（如 `setCurrentRoot`）会造成额外 render。改为在 effect 内通过事件/条件触发，或拆分为初始化逻辑；对 `data-loader.ts` 中的同步 setState，使用 `queueMicrotask`/`setTimeout` 异步化。
- **PracticePage.tsx**：`answerStartTime = useRef(Date.now())` 在每次 render 都重置，导致答题计时失真。改为在 `nextRoot()` 或 `startPractice()` 中赋值，而不是 render 阶段。
- 删除所有未使用 import/变量（Badge、Progress、RootCharDisplay、Flame、Timer 等），先让 `npm run lint` 通过。

#### 1.2 修正数据加载路径
**涉及文件：** `src/lib/data-loader.ts`

**做什么 & 为什么 & 怎么做：**
- 把 `/data/charCodeData.json` 和 `/data/builtinPhrases.json` 改为基于 `import.meta.env.BASE_URL` 的相对路径：
  ```ts
  const base = import.meta.env.BASE_URL || '/';
  const url = `${base}data/charCodeData.json`.replace(/\/+/, '/');
  ```
- 这样 Hash Router + `base: './'` 部署到任意子路径时都能正确加载。

#### 1.3 修复字根数据重复 key
**涉及文件：** `src/data/roots.ts`

**做什么 & 为什么 & 怎么做：**
- `PUA_ROOTS` 对象存在重复 key `0x382F`（后一个会覆盖前一个）。检查字根图/码表，保留正确映射，删除重复项。

---

### Phase 2：练习模式重设计（本次重构核心）

#### 2.1 统一类型定义
**涉及文件：** `src/types/index.ts`（若不存在则新建 `src/types/practice.ts`）

**做什么 & 为什么 & 怎么做：**
- 定义清晰的练习域类型：
  ```ts
  export type RootPracticeMode = 'beginner' | 'progressive' | 'fullcode' | 'weak';
  export type CharSetRange = 'top500' | 'top1000' | 'top1500' | 'all';
  export type WholeCharFilter = 'all' | 'mustSplit' | 'weak';
  export type PhraseMode = 'twoChar' | 'threeChar' | 'fourChar' | 'mixed' | 'sentence';
  ```
- 这样三种练习页的模式语义不再互相污染，Store 也能按类型存取。

#### 2.2 重新设计字根练习模式
**涉及文件：** `src/pages/PracticePage.tsx`、`src/data/roots.ts`

**做什么 & 为什么 & 怎么做：**
- `beginner`：从 `commonRootMappings`（或精选的 30~50 个高频/易记字根）开始，每次 5 个新字根，掌握后再解锁下一批。解决"入门被 329 个字根吓退"的问题。
- `progressive`：基于全部 `practiceRootMappings` 做间隔重复，按字根使用频率排序出题（高频优先）。
- `fullcode`：全部 329 字根随机出题，用于总复习。
- `weak`：优先从 `wrongCountMap` 中按错误率排序出题；若弱项不足则补充未练习字根。
- 真正实现 `getRootsForMode(style)`，返回不同的字根列表，而不是全部返回。

#### 2.3 重新设计整字练习模式
**涉及文件：** `src/pages/WholeCharPracticePage.tsx`、`src/types/index.ts`

**做什么 & 为什么 & 怎么做：**
- 删除旧的 `WholeCharMode`（progressive / progressive500）与 `setMode` 的混淆。
- 采用两个正交维度：
  - **字集范围** `CharSetRange`：top500 / top1000 / top1500 / all
  - **过滤条件** `WholeCharFilter`：all / mustSplit / weak
- 学习池 = `charSetRange` 选出的字 × `filter` 过滤。
- 将 `freqMode` 与 `mustSplitMode` 合并为上述两个维度，UI 上用两个独立选择器呈现，避免用户困惑。

#### 2.4 词组练习模式保持，但持久化到 Store
**涉及文件：** `src/pages/PhrasePracticePage.tsx`

**做什么 & 为什么 & 怎么做：**
- 模式选择（twoChar / threeChar / fourChar / mixed / sentence）本身合理，保留。
- 答题结果通过 `PHRASE_ANSWER` action 写入 `progress-store`，使首页学习进度能感知到词组练习进展。

---

### Phase 3：统一状态层接入

#### 3.1 增强 progress-store 以支持新模式
**涉及文件：** `src/store/progress-store.ts`

**做什么 & 为什么 & 怎么做：**
- 在 `Preferences` 中新增模式偏好：
  ```ts
  rootMode: RootPracticeMode;
  charSetRange: CharSetRange;
  wholeCharFilter: WholeCharFilter;
  phraseMode: PhraseMode;
  ```
- 确保 `spacedPools` 的 key 与新模式一一对应，例如：
  - 字根：`root:beginner`、`root:progressive`、`root:fullcode`、`root:weak`
  - 整字：`whole:top500:all`、`whole:top500:mustSplit` 等
- 增加 `totalPoints` 聚合逻辑或提供 selector，让成就系统能读取跨模块总积分。
- 提供 `useAchievementsData()` 之类的 selector，返回 `AchievementData`（totalPoints / masteredRoots / totalAttempts / maxStreak / totalCorrect / practiceDays）。

#### 3.2 让间隔学习 Hook 与 Store 协同
**涉及文件：** `src/hooks/use-spaced-learning.ts`

**做什么 & 为什么 & 怎么做：**
- 当前 Hook 自己读写 localStorage，与 Store 的 `spacedPools` 重复。改为：
  - 从 Store 读取对应 pool；
  - `getNextItem()` / `recordResult()` 通过 Store 的 `SPACED_RECORD` 等 action 更新；
  - 首次无 pool 时由 Store 自动初始化（`createDefaultPool`）。
- 或者保留 Hook 作为纯算法封装，但禁止它再碰 localStorage，所有持久化走 Store。

#### 3.3 字根页接入 Store
**涉及文件：** `src/pages/PracticePage.tsx`

**做什么 & 为什么 & 怎么做：**
- 使用 `useRootProgress()` 与 `useSpacedPool('root:' + practiceMode, rootIds)` 替代 `useLocalStorage('ziyuan-practice-v5', ...)` 与独立的 `useSpacedLearning`。
- 答题正确/错误时 dispatch `ROOT_ANSWER`；需要间隔调度时 dispatch `SPACED_RECORD`。
- 删除 `ModePersistData` 中可由 Store 推导的字段（correctCountMap、wrongCountMap、totalStats 等），仅保留 UI 临时状态（如 `isPlaying`、`currentRootChar` 的会话恢复可选）。
- 保留 `dailyStats`、`totalPoints` 等到 Store 统一维护。

#### 3.4 整字页接入 Store
**涉及文件：** `src/pages/WholeCharPracticePage.tsx`

**做什么 & 为什么 & 怎么做：**
- 使用 `useWholeCharProgress()` 与 `useSpacedPool('whole:' + charSetRange + ':' + filter, charIds)`。
- 答题时 dispatch `WHOLE_CHAR_ANSWER`。
- 用 Store 的 `preferences` 保存 `charSetRange` 和 `wholeCharFilter`，而不是 localStorage 的多个 key。
- 简化 `WholeCharPersistData`，移除 `freqMode` / `mustSplitMode` 等旧字段。

#### 3.5 词组页接入 Store
**涉及文件：** `src/pages/PhrasePracticePage.tsx`

**做什么 & 为什么 & 怎么做：**
- 使用 `usePhraseProgress()` 记录答题；使用 `usePreferences()` 保存 `phraseMode`。
- 删除 `useLocalStorage('phrase-mode', ...)`。
- 每答完一题 dispatch `PHRASE_ANSWER`，让首页进度条能反映词组练习。

#### 3.6 修复首页进度计算
**涉及文件：** `src/hooks/use-learning-progress.ts`

**做什么 & 为什么 & 怎么做：**
- 确保 `useLearningProgress()` 只读取 `progress-store`，不读旧 localStorage key。
- 调整阶段阈值与模式对应关系：
  - 字根掌握进度仍按 `correctCountMap >= 3` 计算。
  - 整字进度按当前选定字集范围（默认 top500）的掌握数量计算。
  - 词组进度按 `phrase.totalAttempts` 与正确率计算。
- 让"下一步"推荐基于真实 Store 数据。

---

### Phase 4：成就与等级系统接入

#### 4.1 新增成就/等级 Hook
**涉及文件：** `src/lib/achievements.ts`（新增导出）、`src/hooks/use-achievements.ts`（新建）

**做什么 & 为什么 & 怎么做：**
- 在 `achievements.ts` 中新增 `computeAchievementData(state: ProgressState): AchievementData`，从 Store 聚合：
  - totalPoints = root.totalPoints（新增）+ wholeChar 各 mode 积分 + phrase 积分，或统一放到 Store 顶层
  - masteredRoots = root correctCountMap 中 >= 3 的数量
  - totalAttempts = root.totalAttempts + 整字总答题 + phrase.totalAttempts
  - maxStreak = root.bestStreak
  - totalCorrect = root.totalCorrect + ...
  - practiceDays = 有练习记录的日期数
- 新建 `useAchievements()`：
  - 订阅 Store；
  - 每次 Store 更新时计算已解锁成就；
  - 对未解锁但条件满足的新成就 dispatch `ACHIEVE`；
  - 返回当前等级、下一等级、最新解锁成就列表。

#### 4.2 在 Store 顶层维护总积分（建议）
**涉及文件：** `src/store/progress-store.ts`

**做什么 & 为什么 & 怎么做：**
- 在 `ProgressState` 顶层新增 `totalPoints` 和 `practiceDays`，各练习页答题时同步更新，避免成就系统每次全量扫描各 mode 积分。
- 或者保持现状，由 `computeAchievementData` 聚合；推荐新增顶层字段，逻辑更清晰。

#### 4.3 UI 展示成就与等级
**涉及文件：** `src/components/Layout.tsx`（或新建 `src/components/UserLevelBadge.tsx`）

**做什么 & 为什么 & 怎么做：**
- 在顶部导航右侧显示当前等级（如"字根学徒 Lv.2"）与积分，提供正向反馈。
- 练习结束后弹出轻量级成就 toast（如"解锁：初出茅庐"）。
- 保持简洁，不过度打扰。

---

### Phase 5：UI/UX 简化与一致性

#### 5.1 简化练习页信息密度
**涉及文件：** `src/pages/PracticePage.tsx`、`src/pages/WholeCharPracticePage.tsx`、`src/pages/PhrasePracticePage.tsx`

**做什么 & 为什么 & 怎么做：**
- 未开始时：只保留标题、核心"开始练习"按钮、模式选择器、当前进度。把高级设置折叠到"更多设置"中。
- 练习中：
  - 字根页：大字根 + 虚拟键盘 + 顶部微型状态条，弱化侧栏统计。
  - 整字页：大汉字 + 编码输入框 + 拆分提示（答错后或首次出现），保留编码规则说明但默认折叠。
  - 词组页：大词组 + 四个码位 + 虚拟键盘。
- 统一反馈：答对/答错用边框色 + 简短文字 + 音效（可选），避免过多动画。

#### 5.2 统一键盘与输入体验
**涉及文件：** `src/components/practice/VirtualKeyboard.tsx`

**做什么 & 为什么 & 怎么做：**
- 三个页面都使用同一虚拟键盘组件，确保视觉/交互一致。
- 支持物理键盘直接输入，虚拟键盘只做视觉反馈。

#### 5.3 模式选择器统一风格
**涉及文件：** 三个练习页

**做什么 & 为什么 & 怎么做：**
- 都用相同的卡片网格选择器，图标 + 主标题 + 一行描述，降低认知成本。
- 当前选中状态用主色边框 + 浅背景，未选中用淡边框。

#### 5.4 更新 README
**涉及文件：** `README.md`

**做什么 & 为什么 & 怎么做：**
- 更新项目结构描述，补充现有 9 个页面、统一 Store、成就系统等说明。

---

## 假设与决策

1. **不替换技术栈**：继续保留 React 19 + Vite 7 + Tailwind + shadcn/ui，不引入 Redux/Zustand（使用已有类 Redux 的 `progress-store.ts`）。
2. **单用户本地存储**：继续以 `localStorage` 为唯一持久化，不引入后端/账号系统。
3. **练习模式语义**：
   - 字根：beginner → progressive → fullcode → weak，构成由易到难的学习路径。
   - 整字：字集范围 × 过滤条件，正交组合，避免模式爆炸。
   - 词组：保持现有五种模式，仅持久化。
4. **成就数据来源**：由 `progress-store` 统一聚合，不再从各练习页本地 state 读取。
5. **向后兼容**：保留 `migrateFromOld` 对旧 localStorage key 的迁移，避免老用户进度丢失；重构完成后旧 key 仍可被清理。
6. **MVP 验证优先**：先让三种练习页都能基于 Store 正常跑通，再做 UI 美化；如果某个模式逻辑复杂，先实现最简版本（如 beginner 只做前 30 字根）。
7. **不引入新依赖**：使用现有 `lucide-react`、`recharts` 等，不新增动画库。

## 验证步骤

1. **Lint 通过**：运行 `npm run lint`，确保 0 errors、0 warnings（允许配置合理的例外）。
2. **TypeScript 通过**：运行 `npm run build` 或 `tsc --noEmit`，无类型错误。
3. **本地运行验证**：
   - `npm run dev` 打开首页，学习路线进度与真实练习数据一致。
   - 进入字根练习，切换 beginner / progressive / fullcode / weak，确认出题范围不同。
   - 答题后刷新页面，进度不丢失；打开 DevTools 确认只写入 `ziyuan-progress-v2`。
   - 进入整字练习，切换 top500 / top1000 / top1500 / all 与"必拆字"过滤，确认学习池变化。
   - 进入词组练习，完成一组后返回首页，词组阶段进度有变化。
4. **成就验证**：
   - 答对第一题弹出"初出茅庐"成就提示。
   - 顶部导航显示当前等级/积分。
5. **数据迁移验证**：
   - 手动往 localStorage 写入旧 key（`ziyuan-practice-v5` 等），刷新后确认数据被迁移到新 Store，且旧 key 被清理。
6. **部署路径验证**：
   - 构建产物部署到子路径（如 `/ziyuan2/`），确认 `charCodeData.json` 与 `builtinPhrases.json` 正常加载。
7. **性能验证**：
   - 首屏 JS bundle 不显著增大；整字/词组大数据仍走运行时 fetch。
