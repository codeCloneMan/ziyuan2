import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: "字源形码",
  description: "力求入门简单且提速快的输入法系列",
  themeConfig: {
    // siteTitle: 'My Custom Title',
    // logo: '../images/源王铎.svg',
    // logo和icon图标放在public中，打包的时候会复制到index.md路径下，图片则放在images路径下
    logo: '字源图标.svg',
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local',
      options: {
        // locales: {
          // zh: {
        translations: {
          button: {
            buttonText: '请输入…',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果：',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭搜索'
            }
          }
        }
      }
        // }
      // }
    },
    nav: [
      { text: '首页', link: '/' },
      // { text: '字源', link: '/ziyuan' },
      // { text: '短拼', link: '/duanpin' },
      // { text: '三拼', link: '/sanpin' },
      // { text: '速记', link: '/suji' },
      // { text: '风云', link: '/fengyun' },

      {
        text: '查看输入方案',
        items: [
          { text: '字源形码', link: '/ziyuan' },
          { text: '短拼拼音', link: '/duanpin' },
          { text: '字源三拼', link: '/sanpin' },
          { text: '字源速记', link: '/suji' },
          { text: '风云整句', link: '/fengyun' },
        ]
      }
    ],

    sidebar: [
      {
        text: '字源系列',
        items: [
          { text: '字源形码', link: '/ziyuan' },
          { text: '短拼拼音', link: '/duanpin' },
          { text: '字源三拼', link: '/sanpin' },
          { text: '字源速记', link: '/suji' },
          { text: '风云整句', link: '/fengyun' }
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
