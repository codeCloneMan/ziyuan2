<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { allRoots } from '../data/rootData.js'
import {
  loadProgress,
  saveProgress,
  clearProgress,
  shouldRestoreProgress,
} from '../utils/progressManager.js'
import { formatTime, safeFocus } from '../utils/safeUtils.js'
import { isSpecialCharacter, canDisplayCharacter } from '../utils/fontChecker.js'

const currentRoot = ref(null)
const userInput = ref('')
const feedback = ref('')
const isCorrect = ref(false)
const correctCount = ref(0)
const answeredRoots = ref(0)
const practiceMode = ref('order') // 'order' or 'shuffle'
const practiceRoots = ref([])
const showFlash = ref(false)
const isComplete = ref(false)
const fontLoaded = ref(false)
const progressRestored = ref(false)
const showResumeDialog = ref(false)
const showCrossResumeDialog = ref(false)
const savedProgress = ref(null)
const savedCrossState = ref(null)
const inputRef = ref(null)
const isComposing = ref(false)
const isCrossPractice = ref(false)
const currentGroup = ref(0)
const groupRepetitions = ref(0)
const groupRoots = ref([])
const totalGroups = ref(0)
const completedGroups = ref(0)

// 计时器
let timer = null
const startTime = ref(null)
const elapsedTime = ref(0)

const totalRoots = computed(() => practiceRoots.value.length)
const accuracy = computed(() => {
  return totalRoots.value > 0 ? Math.round((correctCount.value / totalRoots.value) * 100) : 0
})
const progress = computed(() => {
  return `${correctCount.value}/${totalRoots.value}`
})

const crossPracticeProgress = computed(() => {
  if (!isCrossPractice.value) return ''
  return `第 ${currentGroup.value + 1}/${totalGroups.value} 组 (已练习 ${groupRepetitions.value}/3 遍)`
})

const canDisplayCurrentRoot = computed(() => {
  if (!currentRoot.value) return true
  const char = currentRoot.value.character
  return isSpecialCharacter(char) ? canDisplayCharacter(char) : true
})

