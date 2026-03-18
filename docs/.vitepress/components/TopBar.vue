<template>
  <header class="topbar" :data-theme="isDark ? 'dark' : 'light'" aria-label="TigerCode navigation">
    <div class="container">
      <a class="brand" href="/">
        <span class="tiger-badge" aria-hidden="true">🐯</span>
        <span class="brand-text">字源形码</span>
      </a>
      <div class="search-box">
        <ClientOnly>
          <VPNavBarSearch />
        </ClientOnly>
      </div>
      <nav class="main-nav" aria-label="Main navigation">
        <template v-for="(item, idx) in navConfig" :key="idx">
          <div
            v-if="item.children && item.children.length"
            class="nav-item dropdown"
            @mouseleave="dropdownOpenMap[idx] = false"
          >
            <button
              class="nav-link dropdown-toggle"
              @mouseenter="dropdownOpenMap[idx] = true"
              @click="dropdownOpenMap[idx] = !dropdownOpenMap[idx]"
            >
              {{ textFor(item) }} <span class="caret" aria-hidden="true">▾</span>
            </button>
            <ul v-if="dropdownOpenMap[idx]" class="dropdown-menu" role="menu">
              <li v-for="(child, cidx) in item.children" :key="cidx">
                <a
                  :href="child.link"
                  :target="child.target || '_self'"
                  @click="handleNavClick($event, child.link, child.target)"
                  >{{ child.text?.[locale] ?? child.label ?? 'Item' }}</a
                >
              </li>
            </ul>
          </div>
          <a
            v-else
            :href="item.link"
            class="nav-link"
            @click="handleNavClick($event, item.link, item.target)"
            >{{ textFor(item) }}</a
          >
        </template>
      </nav>
      <button
        class="lang-toggle"
        aria-label="Switch language"
        title="切换语言"
        @click="toggleLocale"
      >
        {{ localeLabel }}
      </button>
      <button
        class="fashion-toggle"
        aria-label="Toggle fashion style"
        title="时尚风格"
        @click="toggleFashion"
      >
        🎨
      </button>
      <button class="theme-toggle" aria-label="Toggle theme" title="夜间/日间" @click="toggleTheme">
        <span v-if="!isDark">🌞</span><span v-else>🌙</span>
      </button>
      <button class="menu-toggle" aria-label="Toggle menu" @click="toggleMobile">☰</button>
    </div>
    <nav
      v-if="isMobile && mobileOpen"
      class="mobile-menu"
      aria-label="Mobile menu"
      :style="mobileMenuStyle"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <template v-for="(item, idx) in navConfig" :key="`m-${idx}`">
        <div v-if="item.children && item.children.length" class="mobile-sub">
          <div class="nav-link mobile-sub-title">{{ textFor(item) }}</div>
          <a
            v-for="(child, cidx) in item.children"
            :key="`m-${idx}-${cidx}`"
            :href="child.link"
            class="nav-link"
            :target="child.target || '_self'"
            @click="handleNavClick($event, child.link, child.target)"
          >
            {{ child.text?.[locale] ?? child.label ?? 'Item' }}
          </a>
        </div>
        <a
          v-else
          :href="item.link"
          class="nav-link"
          :target="item.target || '_self'"
          @click="handleNavClick($event, item.link, item.target)"
        >
          {{ textFor(item) }}
        </a>
      </template>
      <div class="mobile-sub">
        <div class="nav-link mobile-sub-title">{{ localeMenuTitle }}</div>
        <a
          v-for="lang in localeCycle"
          :key="`lang-${lang}`"
          href="#"
          class="nav-link"
          @click.prevent="switchLocale(lang)"
        >
          {{ localeDisplayName[lang] }}
        </a>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { VPNavBarSearch } from 'vitepress/theme'
const isMobile = ref(false)
const mobileOpen = ref(false)
const fashionOn = ref(false)
function toggleFashion() {
  fashionOn.value = !fashionOn.value
  document.body.classList.toggle('theme-fashion', fashionOn.value)
  localStorage.setItem('zt-fashion', fashionOn.value ? 'fashion-on' : 'fashion-off')
}
const isDark = ref(false)
// Stage 3: navigation data + locale (zh/en) - data-driven nav via i18n JSON
const locale = ref('zh')
const localeCycle = ['zh', 'tw', 'en']
const localeDisplayName = {
  zh: '简体中文',
  tw: '繁體中文',
  en: 'English',
}
const localeLabel = computed(() => {
  const currentIndex = localeCycle.indexOf(locale.value)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % localeCycle.length
  return localeDisplayName[localeCycle[nextIndex]]
})
const localeMenuTitle = computed(() => {
  if (locale.value === 'en') return 'Language'
  if (locale.value === 'tw') return '語言'
  return '语言'
})
const navZH = ref([])
const navTW = ref([])
const navEN = ref([])
const navConfig = ref([])
const dropdownOpenMap = reactive({})
function setNavConfigLocale() {
  if (locale.value === 'en') {
    navConfig.value = navEN.value
    return
  }
  if (locale.value === 'tw') {
    navConfig.value = navTW.value
    return
  }
  navConfig.value = navZH.value
}
function toggleLocale() {
  const currentIndex = localeCycle.indexOf(locale.value)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % localeCycle.length
  switchLocale(localeCycle[nextIndex])
}
function switchLocale(targetLang) {
  locale.value = targetLang
  localStorage.setItem('zt-lang', targetLang)
  const path = window.location.pathname
  const basePath = path.replace(/^\/(en|tw)(?=\/|$)/, '') || '/'
  let nextPath = basePath
  if (targetLang === 'en') {
    nextPath = basePath === '/' ? '/en/' : `/en${basePath}`
  } else if (targetLang === 'tw') {
    nextPath = basePath === '/' ? '/tw/' : `/tw${basePath}`
  }
  if (nextPath !== path) {
    window.location.assign(nextPath)
  }
}
function textFor(item) {
  return (item.text && item.text[locale.value]) ?? item.label ?? ''
}

