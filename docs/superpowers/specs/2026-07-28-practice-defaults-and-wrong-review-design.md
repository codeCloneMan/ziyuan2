# 练习页默认值与错题重练设计

日期：2026-07-28
状态：已批准

## 背景

用户反馈练习页存在 5 个问题：
1. 答错字根后直接切下一题，错题不再出现，无法强化
2. 入门模式初始 5 个字根按数组顺序出现，存在强行记忆可能
3. 新字根提示展示默认关闭，新手不知道按键
4. 设定面板默认折叠，新手不知道有设定
5. 整字/词组练习存在同样问题

## 目标

- 答错的字根/单字/词组在 3-5 步内重新出现
- 入门模式初始字根随机化
- 三个练习页提示展示默认开启
- 三个练习页设定面板默认展开
- 词组练习新增答前提示功能

## 设计

### 1. 错题重练队列（进阶模式）

**机制**：每个练习页新增 `wrongQueueRef: useRef<string[]>`。

**答错时**：将当前项 ID 推入 `wrongQueueRef.current`。

**取下一题时**：若 `wrongQueueRef.current.length > 0` 且距上次答错已隔 ≥3 步，从队列头部取出作为下一题；否则按原 shuffle 逻辑。

**步数追踪**：`wrongQueueRef` 存 `{ id, step }`，每取一次下一题 step+1，step≥3 时取该错题。

**入门模式**：无需改动。spaced 间隔学习已会自动带回答错项（重置 consecutiveCorrect + 降低 stability）。

### 2. 入门模式初始字根随机化

修改 spaced 池初始化：`pendingPool` 在创建时 shuffle。

文件：`src/store/progress-store.ts` 的 `getOrCreateSpacedPool` 或类似初始化函数。

### 3. 默认值修改

`defaultPreferences`：
- `showHint: true`（字根）
- `wholeCharShowHint: true`（整字）
- 新增 `phraseShowHint: true`（词组）

### 4. 设定面板默认展开

三个页面的 `<details>` 改为受控：
```tsx
const [showSettings, setShowSettings] = useState(true);
<details open={showSettings} onToggle={e => setShowSettings(e.currentTarget.open)}>
```

### 5. 词组练习新增答前提示

新增 `phraseShowHint` preference。

开启后：用户输入时，对每个字显示全码提示（与整字练习一致）。

## 修改文件清单

| 文件 | 修改 |
|------|------|
| `src/store/progress-store.ts` | defaultPreferences 改 showHint/wholeCharShowHint 为 true，新增 phraseShowHint；spaced 池初始化 shuffle pendingPool |
| `src/pages/PracticePage.tsx` | 进阶模式错题队列；details 受控默认展开 |
| `src/pages/WholeCharPracticePage.tsx` | 进阶模式错题队列；details 受控默认展开 |
| `src/pages/PhrasePracticePage.tsx` | 错题队列；details 受控默认展开；新增 phraseShowHint 开关 + 答前提示显示 |

## 验证

- TypeScript 类型检查
- 全量单元测试
- 生产构建
- 手动验证：答错后 3-5 步内重见；入门初始 5 项随机；提示默认开；设定面板默认展开
