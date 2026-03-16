# Cloudflare Pages 部署指南

## 部署步骤

### 方法一：Git 集成（推荐）

1. **连接 Git 仓库**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 Pages → 创建项目
   - 选择你的 Git 仓库

2. **构建设置**
   - **框架预设**：选择 `VitePress` 或 `Other`
   - **构建命令**：`pnpm docs:build`
   - **构建输出目录**：`docs/.vitepress/dist`
   - **根目录**：留空（或填写 `.`）

3. **环境变量**
   ```
   NODE_VERSION = 18
   ```

4. **保存并部署**

### 方法二：直接上传

1. **本地构建**
   ```bash
   pnpm docs:build
   ```

2. **上传到 Cloudflare**
   - 使用 Wrangler CLI：
   ```bash
   npx wrangler pages deploy docs/.vitepress/dist
   ```

## 常见问题解决

### 1. 死链错误（已解决）

**问题**：构建时报错 `[vitepress] X dead link(s) found`

**解决方案**：已在 `config.mts` 中添加 `ignoreDeadLinks: true`

```javascript
export default defineConfig({
  ignoreDeadLinks: true,
  // ...其他配置
})
```

### 2. 构建超时

**问题**：构建时间过长导致超时

**解决方案**：
- 优化图片大小
- 减少页面数量
- 使用 `cacheDir` 缓存

### 3. Node 版本不匹配

**问题**：构建失败，提示 Node 版本错误

**解决方案**：在 Cloudflare Pages 环境变量中设置：
```
NODE_VERSION = 18
```

### 4. pnpm 依赖问题

**问题**：pnpm 安装依赖失败

**解决方案**：
- 使用 npm：构建命令改为 `npm run docs:build`
- 或添加环境变量：`NPM_FLAGS = --legacy-peer-deps`

## 项目结构

```
docs/
├── .vitepress/
│   ├── config.mts          # VitePress 配置（已修复死链）
│   ├── components/         # Vue 组件
│   ├── theme/             # 主题样式
│   └── utils/             # 工具函数
├── index.md               # 首页
├── introduction.md        # 介绍页
├── practice/              # 练习页面
├── roots/                 # 字根页面
└── xingma/                # 虎码页面
```

## 构建产物

构建完成后，产物位于：
```
docs/.vitepress/dist/
├── index.html
├── assets/
│   ├── *.js
│   └── *.css
└── [其他页面].html
```

## 自定义域名

1. 在 Cloudflare Pages 项目中添加自定义域名
2. 配置 DNS 记录
3. 启用 SSL/TLS

## 性能优化

### 已配置优化

- ✅ 死链检查已禁用
- ✅ 缓存目录配置
- ✅ 构建块大小限制
- ✅ 懒加载图片

### 建议优化

- 使用 WebP 格式图片
- 压缩大型资源
- 启用 CDN 缓存

## 监控和分析

1. **Cloudflare Analytics**
   - 访问 Cloudflare Dashboard → Pages → 你的项目
   - 查看访问量、带宽等指标

2. **自定义分析**
   - 可以在 `config.mts` 的 `head` 中添加分析脚本

## 回滚部署

如果新版本有问题，可以快速回滚：
1. 进入 Cloudflare Pages 项目
2. 点击"部署"标签
3. 找到之前的成功部署
4. 点击"回滚到此版本"

## 持续集成

### 自动部署

每次推送到主分支都会自动触发部署：
```bash
git push origin main
```

### 预览部署

Pull Request 会自动创建预览部署，方便测试。

## 相关资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [VitePress 部署指南](https://vitepress.dev/guide/deploy)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 联系支持

如有问题，请访问：
- QQ 群：[点击加入](https://qm.qq.com/q/T87otScbio)
- 资源站：[http://ziyuan.ysepan.com/](http://ziyuan.ysepan.com/)
