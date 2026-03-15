<template>
  <header class="topbar" :data-theme="isDark ? 'dark' : 'light'" aria-label="TigerCode navigation">
    <div class="container">
      <a class="brand" href="/">
        <span class="tiger-badge" aria-hidden="true">🐯</span>
        <span class="brand-text">字源形码</span>
      </a>
      <nav class="main-nav" aria-label="Main navigation">
        <template v-for="(item, idx) in navConfig" :key="idx">
          <div v-if="item.children && item.children.length" class="nav-item dropdown" @mouseleave="dropdownOpenMap[idx] = false">
            <button class="nav-link dropdown-toggle" @mouseenter="dropdownOpenMap[idx] = true" @click="dropdownOpenMap[idx] = !dropdownOpenMap[idx]">
              {{ textFor(item) }} <span class="caret" aria-hidden="true">▾</span>
            </button>
            <ul v-if="dropdownOpenMap[idx]" class="dropdown-menu" role="menu">
              <li v-for="(child, cidx) in item.children" :key="cidx">
                <a :href="child.link" :target="child.target || '_self'">{{ child.text?.[locale] ?? child.label ?? 'Item' }}</a>
              </li>
            </ul>
          </div>
          <a v-else :href="item.link" class="nav-link">{{ textFor(item) }}</a>
        </template>
      </nav>
      <button class="lang-toggle" aria-label="Switch language" @click="toggleLocale" title="切换语言">{{ localeLabel }}</button>
      <button class="fashion-toggle" aria-label="Toggle fashion style" @click="toggleFashion" title="时尚风格">🎨</button>
      <button class="theme-toggle" aria-label="Toggle theme" @click="toggleTheme" title="夜间/日间">
        <span v-if="!isDark">🌞</span><span v-else>🌙</span>
      </button>
      <button class="menu-toggle" aria-label="Toggle menu" @click="toggleMobile">☰</button>
    </div>
    <nav class="mobile-menu" v-if="isMobile && mobileOpen" aria-label="Mobile menu" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" :style="mobileMenuStyle">
      <a href="/" class="nav-link">首页</a>
      <a href="/introduction" class="nav-link">快速入门</a>
      <a href="/route" class="nav-link">学习路线</a>
      <div class="mobile-sub">
        <div class="nav-link" style="font-weight:700">字根练习</div>
        <a href="/practice/typing" class="nav-link">所有字根</a>
        <a href="/practice/modern" class="nav-link">顺序练习</a>
        <a href="/practice/random" class="nav-link">随机练习</a>
        <a href="/practice/top500" class="nav-link">常用字根</a>
        <a href="/practice/error" class="nav-link">错题本</a>
      </div>
      <a href="/xingma/index" class="nav-link">字源形码</a>
      <a href="/duanpin" class="nav-link">短拼拼音</a>
      <div class="mobile-sub">
        <div class="nav-link" style="font-weight:700">友情链接</div>
        <a href="https://ceping.shurufa.app/" target="_blank" class="nav-link">输入法测评</a>
        <a href="https://yb6b.github.io/#/" target="_blank" class="nav-link">YB6B 测评</a>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue'
const isMobile = ref(false)
const mobileOpen = ref(false)
const dropdownOpen = ref(false)
const linksOpen = ref(false)
const fashionOn = ref(false)
function toggleFashion() {
  fashionOn.value = !fashionOn.value
  document.body.classList.toggle('theme-fashion', fashionOn.value)
  localStorage.setItem('zt-fashion', fashionOn.value ? 'fashion-on' : 'fashion-off')
}
const isDark = ref(false)
// Stage 3: navigation data + locale (zh/en) - data-driven nav via i18n JSON
const locale = ref('zh')
const localeLabel = computed(() => locale.value === 'zh' ? 'English' : '中文')
const navZH = ref([])
const navEN = ref([])
const navConfig = ref([])
const dropdownOpenMap = reactive({})
function setNavConfigLocale(){ navConfig.value = locale.value === 'zh' ? navZH.value : navEN.value }
function toggleLocale(){
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('zt-lang', locale.value)
  // Navigate to corresponding language path
  const path = window.location.pathname
  const isEn = path.startsWith('/en')
  const targetLang = locale.value
  if (targetLang === 'en') {
    if (isEn) return
    const newPath = path === '/' ? '/en/' : '/en' + path
    window.location.assign(newPath)
  } else {
    if (!isEn) return
    const rest = path.startsWith('/en/') ? path.slice(3) : path
    const newPath = (rest === '' ? '/' : rest)
    window.location.assign(newPath)
  }
}
function textFor(item) {
  return (item.text && item.text[locale.value]) ?? item.label ?? ''
}

