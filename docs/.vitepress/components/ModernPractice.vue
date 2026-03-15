<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { allRoots } from '../data/rootData.js'
import { isSpecialCharacter, canDisplayCharacter } from '../utils/fontChecker.js'
import { saveProgress, loadProgress, clearProgress } from '../utils/PracticeProgressManager.js'
import {
  safeGetItem,
  safeSetItem,
  isStorageAvailable
} from '../utils/safeStorage.js'
import {
  shuffleArray,
  safeParseInt,
  safeParseNumber,
  formatTime,
  debounce,
  safeFocus,
  prefersReducedMotion
} from '../utils/safeUtils.js'

/**
 * 现代化字根练习组件 - 健壮优化版本
 * 优化点：
 * 1. 使用安全存储工具处理 localStorage
 * 2. 使用防抖处理输入验证
 * 3. 增强边界检查
 * 4. 支持减少动画偏好
 */

// 常量定义
const ERROR_RADICALS_KEY = 'errorRadicals'
const PROGRESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7天

// 组件属性
const props = defineProps({
  mode: {
    type: String,
    default: 'order' // 'order' | 'random' | 'error' for error radical practice
  },
  autoAdvance: {
    type: Boolean,
    default: true
  },
  showHint: {
    type: Boolean,
    default: true
  },
  errorRadicals: {
    type: Array,
    default: () => [] // For error radical practice
  }
})

// 响应式状态
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

const currentCode = computed(() => {
  if (!currentRoot.value) return ''
  return currentRoot.value.code || ''
})

// 检查当前字根是否可以显示
const canDisplayCurrentRoot = computed(() => {
  if (!currentRoot.value) return true
  const char = currentRoot.value.character
  
  // 检查是否是特殊字符
  const isSpecial = isSpecialCharacter(char)
  if (!isSpecial) return true
  
  // 检查是否可以显示
  const canDisplay = canDisplayCharacter(char)
  return canDisplay
})

// 获取字符的Unicode编码
const charUnicode = computed(() => {
  if (!currentRoot.value) return ''
  const char = currentRoot.value.character
  return 'U+' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
})

// 使用工具函数中的 shuffleArray

// 初始化练习列表
const initPracticeList = () => {
  if (props.mode === 'error') {
    // 使用错误字根练习模式
    practiceList.value = [...props.errorRadicals]
  } else if (props.mode === 'random') {
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

// 开始练习
const startPractice = (ignoreSavedProgress = false) => {
  if (ignoreSavedProgress) {
    clearProgress('modern')
  }
  
  initPracticeList()
  loadCurrentRoot()
  startTime.value = Date.now()
  startTimer()
  feedback.value = '开始练习！输入字根编码'
  feedbackType.value = 'info'
  focusInput()
  
  // 保存初始进度
  saveCurrentProgress()
}

// 加载当前字根
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

// 验证输入 - 使用防抖优化
const validateInput = debounce(() => {
  if (!userInput.value || !currentRoot.value) return

  totalCount.value++
  const input = userInput.value.toLowerCase().trim()
  const code = currentRoot.value.code?.toLowerCase() || ''
  
  if (!code) {
    console.warn('当前字根没有编码信息')
    return
  }

  if (input === code) {
    handleCorrect()
  } else {
    handleWrong(code)
  }
}, 150, false)

// 处理正确答案
const handleCorrect = () => {
  correctCount.value++
  isCorrect.value = true
  feedback.value = `✅ 正确！编码是：${currentCode.value}`
  feedbackType.value = 'success'

  setTimeout(() => {
    if (props.autoAdvance) {
      nextRoot()
    }
  }, 500)
}

// 处理错误答案
const handleWrong = (correctCode) => {
  wrongCount.value++
  isWrong.value = true
  feedback.value = `❌ 错误！正确编码是：${correctCode}`
  feedbackType.value = 'error'

  // 保存错误字根到本地存储
  saveErrorRadical(currentRoot.value)

  setTimeout(() => {
    if (props.autoAdvance) {
      nextRoot()
    }
  }, 1500)
}

// 保存当前进度
const saveCurrentProgress = () => {
  const progressData = {
    mode: props.mode,
    currentIndex: currentIndex.value,
    practiceList: practiceList.value,
    correctCount: correctCount.value,
    totalCount: totalCount.value,
    wrongCount: wrongCount.value,
    elapsedTime: elapsedTime.value,
    isPaused: isPaused.value,
    timestamp: Date.now()
  }
  
  saveProgress('modern', progressData)
}

// 恢复进度
const restoreProgress = (progressData) => {
  if (!progressData || typeof progressData !== 'object') return false
  
  try {
    // 检查进度是否过期（7天）
    const timestamp = safeParseNumber(progressData.timestamp, 0)
    if (Date.now() - timestamp > PROGRESS_MAX_AGE) {
      console.log('进度已过期')
      return false
    }
    
    // 恢复状态 - 使用安全解析
    currentIndex.value = safeParseInt(progressData.currentIndex, 0)
    practiceList.value = Array.isArray(progressData.practiceList) ? progressData.practiceList : []
    correctCount.value = safeParseInt(progressData.correctCount, 0)
    totalCount.value = safeParseInt(progressData.totalCount, 0)
    wrongCount.value = safeParseInt(progressData.wrongCount, 0)
    elapsedTime.value = safeParseInt(progressData.elapsedTime, 0)
    isPaused.value = !!progressData.isPaused
    
    // 加载当前字根
    if (currentIndex.value < practiceList.value.length) {
      currentRoot.value = practiceList.value[currentIndex.value]
    } else {
      completePractice()
    }
    
    // 启动计时器
    if (!isPaused.value) {
      startTimer()
    }
    
    progressRestored.value = true
    feedback.value = '✅ 进度已恢复！'
    feedbackType.value = 'success'
    
    return true
  } catch (error) {
    console.error('恢复进度失败:', error)
    return false
  }
}

// 保存错误字根到本地存储 - 使用安全存储
const saveErrorRadical = (root) => {
  if (!root) return
  
  // 加载现有的错误字根
  const errorRadicals = safeGetItem(ERROR_RADICALS_KEY, [])
  
  const rootId = `${root.character}-${root.code}`
  
  // 检查是否已经存在
  const exists = errorRadicals.some(r => `${r.character}-${r.code}` === rootId)
  if (!exists) {
    errorRadicals.push(root)
    const success = safeSetItem(ERROR_RADICALS_KEY, errorRadicals)
    if (success) {
      console.log('错误字根已保存:', root.character)
    }
  }
}

// 下一个字根
const nextRoot = () => {
  currentIndex.value++
  feedback.value = ''
  feedbackType.value = ''
  loadCurrentRoot()
  focusInput()
}

// 上一个字根
const prevRoot = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    loadCurrentRoot()
    feedback.value = ''
    feedbackType.value = ''
    focusInput()
  }
}

