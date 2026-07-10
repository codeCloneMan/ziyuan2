import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // shadcn/ui 组件按标准模式导出 variants 工具函数；router.tsx 只导出 router 实例
  // 这两类文件不适用 react-refresh/only-export-components 规则
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/router.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