const charUnicode = computed(() => {
  if (!currentRoot.value) return ''
  return (
    'U+' + currentRoot.value.character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
  )
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

const initCrossPractice = () => {
  if (!fontLoaded.value) return

  const roots = [...allRoots]
  totalGroups.value = Math.ceil(roots.length / 10)

  const savedCrossProgress = loadCrossPracticeProgress()
  if (savedCrossProgress) {
    completedGroups.value = savedCrossProgress.completedGroups || 0
    currentGroup.value = savedCrossProgress.currentGroup || 0
    groupRepetitions.value = savedCrossProgress.groupRepetitions || 0

    completedGroups.value = Number(completedGroups.value)
    currentGroup.value = Number(currentGroup.value)
    groupRepetitions.value = Number(groupRepetitions.value)

    if (completedGroups.value >= totalGroups.value) {
      isComplete.value = true
      feedback.value = '🎉 恭喜完成所有十字练习！'
      return
    }
  } else {
    completedGroups.value = 0
    currentGroup.value = 0
    groupRepetitions.value = 0
  }

  loadCurrentGroup()
}

const loadCurrentGroup = () => {
  const roots = [...allRoots]
  const startIdx = currentGroup.value * 10
  const endIdx = Math.min(startIdx + 10, roots.length)
  groupRoots.value = roots.slice(startIdx, endIdx)

  if (practiceMode.value === 'order') {
    practiceRoots.value = [...groupRoots.value]
  } else {
    practiceRoots.value = shuffleArray([...groupRoots.value])
  }

  correctCount.value = 0
  answeredRoots.value = 0
  isComplete.value = false

  nextRoot()
}

const handleGroupCompleted = () => {
  groupRepetitions.value++

  saveCrossPracticeProgress({
    completedGroups: completedGroups.value,
    currentGroup: currentGroup.value,
    groupRepetitions: groupRepetitions.value,
    lastCompletedTime: new Date().toISOString(),
  })

  if (groupRepetitions.value >= 3) {
    completedGroups.value++
    saveCrossPracticeProgress({
      completedGroups: completedGroups.value,
      currentGroup: currentGroup.value,
      groupRepetitions: 0,
      lastCompletedTime: new Date().toISOString(),
    })

    if (completedGroups.value >= totalGroups.value) {
      isComplete.value = true
      feedback.value = '🎉 恭喜完成所有十字练习！'
      return
    }

    currentGroup.value = completedGroups.value
    groupRepetitions.value = 0
    feedback.value = `✅ 完成第 ${completedGroups.value} 组！进入第 ${currentGroup.value + 1} 组`
  } else {
    feedback.value = `✅ 完成第 ${groupRepetitions.value}/3 遍练习，继续下一遍！`
  }

  setTimeout(() => {
    loadCurrentGroup()
  }, 1500)
}

const startPractice = (ignoreSavedProgress = false) => {
  if (!fontLoaded.value) return

  if (ignoreSavedProgress) {
    if (isCrossPractice.value) {
      clearCrossPracticeProgress()
      clearCrossPracticeState()
    } else {
      clearProgress()
    }
  }

  correctCount.value = 0
  answeredRoots.value = 0
  isComplete.value = false
  progressRestored.value = false

  startTimer()
  focusInput()

  if (isCrossPractice.value) {
    initCrossPractice()
    return
  }

  if (practiceMode.value === 'order') {
    practiceRoots.value = [...allRoots]
  } else {
    practiceRoots.value = shuffleArray([...allRoots])
  }

  nextRoot()
}

const startTimer = () => {
  stopTimer()
  startTime.value = Date.now()
  elapsedTime.value = 0

  timer = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const focusInput = () => {
  nextTick(() => {
    safeFocus(inputRef.value, 100)
  })
}

const toggleCrossPractice = () => {
  if (!fontLoaded.value) return

  isCrossPractice.value = !isCrossPractice.value

  if (isCrossPractice.value) {
    initCrossPractice()
  } else {
    startPractice(true)
  }

  saveCrossPracticeState({
    isCrossPractice: isCrossPractice.value,
    practiceMode: practiceMode.value,
    currentGroup: currentGroup.value,
    groupRepetitions: groupRepetitions.value,
    completedGroups: completedGroups.value,
  })
}

const toggleOrderMode = () => {
  if (!fontLoaded.value) return

  practiceMode.value = 'order'

  if (isCrossPractice.value) {
    loadCurrentGroup()
    saveCrossPracticeState({
      isCrossPractice: true,
      practiceMode: 'order',
      currentGroup: currentGroup.value,
      groupRepetitions: groupRepetitions.value,
      completedGroups: completedGroups.value,
    })
  } else {
    startPractice(true)
  }
}

const toggleShuffleMode = () => {
  if (!fontLoaded.value) return

  practiceMode.value = 'shuffle'

  if (isCrossPractice.value) {
    loadCurrentGroup()
    saveCrossPracticeState({
      isCrossPractice: true,
      practiceMode: 'shuffle',
      currentGroup: currentGroup.value,
      groupRepetitions: groupRepetitions.value,
      completedGroups: completedGroups.value,
    })
  } else {
    startPractice(true)
  }
}

const nextRoot = () => {
  if (answeredRoots.value < practiceRoots.value.length) {
    currentRoot.value = practiceRoots.value[answeredRoots.value]
    userInput.value = ''
    feedback.value = ''
  } else {
    if (isCrossPractice.value) {
      handleGroupCompleted()
      return
    }

    isComplete.value = true
    feedback.value = '🎉 恭喜完成所有字根练习！'
  }

  if (!isCrossPractice.value) {
    saveProgress(
      practiceMode.value,
      correctCount.value,
      answeredRoots.value,
      practiceRoots.value,
      isComplete.value
    )
  }
}

const checkAnswer = () => {
  if (!userInput.value || !currentRoot.value || isComplete.value || isComposing.value) return

  const input = userInput.value.toLowerCase().trim()
  const code = currentRoot.value.code.toLowerCase()

  showFlash.value = true
  setTimeout(() => {
    showFlash.value = false
  }, 300)

  if (input === code) {
    correctCount.value++
    isCorrect.value = true
    feedback.value = '✅ 正确！'

    // 立即跳转到下一个字根
    answeredRoots.value++
    userInput.value = ''
    nextRoot()
    focusInput()
  } else {
    isCorrect.value = false
    feedback.value = `❌ 错误！正确答案是 ${code.toUpperCase()}`

    setTimeout(() => {
      answeredRoots.value++
      userInput.value = ''
      nextRoot()
      focusInput()
    }, 1200)
  }
}

const saveCrossPracticeProgress = (progressData) => {
  try {
    localStorage.setItem('crossPracticeProgress_all', JSON.stringify(progressData))
  } catch (error) {
    console.error('保存十字练习进度失败:', error)
  }
}

const loadCrossPracticeProgress = () => {
  try {
    const saved = localStorage.getItem('crossPracticeProgress_all')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('加载十字练习进度失败:', error)
    return null
  }
}

const clearCrossPracticeProgress = () => {
  localStorage.removeItem('crossPracticeProgress_all')
}

const saveCrossPracticeState = (stateData) => {
  try {
    localStorage.setItem('crossPracticeState_all', JSON.stringify(stateData))
  } catch (error) {
    console.error('保存十字练习状态失败:', error)
  }
}

const loadCrossPracticeState = () => {
  try {
    const saved = localStorage.getItem('crossPracticeState_all')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('加载十字练习状态失败:', error)
    return null
  }
}

const clearCrossPracticeState = () => {
  localStorage.removeItem('crossPracticeState_all')
}

const resumeProgress = () => {
  if (savedProgress.value) {
    initPractice(
      savedProgress.value.mode,
      savedProgress.value.practiceRoots,
      savedProgress.value.correctCount,
      savedProgress.value.answeredRoots,
      savedProgress.value.isComplete
    )
    showResumeDialog.value = false
    progressRestored.value = true
    startTimer()
    focusInput()
  }
}

const resumeCrossPractice = () => {
  showCrossResumeDialog.value = false
  isCrossPractice.value = true
  practiceMode.value = savedCrossState.value.practiceMode || 'shuffle'

  currentGroup.value = savedCrossState.value.currentGroup
  groupRepetitions.value = savedCrossState.value.groupRepetitions
  completedGroups.value = savedCrossState.value.completedGroups

  progressRestored.value = true
  initCrossPractice()
  startTimer()
  focusInput()
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

const loadFonts = async () => {
  try {
    const testElement = document.createElement('div')
    testElement.style.fontFamily =
      'CJK-Extended, "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "SimSun", "Arial Unicode MS", sans-serif'
    testElement.textContent = '⺝'
    document.body.appendChild(testElement)

    await new Promise((resolve) => requestAnimationFrame(resolve))

    // 检查元素宽度以确认字体加载
    document.body.removeChild(testElement)

    fontLoaded.value = true
  } catch (error) {
    console.error('字体加载失败:', error)
    fontLoaded.value = true
  }
}

onMounted(async () => {
  await loadFonts()

  const crossState = loadCrossPracticeState()
  const crossProgress = loadCrossPracticeProgress()

  if (crossState && crossState.isCrossPractice) {
    savedCrossState.value = crossState

    if (crossProgress) {
      savedCrossState.value.currentGroup =
        Number(crossProgress.currentGroup || crossState.currentGroup) || 0
      savedCrossState.value.groupRepetitions =
        Number(crossProgress.groupRepetitions || crossState.groupRepetitions) || 0
      savedCrossState.value.completedGroups =
        Number(crossProgress.completedGroups || crossState.completedGroups) || 0
    }

    if (crossProgress && Number(crossProgress.completedGroups) < Math.ceil(allRoots.length / 10)) {
      showCrossResumeDialog.value = true
    } else {
      isCrossPractice.value = true
      practiceMode.value = crossState.practiceMode || 'shuffle'
      currentGroup.value = savedCrossState.value.currentGroup
      groupRepetitions.value = savedCrossState.value.groupRepetitions
      completedGroups.value = savedCrossState.value.completedGroups
      progressRestored.value = true
      initCrossPractice()
      startTimer()
      focusInput()
    }
  } else {
    const progressData = loadProgress()
    savedProgress.value = progressData

    if (progressData && shouldRestoreProgress(progressData)) {
      showResumeDialog.value = true
    } else {
      practiceMode.value = 'order'
      startPractice(true)
    }
  }
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="root-practice">
    <!-- 练习头部 -->
    <div class="practice-header">
      <h1 class="practice-title">字根练习</h1>
      <div class="practice-mode">
        <span class="mode-badge" :class="practiceMode">
          {{ practiceMode === 'order' ? '🔄 顺序练习' : '🎲 乱序练习' }}
        </span>
        <span v-if="isCrossPractice" class="mode-badge group-mode"> ✳️ 十字练习 </span>
      </div>
    </div>

    <!-- 统计面板 -->
    <div class="stats-panel">
      <div class="stat-box">
        <span class="stat-number">{{ progress }}</span>
        <span class="stat-label">进度</span>
      </div>
      <div class="stat-box">
        <span class="stat-number text-success">{{ accuracy }}%</span>
        <span class="stat-label">正确率</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{{ correctCount }}</span>
        <span class="stat-label">正确</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{{ answeredRoots }}</span>
        <span class="stat-label">已答</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{{ totalRoots }}</span>
        <span class="stat-label">总数</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{{ formatTime(elapsedTime) }}</span>
        <span class="stat-label">用时</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: `${(correctCount / totalRoots) * 100}%` }" />
    </div>

    <!-- 十字练习进度信息 -->
    <div v-if="isCrossPractice" class="group-info">
      <span>📊 {{ crossPracticeProgress }}</span>
      <span>✅ 已完成 {{ completedGroups }}/{{ totalGroups }} 组</span>
    </div>

    <!-- 恢复进度对话框 -->
    <div v-if="showResumeDialog && savedProgress" class="resume-dialog">
      <div class="resume-content">
        <h3>📝 发现保存的进度</h3>
        <p>上次练习：{{ savedProgress.correctCount }}/{{ savedProgress.answeredRoots }} 个字根</p>
        <p>
          正确率：{{
            Math.round((savedProgress.correctCount / savedProgress.answeredRoots) * 100)
          }}%
        </p>
        <div class="resume-buttons">
          <button class="btn-resume btn-continue" @click="resumeProgress">继续练习</button>
          <button class="btn-resume btn-restart" @click="startPractice(true)">重新开始</button>
        </div>
      </div>
    </div>

    <!-- 十字练习恢复对话框 -->
    <div v-if="showCrossResumeDialog && savedCrossState" class="resume-dialog">
      <div class="resume-content">
        <h3>✳️ 发现十字练习进度</h3>
        <p>
          当前进度：第 {{ savedCrossState.currentGroup + 1 }}/{{ Math.ceil(allRoots.length / 10) }}
          组
        </p>
        <p>当前组练习：{{ savedCrossState.groupRepetitions }}/3 遍</p>
        <div class="resume-buttons">
          <button class="btn-resume btn-continue" @click="resumeCrossPractice">继续练习</button>
          <button class="btn-resume btn-restart" @click="startPractice(true)">重新开始</button>
        </div>
      </div>
    </div>

    <!-- 练习主区域 -->
    <div class="practice-main">
      <div class="character-display">
        <div
          v-if="currentRoot"
          class="character"
          :class="{ 'unicode-fallback': !canDisplayCurrentRoot }"
        >
          <span v-if="canDisplayCurrentRoot">{{ currentRoot.character }}</span>
          <div v-else class="unicode-fallback">
            <div class="unicode-code">
              {{ charUnicode }}
            </div>
            <div class="unicode-hint">字根：{{ currentRoot.hint }}</div>
          </div>
        </div>
      </div>

      <div class="input-section">
        <div class="input-area">
          <input
            ref="inputRef"
            v-model="userInput"
            class="code-input"
            :class="{ 'flash-red': showFlash }"
            :disabled="!fontLoaded || isComplete"
            placeholder="输入编码"
            autocomplete="off"
            spellcheck="false"
            maxlength="4"
            @keyup.enter="checkAnswer"
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
          />
        </div>

        <div v-if="feedback" class="feedback" :class="{ correct: isCorrect, error: !isCorrect }">
          {{ feedback }}
        </div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="controls">
      <button
        class="control-btn"
        :class="{ active: practiceMode === 'order' }"
        @click="toggleOrderMode"
      >
        🔄 顺序练习
      </button>
      <button
        class="control-btn"
        :class="{ active: practiceMode === 'shuffle' }"
        @click="toggleShuffleMode"
      >
        🎲 乱序练习
      </button>
      <button class="control-btn" :class="{ active: isCrossPractice }" @click="toggleCrossPractice">
        ✳️ 十字练习
      </button>
      <button class="control-btn restart-btn" :disabled="!fontLoaded" @click="startPractice(true)">
        🔄 重新开始
      </button>
    </div>

    <!-- 完成状态 -->
    <div v-if="isComplete" class="completion-screen">
      <div class="completion-content">
        <h2>🎉 练习完成！</h2>
        <div class="completion-stats">
          <div class="completion-stat">
            <span class="stat-number">{{ correctCount }}</span>
            <span class="stat-label">正确数量</span>
          </div>
          <div class="completion-stat">
            <span class="stat-number">{{ accuracy }}%</span>
            <span class="stat-label">正确率</span>
          </div>
          <div class="completion-stat">
            <span class="stat-number">{{ formatTime(elapsedTime) }}</span>
            <span class="stat-label">总用时</span>
          </div>
        </div>
        <div class="completion-actions">
          <button class="btn-resume btn-continue" @click="startPractice(true)">重新练习</button>
          <button class="completion-clear-btn" @click="clearProgress">🗑️ 清除进度</button>
        </div>
      </div>
    </div>

    <!-- 字体加载提示 -->
    <div v-if="!fontLoaded" class="font-loading">
      <div class="loading-spinner" />
      <p>正在加载字体...</p>
    </div>

    <!-- 提示信息 -->
    <div v-else class="font-info">
      <p v-if="!isCrossPractice">💡 提示：练习进度会永久保存到本地，关闭页面后仍可继续。</p>
      <p v-else>💡 提示：十字练习将字根分为每组10个，每组需练习3遍才能进入下一组。进度永久保存。</p>
    </div>
  </div>
</template>

<style scoped>
/* 虎码风格现代化样式 - 与虎码输入法网站保持一致 */
.root-practice {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--vp-c-bg);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.practice-header {
  text-align: center;
  margin-bottom: 2rem;
}

.practice-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--tiger-primary);
  margin: 0 0 1rem 0;
  letter-spacing: -0.02em;
}

.practice-mode {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 2px solid var(--vp-c-border);
  transition: all var(--transition-normal);
}

.mode-badge.order {
  background: var(--tiger-primary);
  color: white;
  border-color: var(--tiger-primary);
}

.mode-badge.shuffle {
  background: var(--tiger-info);
  color: white;
  border-color: var(--tiger-info);
}

.mode-badge.group-mode {
  background: var(--tiger-success);
  color: white;
  border-color: var(--tiger-success);
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-box {
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 1.25rem 1rem;
  text-align: center;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.stat-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--tiger-primary);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.stat-box:hover::before {
  opacity: 1;
}

.stat-box:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--tiger-primary);
}

.stat-number {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin-bottom: 0.25rem;
  line-height: 1;
}

.stat-number.text-success {
  color: var(--tiger-success);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.progress-track {
  height: 12px;
  background: var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 2rem;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--tiger-primary), var(--tiger-info));
  border-radius: 6px;
  transition: width var(--transition-normal);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
  border-radius: 0 6px 6px 0;
}

.group-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  flex-wrap: wrap;
}

