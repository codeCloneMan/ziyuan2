import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // lang: 'en-US',
  title: "字源系列输入法",
  description: "一种简单的形码输入法",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '短拼', link: '/duanpin' }
    ],

    sidebar: [
      {
        text: '字源系列',
        items: [
          { text: '字源形码输入法', link: '/ziyuan' },
          { text: '短拼拼音输入法', link: '/duanpin' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'qq', link: 'https://qm.qq.com/cgi-bin/qm/qr?k=oSH8W7FCjCnNp-S_BABVNrQwA9hrKvew&jump_from=webapi&authKey=BW7EkPl3QLb9lO65Pyao0EF5tmIxcoa1wWME7Dsh8qW06kws8BCZ5rUb3PXxz+Yj' },
      // { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],

    // 侧边栏 On this page 名称修改
    outline: {
      label: '大纲速览' // 将这里的文本修改为你想要的名称
    },

  }
})
