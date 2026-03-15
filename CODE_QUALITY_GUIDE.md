# 代码检查工具使用指南

本项目已配置完整的代码质量检查工具，包括 ESLint 和 Prettier。

## 📋 已安装的工具

### ESLint 10.0.3
- **@eslint/js** - ESLint 官方 JavaScript 配置
- **eslint-plugin-vue** - Vue 组件检查
- **@typescript-eslint/parser** - TypeScript 解析器
- **@typescript-eslint/eslint-plugin** - TypeScript 规则集
- **vue-eslint-parser** - Vue 模板解析
- **globals** - 全局变量定义

### Prettier 3.8.1
- 代码格式化工具
- **eslint-config-prettier** - 禁用与 Prettier 冲突的 ESLint 规则

## 🚀 可用命令

```bash
# 检查代码问题（不修复）
pnpm lint:check

# 检查并自动修复问题
pnpm lint

# 格式化代码（不检查）
pnpm format

# 检查代码格式
pnpm format:check
```

## 📝 配置说明

### ESLint 配置 (`eslint.config.js`)
- ✅ 支持 JavaScript (.js, .jsx, .cjs, .mjs)
- ✅ 支持 TypeScript (.ts, .tsx, .mts, .cts)
- ✅ 支持 Vue 组件 (.vue)
- ✅ 自动忽略缓存和构建目录

### Prettier 配置 (`.prettierrc.json`)
```json
{
  "semi": false,           // 不使用分号
  "singleQuote": true,     // 使用单引号
  "printWidth": 100,       // 每行最大字符数 100
  "trailingComma": "es5",  // ES5 兼容的尾随逗号
  "tabWidth": 2,           // 2 空格缩进
  "useTabs": false         // 使用空格而非制表符
}
```

## 🔧 已修复的问题

### 字根数据错误
1. ✅ `⺝` 的提示从"单人旁"改为"月字旁"
2. ✅ `走` 的提示从"走之底"改为"走字底"
3. ✅ 统一了相关字根的描述

### 代码风格问题
- ✅ 统一使用单引号
- ✅ 移除行尾分号
- ✅ 文件末尾添加空行
- ✅ 统一缩进和空格

## ⚠️ 待手动修复的问题

运行 `pnpm lint:check` 后剩余的 45 个错误需要手动修复：

### 未使用的变量 (no-unused-vars)
- `ModernPractice.vue` - 多个未使用变量
- `TopBar.vue` - `dropdownOpen`, `linksOpen`, `e`
- `TypingPractice.vue` - `progress`, `currentCode`
- `Layout.vue` - `currentLangLabel`

### 其他问题
- `ModernPractice.vue:418-421` - 使用 `Object.hasOwn()` 替代 `hasOwnProperty`
- `TypingPractice.vue:98` - 移除无用的赋值
- `index.ts:199` - 替换 `any` 类型为具体类型

## 💡 最佳实践建议

### 1. 提交前检查
```bash
# 先格式化代码
pnpm format

# 再运行检查
pnpm lint:check

# 如果有问题，自动修复
pnpm lint
```

### 2. VS Code 配置
推荐安装以下扩展：
- ESLint (dbaeumer.vscode-eslint)
- Prettier - Code formatter (esbenp.prettier-vscode)

在 `.vscode/settings.json` 中添加：
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 3. Git Hooks（可选）
可以配置 Husky 在提交前自动运行检查和格式化：

```bash
pnpm add -D husky
npx husky install
npx husky add .husky/pre-commit "pnpm lint:check && pnpm format:check"
```

## 📊 质量指标

- **修复前**: 539 个问题 (85 errors, 454 warnings)
- **修复后**: 46 个问题 (45 errors, 1 warning)
- **自动修复率**: 91.5%
- **剩余问题**: 需要手动修复的代码逻辑问题

## 🎯 下一步建议

1. **修复剩余错误** - 优先处理未使用变量和类型问题
2. **添加测试框架** - 配置 Vitest 进行单元测试
3. **配置 CI/CD** - 在 GitHub Actions 中集成代码检查
4. **添加类型检查** - 使用 `tsc --noEmit` 进行类型验证

---

**创建时间**: 2026-03-15
**最后更新**: 2026-03-15
