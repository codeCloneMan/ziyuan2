import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: "字源",
  description: "力求入门简单且提速快的输入法系列",

  markdown: {
    image: {
      // 默认禁用；设置为 true 可为所有图片启用懒加载。
      lazyLoading: true
    }
  },

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
      {
        text: '查看输入方案',
        items: [
          { text: '字源形码', link: '/ziyuan/index' },
          { text: '短拼拼音', link: '/duanpin' },
          { text: '字源三拼', link: '/sanpin' },
          { text: '字源速记', link: '/suji' },
          // { text: '风云整句', link: '/fengyun' },
        ]
      }
    ],

    sidebar: {
        '/ziyuan': [{
          text: '目录展示',
          items: [
            { text: '字源了解', link: '/ziyuan/ziyuan' },
            { text: '字根练习', link: '/ziyuan/zigen' },
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