// 处理导航点击
function handleNavClick(event, link, target) {
  if (target === '_blank' || link.startsWith('http')) {
    // 外部链接，允许默认行为
    return
  }

  // 内部链接，使用VitePress路由
  event.preventDefault()

  // 关闭移动端菜单
  if (isMobile.value) {
    mobileOpen.value = false
  }

  // 使用 window.location 进行导航
  window.location.href = link
}

// eslint-disable-next-line no-unused-vars
let touchStartY = 0
let swiping = false
// phase 2: drag state for mobile navigation
const dragX = ref(0)
const isDragging = ref(false)
const DRAG_THRESHOLD = 60

function checkMobile() {
  isMobile.value = window.innerWidth <= 860
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function onTouchStart() {
  if (!isMobile.value) return
  swiping = true
}
// eslint-disable-next-line no-unused-vars
function onTouchMove(e) {
  // reserved for future feedback
}
function onTouchEnd() {
  if (!swiping) return
  const dx = 0
  const dy = 0
  if (-dragX.value > DRAG_THRESHOLD) {
    mobileOpen.value = false
  } else if (Math.abs(dx) > 40 && Math.abs(dy) < 20 && dx < 0) {
    mobileOpen.value = false
  }
  dragX.value = 0
  isDragging.value = false
  swiping = false
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('zt-theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  const saved = localStorage.getItem('zt-theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
  // restore fashion setting
  const f = localStorage.getItem('zt-fashion')
  if (f === 'fashion-on') {
    fashionOn.value = true
    document.body.classList.add('theme-fashion')
  }
  const path = window.location.pathname
  if (path.startsWith('/en')) {
    locale.value = 'en'
  } else if (path.startsWith('/tw')) {
    locale.value = 'tw'
  }
  Promise.all([
    import('../../i18n/nav.zh.json'),
    import('../../i18n/nav.tw.json'),
    import('../../i18n/nav.en.json'),
  ])
    .then(([zh, tw, en]) => {
      navZH.value = zh.default ?? zh
      navTW.value = tw.default ?? tw
      navEN.value = en.default ?? en
      setNavConfigLocale()
    })
    .catch(() => {
      navZH.value = [{ key: 'home', link: '/', text: { zh: '首页', en: 'Home' } }]
      navTW.value = [{ key: 'home', link: '/tw/', text: { zh: '首頁', en: 'Home', tw: '首頁' } }]
      navEN.value = [{ key: 'home', link: '/en/', text: { zh: '首页', en: 'Home' } }]
      setNavConfigLocale()
    })
  const storedLang = localStorage.getItem('zt-lang')
  if (storedLang && localeCycle.includes(storedLang)) locale.value = storedLang
  watch(locale, () => setNavConfigLocale())
})
// computed style for mobile menu drag translation
const mobileMenuStyle = computed(() => ({
  transform: `translateX(${dragX.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.25s ease-out',
}))
</script>

<style scoped>
:root {
  --bg: #ffffff;
  --text: #1f2937;
  --surface: #ffffff;
  --border: #e5e7eb;
  --shadow: rgba(0, 0, 0, 0.08);
  --primary: #3b82f6;
}
[data-theme='dark'] {
  --bg: #0b1020;
  --text: #e5e7eb;
  --surface: #11131b;
  --border: #2b3240;
  --shadow: rgba(0, 0, 0, 0.6);
  --primary: #93c5fd;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 12px var(--shadow);
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.tiger-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: linear-gradient(135deg, #f59e0b 0%, #f472b6 60%, #f43f5e 100%);
  color: white;
  font-weight: 700;
}
.brand-text {
  font-weight: 800;
  color: var(--text);
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Noto Sans SC',
    sans-serif;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 32px;
}
.main-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-link {
  color: var(--text);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 700;
}
.nav-link:hover {
  background: rgba(59, 130, 246, 0.08);
}
.nav-item {
  position: relative;
}
.dropdown-toggle {
  background: transparent;
  border: none;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 700;
  color: var(--text);
}
.dropdown-toggle:hover {
  background: rgba(59, 130, 246, 0.08);
}
.caret {
  margin-left: 6px;
  font-size: 0.8em;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 0;
  min-width: 180px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  list-style: none;
  margin: 0;
  padding: 0;
}
.dropdown-menu a {
  display: block;
  padding: 8px 14px;
  color: var(--text);
  text-decoration: none;
}
.dropdown-menu a:hover {
  background: #f8fafc;
}
.theme-toggle {
  margin-left: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
}
.menu-toggle {
  display: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 16px;
  cursor: pointer;
}
.mobile-menu {
  display: none;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}
.mobile-sub {
  padding-left: 8px;
  border-left: 2px solid var(--border);
  margin-left: 8px;
}
.mobile-sub-title {
  font-weight: 700;
}
@media (max-width: 860px) {
  .main-nav {
    display: none;
  }
  .search-box {
    padding-left: 12px;
    flex: 1;
    justify-content: flex-end;
  }
  .menu-toggle {
    display: inline-flex;
  }
  .mobile-menu {
    display: block;
  }
}
</style>
