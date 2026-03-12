<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { allRoots } from '../data/rootData.js'
import { saveProgress, loadProgress, clearProgress } from '../utils/PracticeProgressManager.js'

/**
 * 字源字根打字练习组件
 * 参考 shurufa.app/pad/ling 设计
 */

// 响应式状态
const currentRoot = ref(null)
const userInput = ref('')
const isCorrect = ref(false)
const isWrong = ref(false)
const practiceList = ref([])
const currentIndex = ref(0)
const correctCount = ref(0)
const totalCount = ref(0)
const startTime = ref(null)
const elapsedTime = ref(0)
const isPaused = ref(false)
const inputRef = ref(null)
const showResumeDialog = ref(false)
const savedProgress = ref(null)
const progressRestored = ref(false)

// 计时器
let timer = null

// 计算属性
const typingSpeed = computed(() => {
  if (elapsedTime.value === 0) return 0
  const minutes = elapsedTime.value / 60
  if (minutes === 0) return 0
  return Math.round(totalCount.value / minutes)
})

const accuracy = computed(() => {
  if (totalCount.value === 0) return 100
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

const currentCode = computed(() => {
  if (!currentRoot.value) return ''
  return currentRoot.value.code || ''
})

// 洗牌算法
const shuffleArray = (array) => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// 初始化练习列表
const initPracticeList = () => {
  practiceList.value = shuffleArray(allRoots)
  currentIndex.value = 0
  totalCount.value = 0
  correctCount.value = 0
  elapsedTime.value = 0
}

// 检查是否应该恢复进度
const shouldRestoreProgress = (progressData) => {
  if (!progressData) return false
  if (progressData.isComplete) return false
  if (progressData.answeredRoots < 1) return false
  if (!progressData.practiceRoots || progressData.practiceRoots.length === 0) return false
  return true
}

// 初始化练习（带进度恢复）
const initPractice = (mode, practiceRoots, correctCount, answeredRoots, isComplete) => {
  practiceList.value = [...practiceRoots]
  currentIndex.value = answeredRoots
  correctCount.value = correctCount
  totalCount.value = answeredRoots
  isPaused.value = false
  
  if (!isComplete && answeredRoots < practiceRoots.length) {
    currentRoot.value = practiceRoots[answeredRoots]
  } else {
    isComplete = true
  }
}

// 开始练习
const startPractice = (ignoreSavedProgress = false) => {
  if (ignoreSavedProgress) {
    clearProgress('typing')
  }
  
  initPracticeList()
  loadCurrentRoot()
  startTime.value = Date.now()
  startTimer()
  focusInput()
}

// 加载当前字根
const loadCurrentRoot = () => {
  if (currentIndex.value >= practiceList.value.length) {
    // 练习完成，重新开始
    initPracticeList()
    currentIndex.value = 0
  }
  currentRoot.value = practiceList.value[currentIndex.value]
  userInput.value = ''
  isCorrect.value = false
  isWrong.value = false
}

// 验证输入
const validateInput = () => {
  if (!userInput.value || !currentRoot.value) return

  totalCount.value++
  const input = userInput.value.toLowerCase().trim()
  const code = currentRoot.value.code.toLowerCase()

  if (input === code) {
    handleCorrect()
  } else {
    handleWrong()
  }
}

// 处理正确答案
const handleCorrect = () => {
  correctCount.value++
  isCorrect.value = true
  isWrong.value = false
  
  setTimeout(() => {
    nextRoot()
  }, 200)
}

// 处理错误答案
const handleWrong = () => {
  isWrong.value = true
  isCorrect.value = false
  
  setTimeout(() => {
    isWrong.value = false
    nextRoot()
  }, 800)
}

// 上一个字根
const prevRoot = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    loadCurrentRoot()
    focusInput()
  }
}

// 下一个字根
const nextRoot = () => {
  currentIndex.value++
  loadCurrentRoot()
  focusInput()
}

// 跳过当前字根
const skipRoot = () => {
  nextRoot()
}

// 清除所有记录
const clearAllErrors = () => {
  if (confirm('确定要清除所有记录吗？这将重置您的练习进度。')) {
    clearProgress('typing')
    startPractice(true)
  }
}

// 暂停/继续
const togglePause = () => {
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    stopTimer()
  } else {
    startTimer()
    focusInput()
  }
}

// 开始计时
const startTimer = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

// 停止计时
const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 格式化时间
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 聚焦输入框
const focusInput = () => {
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }, 100)
}

