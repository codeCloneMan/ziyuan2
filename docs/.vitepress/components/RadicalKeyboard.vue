/** * 字根键盘组件 - 显示 QWERTY 键盘布局及字根位置 * 模仿虎码练习页面的虚拟键盘设计 */

<script setup>
const props = defineProps({
  // 当前要显示的字根编码
  currentCode: {
    type: String,
    default: '',
  },
  // 用户输入的编码
  userInput: {
    type: String,
    default: '',
  },
  // 是否显示正确/错误状态
  showResult: {
    type: Boolean,
    default: false,
  },
  // 是否正确
  isCorrect: {
    type: Boolean,
    default: false,
  },
})

// QWERTY 键盘布局
const keyboardRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

// 获取按键状态
const getKeyState = (key) => {
  const upperCode = props.currentCode.toUpperCase()
  const upperInput = props.userInput.toUpperCase()

  // 如果正在输入，高亮对应的按键
  if (upperInput && key === upperInput[0]) {
    return 'active'
  }

  // 如果显示结果
  if (props.showResult) {
    // 正确时高亮答案键
    if (props.isCorrect && upperCode.includes(key)) {
      return 'correct'
    }
    // 错误时高亮答案键和用户按错的键
    if (!props.isCorrect) {
      if (upperCode.includes(key)) {
        return 'target'
      }
      if (upperInput.includes(key)) {
        return 'wrong'
      }
    }
  }

  return 'normal'
}
</script>

<template>
  <div class="radical-keyboard">
    <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="keyboard-row">
      <div v-for="key in row" :key="key" class="keyboard-key" :class="getKeyState(key)">
        {{ key }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.radical-keyboard {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
}

.keyboard-row:nth-child(2) {
  padding-left: 1.5rem;
}

.keyboard-row:nth-child(3) {
  padding-left: 3rem;
}

.keyboard-key {
  width: 2.8rem;
  height: 2.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  transition: all 0.15s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.keyboard-key.normal:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
}

.keyboard-key.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  transform: translateY(2px);
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.3);
}

.keyboard-key.correct {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
  animation: correctPulse 0.5s ease;
}

.keyboard-key.target {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
  animation: targetPulse 0.5s ease;
}

.keyboard-key.wrong {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
  animation: wrongShake 0.5s ease;
}

@keyframes correctPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes targetPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
  }
}

@keyframes wrongShake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .keyboard-key {
    width: 2.2rem;
    height: 2.2rem;
    font-size: 0.875rem;
  }

  .keyboard-row:nth-child(2) {
    padding-left: 1rem;
  }

  .keyboard-row:nth-child(3) {
    padding-left: 2rem;
  }
}

@media (max-width: 480px) {
  .keyboard-key {
    width: 1.8rem;
    height: 1.8rem;
    font-size: 0.75rem;
    border-radius: 6px;
  }

  .keyboard-row {
    gap: 0.25rem;
  }

  .keyboard-row:nth-child(2) {
    padding-left: 0.75rem;
  }

  .keyboard-row:nth-child(3) {
    padding-left: 1.5rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .keyboard-key.normal:hover {
    transform: none;
    border-color: #e2e8f0;
    color: #475569;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .keyboard-key {
    transition: none;
  }

  .keyboard-key.correct,
  .keyboard-key.target,
  .keyboard-key.wrong {
    animation: none;
  }
}
</style>
