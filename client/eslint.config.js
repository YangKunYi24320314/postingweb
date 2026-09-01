import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  // 这些目录不检查
  {
    ignores: ['node_modules/**', 'dist/**', 'public/**'],
  },

  // JS 基础规则
  js.configs.recommended,

  // Vue 官方推荐规则（flat 版本，注意用 ... 展开）
  ...pluginVue.configs['flat/recommended'],

  // 关闭与 Prettier 冲突的格式规则（让颜色和格式由 Prettier 统一）
  prettier,

  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // 允许单文件组件用短名字，避免命名约束太严
      'vue/multi-word-component-names': 'off',
      // 未定义变量不报错（新手期降低干扰）
      'no-unused-vars': 'warn',
    },
  },
]
