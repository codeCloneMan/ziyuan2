<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { allRoots } from '../data/rootData.js'
import { loadProgress, saveProgress, clearProgress, shouldRestoreProgress } from '../utils/progressManager.js'

const currentRoot = ref(null)
const userInput = ref('')
const feedback = ref('')
const correctCount = ref(0)
const answeredRoots = ref(0)
const practiceMode = ref('order') // 'order' or 'shuffle'
const practiceRoots = ref([])
const showFlash = ref(false)
const isComplete = ref(false)
const fontLoaded = ref(false)
const progressRestored = ref(false)
const showResumeDialog = ref(false)
const savedProgress = ref(null)
// 添加：追踪中文输入状态
const isComposing = ref(false)

const totalRoots = computed(() => practiceRoots.value.length)
const accuracy = computed(() => {
  return totalRoots.value > 0 ? Math.round((correctCount.value / totalRoots.value) * 100) : 0
})
const progress = computed(() => {
  return `${correctCount.value}/${totalRoots.value}`
})

const shuffleArray = (array) => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[randomIndex]
    result[randomIndex] = temp
  }
  return result
}

const initPractice = (mode, roots, correct, answered, complete) => {
  practiceMode.value = mode
  practiceRoots.value = [...roots]
  correctCount.value = correct
  answeredRoots.value = answered
  isComplete.value = complete
  
  if (!complete && answered < roots.length) {
    currentRoot.value = roots[answered]
  } else {
    isComplete.value = true
  }
}

const startPractice = (ignoreSavedProgress = false) => {
  if (!fontLoaded.value) return
  
  // 清除之前的进度
  if (ignoreSavedProgress) {
    clearProgress()
  }
  
  correctCount.value = 0
  answeredRoots.value = 0
  isComplete.value = false
  progressRestored.value = false
  
  if (practiceMode.value === 'order') {
    practiceRoots.value = [...allRoots]
  } else {
    practiceRoots.value = shuffleArray([...allRoots])
  }
  
  nextRoot()
  
  // 注意：这里不保存进度，因为 answeredRoots = 0
}

const toggleOrderMode = () => {
  if (!fontLoaded.value) return
  
  practiceMode.value = 'order'
  startPractice(true) // 忽略保存的进度，重新开始
}

const toggleShuffleMode = () => {
  if (!fontLoaded.value) return
  
  practiceMode.value = 'shuffle'
  startPractice(true) // 忽略保存的进度，重新开始
}

const nextRoot = () => {
  if (answeredRoots.value < practiceRoots.value.length) {
    currentRoot.value = practiceRoots.value[answeredRoots.value]
    userInput.value = '' // 确保输入框清空
    feedback.value = ''
  } else {
    isComplete.value = true
    feedback.value = '🎉 恭喜完成所有字根练习！'
  }
  
  // 保存进度 - 只有 answeredRoots >= 1 时才会真正保存
  saveProgress(
    practiceMode.value,
    correctCount.value,
    answeredRoots.value,
    practiceRoots.value,
    isComplete.value
  )
}

// 新增：封装输入处理逻辑
const handleProcessedInput = (input) => {
  if (!fontLoaded.value || isComplete.value || isComposing.value) return
  
  // 只取第一个字母
  const validInput = input.charAt(0).toLowerCase()
  
  if (validInput.length === 1 && !isComplete.value) {
    answeredRoots.value++
    const userAnswer = validInput
    const correctAnswer = currentRoot.value.code.toLowerCase()
    
    if (userAnswer === correctAnswer) {
      correctCount.value++
      // 答对后保存进度
      saveProgress(
        practiceMode.value,
        correctCount.value,
        answeredRoots.value,
        practiceRoots.value,
        isComplete.value
      )
      
      // 答对后直接清空输入框
      userInput.value = ''
      
      if (answeredRoots.value === practiceRoots.value.length) {
        isComplete.value = true
        feedback.value = '🎉 恭喜完成所有字根练习！'
      } else {
        nextRoot()
      }
    } else {
      showFlash.value = true
      feedback.value = `❌ 错误！正确答案是: ${correctAnswer}`
      setTimeout(() => {
        userInput.value = ''
        showFlash.value = false
        feedback.value = ''
        answeredRoots.value--
        
        // 答错后，如果 answeredRoots 变为0，不保存进度
        if (answeredRoots.value >= 1) {
          saveProgress(
            practiceMode.value,
            correctCount.value,
            answeredRoots.value,
            practiceRoots.value,
            isComplete.value
          )
        }
      }, 500)
    }
  }
}

