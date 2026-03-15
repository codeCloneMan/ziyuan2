<script setup>
/**
 * 字根卡片组件
 * 展示单个字根的卡片，包含字符、编码、提示和分类
 */
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  root: {
    type: Object,
    required: true,
    validator: (value) => {
      return value.character && value.code && value.hint
    }
  }
})

const emit = defineEmits(['click', 'hover'])

const isHovered = ref(false)
const charLoaded = ref(true)

// 检查字符是否是扩展 B 区或更高区域的字符
const isExtendedChar = computed(() => {
  const code = props.root.character.codePointAt(0)
  // CJK 扩展 B 区及以后：U+20000 及以上
  // 包括：扩展 B (20000-2A6DF), C (2A700-2B73F), D (2B740-2B81F), 
  //      E (2B820-2CEAF), F (2CEB0-2EBEF), G (30000-3134F), H-I (31350-+)
  return code >= 0x20000
})

// 获取字符的 Unicode 编码显示
const charUnicode = computed(() => {
  const code = props.root.character.codePointAt(0)
  return `U+${code.toString(16).toUpperCase().padStart(5, '0')}`
})

// 检测字符是否能正常显示（简化版）
const canDisplay = computed(() => {
  // 扩展字符可能需要特殊字体
  if (isExtendedChar.value) {
    return charLoaded.value
  }
  return true
})
</script>

<template>
  <div
    class="root-card"
    :class="{ hovered: isHovered }"
    @click="emit('click', root)"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 字根字符 -->
    <div class="character" :class="{ 'extended-char': isExtendedChar }">
      <template v-if="canDisplay">
        {{ root.character }}
      </template>
      <template v-else>
        <div class="char-placeholder">
          <span class="unicode">{{ charUnicode }}</span>
          <span class="code">{{ root.code.toUpperCase() }}</span>
        </div>
      </template>
    </div>
    
    <!-- 编码徽章 -->
    <div class="code-badge">{{ root.code.toUpperCase() }}</div>
    
    <!-- 提示文字 -->
    <div class="hint">{{ root.hint }}</div>
    
    <!-- 分类标签 -->
    <div class="category-tag" v-if="root.category">
      {{ root.category }}
    </div>
  </div>
</template>

<style scoped>
.root-card {
  position: relative;
  padding: 1.5rem 1rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.root-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.root-card:hover::before {
  opacity: 1;
}

.root-card:hover {
  transform: translateY(-4px);
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
}

.root-card.hovered {
  border-color: #667eea;
}

/* 字根字符 */
.character {
  font-size: 2.5rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 0.5rem;
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease;
  /* 确保偏旁部首等特殊字符能正确显示 */
  font-family: "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "SimHei", "WenQuanYi Micro Hei", "BabelStone Han", "Hanazono", sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* 扩展字符标识 */
.character.extended-char {
  position: relative;
}

/* 占位符样式 */
.char-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background: rgba(243, 244, 246, 0.8);
  border-radius: 8px;
  border: 2px dashed #d1d5db;
  min-width: 60px;
}

.char-placeholder .unicode {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
}

.char-placeholder .code {
  font-size: 1.25rem;
  font-weight: bold;
  color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.root-card:hover .character {
  transform: scale(1.1);
}

.root-card:hover .char-placeholder {
  background: rgba(102, 126, 234, 0.1);
  border-color: #667eea;
}

/* 编码徽章 */
.code-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  z-index: 2;
}

/* 提示文字 */
.hint {
  font-size: 0.875rem;
  color: #475569;
  margin-top: 0.5rem;
  position: relative;
  z-index: 1;
}

/* 分类标签 */
.category-tag {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

/* 暗色模式 */
.dark .root-card {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .root-card::before {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.1));
}

.dark .root-card:hover {
  border-color: #8b5cf6;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
}

.dark .character {
  color: #f1f5f9;
}

.dark .hint {
  color: #cbd5e1;
}

.dark .category-tag {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .root-card {
    padding: 1rem 0.75rem;
    min-height: 120px;
  }
  
  .character {
    font-size: 2rem;
  }
  
  .code-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }
  
  .hint {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .root-card {
    padding: 0.75rem 0.5rem;
    min-height: 100px;
  }
  
  .character {
    font-size: 1.75rem;
  }
  
  .hint {
    font-size: 0.75rem;
  }
}
</style>