let touchStartX = 0
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

function onTouchStart(e) {
  if (!isMobile.value) return
  swiping = true
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}
function onTouchMove(e) {
  // reserved for future feedback
}
function onTouchEnd(e) {
  if (!swiping) return
  const endX = e.changedTouches[0]?.clientX ?? touchStartX
  const endY = e.changedTouches[0]?.clientY ?? touchStartY
  const dx = endX - touchStartX
  const dy = endY - touchStartY
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
  // load navigation translations (zh/en) as data-driven config
  Promise.all([
    import('../../i18n/nav.zh.json'),
    import('../../i18n/nav.en.json')
  ]).then(([zh, en]) => {
    navZH.value = zh.default ?? zh
    navEN.value = en.default ?? en
    setNavConfigLocale()
  }).catch(() => {
    // Fallbacks if dynamic imports fail
    navZH.value = [{ key: 'home', link: '/', text: { zh: '首页', en: 'Home' } }]
    navEN.value = [{ key: 'home', link: '/en/index', text: { zh: '首页', en: 'Home' } }]
    setNavConfigLocale()
  })
  // read initial language from localStorage and apply
  const storedLang = localStorage.getItem('zt-lang')
  if (storedLang) locale.value = storedLang
  // react to locale changes
  watch(locale, () => setNavConfigLocale())
})
// computed style for mobile menu drag translation
const mobileMenuStyle = computed(() => ({
  transform: `translateX(${dragX.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.25s ease-out'
}))
</script>

<style scoped>
:root{ --bg: #ffffff; --text: #1f2937; --surface: #ffffff; --border: #e5e7eb; --shadow: rgba(0,0,0,0.08); --primary: #3b82f6; }
[data-theme="dark"]{ --bg: #0b1020; --text: #e5e7eb; --surface: #11131b; --border: #2b3240; --shadow: rgba(0,0,0,0.6); --primary: #93c5fd; }
.topbar { position: sticky; top: 0; z-index: 40; background: var(--bg); border-bottom: 1px solid var(--border); box-shadow: 0 2px 12px var(--shadow); }
.container { max-width: 1200px; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
.tiger-badge { width: 28px; height: 28px; display:flex; align-items:center; justify-content:center; border-radius: 6px; background: linear-gradient(135deg, #f59e0b 0%, #f472b6 60%, #f43f5e 100%); color:white; font-weight:700; }
.brand-text { font-weight: 800; color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, 'Noto Sans SC', sans-serif; }
.main-nav { display: flex; align-items: center; gap: 8px; }
.nav-link { color: var(--text); text-decoration: none; padding: 8px 12px; border-radius: 999px; font-weight: 700; }
.nav-link:hover { background: rgba(59,130,246,.08); }
.nav-item { position: relative; }
.dropdown-toggle { background: transparent; border: none; padding: 8px 12px; border-radius: 999px; font-weight: 700; color: var(--text); }
.dropdown-toggle:hover { background: rgba(59,130,246,.08); }
.caret { margin-left: 6px; font-size: 0.8em; }
.dropdown-menu { position: absolute; top: 100%; left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 0; min-width: 180px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); list-style: none; margin: 0; padding: 0; }
.dropdown-menu a { display: block; padding: 8px 14px; color: var(--text); text-decoration: none; }
.dropdown-menu a:hover { background: #f8fafc; }
.theme-toggle { margin-left: 8px; background: var(--surface); border: 1px solid var(--border); padding: 6px 10px; border-radius: 999px; cursor: pointer; font-size: 14px; }
.menu-toggle { display: none; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 16px; cursor: pointer; }
.mobile-menu { display: none; padding: 8px 12px; border-top: 1px solid var(--border); background: var(--bg); }
.mobile-sub { padding-left: 8px; border-left: 2px solid var(--border); margin-left: 8px; }
@media (max-width: 860px) {
  .main-nav { display: none; }
  .menu-toggle { display: inline-flex; }
  .mobile-menu { display: block; }
}
</style>
