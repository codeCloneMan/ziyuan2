import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // 多语言配置
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: '字源形码',
      description: '字源形码 - 入门简单的形码输入法，仅需20个核心字根，30分钟即可上手打字',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '快速入门', link: '/introduction' },
          {
            text: '字根练习',
            items: [
              { text: '常用字根', link: '/practice/top500' },
              { text: '顺序练习', link: '/practice/modern' },
              { text: '随机练习', link: '/practice/random' },
              { text: '错题本', link: '/practice/error' }
            ]
          },
          { text: '字根大全', link: '/roots/index' },
          { text: '字源形码', link: '/xingma/index' },
          { text: '短拼拼音', link: '/duanpin' },
          {
            text: '更多工具',
            items: [
              { text: '输入法测评', link: 'https://ceping.shurufa.app/', target: '_blank' },
              { text: 'YB6B 测评', link: 'https://yb6b.github.io/#/', target: '_blank' },
              { text: '52 打字', link: 'https://www.52dazi.cn/home', target: '_blank' },
              { text: 'Cheonhyeong', link: 'http://cheonhyeong.com/Simplified/download.html', target: '_blank' },
              { text: '汉典', link: 'https://www.zdic.net/', target: '_blank' }
            ]
          }
        ],
        sidebar: {
          '/roots/': [{
            text: '字根大全',
            items: [
              { text: '字根大全', link: '/roots/index' }
            ]
          }],
          '/xingma/': [{
            text: '目录展示',
            items: [
              { text: '字源了解', link: '/xingma/liaojie' }
            ]
          }],
          '/practice/': [{
            text: '练习模式',
            items: [
              { text: '常用字根练习', link: '/practice/top500' },
              { text: '顺序练习', link: '/practice/modern' },
              { text: '随机练习', link: '/practice/random' },
              { text: '错题本', link: '/practice/error' }
            ]
          }]
        },
        
        // 搜索配置
        search: {
          provider: 'local',
          options: {
            locales: {
              zh: {
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
            }
          }
        },
        
        // 社交链接
        socialLinks: [
          { icon: 'qq', link: 'https://qm.qq.com/q/T87otScbio' },
          { icon: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 56 56"><path fill="currentColor" fill-rule="evenodd" d="M31.8 36.237c-.917 3.427-.942 6.285-.074 8.574c1.595 4.208 7.2 5.419 7.464 6.522C39.454 52.437 31.726 53 27.358 53c-4.367 0-9.724-.833-9.724-1.667c0-.833 5.084-1.939 6.629-6.6c.9-2.717.802-5.838-.296-9.361a2.808 2.808 0 0 1-.845.128c-1.191 0-2.183-.73-2.397-1.694c-.822.54-1.852.86-2.969.86c-2.41 0-4.411-1.492-4.807-3.454a4.534 4.534 0 0 1-1.047.121C9.747 31.333 8 29.841 8 28c0-1.243.796-2.327 1.977-2.9c-.607-.379-1.001-.992-1.001-1.683c0-.24.047-.471.135-.686C8.442 22.434 8 21.92 8 21.333c0-.727.682-1.345 1.632-1.573C8.637 19.15 8 18.214 8 17.167c0-1.663 1.603-3.04 3.699-3.293a3.368 3.368 0 0 1-.772-2.124c0-2.071 1.965-3.75 4.39-3.75c.244 0 .484.017.718.05c.585-1.483 2.227-2.55 4.16-2.55c.537 0 1.051.082 1.527.233C22.052 4.179 23.646 3 25.56 3c1.958 0 3.58 1.232 3.86 2.837c.715-.716 1.78-1.17 2.97-1.17c2.155 0 3.902 1.492 3.902 3.333c0 .62-.199 1.201-.544 1.699c.177-.021.359-.032.544-.032c2.006 0 3.66 1.293 3.878 2.958a4.4 4.4 0 0 1 1.975-.458c2.156 0 3.903 1.492 3.903 3.333c0 1.255-.812 2.348-2.012 2.917c1.2.568 2.012 1.661 2.012 2.916c0 1.09-.613 2.059-1.56 2.667c.366.418.584.937.584 1.5c0 .216-.032.425-.092.624c1.8.853 3.019 2.493 3.019 4.376c0 2.761-2.62 5-5.854 5a6.68 6.68 0 0 1-2.362-.424c-.886.776-2.123 1.257-3.491 1.257a5.415 5.415 0 0 1-2.955-.85c-.42.357-.948.621-1.538.754"/></svg>',
          }, 
          link: 'http://ziyuan.ysepan.com/' }
        ],
        
        // 侧边栏配置
        outline: {
          label: '大纲速览'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'Tiger Origin',
      description: 'Tiger Origin - An easy-to-learn shape-based input method with only 20 core radicals, get typing in 30 minutes',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Getting Started', link: '/en/introduction' },
          {
            text: 'Root Practice',
            items: [
              { text: 'Common Roots', link: '/en/practice/top500' },
              { text: 'Order Practice', link: '/en/practice/modern' },
              { text: 'Random Practice', link: '/en/practice/random' },
              { text: 'Error Book', link: '/en/practice/error' }
            ]
          },
          { text: 'Tiger Origin', link: '/en/xingma/index' },
          { text: 'Duanpin', link: '/en/duanpin' },
          {
            text: 'More Tools',
            items: [
              { text: 'Input Method Test', link: 'https://ceping.shurufa.app/', target: '_blank' },
              { text: 'YB6B Test', link: 'https://yb6b.github.io/#/', target: '_blank' },
              { text: '52 Typing', link: 'https://www.52dazi.cn/home', target: '_blank' },
              { text: 'Cheonhyeong', link: 'http://cheonhyeong.com/Simplified/download.html', target: '_blank' },
              { text: 'Hanjian', link: 'https://www.zdic.net/', target: '_blank' }
            ]
          }
        ],
        sidebar: {
          '/en/xingma/': [{
            text: 'Contents',
            items: [
              { text: 'About Tiger Origin', link: '/en/xingma/index' },
              { text: 'Introduction', link: '/en/introduction' }
            ]
          }],
          '/en/practice/': [{
            text: 'Practice Modes',
            items: [
              { text: 'Common Roots Practice', link: '/en/practice/top500' },
              { text: 'Order Practice', link: '/en/practice/modern' },
              { text: 'Random Practice', link: '/en/practice/random' },
              { text: 'Error Practice', link: '/en/practice/error' }
            ]
          }]
        },
        
        // 搜索配置
        search: {
          provider: 'local',
          options: {
            locales: {
              en: {
                translations: {
                  button: {
                    buttonText: 'Search...',
                    buttonAriaLabel: 'Search documentation'
                  },
                  modal: {
                    noResultsText: 'No results found:',
                    resetButtonTitle: 'Clear search',
                    footer: {
                      selectText: 'to select',
                      navigateText: 'to navigate',
                      closeText: 'to close'
                    }
                  }
                }
              }
            }
          }
        },
        
        // 社交链接
        socialLinks: [
          { icon: 'qq', link: 'https://qm.qq.com/q/T87otScbio' },
          { icon: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 56 56"><path fill="currentColor" fill-rule="evenodd" d="M31.8 36.237c-.917 3.427-.942 6.285-.074 8.574c1.595 4.208 7.2 5.419 7.464 6.522C39.454 52.437 31.726 53 27.358 53c-4.367 0-9.724-.833-9.724-1.667c0-.833 5.084-1.939 6.629-6.6c.9-2.717.802-5.838-.296-9.361a2.808 2.808 0 0 1-.845.128c-1.191 0-2.183-.73-2.397-1.694c-.822.54-1.852.86-2.969.86c-2.41 0-4.411-1.492-4.807-3.454a4.534 4.534 0 0 1-1.047.121C9.747 31.333 8 29.841 8 28c0-1.243.796-2.327 1.977-2.9c-.607-.379-1.001-.992-1.001-1.683c0-.24.047-.471.135-.686C8.442 22.434 8 21.92 8 21.333c0-.727.682-1.345 1.632-1.573C8.637 19.15 8 18.214 8 17.167c0-1.663 1.603-3.04 3.699-3.293a3.368 3.368 0 0 1-.772-2.124c0-2.071 1.965-3.75 4.39-3.75c.244 0 .484.017.718.05c.585-1.483 2.227-2.55 4.16-2.55c.537 0 1.051.082 1.527.233C22.052 4.179 23.646 3 25.56 3c1.958 0 3.58 1.232 3.86 2.837c.715-.716 1.78-1.17 2.97-1.17c2.155 0 3.902 1.492 3.902 3.333c0 .62-.199 1.201-.544 1.699c.177-.021.359-.032.544-.032c2.006 0 3.66 1.293 3.878 2.958a4.4 4.4 0 0 1 1.975-.458c2.156 0 3.903 1.492 3.903 3.333c0 1.255-.812 2.348-2.012 2.917c1.2.568 2.012 1.661 2.012 2.916c0 1.09-.613 2.059-1.56 2.667c.366.418.584.937.584 1.5c0 .216-.032.425-.092.624c1.8.853 3.019 2.493 3.019 4.376c0 2.761-2.62 5-5.854 5a6.68 6.68 0 0 1-2.362-.424c-.886.776-2.123 1.257-3.491 1.257a5.415 5.415 0 0 1-2.955-.85c-.42.357-.948.621-1.538.754"/></svg>',
          }, 
          link: 'http://ziyuan.ysepan.com/' }
        ],
        
        // 侧边栏配置
        outline: {
          label: 'Page Outline'
        }
      }
    },
    tw: {
      label: '繁體中文',
      lang: 'zh-TW',
      title: '字源形碼',
      description: '字源形碼 - 入門簡單的形碼輸入法，僅需20個核心字根，30分鐘即可上手打字',
      themeConfig: {
        nav: [
          { text: '首頁', link: '/tw/' },
          { text: '快速入門', link: '/tw/introduction' },
          {
            text: '字根練習',
            items: [
              { text: '常用字根', link: '/tw/practice/top500' },
              { text: '順序練習', link: '/tw/practice/modern' },
              { text: '隨機練習', link: '/tw/practice/random' },
              { text: '錯題本', link: '/tw/practice/error' }
            ]
          },
          { text: '字源形碼', link: '/tw/xingma/index' },
          { text: '短拼拼音', link: '/tw/duanpin' },
          {
            text: '更多工具',
            items: [
              { text: '輸入法測評', link: 'https://ceping.shurufa.app/', target: '_blank' },
              { text: 'YB6B 測評', link: 'https://yb6b.github.io/#/', target: '_blank' },
              { text: '52打字', link: 'https://www.52dazi.cn/home', target: '_blank' },
              { text: 'Cheonhyeong', link: 'http://cheonhyeong.com/Simplified/download.html', target: '_blank' },
              { text: '漢典', link: 'https://www.zdic.net/', target: '_blank' }
            ]
          }
        ],
        sidebar: {
          '/tw/xingma/': [{
            text: '目錄展示',
            items: [
              { text: '字源了解', link: '/tw/xingma/index' }
            ]
          }],
          '/tw/practice/': [{
            text: '練習模式',
            items: [
              { text: '常用字根練習', link: '/tw/practice/top500' },
              { text: '順序練習', link: '/tw/practice/modern' },
              { text: '隨機練習', link: '/tw/practice/random' },
              { text: '錯題本', link: '/tw/practice/error' }
            ]
          }]
        },
        
        // 搜索配置
        search: {
          provider: 'local',
          options: {
            locales: {
              tw: {
                translations: {
                  button: {
                    buttonText: '請輸入…',
                    buttonAriaLabel: '搜尋文檔'
                  },
                  modal: {
                    noResultsText: '無法找到相關結果：',
                    resetButtonTitle: '清除查詢條件',
                    footer: {
                      selectText: '選擇',
                      navigateText: '切換',
                      closeText: '關閉搜尋'
                    }
                  }
                }
              }
            }
          }
        },
        
        // 社交链接
        socialLinks: [
          { icon: 'qq', link: 'https://qm.qq.com/q/T87otScbio' },
          { icon: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 56 56"><path fill="currentColor" fill-rule="evenodd" d="M31.8 36.237c-.917 3.427-.942 6.285-.074 8.574c1.595 4.208 7.2 5.419 7.464 6.522C39.454 52.437 31.726 53 27.358 53c-4.367 0-9.724-.833-9.724-1.667c0-.833 5.084-1.939 6.629-6.6c.9-2.717.802-5.838-.296-9.361a2.808 2.808 0 0 1-.845.128c-1.191 0-2.183-.73-2.397-1.694c-.822.54-1.852.86-2.969.86c-2.41 0-4.411-1.492-4.807-3.454a4.534 4.534 0 0 1-1.047.121C9.747 31.333 8 29.841 8 28c0-1.243.796-2.327 1.977-2.9c-.607-.379-1.001-.992-1.001-1.683c0-.24.047-.471.135-.686C8.442 22.434 8 21.92 8 21.333c0-.727.682-1.345 1.632-1.573C8.637 19.15 8 18.214 8 17.167c0-1.663 1.603-3.04 3.699-3.293a3.368 3.368 0 0 1-.772-2.124c0-2.071 1.965-3.75 4.39-3.75c.244 0 .484.017.718.05c.585-1.483 2.227-2.55 4.16-2.55c.537 0 1.051.082 1.527.233C22.052 4.179 23.646 3 25.56 3c1.958 0 3.58 1.232 3.86 2.837c.715-.716 1.78-1.17 2.97-1.17c2.155 0 3.902 1.492 3.902 3.333c0 .62-.199 1.201-.544 1.699c.177-.021.359-.032.544-.032c2.006 0 3.66 1.293 3.878 2.958a4.4 4.4 0 0 1 1.975-.458c2.156 0 3.903 1.492 3.903 3.333c0 1.255-.812 2.348-2.012 2.917c1.2.568 2.012 1.661 2.012 2.916c0 1.09-.613 2.059-1.56 2.667c.366.418.584.937.584 1.5c0 .216-.032.425-.092.624c1.8.853 3.019 2.493 3.019 4.376c0 2.761-2.62 5-5.854 5a6.68 6.68 0 0 1-2.362-.424c-.886.776-2.123 1.257-3.491 1.257a5.415 5.415 0 0 1-2.955-.85c-.42.357-.948.621-1.538.754"/></svg>',
          }, 
          link: 'http://ziyuan.ysepan.com/' }
        ],
        
        // 侧边栏配置
        outline: {
          label: '大綱速覽'
        }
      }
    }
  },

  // 全局配置
  lastUpdated: true,
  cleanUrls: true,
  
  // 忽略死链检查（避免构建失败）
  ignoreDeadLinks: true,

  // 性能优化配置
  cacheDir: '.vitepress/cache',

  // 构建优化和主题样式
  vite: {
    build: {
      chunkSizeWarningLimit: 1000
    },
    // 优化开发体验
    server: {
      host: true
    },
    css: {
      postcss: {
        plugins: []
      }
    }
  },
  
  head: [
    ['meta', { name: 'keywords', content: '字源,形码,输入法,五笔,拼音,短拼,字根练习' }],
    ['meta', { name: 'author', content: '字源输入法' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { property: 'og:title', content: '字源形码 - 入门简单的形码输入法' }],
    ['meta', { property: 'og:description', content: '字源形码仅需20个核心字根，30分钟即可上手打字。四码定长，无重码或极低选重，打字流畅不停顿。' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: '字源形码 - 入门简单的形码输入法' }],
    ['meta', { name: 'twitter:description', content: '仅需20个核心字根，30分钟即可上手打字' }],
    ['link', { rel: 'icon', href: '/字源图标.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    // 预加载关键字体 - 支持多语言
    ['link', {
      rel: 'preload',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&family=Inter:wght@400;500;700&display=swap',
      as: 'style'
    }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&family=Inter:wght@400;500;700&display=swap'
    }]
  ],
  markdown: {
    image: {
      lazyLoading: true
    }
  }
})