// 恢复进度
const handleResume = () => {
  if (savedProgress.value) {
    initPractice(
      savedProgress.value.mode,
      savedProgress.value.practiceRoots,
      savedProgress.value.correctCount,
      savedProgress.value.answeredRoots,
      savedProgress.value.isComplete
    )
    progressRestored.value = true
    showResumeDialog.value = false
    
    // 更新当前根
    if (currentIndex.value < practiceList.value.length) {
      currentRoot.value = practiceList.value[currentIndex.value]
    }
    
    startTimer()
    focusInput()
  }
}

// 重新开始
const handleRestart = () => {
  showResumeDialog.value = false
  startPractice(true)
}

// 键盘事件处理
const handleKeydown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (userInput.value) {
      validateInput()
    } else {
      skipRoot()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    togglePause()
  } else if (e.key === 'Tab') {
    e.preventDefault()
    skipRoot()
  }
}

// 页面卸载时保存进度
const handleBeforeUnload = () => {
  if (!isPaused.value && totalCount.value >= 1) {
    saveProgress(
      'typing',
      correctCount.value,
      currentIndex.value,
      practiceList.value,
      false,
      'typing'
    )
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  
  // 加载保存的进度
  const progressData = loadProgress('typing')
  savedProgress.value = progressData
  
  if (progressData && shouldRestoreProgress(progressData)) {
    showResumeDialog.value = true
  } else {
    startPractice()
  }
  
  // 添加页面卸载监听
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  stopTimer()
  
  // 离开页面时保存进度
  if (!isPaused.value && totalCount.value >= 1) {
    saveProgress(
      'typing',
      correctCount.value,
      currentIndex.value,
      practiceList.value,
      false,
      'typing'
    )
  }
})
</script>

<template>
  <div class="typing-practice-container">
    <!-- 统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">{{ currentIndex }} / {{ practiceList.length }}</div>
        <div class="stat-label">进度</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" :class="{ 'high': accuracy >= 90, 'medium': accuracy >= 70 }">
          {{ accuracy }}%
        </div>
        <div class="stat-label">正确率</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ formatTime(elapsedTime) }}</div>
        <div class="stat-label">用时</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ correctCount }}</div>
        <div class="stat-label">正确</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ totalCount - correctCount }}</div>
        <div class="stat-label">错误</div>
      </div>
    </div>

    <!-- 主练习区域 -->
    <div class="practice-area" v-if="currentRoot && !isPaused">
      <!-- 字根显示 -->
      <div class="root-display">
        <div class="root-character" :class="{ 'correct': isCorrect, 'wrong': isWrong }">
          {{ currentRoot.character }}
        </div>
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
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button @click="prevRoot" class="btn btn-secondary" :disabled="currentIndex === 0">
          ← 上一个
        </button>
        <button @click="skipRoot" class="btn btn-warning">
          跳过
        </button>
        <button @click="nextRoot" class="btn btn-primary">
          下一个 →
        </button>
        <button @click="togglePause" class="btn btn-secondary">
          {{ isPaused ? '▶️ 继续' : '⏸️ 暂停' }}
        </button>
        <button @click="clearAllErrors" class="btn btn-danger">
          🗑️ 清除记录
        </button>
      </div>
    </div>

    <!-- 暂停界面 -->
    <div class="pause-screen" v-if="isPaused">
      <h2>⏸️ 已暂停</h2>
      <div class="pause-stats">
        <div class="stat">
          <span class="stat-number">{{ typingSpeed }}</span>
          <span class="stat-label">字/分</span>
        </div>
        <div class="stat">
          <span class="stat-number">{{ accuracy }}%</span>
          <span class="stat-label">正确率</span>
        </div>
        <div class="stat">
          <span class="stat-number">{{ correctCount }}</span>
          <span class="stat-label">正确</span>
        </div>
      </div>
      <div class="pause-actions">
        <button @click="togglePause" class="btn btn-large btn-primary">
          继续练习
        </button>
        <button @click="startPractice" class="btn btn-large btn-secondary">
          再来一次
        </button>
      </div>
    </div>

    <!-- 恢复进度对话框 -->
    <div v-if="showResumeDialog" class="resume-overlay">
      <div class="resume-dialog">
        <div class="resume-header">
          <div class="resume-icon">💾</div>
          <div class="resume-title">
            <h2>发现未完成的练习</h2>
            <p>检测到您之前有未完成的练习，要继续吗？</p>
          </div>
        </div>
        <div class="progress-info-row">
          <span class="progress-item">📝 练习模式: 打字练习</span>
          <span class="progress-item">✅ 已完成: {{ savedProgress?.answeredRoots || 0 }}/{{ savedProgress?.practiceRoots?.length || allRoots.length }}</span>
          <span class="progress-item">🎯 正确率: {{ savedProgress ? Math.round((savedProgress.correctCount / savedProgress.answeredRoots) * 100) : 0 }}%</span>
        </div>
        <div class="dialog-buttons">
          <button @click="handleResume" class="btn btn-success">
            ✅ 继续练习
          </button>
          <button @click="handleRestart" class="btn btn-danger">
            🔄 重新开始
          </button>
        </div>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div class="keyboard-hints">
      <span class="hint">Enter - 提交/跳过</span>
      <span class="hint">Tab - 跳过</span>
      <span class="hint">ESC - 暂停/继续</span>
    </div>
  </div>
