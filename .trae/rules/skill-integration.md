# Skill Integration Rules

本规则定义 AI 与已安装 skills 的协作规范，确保 skill 被正确触发、安全使用、高效协作。

---

## 一、Skill 触发条件与使用场景

### 1. code (v1.0.4) — 编码工作流

**触发条件：**
- 用户明确请求代码实现、功能开发、bug 修复
- 需要规划-执行-验证的编码工作流

**核心行为：**
- 执行前先检查 `~/code/memory.md` 中用户偏好
- 遵循 Plan → Execute → Verify → Deliver 流程
- 每步可独立验证，不交付未测试代码
- 仅在用户明确请求时存储偏好到 memory.md

**禁止事项：**
- 自动执行代码
- 发起网络请求
- 访问 `~/code/` 及用户项目以外的文件
- 修改自身 SKILL.md 或辅助文件

### 2. frontend-design-pro (v1.0.0) — 前端设计质量提升

**触发条件：**
- 用户使用命令：`/audit` `/polish` `/critique` `/colorize` `/animate` `/bolder` `/quieter` `/distill` `/delight` `/normalize` `/harden`
- 请求涉及：UI 设计审查、界面优化、前端设计建议、让设计更好看、检查设计质量

**核心行为：**
- 生成或修改 UI 代码时，主动应用设计规范（字体、色彩、空间、动效、交互、UX 文案）
- `/audit`：检查并列出 3-5 个具体问题（带行号/组件名）
- 其他命令：先说明修改再输出代码
- 发现反模式时简短提醒
- 设计建议必须落地到具体代码，不停留在概念

**设计规范要点：**
- 字体：选用 Geist/DM Sans/Sora 等，禁止 Arial/Inter/system-ui，同页面不超过 2 种字体族
- 色彩：使用 OKLCH 色彩空间，中性色带色调，暗色背景用 #0f0f0f 而非纯黑
- 空间：4px 或 8px 基础间距系统，正文 65ch、宽容器 1280px
- 动效：cubic-bezier(0.16, 1, 0.3, 1)，微交互 100-200ms，禁止 bounce/elastic
- 交互：Focus 状态清晰可见，skeleton 优于 spinner，错误信息具体可操作
- UX 文案：按钮动词开头，空状态说明原因+下一步，错误提示用人话

**禁止事项：**
- 使用 Arial/Inter/system-ui 字体
- 使用 bounce/elastic 动效
- 给出无法落地到代码的纯概念建议

### 3. skill-vetter (v1.0.0) — Skill 安全审查

**触发条件：**
- 安装任何来自外部来源的 skill 之前（ClawdHub、GitHub、其他 agent 分享）
- 用户要求评估未知 skill 的安全性
- 任何被要求安装未知代码的场景

**核心行为：**
- 执行四步审查：来源检查 → 代码审查（强制） → 权限范围评估 → 风险分级
- 输出标准化审查报告，包含风险等级与最终判定

**红线（触碰即拒绝）：**
- curl/wget 未知 URL
- 发送数据到外部服务器
- 请求凭证/令牌/API 密钥
- 读取 ~/.ssh/~/.aws 等敏感目录
- 访问 MEMORY.md/USER.md/SOUL.md/IDENTITY.md
- base64 解码
- eval/exec 外部输入
- 修改系统文件
- 混淆代码
- 请求 sudo 权限
- 访问浏览器 cookie/session

**风险分级：**

| 风险等级 | 示例 | 处理 |
|----------|------|------|
| LOW | 笔记、天气、格式化 | 基本审查，可安装 |
| MEDIUM | 文件操作、浏览器、API | 需完整代码审查 |
| HIGH | 凭证、交易、系统操作 | 需人类审批 |
| EXTREME | 安全配置、root 访问 | 禁止安装 |

### 4. summarize-pro (1.0.0) — 文本摘要

