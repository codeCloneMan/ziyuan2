# 字根练习

基于「字源131字根」的字根记忆训练工具，灵感来源于虎码官网字根练习。

## 功能特性

- 🎯 **字根练习** — 随机/顺序/弱项三种练习模式
- ⌨️ **键盘映射** — 虚拟键盘 + 物理键盘双支持
- 📊 **实时统计** — 连击计分、正确率追踪、弱项分析
- 📖 **字根总表** — 按键位分组展示，支持搜索筛选
- 🎨 **精美UI** — 现代化设计，响应式布局

## 技术栈

- React 18 + TypeScript
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
├── components/     # 通用组件
│   ├── Layout.tsx  # 页面布局（导航 + 页脚）
│   └── ui/         # shadcn/ui 组件库
├── data/
│   └── roots.ts    # 字根映射数据
├── pages/
│   ├── HomePage.tsx      # 首页
│   ├── PracticePage.tsx  # 字根练习页
│   └── TablePage.tsx     # 字根总表页
├── types/
│   └── index.ts    # TypeScript 类型定义
├── hooks/          # 自定义 hooks
├── lib/
│   └── utils.ts    # 工具函数
├── index.css       # 全局样式
├── main.tsx        # 入口文件
└── router.tsx      # 路由配置
```

## License

MIT
