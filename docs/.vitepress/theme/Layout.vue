<template>
  <div class="vitepress-layout">
    <TopBar />
    <Content />
  </div>
</template>

<script setup>
import TopBar from '../components/TopBar.vue'
import { ref, onMounted, watch } from 'vue'
const showI18nBanner = ref(false)
const currentLang = ref(localStorage.getItem('zt-lang') || 'zh')
watch(currentLang, (v) => localStorage.setItem('zt-lang', v))
onMounted(() => {
  showI18nBanner.value = true
  // sync with localStorage if changed by TopBar via locale (not strictly inherited here)
  const stored = localStorage.getItem('zt-lang')
  if (stored) currentLang.value = stored
})
</script>
<style scoped>
.vitepress-layout {
  padding-top: 80px; /* ensure content not hidden behind top bar */
</style>

<style>
body.theme-fashion {
  background: linear-gradient(45deg, #ff0000, #00ff00, #0000ff);
  min-height: 100vh;
}
</style>