**触发条件：**
- 用户使用关键词：summarize、summary、tldr、tl;dr、eli5、key takeaways、action items、bullet points、executive summary、chapter summary、comparison summary、thread summary、meeting summary/notes、email summary
- 需要处理长文本、会议记录、邮件、文章、对话、PDF、报告等内容
- 用户请求自定义长度摘要（如 "summarize in 50 words"）
- 用户请求多语言摘要（如 "summarize in hindi"）

**核心行为：**
- 支持智能格式检测（邮件→邮件摘要、会议→会议摘要等）
- 始终显示词数缩减统计
- 不编造原文没有的信息
- 支持保存摘要、查看历史、统计使用数据、自定义模板
- 所有数据存储在 `~/.openclaw/summarize-pro/`，不发送外部请求

**禁止事项：**
- 编造原文不存在的信息
- 发送任何外部 API 请求
- 将摘要数据存储到项目目录以外（仅限 ~/.openclaw/summarize-pro/）

### 5. karpathy-guidelines — 编码行为准则

**触发条件：**
- 编写、审查或重构代码时
- 需要避免 LLM 常见编码错误时

**核心行为：**
- Think Before Coding：显式陈述假设、存在多种解读时全部呈现、不确定就问
- Simplicity First：不为未被请求的功能写代码、不为单次使用建抽象、不添加未请求的灵活性/可配置性
- Surgical Changes：只改必须改的、匹配现有风格、不随意重构、不"改进"相邻代码
- Goal-Driven Execution：定义可验证的成功标准，循环直到验证通过

**禁止事项：**
- 为未被请求的功能写代码
- 为单次使用建立抽象层
- 添加未请求的灵活性或可配置性
- 随意重构或"改进"相邻代码

**权衡：** 这些准则偏向谨慎而非速度，对于琐碎任务需自行判断

### 6. github (v1.0.0) — GitHub 操作

**触发条件：**
- 需要操作 GitHub Issues、PR、CI 运行、API 查询
- 用户明确请求 GitHub 相关操作

**核心行为：**
- 使用 `gh` CLI 工具
- 不在 git 目录时必须指定 `--repo owner/repo`
- 优先使用 `--json` + `--jq` 获取结构化输出
- 查看失败步骤使用 `--log-failed`

**禁止事项：**
- 在非 git 目录时不指定 `--repo` 参数
- 使用非结构化输出（应优先 `--json` + `--jq`）
- 执行破坏性 git 操作（push --force、hard reset）除非用户明确请求

### 7. hermes-agent (1.0.0) — 学习循环智能体

**触发条件：**
- 用户希望 AI 具备跨会话的持久性、自我纠错和主动性
- 需要工作区规则注入、反思记忆、模式推广

**核心行为：**
- 非破坏性注入：只添加内容，不替换整个文件（AGENTS.md/SOUL.md/HEARTBEAT.md）
- 非平凡任务前先读取 `~/hermes-agent/memory.md`
- 重要工作后立即反思，可复用教训写入 reflections.md
- 同一模式成功三次→记录到 promotions.md →建议转为 skill 或规则
- memory.md 保持短小精悍，过时内容移至 archive/
- 不存储凭证/敏感数据，不修改 SKILL.md

**禁止事项：**
- 替换整个工作区文件（必须非破坏性注入）
- 存储凭证或敏感数据
- 修改自身 SKILL.md

### 8. find-skills (1.0.0) — Skill 发现与搜索

**触发条件：**
- 用户想查找可用 skill（"Find skills for [task]"、"What skills are available?"）
- 搜索特定功能、发现新 skill

**核心行为：**
- 支持多来源搜索：ClawHub（`npx clawhub search`）、OpenClaw Directory、LobeHub、GitHub
- 按功能、提供者、流行度搜索
- 安装前检查要求、阅读文档、隔离测试

**禁止事项：**
- 执行 skill 安装（安装用 `clawhub install`）
- 管理已安装 skill（管理用 `openclaw skills list`）
- 创建 skill（创建用 skill-creator）

### 9. skill-creator (0.1.0) — Skill 创建

