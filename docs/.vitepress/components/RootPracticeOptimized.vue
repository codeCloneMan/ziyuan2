<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { allRoots } from '../data/rootData.js'

/**
 * 优化版字根练习组件
 */

const props = defineProps({
  mode: {
    type: String,
    default: 'order'
  },
  autoAdvance: {
    type: Boolean,
    default: true
  }
})

const currentRoot = ref(null)
const userInput = ref('')
const feedback = ref('')
const feedbackType = ref('') // 'success' | 'error' | 'info'
const isCorrect = ref(false)
const isWrong = ref(false)
const currentIndex = ref(0)
const practiceList = ref([])
const correctCount = ref(0)
const totalCount = ref(0)
const wrongCount = ref(0)
const elapsedTime = ref(0)
const isPaused = ref(false)
const inputRef = ref(null)

let timer = null

const accuracy = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((correctCount.value / totalCount.value) * 100)
})

const progress = computed(() => {
  if (practiceList.value.length === 0) return 0
  return Math.round((currentIndex.value / practiceList.value.length) * 100)
})

const currentHint = computed(() => {
  if (!currentRoot.value) return ''
  return currentRoot.value.hint || ''
})

const shuffleArray = (array) => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

const initPractice = () => {
  if (props.mode === 'shuffle') {
    practiceList.value = shuffleArray(allRoots)
  } else {
    practiceList.value = [...allRoots]
  }
  currentIndex.value = 0
  totalCount.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  elapsedTime.value = 0
}

const startPractice = () => {
  initPractice()
  loadCurrentRoot()
  startTimer()
  feedback.value = '开始练习！输入字根编码'
  feedbackType.value = 'info'
  focusInput()
}

const loadCurrentRoot = () => {
  if (currentIndex.value >= practiceList.value.length) {
    completePractice()
    return
  }
  currentRoot.value = practiceList.value[currentIndex.value]
  userInput.value = ''
  isCorrect.value = false
  isWrong.value = false
}

const validateInput = () => {
  if (!userInput.value || !currentRoot.value) return

  totalCount.value++
  const input = userInput.value.toLowerCase().trim()
  const code = currentRoot.value.code.toLowerCase()

  if (input === code) {
    handleCorrect()
  } else {
    handleWrong(code)
  }
}

const handleCorrect = () => {
  correctCount.value++
  isCorrect.value = true
  feedback.value = `✅ 正确！编码是：${currentRoot.value.code}`
  feedbackType.value = 'success'

  setTimeout(() => {
    if (props.autoAdvance) {
      nextRoot()
    }
  }, 300)
}

const handleWrong = (correctCode) => {
  wrongCount.value++
  isWrong.value = true
  feedback.value = `❌ 错误！正确编码是：${correctCode}`
  feedbackType.value = 'error'

  setTimeout(() => {
    if (props.autoAdvance) {
      nextRoot()
    }
  }, 1000)
}

const nextRoot = () => {
  currentIndex.value++
  feedback.value = ''
  feedbackType.value = ''
  loadCurrentRoot()
  focusInput()
}

const prevRoot = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    loadCurrentRoot()
    feedback.value = ''
    feedbackType.value = ''
    focusInput()
  }
}

const completePractice = () => {
  stopTimer()
  currentRoot.value = null
  const timeSpent = formatTime(elapsedTime.value)
  feedback.value = `🎉 练习完成！正确率：${accuracy.value}%，用时：${timeSpent}`
  feedbackType.value = 'success'
  isPaused.value = true
}

const restartPractice = () => {
  isPaused.value = false
  startPractice()
}

const startTimer = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const focusInput = () => {
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }, 100)
}

const handleKeydown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (userInput.value) {
      validateInput()
    } else {
      nextRoot()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    if (!isPaused.value) {
      isPaused.value = true
      stopTimer()
    } else {
      isPaused.value = false
      startTimer()
      focusInput()
    }
  } else if (e.ctrlKey && e.key === 'ArrowRight') {
    e.preventDefault()
    nextRoot()
  } else if (e.ctrlKey && e.key === 'ArrowLeft') {
    e.preventDefault()
    prevRoot()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  startPractice()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  stopTimer()
})
</script>