// 修改：处理输入
const handleInput = (e) => {
  if (!fontLoaded.value || isComplete.value || isComposing.value) return
  
  const input = e.target.value
  
  // 只允许字母输入，且只取第一个字符
  const letterMatch = input.match(/^[a-zA-Z]/)
  if (!letterMatch) {
    // 如果不是字母，清空输入
    e.target.value = ''
    userInput.value = ''
    return
  }
  
  // 处理输入
  handleProcessedInput(letterMatch[0])
  
  // 确保输入框清空
  if (!showFlash.value) {
    userInput.value = ''
    e.target.value = ''
  }
}

// 新增：处理中文输入法开始
const handleCompositionStart = () => {
  isComposing.value = true
}

// 新增：处理中文输入法结束
const handleCompositionEnd = (e) => {
  isComposing.value = false
  // 在中文输入结束后，尝试处理输入
  if (e.data && /^[a-zA-Z]$/.test(e.data)) {
    handleProcessedInput(e.data)
  }
}

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
    if (!isComplete.value && answeredRoots.value < practiceRoots.value.length) {
      currentRoot.value = practiceRoots.value[answeredRoots.value]
    }
    
    feedback.value = `✅ 已恢复进度！已完成 ${answeredRoots.value}/${practiceRoots.value.length} 个字根`
  }
}

const handleRestart = () => {
  showResumeDialog.value = false
  startPractice(true)
}

const loadFonts = async () => {
  try {
    const testElement = document.createElement('div')
    testElement.style.fontFamily = 'CJK-Extended, "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "SimSun", "Arial Unicode MS", sans-serif'
    testElement.textContent = '⺝'
    document.body.appendChild(testElement)
    
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    const width = testElement.offsetWidth
    document.body.removeChild(testElement)
    
    fontLoaded.value = true
    console.log('字体加载成功，可以显示特殊字根')
  } catch (error) {
    console.error('字体加载失败:', error)
    fontLoaded.value = true
  }
}

// 监听页面卸载事件，确保进度保存
const handleBeforeUnload = () => {
  if (fontLoaded.value && !isComplete.value && answeredRoots.value >= 1) {
    saveProgress(
      practiceMode.value,
      correctCount.value,
      answeredRoots.value,
      practiceRoots.value,
      isComplete.value
    )
  }
}

onMounted(async () => {
  // 加载字体
  await loadFonts()
  
  // 加载保存的进度
  const progressData = loadProgress()
  savedProgress.value = progressData
  
  if (progressData && shouldRestoreProgress(progressData)) {
    showResumeDialog.value = true
  } else {
    // 没有可恢复的进度，开始新练习
    practiceMode.value = 'order'
    startPractice(true)
  }
  
  // 添加页面卸载监听
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  // 移除监听器
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // 离开页面时保存进度 - 只有 answeredRoots >= 1 时才保存
  if (fontLoaded.value && !isComplete.value && answeredRoots.value >= 1) {
    saveProgress(
      practiceMode.value,
      correctCount.value,
      answeredRoots.value,
      practiceRoots.value,
      isComplete.value
    )
  }
})
</script>

