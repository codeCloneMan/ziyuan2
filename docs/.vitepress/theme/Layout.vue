<template>
  <div class="vitepress-layout">
    <TopBar />
    <Content />
  </div>
</template>

<script setup>
import TopBar from '../components/TopBar.vue'
import { ref, computed, onMounted, watch } from 'vue'
const showI18nBanner = ref(false)
const currentLang = ref(localStorage.getItem('zt-lang') || 'zh')
const currentLangLabel = computed(() => currentLang.value === 'zh' ? '中文' : 'English')
watch(currentLang, (v)=> localStorage.setItem('zt-lang', v))
onMounted(() => {
  showI18nBanner.value = true
  // sync with localStorage if changed by TopBar via locale (not strictly inherited here)
  const stored = localStorage.getItem('zt-lang')
  if (stored) currentLang.value = stored
})
</script>
<style scoped>
.theme-fashion {
  background: radial-gradient(circle at 20% 20%, rgba(255, 92, 131, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 80% 60%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
              linear-gradient(135deg, #f7f9ff 0%, #f6faff 60%, #fff4f6 100%);
  min-height: 100vh;
}
.vitepress-layout.theme-fashion {
  /* ensure content sits on fashion background cleanly */
  position: relative;
}
.vitepress-layout {
  padding-top: 80px; /* ensure content not hidden behind top bar */
}
</style>
