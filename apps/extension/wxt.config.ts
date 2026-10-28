import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Better Translate',
    description: 'AI 原生翻译：上下文感知的划词翻译与沉浸式网页翻译，模型管理透明可控',
    permissions: ['storage'],
    host_permissions: ['http://*/*', 'https://*/*'],
  },
})