.practice-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.character-display {
  text-align: center;
  position: relative;
}

.character {
  font-size: 8rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  line-height: 1;
  margin-bottom: 1rem;
  font-family: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform var(--transition-normal);
}

.character:hover {
  transform: scale(1.05);
}

.character.unicode-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.unicode-code {
  font-size: 2rem;
  font-family: 'Courier New', monospace;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-mute);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 2px solid var(--vp-c-border);
  font-weight: 600;
}

.unicode-hint {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  text-align: center;
  font-weight: 500;
}

.input-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.input-area {
  position: relative;
}

.code-input {
  padding: 1.25rem 2rem;
  font-size: 1.75rem;
  text-align: center;
  border: 3px solid var(--vp-c-border);
  border-radius: 16px;
  width: 240px;
  outline: none;
  transition: all var(--transition-normal);
  font-family: inherit;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.code-input:focus {
  border-color: var(--tiger-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
  transform: translateY(-1px);
}

.code-input.flash-red {
  animation: flashRed 0.6s;
  border-color: var(--tiger-error);
}

.code-input:disabled {
  background: var(--vp-c-bg-mute);
  cursor: not-allowed;
  opacity: 0.6;
}

.feedback {
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
  min-height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  transition: all var(--transition-normal);
}

.feedback.correct {
  color: var(--tiger-success);
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid var(--tiger-success);
}

.feedback.error {
  color: var(--tiger-error);
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid var(--tiger-error);
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.control-btn {
  padding: 0.875rem 1.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  border: 3px solid var(--vp-c-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  overflow: hidden;
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--tiger-primary);
  transition: left var(--transition-normal);
  z-index: 0;
}

.control-btn:hover::before {
  left: 0;
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--tiger-primary);
}

.control-btn.active {
  background: var(--tiger-primary);
  color: white;
  border-color: var(--tiger-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-brand);
}

.control-btn.active::before {
  left: 0;
}

.control-btn span {
  position: relative;
  z-index: 1;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.resume-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.resume-content {
  background: var(--vp-c-bg);
  border-radius: 20px;
  padding: 2.5rem;
  text-align: center;
  max-width: 450px;
  box-shadow: var(--shadow-lg);
  border: 3px solid var(--vp-c-border);
  animation: slideUp 0.3s ease-out;
}

.resume-content h3 {
  font-size: 1.75rem;
  color: var(--tiger-primary);
  margin-bottom: 1.5rem;
  font-weight: 800;
}

.resume-content p {
  color: var(--vp-c-text-2);
  margin-bottom: 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
}

.resume-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn-resume {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-normal);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: var(--shadow-md);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  overflow: hidden;
}

.btn-continue {
  background: var(--tiger-success);
  color: white;
}

.btn-continue:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.btn-restart {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 3px solid var(--vp-c-border);
}

.btn-restart:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--tiger-primary);
  transform: translateY(-2px);
}

