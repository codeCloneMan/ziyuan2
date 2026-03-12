<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { allRoots } from '../data/rootData.js'
import { isSpecialCharacter, canDisplayCharacter } from '../utils/fontChecker.js'
import { saveProgress, loadProgress, clearProgress } from '../utils/PracticeProgressManager.js'

/**
 * 错误字根练习组件
 * 专门练习之前答错的字根
 */

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

// 错误字根管理
const errorRadicals = ref([])
const masteredRadicals = ref([])
const radicalStats = ref({}) // 记录每个字根的统计信息

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

const remainingErrors = computed(() => {
  return errorRadicals.value.length
})

const masteredCount = computed(() => {
  return masteredRadicals.value.length
})

const masteryRate = computed(() => {
  const totalErrors = errorRadicals.value.length + masteredRadicals.value.length
  if (totalErrors === 0) return 0
  return Math.round((masteredRadicals.value.length / totalErrors) * 100)
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

// 从本地存储加载错误字根
const loadErrorRadicals = () => {
  try {
    const saved = localStorage.getItem('errorRadicals')
    if (saved) {
      errorRadicals.value = JSON.parse(saved)
    }
    
    const savedMastered = localStorage.getItem('masteredRadicals')
    if (savedMastered) {
      masteredRadicals.value = JSON.parse(savedMastered)
    }
    
    const savedStats = localStorage.getItem('radicalStats')
    if (savedStats) {
      radicalStats.value = JSON.parse(savedStats)
    }
  } catch (error) {
    console.error('加载错误字根失败:', error)
    errorRadicals.value = []
    masteredRadicals.value = []
    radicalStats.value = {}
  }
}

// 保存错误字根到本地存储
const saveErrorRadicals = () => {
  try {
    localStorage.setItem('errorRadicals', JSON.stringify(errorRadicals.value))
    localStorage.setItem('masteredRadicals', JSON.stringify(masteredRadicals.value))
    localStorage.setItem('radicalStats', JSON.stringify(radicalStats.value))
  } catch (error) {
    console.error('保存错误字根失败:', error)
  }
}

// 添加错误字根
const addErrorRadical = (root) => {
  if (!root) return
  
  const rootId = `${root.character}-${root.code}`
  
  // 如果已经在已掌握列表中，先移除
  const masteredIndex = masteredRadicals.value.findIndex(r => 
    `${r.character}-${r.code}` === rootId
  )
  if (masteredIndex !== -1) {
    masteredRadicals.value.splice(masteredIndex, 1)
  }
  
  // 添加到错误列表（如果不在列表中）
  const errorIndex = errorRadicals.value.findIndex(r => 
    `${r.character}-${r.code}` === rootId
  )
  if (errorIndex === -1) {
    errorRadicals.value.push(root)
  }
  
  // 更新统计信息
  if (!radicalStats.value[rootId]) {
    radicalStats.value[rootId] = {
      errorCount: 0,
      correctCount: 0,
      lastPracticed: null,
      consecutiveCorrect: 0
    }
  }
  radicalStats.value[rootId].errorCount++
  radicalStats.value[rootId].lastPracticed = new Date().toISOString()
  radicalStats.value[rootId].consecutiveCorrect = 0
  
  saveErrorRadicals()
}

// 标记字根为已掌握
const markAsMastered = (root) => {
  if (!root) return
  
  const rootId = `${root.character}-${root.code}`
  
  // 从错误列表中移除
  const errorIndex = errorRadicals.value.findIndex(r => 
    `${r.character}-${r.code}` === rootId
  )
  if (errorIndex !== -1) {
    errorRadicals.value.splice(errorIndex, 1)
  }
  
  // 添加到已掌握列表（如果不在列表中）
  const masteredIndex = masteredRadicals.value.findIndex(r => 
    `${r.character}-${r.code}` === rootId
  )
  if (masteredIndex === -1) {
    masteredRadicals.value.push(root)
  }
  
  saveErrorRadicals()
}

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
  // 只使用错误字根进行练习
  practiceList.value = shuffleArray([...errorRadicals.value])
  currentIndex.value = 0
  totalCount.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  elapsedTime.value = 0
}

// 开始练习
const startPractice = () => {
  loadErrorRadicals()
  
  if (errorRadicals.value.length === 0) {
    feedback.value = '🎉 恭喜！目前没有需要练习的错误字根。'
    feedbackType.value = 'success'
    return
  }
  
  initPracticeList()
  loadCurrentRoot()
  startTime.value = Date.now()
  startTimer()
  feedback.value = `开始错误字根练习！共 ${errorRadicals.value.length} 个需要练习的字根`
  feedbackType.value = 'info'
  focusInput()
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

// 验证输入
const validateInput = () => {
  if (!userInput.value || !currentRoot.value) return

  totalCount.value++
  const input = userInput.value.toLowerCase().trim()
  const code = currentRoot.value.code.toLowerCase()
  const rootId = `${currentRoot.value.character}-${currentRoot.value.code}`

  if (input === code) {
    handleCorrect(rootId)
  } else {
    handleWrong(code, rootId)
  }
}

// 处理正确答案
const handleCorrect = (rootId) => {
  correctCount.value++
  isCorrect.value = true
  feedback.value = `✅ 正确！编码是：${currentCode.value}`
  feedbackType.value = 'success'
  
  // 更新统计信息
  if (!radicalStats.value[rootId]) {
    radicalStats.value[rootId] = {
      errorCount: 0,
      correctCount: 0,
      lastPracticed: null,
      consecutiveCorrect: 0
    }
  }
  radicalStats.value[rootId].correctCount++
  radicalStats.value[rootId].lastPracticed = new Date().toISOString()
  radicalStats.value[rootId].consecutiveCorrect++
  
  // 如果连续答对3次，标记为已掌握
  if (radicalStats.value[rootId].consecutiveCorrect >= 3) {
    markAsMastered(currentRoot.value)
    feedback.value = `🎉 太棒了！字根 "${currentRoot.value.character}" 已掌握！`
  }
  
  saveErrorRadicals()

  setTimeout(() => {
    nextRoot()
  }, 800)
}

// 处理错误答案
const handleWrong = (correctCode, rootId) => {
  wrongCount.value++
  isWrong.value = true
  feedback.value = `❌ 错误！正确编码是：${correctCode}`
  feedbackType.value = 'error'
  
  // 添加到错误字根列表
  addErrorRadical(currentRoot.value)

  setTimeout(() => {
    nextRoot()
  }, 1500)
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

// 清除所有错误记录
const clearAllErrors = () => {
  if (confirm('确定要清除所有错误记录吗？这将重置您的练习进度。')) {
    errorRadicals.value = []
    masteredRadicals.value = []
    radicalStats.value = {}
    saveErrorRadicals()
    startPractice()
  }
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

// 生命周期
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
  <div class="error-practice-container">
    <!-- 顶部统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">错误字根</span>
        <span class="stat-value error">{{ remainingErrors }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已掌握</span>
        <span class="stat-value success">{{ masteredCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">掌握率</span>
        <span class="stat-value" :class="{ 'success': masteryRate >= 80, 'warning': masteryRate < 80 }">
          {{ masteryRate }}%
        </span>
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
    </div>

    <!-- 进度条 -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 主练习区域 -->
    <div class="practice-area" v-if="currentRoot && !isPaused && errorRadicals.length > 0">
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

    <!-- 无错误字根提示 -->
    <div v-if="errorRadicals.length === 0" class="no-errors-message">
      <div class="success-icon">🎉</div>
      <h2>恭喜！没有需要练习的错误字根</h2>
      <p>您的字根掌握情况非常好！继续保持！</p>
      <div class="suggestions">
        <p>建议：</p>
        <ul>
          <li>继续进行 <a href="/practice/modern">顺序字根练习</a></li>
          <li>尝试 <a href="/practice/random">随机模式练习</a></li>
          <li>挑战 <a href="/practice/top500">常用字根练习</a></li>
        </ul>
      </div>
    </div>

    <!-- 完成界面 -->
    <div class="complete-screen" v-if="(!currentRoot || isPaused) && errorRadicals.length > 0">
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
          <button @click="clearAllErrors" class="btn btn-large btn-danger">
            🗑️ 清除记录
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
.error-practice-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 15px;
}

/* 统计栏样式覆盖 */
.stats-bar {
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 50%, #fd79a8 100%);
  box-shadow: 0 4px 15px rgba(253, 121, 168, 0.3);
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
  background: linear-gradient(90deg, #fd79a8 0%, #e17055 100%);
  transition: width 0.3s ease;
  border-radius: 4px;
}

/* 练习区域样式覆盖 */
.practice-area {
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 50%, #fd79a8 100%);
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
  background: rgba(253, 121, 168, 0.1);
  border-radius: 8px;
  margin: 1.5rem auto;
  max-width: 500px;
  font-weight: 500;
  border: 1px solid rgba(253, 121, 168, 0.2);
}

/* 输入区域样式覆盖 */
.code-input:focus {
  border-color: #fd79a8;
  box-shadow: 0 0 0 4px rgba(253, 121, 168, 0.2);
}

/* 按钮样式覆盖 */
.btn-primary {
  background: linear-gradient(135deg, #fd79a8 0%, #e17055 100%);
  color: white;
  box-shadow: 0 8px 24px rgba(253, 121, 168, 0.3);
}

/* 无错误字根提示 */
.no-errors-message {
  background: linear-gradient(135deg, #a7e6c3 0%, #6ee7b7 50%, #34d399 100%);
  border-radius: 16px;
  padding: 60px 40px;
  text-align: center;
  margin-bottom: 20px;
  box-shadow: 0 8px 30px rgba(52, 211, 153, 0.3);
}

.success-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.no-errors-message h2 {
  font-size: 28px;
  color: #1f2937;
  margin-bottom: 15px;
}

.no-errors-message p {
  font-size: 18px;
  color: #374151;
  margin-bottom: 25px;
}

.suggestions {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 20px;
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
}

.suggestions p {
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 10px;
}

.suggestions ul {
  list-style: none;
  padding: 0;
}

.suggestions li {
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
}

.suggestions li:before {
  content: "→";
  position: absolute;
  left: 0;
  color: #34d399;
}

.suggestions a {
  color: #fd79a8;
  text-decoration: none;
  font-weight: bold;
}

.suggestions a:hover {
  text-decoration: underline;
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
  background: linear-gradient(135deg, #fd79a8 0%, #e17055 100%);
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
  background: linear-gradient(135deg, #fd79a8 0%, #e17055 100%);
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
</style>
