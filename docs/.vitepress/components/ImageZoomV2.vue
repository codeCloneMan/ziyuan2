<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: '字根图'
  },
  caption: {
    type: String,
    default: '字根图 - 点击可放大查看'
  },
  maxWidth: {
    type: String,
    default: '100%'
  },
  maxHeight: {
    type: String,
    default: '900px'
  }
})

const isZoomed = ref(false)
const imageContainer = ref(null)
const imageLoaded = ref(false)
const imageError = ref(false)
const errorMessage = ref('')

const toggleZoom = () => {
  if (!imageError.value && imageLoaded.value) {
    isZoomed.value = !isZoomed.value
    if (isZoomed.value) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
}

const handleImageLoad = () => {
  imageLoaded.value = true
  imageError.value = false
  errorMessage.value = ''
}

const handleImageError = () => {
  imageError.value = true
  imageLoaded.value = false
  errorMessage.value = '图片加载失败'
  console.error('图片加载失败:', props.src)
}

const handleClickOutside = (e) => {
  if (isZoomed.value && imageContainer.value && !imageContainer.value.contains(e.target)) {
    toggleZoom()
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && isZoomed.value) {
    toggleZoom()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div ref="imageContainer" class="image-zoom-container">
    <!-- 正常图片 -->
    <div v-if="!imageError" class="thumbnail-container" @click="toggleZoom">
      <img 
        :src="src" 
        :alt="alt" 
        class="thumbnail-image"
        :class="{ 'loading': !imageLoaded }"
        :style="{ maxWidth, maxHeight }"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      <div class="caption">{{ caption }}</div>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="imageError" class="image-error-state">
      <div class="error-icon">❌</div>
      <div class="error-message">{{ errorMessage }}</div>
      <div class="error-hint">请检查图片路径</div>
    </div>
    
    <!-- 放大查看 -->
    <div v-if="isZoomed" class="zoom-overlay">
      <div class="zoom-content" @click.stop>
        <img :src="src" :alt="alt" class="zoomed-image" />
        <div class="zoom-controls">
          <button @click="toggleZoom" class="close-btn">关闭 (ESC)</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-zoom-container {
  position: relative;
  margin: 1.5rem auto;
  max-width: 800px;
}

.thumbnail-container {
  cursor: pointer;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.thumbnail-container:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.thumbnail-image {
  width: 100%;
  height: auto;
  display: block;
  transition: all 0.3s ease;
  opacity: 1;
}

.thumbnail-image.loading {
  opacity: 0.5;
  cursor: wait;
}

.thumbnail-container:hover .thumbnail-image {
  transform: scale(1.02);
}

.caption {
  padding: 0.5rem;
  background: #f8f9fa;
  color: #2c3e50;
  font-weight: bold;
  text-align: center;
  font-size: 0.9rem;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.image-error-state {
  padding: 30px;
  background: #fff5f5;
  border: 2px dashed #ff6b6b;
  border-radius: 8px;
  text-align: center;
  margin: 1.5rem auto;
  max-width: 400px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.error-message {
  color: #e03131;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 8px;
}

.error-hint {
  color: #868e96;
  font-size: 14px;
}

.zoom-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.zoom-content {
  position: relative;
  max-width: 95%;
  max-height: 95%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zoomed-image {
  max-width: 90vw;
  max-height: 80vh;
  border: 3px solid #3498db;
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.7);
  object-fit: contain;
}

.zoom-controls {
  margin-top: 20px;
  text-align: center;
  color: white;
  width: 100%;
}

.close-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.5);
}

.close-btn:hover {
  background: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.7);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .thumbnail-container {
    margin: 1rem auto;
  }
  
  .zoomed-image {
    max-width: 95vw;
    max-height: 70vh;
  }
  
  .image-error-state {
    padding: 20px;
    max-width: 300px;
  }
  
  .error-icon {
    font-size: 36px;
  }
  
  .error-message {
    font-size: 16px;
  }
  
  .close-btn {
    padding: 8px 20px;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .caption {
    font-size: 0.85rem;
  }
  
  .error-hint {
    font-size: 12px;
  }
}
</style>