.completion-screen {
  text-align: center;
  padding: 3rem;
  background: linear-gradient(135deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  border-radius: 20px;
  border: 3px solid var(--tiger-primary);
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

.completion-screen::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--tiger-primary), var(--tiger-success));
}

.completion-content h2 {
  font-size: 2.5rem;
  color: var(--tiger-primary);
  margin-bottom: 2rem;
  font-weight: 900;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.completion-stats {
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}

.completion-stat {
  text-align: center;
  padding: 1.5rem;
  background: var(--vp-c-bg);
  border-radius: 16px;
  border: 2px solid var(--vp-c-border);
  min-width: 120px;
}

.completion-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.completion-clear-btn {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  border: 3px solid var(--tiger-error);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--vp-c-bg);
  color: var(--tiger-error);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.completion-clear-btn:hover {
  background: var(--tiger-error);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
}

.font-loading {
  text-align: center;
  padding: 3rem;
  color: var(--vp-c-text-2);
}

.loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid var(--vp-c-border);
  border-radius: 50%;
  border-top-color: var(--tiger-primary);
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

.font-info {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--vp-c-bg-soft), var(--vp-c-bg-mute));
  border-radius: 12px;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  border: 1px solid var(--vp-c-border);
  line-height: 1.6;
}

@keyframes flashRed {
  0% {
    transform: translateX(0);
    border-color: var(--tiger-error);
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
  100% {
    transform: translateX(0);
    border-color: var(--vp-c-border);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .root-practice {
    padding: 1rem;
    margin: 0.5rem;
  }

  .practice-title {
    font-size: 2rem;
  }

  .stats-panel {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .character {
    font-size: 6rem;
  }

  .controls {
    flex-direction: column;
    align-items: center;
  }

  .control-btn {
    width: 250px;
  }

  .code-input {
    width: 200px;
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }

  .character {
    font-size: 4.5rem;
  }

  .code-input {
    width: 180px;
    font-size: 1.25rem;
    padding: 1rem 1.5rem;
  }

  .practice-title {
    font-size: 1.75rem;
  }
}

.mode-btn {
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.mode-btn:hover {
  transform: translateY(-1px);
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

/* 新增：十字练习按钮样式 */
.cross-btn {
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  background: #7f8c8d; /* 灰色 */
  color: white;
}

.cross-btn:hover {
  background: #95a5a6;
  transform: translateY(-1px);
}

.cross-btn.cross-active {
  background: #3498db; /* 蓝色 */
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
}

.cross-btn.cross-active:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

.restart-btn {
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.restart-btn:hover {
  background: #c0392b;
  transform: translateY(-1px);
}

.restart-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
