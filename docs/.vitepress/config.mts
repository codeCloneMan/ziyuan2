import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: "字源形码",
  description: "入门简单且性能强的形码输入法",
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ['meta', { name: 'keywords', content: '字源,形码,输入法,五笔,拼音,短拼' }],
    ['meta', { name: 'author', content: '字源输入法' }],
    ['link', { rel: 'icon', href: '/字源图标.png' }],
    // 导入 Noto Sans CJK SC 字体
    ['link', { 
      rel: 'stylesheet', 
      href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap' 
    }],
    ['link', {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: ''
    }]
  ],
  markdown: {
    image: {
      lazyLoading: true
    }
  },

  themeConfig: { 
    // siteTitle: 'My Custom Title',
    // logo: '../images/源王铎.svg',
    // logo和icon图标放在public中，打包的时候会复制到index.md路径下，图片则放在images路径下
    // logo: '字源图标.svg',
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
      { text: '输入法介绍', link: '/introduction' },
      { text: '字根练习', link: '/practice/typing' },
      { text: '字源形码', link: '/xingma/index' },
      { text: '短拼拼音', link: '/duanpin' },
      { 
        text: '更多工具', 
        items: [
          { text: '输入法测评', link: 'https://ceping.shurufa.app/', target: '_blank' },
          { text: 'YB6B 测评', link: 'https://yb6b.github.io/#/', target: '_blank' },
          { text: '52打字', link: 'https://www.52dazi.cn/home', target: '_blank' },
          { text: 'Cheonhyeong', link: 'http://cheonhyeong.com/Simplified/download.html', target: '_blank' },
          { text: '汉典', link: 'https://www.zdic.net/', target: '_blank' }
        ]
      }
    ],

    sidebar: {
        '/xingma/': [{
          text: '目录展示',
          items: [
            { text: '字源了解', link: '/xingma/liaojie' },
          ]
        }],
        '/practice/': [{
          text: '练习模式',
          items: [
            { text: '常用字根练习', link: '/practice/top500' },
            { text: '顺序练习', link: '/practice/modern' },
            { text: '随机练习', link: '/practice/random' },
            { text: '错误字根练习', link: '/practice/error' },
          ]
        }]
      },

    socialLinks: [
      { icon: 'qq', link: 'https://qm.qq.com/q/T87otScbio' },
      { icon: {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 56 56"><path fill="currentColor" fill-rule="evenodd" d="M31.8 36.237c-.917 3.427-.942 6.285-.074 8.574c1.595 4.208 7.2 5.419 7.464 6.522C39.454 52.437 31.726 53 27.358 53c-4.367 0-9.724-.833-9.724-1.667c0-.833 5.084-1.939 6.629-6.6c.9-2.717.802-5.838-.296-9.361a2.808 2.808 0 0 1-.845.128c-1.191 0-2.183-.73-2.397-1.694c-.822.54-1.852.86-2.969.86c-2.41 0-4.411-1.492-4.807-3.454a4.534 4.534 0 0 1-1.047.121C9.747 31.333 8 29.841 8 28c0-1.243.796-2.327 1.977-2.9c-.607-.379-1.001-.992-1.001-1.683c0-.24.047-.471.135-.686C8.442 22.434 8 21.92 8 21.333c0-.727.682-1.345 1.632-1.573C8.637 19.15 8 18.214 8 17.167c0-1.663 1.603-3.04 3.699-3.293a3.368 3.368 0 0 1-.772-2.124c0-2.071 1.965-3.75 4.39-3.75c.244 0 .484.017.718.05c.585-1.483 2.227-2.55 4.16-2.55c.537 0 1.051.082 1.527.233C22.052 4.179 23.646 3 25.56 3c1.958 0 3.58 1.232 3.86 2.837c.715-.716 1.78-1.17 2.97-1.17c2.155 0 3.902 1.492 3.902 3.333c0 .62-.199 1.201-.544 1.699c.177-.021.359-.032.544-.032c2.006 0 3.66 1.293 3.878 2.958a4.4 4.4 0 0 1 1.975-.458c2.156 0 3.903 1.492 3.903 3.333c0 1.255-.812 2.348-2.012 2.917c1.2.568 2.012 1.661 2.012 2.916c0 1.09-.613 2.059-1.56 2.667c.366.418.584.937.584 1.5c0 .216-.032.425-.092.624c1.8.853 3.019 2.493 3.019 4.376c0 2.761-2.62 5-5.854 5a6.68 6.68 0 0 1-2.362-.424c-.886.776-2.123 1.257-3.491 1.257a5.415 5.415 0 0 1-2.955-.85c-.42.357-.948.621-1.538.754"/></svg>`,
        }, 
        link: 'http://ziyuan.ysepan.com/' }
      // { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],

    // 侧边栏 On this page 名称修改
    outline: {
      label: '大纲速览' // 将这里的文本修改为你想要的名称
    },
  }
})