<template>
  <div class="root-practice-optimized">
    <!-- 统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">进度</span>
        <span class="stat-value">{{ currentIndex }} / {{ practiceList.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">正确率</span>
        <span class="stat-value" :class="{ 'success': accuracy >= 80, 'warning': accuracy < 80 }">
          {{ accuracy }}%
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">用时</span>
        <span class="stat-value">{{ formatTime(elapsedTime) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">正确</span>
        <span class="stat-value success">{{ correctCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">错误</span>
        <span class="stat-value error">{{ wrongCount }}</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 主练习区域 -->
    <div class="practice-area" v-if="currentRoot && !isPaused">
      <!-- 字根显示 -->
      <div class="root-display">
        <div class="root-character">{{ currentRoot.character }}</div>
      </div>
      
      <!-- 提示信息 -->
      <div class="hint-display">
        {{ currentHint }}
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <input
          ref="inputRef"
          v-model="userInput"
          type="text"
          maxlength="10"
          placeholder="输入字根编码"
          class="code-input"
          :class="{ 'correct': isCorrect, 'wrong': isWrong }"
          @input="validateInput"
          autocomplete="off"
          spellcheck="false"
        />
        
        <!-- 反馈信息 -->
        <div v-if="feedback" class="feedback-message" :class="feedbackType">
          {{ feedback }}
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button @click="prevRoot" class="btn btn-secondary" :disabled="currentIndex === 0">
          ← 上一个
        </button>
        <button @click="nextRoot" class="btn btn-primary">
          下一个 →
        </button>
        <button @click="restartPractice" class="btn btn-warning">
          🔄 重新开始
        </button>
      </div>
    </div>

    <!-- 完成界面 -->
    <div class="complete-screen" v-if="!currentRoot || isPaused">
      <div v-if="isPaused" class="pause-content">
        <h2>⏸️ 已暂停</h2>
        <div class="complete-stats">
          <div class="stat">
            <span class="stat-number">{{ currentIndex }}</span>
            <span class="stat-label">已完成</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ accuracy }}%</span>
            <span class="stat-label">正确率</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ formatTime(elapsedTime) }}</span>
            <span class="stat-label">用时</span>
          </div>
        </div>
        <div class="complete-actions">
          <button @click="restartPractice" class="btn btn-large btn-primary">
            继续练习
          </button>
        </div>
      </div>

      <div v-else class="complete-content">
        <h2>🎉 练习完成！</h2>
        <div class="complete-stats">
          <div class="stat">
            <span class="stat-number">{{ correctCount }}</span>
            <span class="stat-label">正确</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ wrongCount }}</span>
            <span class="stat-label">错误</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ accuracy }}%</span>
            <span class="stat-label">正确率</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ formatTime(elapsedTime) }}</span>
            <span class="stat-label">用时</span>
          </div>
        </div>
        <div class="complete-message">
          {{ accuracy >= 80 ? '太棒了！继续保持！' : '加油！多练习就能提高！' }}
        </div>
        <div class="complete-actions">
          <button @click="restartPractice" class="btn btn-large btn-primary">
            再来一次
          </button>
        </div>
      </div>
    </div>

    <!-- 键盘快捷键提示 -->
    <div class="keyboard-hints">
      <span class="hint">Enter - 提交</span>
      <span class="hint">Ctrl+→ - 下一个</span>
      <span class="hint">Ctrl+← - 上一个</span>
      <span class="hint">ESC - 暂停</span>
    </div>
  </div>
</template>

<style scoped>
.root-practice-optimized {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  justify-content: space-around;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.stat-value.success {
  color: #4ade80;
}

.stat-value.warning {
  color: #fbbf24;
}

.stat-value.error {
  color: #f87171;
}

/* 进度条 */
.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  margin-bottom: 30px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 4px;
}

/* 练习区域 */
.practice-area {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 50px 40px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

/* 字根显示 */
.root-display {
  text-align: center;
  margin-bottom: 20px;
}

.root-character {
  font-size: 120px;
  font-weight: bold;
  color: #1f2937;
  line-height: 1.2;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

/* 提示信息 */
.hint-display {
  text-align: center;
  font-size: 18px;
  color: #6b7280;
  padding: 15px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  margin-bottom: 30px;
  font-weight: 500;
}

/* 输入区域 */
.input-area {
  max-width: 400px;
  margin: 0 auto 40px;
}

.code-input {
  width: 100%;
  padding: 15px 20px;
  font-size: 24px;
  text-align: center;
  border: 3px solid #d1d5db;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-weight: bold;
  letter-spacing: 2px;
}

.code-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.code-input.correct {
  border-color: #4ade80;
  background: #f0fdf4;
}

.code-input.wrong {
  border-color: #f87171;
  background: #fef2f2;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

/* 反馈信息 */
.feedback-message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
}

.feedback-message.success {
  background: #f0fdf4;
  color: #166534;
  border: 2px solid #4ade80;
}

.feedback-message.error {
  background: #fef2f2;
  color: #991b1b;
  border: 2px solid #f87171;
}

.feedback-message.info {
  background: #eff6ff;
  color: #1e40af;
  border: 2px solid #60a5fa;
}

/* 控制按钮 */
.control-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.btn-warning {
  background: #fef3c7;
  color: #92400e;
}

.btn-warning:hover:not(:disabled) {
  background: #fde68a;
}

.btn-large {
  padding: 16px 40px;
  font-size: 18px;
}

/* 完成界面 */
.complete-screen {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.complete-screen h2 {
  font-size: 32px;
  color: #1f2937;
  margin-bottom: 40px;
}

.complete-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-bottom: 30px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 48px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.complete-message {
  font-size: 20px;
  color: #374151;
  margin-bottom: 40px;
  font-weight: bold;
}

.complete-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

/* 键盘提示 */
.keyboard-hints {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.hint {
  background: #f3f4f6;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .stat-item {
    flex: 1 1 40%;
  }
  
  .root-character {
    font-size: 80px;
  }
  
  .practice-area {
    padding: 30px 20px;
  }
  
  .complete-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .control-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .root-character {
    font-size: 60px;
  }
  
  .code-input {
    font-size: 20px;
    padding: 12px 15px;
  }
  
  .complete-screen {
    padding: 40px 20px;
  }
}
</style>