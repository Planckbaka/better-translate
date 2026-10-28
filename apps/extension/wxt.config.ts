import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  zip: {
    // 发布包统一命名为 better-translate-<version>-<browser>.zip
    name: 'better-translate',
  },
  manifest: {
    name: 'Better Translate',
    description: 'AI 原生翻译：上下文感知的划词翻译与沉浸式网页翻译，模型管理透明可控',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['http://*/*', 'https://*/*'],
    commands: {
      'translate-selection': {
        suggested_key: { default: 'Alt+T' },
        description: '翻译选中的文本',
      },
    },
  },
})