**触发条件：**
- 用户要求创建、编辑、改进 skill
- 提到 "turn this into a skill"、"make a skill for this"、"new skill"
- 询问 skill 格式、SKILL.md 结构、最佳实践

**核心行为：**
- 遵循六步流程：理解 → 规划 → 初始化 → 编辑 → 打包 → 迭代
- 简洁为王：上下文窗口是公共资源，只添加模型不知道的信息
- 渐进式披露：metadata（始终）→ SKILL.md body（触发时）→ 捆绑资源（按需）
- 设置适当的自由度：脆弱任务→低自由度（具体脚本）；多变任务→高自由度（文字指导）
- SKILL.md body 控制在 500 行以内，避免上下文膨胀

**禁止事项：**
- 在 SKILL.md body 中添加模型已知的信息
- SKILL.md body 超过 500 行
- 为脆弱任务设置高自由度

---

## 二、Skill 协作关系与优先级

### 优先级层级（高→低）

| 优先级 | Skill | 原因 |
|--------|-------|------|
| P0 安全 | skill-vetter | 安全前置，安装前必须审查 |
| P0 行为 | karpathy-guidelines | 编码行为底座，所有编码任务适用 |
| P1 核心工作流 | code | 编码主流程 |
| P1 设计质量 | frontend-design-pro | 前端代码必须遵循 |
| P2 辅助工具 | summarize-pro, github | 按需触发 |
| P3 元技能 | find-skills, skill-creator, hermes-agent | 扩展与管理 |

### 协作矩阵

| 场景 | 涉及 Skill | 协作方式 |
|------|-----------|---------|
| 编码实现 | code + karpathy-guidelines | code 驱动流程，karpathy 约束行为 |
| 前端开发 | code + karpathy-guidelines + frontend-design-pro | code 驱动流程，karpathy 约束行为，frontend-design-pro 把控设计质量 |
| 安装新 skill | skill-vetter → find-skills → skill-creator | 先审查、再搜索、最后创建 |
| 长文本处理 | summarize-pro | 独立使用，不与其他 skill 交叉 |
| GitHub 协作 | github + code | github 处理仓库操作，code 处理代码变更 |
| 跨会话优化 | hermes-agent + karpathy-guidelines | hermes 提供记忆与反思，karpathy 提供编码行为准则 |
| Skill 生命周期 | find-skills → skill-vetter → skill-creator | 发现→审查→创建 |

### 协作原则

1. **安全优先**：任何外部 skill 安装前，skill-vetter 必须先执行审查
2. **行为准则渗透**：karpathy-guidelines 作为编码行为的底层约束，在所有编码场景中隐式生效
3. **设计质量把关**：涉及前端 UI 的编码，frontend-design-pro 规范自动适用
4. **最小加载**：按需激活 skill，不预加载未使用的 skill 内容
5. **信息不重复**：同一规则不在多个 skill 中重复定义，遵循单一来源原则
6. **职责不越界**：每个 skill 只做自己声明的事，不跨界执行其他 skill 的职责

---

## 三、安全注意事项

### 通用安全规则

1. **外部 Skill 安装**：必须先经 skill-vetter 审查，高风险等级需人类审批
2. **敏感数据保护**：不将凭证、密钥、个人敏感信息写入 skill 数据文件
3. **网络请求最小化**：优先使用无网络依赖的 skill（code、karpathy-guidelines、frontend-design-pro 均无外部请求）
4. **文件访问边界**：每个 skill 只访问其声明目录和用户项目文件，禁止跨域访问
5. **执行权限控制**：skill 仅提供指导，不自动执行代码；子代理委派需用户明确授权

### Skill 特定安全约束