// 跳过当前字根
const skipRoot = () => {
  feedback.value = '⏭️ 已跳过'
  feedbackType.value = 'info'
  setTimeout(() => {
    nextRoot()
  }, 300)
}

// 完成练习
const completePractice = () => {
  stopTimer()
  currentRoot.value = null
  const timeSpent = formatTime(elapsedTime.value)
  feedback.value = `🎉 练习完成！正确率：${accuracy.value}%，用时：${timeSpent}`
  feedbackType.value = 'success'
  isPaused.value = true
}

// 重新开始
const restartPractice = () => {
  isPaused.value = false
  startPractice()
}

// 暂停/继续
const togglePause = () => {
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    stopTimer()
    feedback.value = '⏸️ 已暂停'
    feedbackType.value = 'info'
  } else {
    startTimer()
    feedback.value = '▶️ 继续练习'
    feedbackType.value = 'info'
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

// 格式化时间 - 使用工具函数

// 聚焦输入框 - 使用 safeFocus
const focusInput = () => {
  nextTick(() => {
    safeFocus(inputRef.value, 50)
  })
}

// 键盘事件处理
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
    togglePause()
  } else if (e.ctrlKey && e.key === 'ArrowRight') {
    e.preventDefault()
    nextRoot()
  } else if (e.ctrlKey && e.key === 'ArrowLeft') {
    e.preventDefault()
    prevRoot()
  } else if (e.key === 'Tab') {
    e.preventDefault()
    skipRoot()
  }
}

// 处理恢复进度
const handleResume = () => {
  if (savedProgress.value) {
    const success = restoreProgress(savedProgress.value)
    if (success) {
      showResumeDialog.value = false
      focusInput()
    }
  }
}

// 处理重新开始
const handleRestart = () => {
  showResumeDialog.value = false
  startPractice(true)
}

// 检查是否应该恢复进度
const shouldRestoreProgress = (progressData) => {
  if (!progressData) return false
  
  // 检查进度是否过期（7天）
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
  if (Date.now() - progressData.timestamp > SEVEN_DAYS) {
    return false
  }
  
  // 检查是否已完成
  if (progressData.currentIndex >= progressData.practiceList?.length) {
    return false
  }
  
  return true
}

// 页面卸载时保存进度
const handleBeforeUnload = () => {
  if (currentRoot.value && !isPaused.value) {
    saveCurrentProgress()
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  
  // 加载保存的进度
  const progressData = loadProgress('modern')
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
  stopTimer()
  
  // 移除监听器
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // 离开页面时保存进度
  if (currentRoot.value && !isPaused.value) {
    saveCurrentProgress()
  }
})
</script>

