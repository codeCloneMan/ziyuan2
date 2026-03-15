<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 图片放大组件
 * 点击放大查看图片，支持滚轮缩放
 */

defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
  width: {
    type: [String, Number],
    default: '100%',
  },
  height: {
    type: [String, Number],
    default: 'auto',
  },
  maxWidth: {
    type: String,
    default: '100%',
  },
})

const isZoomed = ref(false)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const zoomContainer = ref(null)
const zoomImage = ref(null)

// 打开放大
const openZoom = () => {
  isZoomed.value = true
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  document.body.style.overflow = 'hidden'
}

// 关闭放大
const closeZoom = () => {
  isZoomed.value = false
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  document.body.style.overflow = ''
}

// 滚轮缩放
const handleWheel = (e) => {
  if (!isZoomed.value) return

  e.preventDefault()

  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.min(Math.max(scale.value + delta, 0.5), 5)
  scale.value = newScale
}

// 开始拖拽
const startDrag = (e) => {
  if (!isZoomed.value || scale.value <= 1) return

  isDragging.value = true
  startX.value = e.clientX - translateX.value
  startY.value = e.clientY - translateY.value
}

// 拖拽中
const onDrag = (e) => {
  if (!isDragging.value) return

  translateX.value = e.clientX - startX.value
  translateY.value = e.clientY - startY.value
}

// 结束拖拽
const endDrag = () => {
  isDragging.value = false
}

// 键盘事件
const handleKeydown = (e) => {
  if (!isZoomed.value) return

  if (e.key === 'Escape') {
    closeZoom()
  } else if (e.key === 'ArrowUp') {
    translateY.value -= 50
  } else if (e.key === 'ArrowDown') {
    translateY.value += 50
  } else if (e.key === 'ArrowLeft') {
    translateX.value -= 50
  } else if (e.key === 'ArrowRight') {
    translateX.value += 50
  } else if (e.key === '+' || e.key === '=') {
    scale.value = Math.min(scale.value + 0.2, 5)
  } else if (e.key === '-' || e.key === '_') {
    scale.value = Math.max(scale.value - 0.2, 0.5)
  }
}

// 重置视图
const resetView = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="image-zoom-container">
    <!-- 原始图片 -->
    <img
      :src="src"
      :alt="alt"
      class="zoomable-image"
      :style="{ width, height, maxWidth }"
      @click="openZoom"
    />

    <!-- 放大遮罩层 -->
    <Teleport to="body">
      <div v-if="isZoomed" class="zoom-overlay" @wheel="handleWheel" @click.self="closeZoom">
        <!-- 放大图片 -->
        <div
          ref="zoomContainer"
          class="zoom-content"
          :style="{
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          }"
          @mousedown="startDrag"
        >
          <img ref="zoomImage" :src="src" :alt="alt" class="zoomed-image" />
        </div>

        <!-- 控制按钮 -->
        <div class="zoom-controls">
          <button class="zoom-btn" title="放大 (+)" @click.stop="scale = Math.min(scale + 0.2, 5)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            class="zoom-btn"
            title="缩小 (-)"
            @click.stop="scale = Math.max(scale - 0.2, 0.5)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button class="zoom-btn" title="重置" @click.stop="resetView">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button class="zoom-btn" title="关闭 (ESC)" @click.stop="closeZoom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- 缩放比例显示 -->
        <div class="zoom-scale">{{ Math.round(scale * 100) }}%</div>

        <!-- 快捷键提示 -->
        <div class="zoom-hints">
          <span>滚轮缩放 | 拖拽移动 | ESC关闭</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.image-zoom-container {
  display: inline-block;
  cursor: zoom-in;
  position: relative;
}

.zoomable-image {
  display: block;
  transition: transform 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.zoomable-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 遮罩层 */
.zoom-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
}

.zoom-overlay:active {
  cursor: grabbing;
}

/* 放大内容 */
.zoom-content {
  max-width: 90vw;
  max-height: 90vh;
  transition: transform 0.1s ease;
  position: relative;
}

.zoomed-image {
  max-width: 100%;
  max-height: 90vh;
  display: block;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-drag: none;
}

/* 控制按钮 */
.zoom-controls {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 10000;
}

.zoom-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.zoom-btn:active {
  transform: scale(0.95);
}

.zoom-btn svg {
  width: 24px;
  height: 24px;
}

/* 缩放比例 */
.zoom-scale {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  backdrop-filter: blur(10px);
  z-index: 10000;
}

/* 快捷键提示 */
.zoom-hints {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  backdrop-filter: blur(10px);
  z-index: 10000;
}

/* 响应式 */
@media (max-width: 768px) {
  .zoom-controls {
    bottom: 60px;
  }

  .zoom-btn {
    width: 40px;
    height: 40px;
  }

  .zoom-btn svg {
    width: 20px;
    height: 20px;
  }

  .zoom-scale {
    bottom: 20px;
    font-size: 12px;
    padding: 6px 12px;
  }

  .zoom-hints {
    top: 20px;
    font-size: 11px;
    padding: 6px 12px;
  }
}
</style>