| Skill | 安全约束 |
|-------|---------|
| code | 不自动执行代码、不发网络请求、不访问 ~/code/ 及用户项目外文件、不修改自身 SKILL.md |
| frontend-design-pro | 无外部依赖、无网络请求、不使用禁止字体和动效 |
| skill-vetter | 本地审查、不发送 skill 内容到外部、红线规则触碰即拒绝 |
| summarize-pro | 所有数据本地存储（~/.openclaw/summarize-pro/）、无外部 API 调用、无网络请求 |
| karpathy-guidelines | 纯行为准则，无文件访问、无网络请求 |
| github | 仅通过 gh CLI 操作、需确认仓库权限、禁止破坏性 git 操作 |
| hermes-agent | 不存储凭证/敏感数据、非破坏性注入工作区文件、不修改 SKILL.md |
| find-skills | 仅搜索发现，不执行安装操作、不执行管理操作 |
| skill-creator | 生成的 skill 需同样遵循安全规范、SKILL.md body ≤ 500 行 |

---

## 四、错误处理与回退策略

### Skill 激活失败

| 情况 | 处理策略 |
|------|---------|
| Skill 文件缺失或损坏 | 提示用户重新安装该 skill，尝试以通用能力完成任务 |
| Skill 与当前环境不兼容 | 说明不兼容原因，回退到标准工作流 |
| 多个 Skill 冲突 | 按优先级层级选择，向用户说明冲突及选择理由 |
| Skill 触发条件不匹配 | 不激活该 skill，不消耗上下文 |

### 执行中的错误

| Skill | 常见错误 | 回退策略 |
|-------|---------|---------|
| code | memory.md 读取失败 | 跳过偏好加载，继续执行编码流程 |
| code | 验证步骤失败 | 不交付，返回修复循环 |
| frontend-design-pro | 无法应用某条设计规范 | 降级应用兼容规范，说明降级原因 |
| frontend-design-pro | 检测到禁止字体/动效 | 强制替换为允许的替代方案，输出替换说明 |
| skill-vetter | 无法获取来源信息 | 标记为未知来源，提高审查等级至 MEDIUM+ |
| skill-vetter | 触碰红线规则 | 直接拒绝，输出红线详情 |
| summarize-pro | 文件读写失败 | 创建新文件并通知用户；历史损坏则备份后重建 |
| summarize-pro | 文本过短（<30 词） | 提示文本已足够简短，提供一句话摘要 |
| karpathy-guidelines | 与其他 skill 行为冲突 | 以 karpathy 准则为底座，冲突处向用户说明 |
| github | gh CLI 未安装 | 提示安装 gh CLI，提供安装指引 |
| github | 仓库权限不足 | 提示检查认证状态和仓库权限 |
| hermes-agent | memory.md 不存在 | 执行 setup 流程创建目录和文件 |
| hermes-agent | memory 噪声过大 | 清理过时条目至 archive/，保持 memory.md 精简 |
| find-skills | 搜索限流 | 等待 1 小时后重试，或使用替代来源（网站/GitHub） |
| skill-creator | 打包验证失败 | 报告具体验证错误，修正后重新打包 |

### 通用回退原则

1. **优雅降级**：skill 不可用时，回退到 AI 基础能力，不阻塞用户任务
2. **明确通知**：任何回退都必须向用户说明原因和当前使用的替代方案
3. **保留上下文**：回退不丢失已收集的信息和已完成的工作
4. **建议修复**：回退时提供恢复 skill 正常使用的具体步骤
5. **不静默失败**：skill 执行出错时必须通知用户，不允许静默忽略

---

## 五、Skill 使用检查清单

在每次使用 skill 时，快速确认以下要点：

- [ ] 触发条件是否匹配？不匹配则不激活
- [ ] 是否需要 skill-vetter 前置审查？（仅外部安装时）
- [ ] 是否有协作 skill 需要同步激活？（参考协作矩阵）
- [ ] 安全约束是否满足？特别是文件访问和网络请求边界
- [ ] 执行失败时的回退方案是否明确？
- [ ] 对于编码任务：karpathy-guidelines 行为准则是否隐式生效？
- [ ] 对于前端任务：frontend-design-pro 设计规范是否自动适用？
- [ ] 是否遵守最小加载原则？不预加载未使用的 skill
- [ ] 是否遵守信息不重复原则？同一规则不跨 skill 重复定义
- [ ] 是否遵守职责不越界原则？skill 只执行自己声明的事