<template>
  <div class="modern-practice-container">
    <!-- 顶部统计栏 -->
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
        <div 
          v-if="canDisplayCurrentRoot" 
          class="root-character"
        >
          {{ currentRoot.character }}
        </div>
        <div 
          v-else 
          class="root-character root-unicode"
        >
          <div class="unicode-code">{{ charUnicode }}</div>
          <div class="unicode-hint">{{ currentHint }}</div>
        </div>
      </div>
      
      <!-- 提示信息 -->
      <div v-if="showHint" class="hint-display">
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
        <button @click="skipRoot" class="btn btn-warning">
          跳过
        </button>
        <button @click="nextRoot" class="btn btn-primary">
          下一个 →
        </button>
        <button @click="togglePause" class="btn btn-secondary">
          {{ isPaused ? '▶️ 继续' : '⏸️ 暂停' }}
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
          <button @click="togglePause" class="btn btn-large btn-primary">
            继续练习
          </button>
          <button @click="restartPractice" class="btn btn-large btn-secondary">
            重新开始
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

    <!-- 恢复进度对话框 -->
    <div v-if="showResumeDialog" class="resume-overlay">
      <div class="resume-dialog">
        <div class="resume-icon">💾</div>
        <h2>发现未完成的练习</h2>
        <p>检测到您之前有未完成的练习，要继续吗？</p>
        <div class="progress-info">
          <span>📝 练习模式: {{ savedProgress?.mode === 'order' ? '顺序练习' : savedProgress?.mode === 'random' ? '乱序练习' : '错误字根练习' }}</span>
          <span>✅ 已完成: {{ savedProgress?.currentIndex || 0 }}/{{ savedProgress?.practiceList?.length || allRoots.length }}</span>
          <span>🎯 正确率: {{ savedProgress?.totalCount ? Math.round((savedProgress.correctCount / savedProgress.totalCount) * 100) : 0 }}%</span>
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

    <!-- 键盘快捷键提示 -->
    <div class="keyboard-hints">
      <span class="hint">Enter - 提交</span>
      <span class="hint">Tab - 跳过</span>
      <span class="hint">Ctrl+→ - 下一个</span>
      <span class="hint">Ctrl+← - 上一个</span>
      <span class="hint">ESC - 暂停</span>
    </div>
  </div>
</template>

<style scoped>
/* 导入统一练习卡片样式 */
@import url('../styles/practice-styles.css');

/* 自定义样式 */
.modern-practice-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 15px;
}

/* 统计栏样式覆盖 */
.stats-bar {
  background: linear-gradient(135deg, #e0f7fa 0%, #e3f2fd 50%, #fce4ec 100%);
  box-shadow: 0 4px 15px rgba(224, 247, 250, 0.5);
}

/* 练习区域样式覆盖 */
.practice-area {
  background: linear-gradient(135deg, #e0f7fa 0%, #e3f2fd 50%, #fce4ec 100%);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

/* 字根显示样式覆盖 */
.root-character {
  font-size: 100px;
  font-weight: bold;
  color: #1f2937;
  line-height: 1.2;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  animation: pulse 2s ease-in-out infinite;
}

.root-unicode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 20px;
  border: 2px dashed #9ca3af;
}

.unicode-code {
  font-family: 'Courier New', monospace;
  font-size: 24px;
  font-weight: bold;
  color: #4b5563;
  margin-bottom: 10px;
  background: #f3f4f6;
  padding: 10px 20px;
  border-radius: 8px;
}

.unicode-hint {
  font-size: 18px;
  color: #6b7280;
  font-weight: 500;
  text-align: center;
  max-width: 300px;
}

/* 提示信息样式覆盖 */
.hint-display {
  text-align: center;
  font-size: 18px;
  color: #6b7280;
  padding: 15px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  margin: 1.5rem auto;
  max-width: 500px;
  font-weight: 500;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

/* 完成界面样式覆盖 */
.complete-screen {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  border-radius: 20px;
  padding: 60px 40px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.complete-screen h2 {
  font-size: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 40px;
  font-weight: 900;
}

.complete-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-bottom: 30px;
}

.stat {
  background: rgba(255, 255, 255, 0.8);
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: block;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
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

/* 键盘提示样式覆盖 */
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
    font-size: 70px;
  }
  
  .practice-area {
    padding: 25px 15px;
  }
  
  .complete-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
  
  .control-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .keyboard-hints {
    gap: 10px;
  }
  
  .hint {
    font-size: 10px;
    padding: 4px 10px;
  }
}

@media (max-width: 480px) {
  .stat-value {
    font-size: 18px;
  }
  
  .root-character {
    font-size: 50px;
  }
  
  .code-input {
    font-size: 18px;
    padding: 10px 12px;
  }
  
  .complete-screen {
    padding: 30px 15px;
  }
  
  .complete-screen h2 {
    font-size: 20px;
  }
  
  .stat-number {
    font-size: 30px;
  }
}

/* 进度条样式覆盖 */
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
</style>