<template>
  <!-- 模板部分保持不变 -->
  <div class="root-practice">
    <div class="practice-area" :class="{ 'fonts-loaded': fontLoaded }">
      <div class="stats">
        <span>🎯 正确率: {{ accuracy }}%</span>
        <span>📊 进度: {{ progress }}</span>
      </div>
      
      <div class="character-container">
        <div class="character-display">
          <span 
            class="character" 
            :class="{ 'special-character': currentRoot?.character && currentRoot.character.length === 1 && currentRoot.character.charCodeAt(0) > 127 }"
          >
            {{ currentRoot?.character || '🎉' }}
          </span>
          <div v-if="!fontLoaded" class="font-loading">
            <div class="loading-spinner"></div>
            <span>加载特殊字体中...</span>
          </div>
        </div>
        <div class="hint-display">
          {{ isComplete ? '完成！' : currentRoot?.hint || '' }}
        </div>
      </div>
      
      <div class="input-area">
        <input
          v-model="userInput"
          @input="handleInput"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          :placeholder="isComplete ? '练习完成' : '请输入字根编码'"
          class="code-input"
          :class="{ 'flash-red': showFlash }"
          :disabled="isComplete || !fontLoaded"
          maxlength="1"
          autofocus
        />
      </div>
      
      <div class="feedback">{{ feedback }}</div>

      <!-- 恢复进度对话框 -->
      <div v-if="showResumeDialog" class="resume-overlay">
        <div class="resume-dialog">
          <div class="resume-icon">💾</div>
          <h2>发现未完成的练习</h2>
          <p>检测到您之前有未完成的练习，要继续吗？</p>
          <div class="progress-info">
            <span>📝 练习模式: {{ savedProgress?.mode === 'order' ? '顺序练习' : '乱序练习' }}</span>
            <span>✅ 已完成: {{ savedProgress?.answeredRoots || 0 }}/{{ savedProgress?.practiceRoots?.length || allRoots.length }}</span>
            <span>🎯 正确率: {{ savedProgress ? Math.round((savedProgress.correctCount / savedProgress.answeredRoots) * 100) : 0 }}%</span>
          </div>
          <div class="dialog-buttons">
            <button @click="handleResume" class="resume-btn">
              ✅ 继续练习
            </button>
            <button @click="handleRestart" class="restart-btn">
              🔄 重新开始
            </button>
          </div>
        </div>
      </div>

      <!-- 完成覆盖层 -->
      <div v-if="isComplete" class="completion-overlay">
        <div class="completion-content">
          <div class="completion-icon">🎉</div>
          <h2>恭喜完成！</h2>
          <p>正确率: {{ accuracy }}%</p>
          <p>完成进度: {{ progress }}</p>
          <div class="completion-buttons">
            <button @click="startPractice" class="completion-restart-btn">
              🔄 再来一次
            </button>
            <button @click="clearProgress" class="completion-clear-btn">
              🗑️ 清除进度
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="controls">
      <button @click="toggleOrderMode" class="mode-btn" :class="{ 'mode-active': practiceMode === 'order' }">
        🔄 顺序练习
      </button>
      <button @click="toggleShuffleMode" class="mode-btn" :class="{ 'mode-active': practiceMode === 'shuffle' }">
        🎲 乱序练习
      </button>
      <button @click="startPractice(true)" class="restart-btn" :disabled="!fontLoaded">
        🔄 重新开始
      </button>
    </div>
    
    <div class="font-info" v-if="fontLoaded">
      <p>💡 提示：练习进度会永久保存到本地，关闭页面后仍可继续。</p>
      <p v-if="progressRestored">✅ 已恢复之前的练习进度</p>
    </div>
  </div>
</template>

<style scoped>
/* 保持原有字体样式不变 */
@import url('../styles/fonts.css');