</template>

<style scoped>
.typing-practice-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  justify-content: space-around;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: white;
  padding: 15px 10px;
  border-radius: 10px;
  margin-bottom: 15px;
  box-shadow: 0 4px 15px rgba(255, 107, 157, 0.3);
}

.stat-item {
  text-align: center;
  min-width: 80px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 3px;
  color: white;
}

.stat-value.high {
  color: #4ade80;
}

.stat-value.medium {
  color: #fbbf24;
}

.stat-label {
  display: block;
  font-size: 12px;
  opacity: 0.9;
}

/* 进度条 */
.progress-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  margin-bottom: 30px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b9d 0%, #c44569 100%);
  transition: width 0.3s ease;
  border-radius: 3px;
}

/* 练习区域 */
.practice-area {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  text-align: center;
}

/* 字根显示 */
.root-display {
  margin-bottom: 30px;
}

.root-character {
  font-size: 150px;
  font-weight: bold;
  color: #1f2937;
  line-height: 1.2;
  transition: all 0.2s ease;
  display: inline-block;
}

.root-character.correct {
  color: #4ade80;
  transform: scale(1.1);
}

.root-character.wrong {
  color: #f87171;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-15px); }
  75% { transform: translateX(15px); }
}

/* 提示信息 */
.hint-display {
  font-size: 20px;
  color: #6b7280;
  padding: 15px 30px;
  background: rgba(255, 107, 157, 0.1);
  border-radius: 8px;
  margin-bottom: 40px;
  font-weight: 500;
  display: inline-block;
}

/* 输入区域 */
.input-area {
  max-width: 500px;
  margin: 0 auto 40px;
}

.code-input {
  width: 100%;
  padding: 20px 25px;
  font-size: 28px;
  text-align: center;
  border: 3px solid #d1d5db;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-weight: bold;
  letter-spacing: 3px;
  font-family: monospace;
}

.code-input:focus {
  outline: none;
  border-color: #ff6b9d;
  box-shadow: 0 0 0 4px rgba(255, 107, 157, 0.2);
}

.code-input.correct {
  border-color: #4ade80;
  background: #f0fdf4;
  color: #166534;
}

.code-input.wrong {
  border-color: #f87171;
  background: #fef2f2;
  color: #991b1b;
}

/* 控制按钮 */
.control-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn {
  padding: 14px 32px;
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

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: white;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-warning {
  background: #fef3c7;
  color: #92400e;
}

.btn-warning:hover {
  background: #fde68a;
}

.btn-large {
  padding: 18px 48px;
  font-size: 18px;
}

/* 暂停界面 */
.pause-screen {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.pause-screen h2 {
  font-size: 36px;
  color: #1f2937;
  margin-bottom: 40px;
}

.pause-stats {
  display: flex;
  justify-content: center;
  gap: 60px;
  margin-bottom: 40px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 56px;
  font-weight: bold;
  color: #ff6b9d;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pause-actions {
  display: flex;
  justify-content: center;
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
  display: flex;
  align-items: center;
  gap: 5px;
}

.hint kbd {
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 恢复进度对话框 */
.resume-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.resume-dialog {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.resume-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.resume-icon {
  font-size: 40px;
}

.resume-title h2 {
  font-size: 22px;
  color: #1f2937;
  margin-bottom: 5px;
  font-weight: 900;
}

.resume-title p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.progress-info-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  background: rgba(255, 107, 157, 0.1);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.progress-item {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dialog-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn-success {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.btn-danger {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 15px;
    padding: 20px 15px;
  }
  
  .stat-item {
    flex: 1 1 40%;
    min-width: 80px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .root-character {
    font-size: 100px;
  }
  
  .practice-area {
    padding: 40px 20px;
  }
  
  .pause-stats {
    gap: 30px;
    flex-wrap: wrap;
  }
  
  .stat-number {
    font-size: 40px;
  }
}

@media (max-width: 480px) {
  .typing-practice-container {
    padding: 15px;
  }
  
  .root-character {
    font-size: 80px;
  }
  
  .code-input {
    font-size: 24px;
    padding: 15px 20px;
  }
  
  .pause-screen {
    padding: 40px 20px;
  }
  
  .pause-screen h2 {
    font-size: 28px;
  }
}
</style>