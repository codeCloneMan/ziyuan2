# 字源形码

基于「字源1.32版字根」的字根记忆训练与形码学习工具，灵感来源于虎码官网字根练习。

## 功能特性

- 🎯 **字根练习** — 入门(beginner)/渐进(progressive)/全码(fullcode)/弱项(weak)四种模式，配合艾宾浩斯间隔学习算法
- ✍️ **整字练习** — 字集范围(常用500/1000/1500/全部) × 过滤条件(全部/必拆字/错题)正交组合，练习整字拆分编码
- 📝 **词组练习** — 双字词/三字词/四字词/混合/短句五种模式，掌握词组四码输入
- 🏆 **成就等级** — 8 级等级体系 + 17 个成就，积分驱动正向反馈循环
- 📊 **统一进度** — 类 Redux 的统一状态 Store，跨页面联动、版本化迁移、集中导入导出
- ⌨️ **双键盘支持** — 物理键盘直接输入 + 虚拟键盘视觉反馈，移动端触觉反馈
- 📖 **字根总表/字根图** — 按键位分组展示，支持搜索筛选
- 🔍 **拆分查询/码表测评** — 汉字拆分查询与输入法码表评估
- 🎨 **现代 UI** — Tailwind CSS 响应式布局，明暗主题切换

## 技术栈

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3.4 + shadcn/ui
- React Router (Hash 模式)
- Lucide Icons

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 部署到 Cloudflare Pages

### 方式一：通过 GitHub 自动部署

1. 将项目推送到 GitHub 仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 Workers & Pages → Create → Pages → Connect to Git
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **Node.js 版本**: `20`
6. 点击 Save and Deploy

### 方式二：通过 Wrangler CLI 手动部署

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
npm run build

# 部署
wrangler pages deploy dist --project-name=root-practice
```

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── Layout.tsx       # 页面布局（导航 + 页脚 + 搜索 + 等级徽章）
│   ├── UserLevelBadge.tsx       # 等级徽章 + 成就面板
│   ├── AchievementToast.tsx     # 成就解锁提示
│   ├── practice/        # 练习相关组件
│   │   ├── VirtualKeyboard.tsx  # 字根键盘（多字根展示）
│   │   ├── CodeKeyboard.tsx     # 编码键盘（字母输入，整字/词组共用）
│   │   ├── RootDisplayCard.tsx  # 字根展示卡
│   │   ├── PracticeStatusBar.tsx # 练习状态条
│   │   └── StatsSidePanel.tsx   # 统计侧栏
│   └── ui/              # shadcn/ui 组件库
├── data/                # 静态数据
│   ├── roots.ts         # 字根映射（含 PUA 字根）
│   ├── commonChars.ts   # 常用字集（500/1000/1500）
│   └── splitData.ts     # 汉字拆分数据
├── pages/               # 9 个页面
│   ├── HomePage.tsx         # 首页（学习路线 + 进度）
│   ├── PracticePage.tsx     # 字根练习
│   ├── WholeCharPracticePage.tsx # 整字练习
│   ├── PhrasePracticePage.tsx    # 词组练习
│   ├── TablePage.tsx        # 字根表
│   ├── ChartPage.tsx        # 字根图
│   ├── SplitSearchPage.tsx  # 拆分查询
│   ├── EvaluatePage.tsx     # 码表测评
│   └── FAQPage.tsx          # 常见问题
├── store/
│   └── progress-store.ts # 统一进度 Store（类 Redux，useSyncExternalStore）
├── hooks/               # 自定义 hooks
│   ├── use-spaced-learning.ts   # 艾宾浩斯间隔学习算法
│   ├── use-achievements.ts      # 成就/等级系统
│   ├── use-learning-progress.ts # 学习阶段进度计算
│   └── use-local-storage.ts     # localStorage 封装
├── lib/                 # 工具与逻辑
│   ├── achievements.ts  # 等级与成就定义
│   ├── data-loader.ts   # 码表/词组数据加载
│   ├── progress-io.ts   # 进度导入导出
│   └── utils.ts         # 通用工具
├── types/index.ts       # 练习模式等类型定义
├── index.css            # 全局样式
├── main.tsx             # 入口文件
└── router.tsx           # 路由配置
```

## License

MIT