@keyframes flashRed {
  0% { border-color: #e74c3c; box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.5); }
  100% { border-color: #3498db; box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.root-practice {
  max-width: 600px;
  margin: 1.5rem auto;
  padding: 1.5rem;
  border: 1px solid #eaecef;
  border-radius: 8px;
  background: #f8f9fa;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.practice-area {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 1.2rem;
  border-radius: 8px;
  background: white;
  min-height: 280px;
  position: relative;
  transition: all 0.3s ease;
}

.fonts-loaded {
  opacity: 1;
  transition: opacity 0.5s ease;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 0.8rem;
  font-weight: bold;
  color: #2c3e50;
}

.character-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem; /* 减少 gap 从 2rem 到 1rem */
  margin: 1.2rem 0; /* 减少 margin 从 2rem 到 1.2rem */
  flex-direction: column;
}

.character-display {
  position: relative;
  min-height: 3rem; /* 减少 min-height 从 4rem 到 3rem */
}

.character {
  font-size: 3.5rem;
  font-weight: bold;
  color: #2c3e50;
  display: block;
  transition: all 0.3s ease;
  font-family: 'CJK-Extended', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Microsoft YaHei', 'SimSun', 'Arial Unicode MS', sans-serif;
}

.special-character {
  font-size: 3.2rem;
}

.hint-display {
  display: flex;
  align-items: center;
  font-size: 1.3rem;
  font-weight: bold;
  color: #3498db;
  background: #e3f2fd;
  padding: 0.4rem 1rem; /* 减少 padding */
  border-radius: 20px;
  min-width: 80px;
  text-align: center;
  margin-top: 0.3rem; /* 减少 margin-top 从 0.5rem 到 0.3rem */
}

.font-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #7f8c8d;
  width: 100%;
}

.loading-spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(52, 152, 219, 0.3);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s linear infinite;
  margin: 0 auto 8px;
}

.input-area {
  margin: 1rem 0; /* 减少 margin 从 1.5rem 到 1rem */
}

.code-input {
  padding: 0.75rem;
  font-size: 1.5rem;
  text-align: center;
  border: 3px solid #3498db;
  border-radius: 8px;
  width: 180px;
  margin: 0 auto;
  outline: none;
  transition: all 0.3s;
  font-family: inherit;
}

.code-input::placeholder {
  color: #95a5a6;
  opacity: 1;
  font-size: 1rem;
}

.code-input:focus {
  border-color: #2980b9;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
}

.code-input.flash-red {
  animation: flashRed 0.5s;
}

.code-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.8;
}

.feedback {
  margin: 0.8rem 0; /* 减少 margin 从 1rem 到 0.8rem */
  font-size: 1.3rem;
  font-weight: bold;
  min-height: 1.8rem;
  color: #e74c3c;
}

/* 恢复进度对话框样式 */
.resume-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  z-index: 20;
}

.resume-dialog {
  background: white;
  border-radius: 12px;
  padding: 1.5rem; /* 减少 padding 从 2rem 到 1.5rem */
  text-align: center;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  animation: fadeIn 0.3s ease;
}

.resume-icon {
  font-size: 2.5rem; /* 减少 font-size 从 3rem 到 2.5rem */
  margin-bottom: 0.8rem; /* 减少 margin-bottom 从 1rem 到 0.8rem */
  color: #3498db;
}

