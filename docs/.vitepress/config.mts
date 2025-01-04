import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // lang: 'en-US',
  title: "字源系列输入法",
  description: "力求入门简单且提速快的输入法系列",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '字源', link: '/ziyuan' },
      { text: '短拼', link: '/duanpin' },
      { text: '三拼', link: '/sanpin' },
      { text: '速记', link: '/suji' },
      { text: '风云', link: '/fengyun' }
    ],

    sidebar: [
      {
        text: '字源系列',
        items: [
          { text: '字源形码输入法', link: '/ziyuan' },
          { text: '短拼拼音输入法', link: '/duanpin' },
          { text: '字源三拼输入法', link: '/sanpin' },
          { text: '字源速记输入法', link: '/suji' },
          { text: '风云整句输入法', link: '/fengyun' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'qq', link: 'https://qm.qq.com/cgi-bin/qm/qr?k=oSH8W7FCjCnNp-S_BABVNrQwA9hrKvew&jump_from=webapi&authKey=BW7EkPl3QLb9lO65Pyao0EF5tmIxcoa1wWME7Dsh8qW06kws8BCZ5rUb3PXxz+Yj' },
      { icon: 'github', link: 'https://github.com/codeCloneMan/ziyuan2' }
      // { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],

    // 侧边栏 On this page 名称修改
    outline: {
      label: '大纲速览' // 将这里的文本修改为你想要的名称
    },

  }
})