.resume-dialog h2 {
  font-size: 1.6rem; /* 减少 font-size 从 1.8rem 到 1.6rem */
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.resume-dialog p {
  color: #7f8c8d;
  margin-bottom: 1rem; /* 减少 margin-bottom 从 1.5rem 到 1rem */
  font-size: 1rem; /* 减少 font-size 从 1.1rem 到 1rem */
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem; /* 减少 gap 从 0.5rem 到 0.4rem */
  margin-bottom: 1rem; /* 减少 margin-bottom 从 1.5rem 到 1rem */
  padding: 0.8rem; /* 减少 padding 从 1rem 到 0.8rem */
  background: #f8f9fa;
  border-radius: 8px;
  text-align: left;
}

.progress-info span {
  font-weight: bold;
  color: #2c3e50;
}

.dialog-buttons {
  display: flex;
  gap: 0.8rem; /* 减少 gap 从 1rem 到 0.8rem */
  justify-content: center;
}

.resume-btn, .restart-btn {
  padding: 0.7rem 1.2rem; /* 减少 padding */
  border: none;
  border-radius: 8px;
  font-size: 0.95rem; /* 减少 font-size 从 1rem 到 0.95rem */
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.resume-btn {
  background: #3498db;
  color: white;
}

.resume-btn:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

.restart-btn {
  background: #e74c3c;
  color: white;
}

.restart-btn:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

/* 完成覆盖层样式 */
.completion-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  z-index: 10;
  backdrop-filter: blur(2px);
}

.completion-content {
  text-align: center;
  padding: 1.5rem; /* 减少 padding 从 2rem 到 1.5rem */
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  max-width: 90%;
}

.completion-icon {
  font-size: 3.5rem; /* 减少 font-size 从 4rem 到 3.5rem */
  margin-bottom: 0.8rem; /* 减少 margin-bottom 从 1rem 到 0.8rem */
  color: #27ae60;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); } /* 减少 bounce 幅度 */
}

.completion-content h2 {
  font-size: 1.8rem; /* 减少 font-size 从 2rem 到 1.8rem */
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.completion-content p {
  font-size: 1.1rem; /* 减少 font-size 从 1.2rem 到 1.1rem */
  color: #3498db;
  margin: 0.4rem 0; /* 减少 margin 从 0.5rem 到 0.4rem */
  font-weight: bold;
}

.completion-buttons {
  display: flex;
  gap: 0.8rem; /* 减少 gap 从 1rem 到 0.8rem */
  justify-content: center;
  margin-top: 1.2rem; /* 减少 margin-top 从 1.5rem 到 1.2rem */
}

.completion-restart-btn {
  padding: 0.7rem 1.8rem; /* 减少 padding */
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem; /* 减少 font-size 从 1.1rem 到 1rem */
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.4); /* 减少 shadow */
}

.completion-restart-btn:hover {
  background: #219653;
  transform: translateY(-2px);
  box-shadow: 0 3px 12px rgba(39, 174, 96, 0.6); /* 减少 shadow */
}

.completion-clear-btn {
  padding: 0.7rem 1.8rem; /* 减少 padding */
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem; /* 减少 font-size 从 1.1rem 到 1rem */
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(149, 165, 166, 0.4); /* 减少 shadow */
}

.completion-clear-btn:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
  box-shadow: 0 3px 12px rgba(149, 165, 166, 0.6); /* 减少 shadow */
}

.controls {
  display: flex;
  justify-content: center;
  gap: 8px; /* 减少 gap 从 10px 到 8px */
  margin-top: 0.8rem; /* 减少 margin-top 从 1rem 到 0.8rem */
  flex-wrap: wrap;
}

.mode-btn {
  padding: 0.55rem 0.9rem; /* 减少 padding */
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem; /* 减少 font-size 从 0.9rem 到 0.85rem */
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); /* 减少 shadow */
}

.mode-btn:hover {
  transform: translateY(-1px); /* 减少 transform 幅度 */
}

.mode-btn.mode-active {
  background: #3498db;
}

.mode-btn.mode-active:hover {
  background: #2980b9;
}

.mode-btn:not(.mode-active) {
  background: #95a5a6;
}

.mode-btn:not(.mode-active):hover {
  background: #7f8c8d;
}

.restart-btn {
  padding: 0.55rem 0.9rem; /* 减少 padding */
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem; /* 减少 font-size 从 0.9rem 到 0.85rem */
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); /* 减少 shadow */
}

.restart-btn:hover {
  background: #c0392b;
  transform: translateY(-1px); /* 减少 transform 幅度 */
}

.restart-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
}

.font-info {
  margin-top: 0.8rem; /* 减少 margin-top 从 1rem 到 0.8rem */
  padding: 0.4rem; /* 减少 padding 从 0.5rem 到 0.4rem */
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.8rem; /* 减少 font-size 从 0.85rem 到 0.8rem */
  color: #7f8c8d;
  text-align: center;
}
</style>