/** * 现代字根练习组件 - 虎码风格设计（分组练习版 V2） * 特点： * - 分组练习，组内字根随机循环 * -
悬浮恢复对话框 */

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { allRoots } from '../data/rootData.js'
import { isSpecialCharacter, canDisplayCharacter } from '../utils/fontChecker.js'
import { safeGetItem, safeSetItem } from '../utils/safeStorage.js'
import { formatTime, safeFocus } from '../utils/safeUtils.js'
import { useGroupPractice } from '../utils/GroupPracticeEngine.js'
import { logStorageOperation, showStorageStatus } from '../utils/localStorageDebugger.js'
import RadicalKeyboard from './RadicalKeyboard.vue'

// 常量定义
const ERROR_RADICALS_KEY = 'errorRadicals'

// 根据模式生成独立的进度键
const getProgressKey = (mode) => {
  const keyMap = {
    order: 'order_progress',
    random: 'random_progress',
    typing: 'typing_progress',
  }
  return keyMap[mode] || `unknown_progress_${mode}` // 避免冲突的默认值
}

const PRACTICE_PROGRESS_KEY = computed(() => getProgressKey(props.mode))
// eslint-disable-next-line no-unused-vars
const PROGRESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 保留供未来使用

// 组件属性
const props = defineProps({
  mode: {
    type: String,
    default: 'order',
    validator: (value) => ['order', 'random'].includes(value),
  },
  title: {
    type: String,
    default: '字根练习',
  },
})

// 使用分组练习引擎
const engine = useGroupPractice({
  groupSize: 8,
  repetitions: 4,
  errorThreshold: 3,
})

// 状态
// eslint-disable-next-line no-unused-vars
const practiceMode = ref('order') // 'order' | 'shuffle'
const userInput = ref('')
const showResult = ref(false)
const isCorrect = ref(false)
const feedback = ref('')
const inputRef = ref(null)
const showResumeDialog = ref(false)
const savedProgress = ref(null) // 存储保存的进度信息
const isRestarted = ref(false) // 重新开始标志

// 计时器
let timer = null
let timeoutIds = [] // 管理所有setTimeout

// 计算属性 - 动态获取恢复对话框文案
const resumeText = computed(() => {
  const textMap = {
    order: '顺序练习',
    random: '随机练习',
  }
  const practiceType = textMap[props.mode] || '练习'
  return `发现未完成的${practiceType}`
})

// 计算属性 - 当前字根信息
const currentHint = computed(() => engine.currentRoot.value?.hint || '')
const currentCode = computed(() => engine.currentRoot.value?.code || '')
const currentRoot = computed(() => engine.currentRoot.value)

// 检查字根显示
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

// 统计面板显示
const progress = computed(() => engine.progress.value)
const accuracy = computed(() => engine.accuracy.value)
const masteryRate = computed(() => engine.masteryRate.value)
const masteredCount = computed(() => engine.masteredCount.value)
// eslint-disable-next-line no-unused-vars
const remainingCount = computed(() => engine.remainingCount.value)
const elapsedTime = computed(() => engine.elapsedTime.value)
const groupProgress = computed(() => engine.groupProgress.value)
// eslint-disable-next-line no-unused-vars
const totalCount = computed(() => engine.totalAttempts.value)
// eslint-disable-next-line no-unused-vars
const correctCount = computed(() => engine.totalCorrect.value)
// eslint-disable-next-line no-unused-vars
const wrongCount = computed(() => engine.totalWrong.value)
const isComplete = computed(() => engine.isComplete.value)
const isPaused = computed(() => engine.isPaused.value)

// 获取当前字根统计
const currentRootStats = computed(() => {
  if (!currentRoot.value) return null
  const rootId = `${currentRoot.value.character}-${currentRoot.value.code}`
  return engine.getRootStats(rootId)
})

// 初始化练习
const initPractice = () => {
  engine.initPractice(allRoots, props.mode)
  userInput.value = ''
  showResult.value = false
  feedback.value = ''
  showResumeDialog.value = false
  isRestarted.value = false // 重置标志
  startTimer()
  focusInput()
}

// 聚焦输入框
const focusInput = () => {
  nextTick(() => {
    safeFocus(inputRef.value, 100)
  })
}

// 验证输入
const validateInput = () => {
  if (!userInput.value || !currentRoot.value || showResult.value) return

  const input = userInput.value.toLowerCase().trim()
  const code = currentCode.value.toLowerCase()

  if (!code) {
    console.warn('当前字根没有编码信息')
    return
  }

  showResult.value = true

  const result = engine.validateInput(input, code)

  if (result.isCorrect) {
    isCorrect.value = true
    const remaining = engine.config.repetitions - result.stats.consecutiveCorrect
    feedback.value = `✅ 正确！还需 ${remaining} 遍`

    if (result.stats.consecutiveCorrect >= engine.config.repetitions) {
      feedback.value = '🎉 已掌握！'
    }

    safeTimeout(() => {
      handleNext()
    }, 800)
  } else {
    isCorrect.value = false
    feedback.value = `❌ 错误！正确答案是 ${code.toUpperCase()}`

    // 保存错误字根
    saveErrorRadical(currentRoot.value)

    // 错误后跳过，继续循环本组
    safeTimeout(() => {
      handleNext()
    }, 1500)
  }

  saveProgress()
}

// 处理下一个
const handleNext = () => {
  const result = engine.next()

  if (result === 'complete') {
    stopTimer()
    feedback.value = `🎉 练习完成！正确率 ${accuracy.value}%`
    clearProgress()
    return
  }

  if (result === 'next-group') {
    feedback.value = '✨ 进入下一组！'
  }

  userInput.value = ''
  showResult.value = false
  focusInput()
  saveProgress()
}

// 跳过当前字根
const skipRoot = () => {
  feedback.value = '⏭️ 已跳过'
  showResult.value = true

  safeTimeout(() => {
    const result = engine.skip()

    if (result === 'complete') {
      stopTimer()
      return
    }

    userInput.value = ''
    showResult.value = false
    focusInput()
    saveProgress()
  }, 500)
}

// 暂停/继续
const togglePause = () => {
  engine.togglePause()
  if (isPaused.value) {
    stopTimer()
    feedback.value = '⏸️ 已暂停'
  } else {
    startTimer()
    feedback.value = ''
    focusInput()
  }
}

// 重新开始
const restartPractice = () => {
  stopTimer()
  clearProgress()
  isRestarted.value = true // 标记为重新开始
  initPractice()
}

// 保存错误字根
const saveErrorRadical = (root) => {
  if (!root) return

  const errorRadicals = safeGetItem(ERROR_RADICALS_KEY, [])
  const rootId = `${root.character}-${root.code}`

  const exists = errorRadicals.some((r) => `${r.character}-${r.code}` === rootId)
  if (!exists) {
    errorRadicals.push(root)
    safeSetItem(ERROR_RADICALS_KEY, errorRadicals)
  }
}

// 计时器
const startTimer = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    engine.updateElapsedTime()
  }, 1000)
}

// 安全的setTimeout函数
const safeTimeout = (callback, delay) => {
  const id = setTimeout(callback, delay)
  timeoutIds.push(id)
  return id
}

// 清理所有定时器
const clearAllTimeouts = () => {
  timeoutIds.forEach((id) => clearTimeout(id))
  timeoutIds = []
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 保存进度
const saveProgress = () => {
  try {
    const state = engine.serializeState()
    state.mode = props.mode

    // 添加兼容字段，确保恢复逻辑能正常工作
    state.answeredRoots = engine.totalAttempts?.value || 0
    state.practiceRoots = engine.currentGroup?.value || [] // 使用currentGroup而不是allRoots

    const key = PRACTICE_PROGRESS_KEY.value
    console.log('🔑 TigerPractice SAVE_PROGRESS:', {
      component: 'TigerPractice',
      mode: props.mode,
      key: key,
      dataSize: JSON.stringify(state).length,
      timestamp: new Date().toISOString(),
      dataPreview: {
        progress: state.progress,
        totalAttempts: state.totalAttempts,
        answeredRoots: state.answeredRoots,
        isComplete: state.isComplete,
      },
    })

    // 记录到调试工具
    logStorageOperation('SET', key, state, 'TigerPractice')

    safeSetItem(key, state)

    // 验证写入
    const verify = safeGetItem(key, null)
    console.log('✅ TigerPractice SAVE_VERIFY:', {
      key: key,
      writeSuccess: !!verify,
      storedProgress: verify?.progress,
    })

    // 显示当前存储状态
    showStorageStatus()
  } catch (error) {
    console.error('❌ TigerPractice: 保存进度失败', error)
  }
}

// 恢复进度
const restoreProgress = () => {
  const saved = safeGetItem(PRACTICE_PROGRESS_KEY.value, null)
  if (!saved) return false

  // 检查模式匹配
  if (saved.mode !== props.mode) {
    console.log('TigerPractice: 模式不匹配，不恢复进度', {
      saved: saved.mode,
      current: props.mode,
    })
    return false
  }

  try {
    engine.deserializeState(saved, allRoots, props.mode)
    console.log('TigerPractice: 成功恢复进度', {
      mode: props.mode,
      key: PRACTICE_PROGRESS_KEY.value,
      progress: engine.progress.value,
    })
    return true
  } catch (error) {
    console.error('TigerPractice: 恢复进度失败', error)
    clearProgress()
    return false
  }
}

// 清除进度
const clearProgress = () => {
  // 将进度重置为0而不是null，确保记录进度为0
  const zeroProgress = {
    mode: props.mode,
    progress: 0,
    accuracy: 0,
    masteryRate: 0,
    currentIndex: 0,
    currentGroup: [],
    practiceQueue: [],
    completedGroups: [],
    errorRoots: [],
    totalCorrect: 0,
    totalWrong: 0,
    totalAttempts: 0,
    elapsedTime: 0,
    isComplete: false,
    isPaused: false,
    timestamp: Date.now(),
    answeredRoots: 0,
    practiceRoots: [],
  }

  const key = PRACTICE_PROGRESS_KEY.value
  console.log('🗑️ TigerPractice CLEAR_PROGRESS:', {
    component: 'TigerPractice',
    mode: props.mode,
    key: key,
    timestamp: new Date().toISOString(),
    isRestarted: isRestarted.value,
  })

  // 显示清除前的数据
  const beforeClear = safeGetItem(key, null)
  console.log('📊 TigerPractice BEFORE_CLEAR:', {
    key: key,
    hadData: !!beforeClear,
    oldProgress: beforeClear?.progress,
    oldMode: beforeClear?.mode,
  })

  safeSetItem(key, zeroProgress)

  // 验证清除
  const afterClear = safeGetItem(key, null)
  console.log('✅ TigerPractice CLEAR_VERIFY:', {
    key: key,
    clearSuccess: !!afterClear,
    newProgress: afterClear?.progress,
    newMode: afterClear?.mode,
  })

  // 记录到调试工具
  logStorageOperation('SET', key, zeroProgress, 'TigerPractice')

  // 显示当前存储状态
  showStorageStatus()
}

// 键盘事件
const handleKeydown = (e) => {
  if (isComplete.value) return

  if (e.key === 'Enter') {
    e.preventDefault()
    if (showResult.value) {
      handleNext()
    } else if (userInput.value) {
      validateInput()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    togglePause()
  } else if (e.key === 'ArrowRight' && e.ctrlKey) {
    e.preventDefault()
    if (showResult.value) {
      handleNext()
    } else {
      skipRoot()
    }
  }
}

// 处理输入
const handleInput = () => {
  if (showResult.value) {
    userInput.value = ''
    return
  }

  if (userInput.value.length >= currentCode.value.length) {
    validateInput()
  }
}

// 处理恢复对话框
const handleResume = () => {
  // 先恢复进度
  restoreProgress()
  showResumeDialog.value = false
}

const handleRestartFromDialog = () => {
  showResumeDialog.value = false
  clearProgress()
  isRestarted.value = true // 标记为重新开始
  initPractice()
}

// 生命周期
onMounted(() => {
  console.log('TigerPractice mounted with mode:', props.mode)

  // 使用更具体的事件监听器，只监听当前组件的输入
  const handleKeydownWrapper = (e) => {
    // 如果焦点在输入框中，才处理键盘事件
    if (document.activeElement === inputRef.value || document.activeElement?.tagName === 'BODY') {
      handleKeydown(e)
    }
  }

  document.addEventListener('keydown', handleKeydownWrapper)

  // 保存引用以便清理
  window._tigerKeydownHandler = handleKeydownWrapper

  // 尝试恢复进度
  const saved = safeGetItem(PRACTICE_PROGRESS_KEY.value, null)
  savedProgress.value = saved // 保存进度信息供对话框使用

  console.log('=== TigerPractice 进度检查开始 ===')
  console.log('组件模式:', props.mode)
  console.log('进度键:', PRACTICE_PROGRESS_KEY.value)
  console.log('保存的数据:', saved)
  console.log('数据类型:', typeof saved)
  console.log('数据完整性检查:', {
    hasData: !!saved,
    isObject: typeof saved === 'object',
    hasProgress: Object.hasOwn(saved || {}, 'progress'),
    hasTotalAttempts: Object.hasOwn(saved || {}, 'totalAttempts'),
    hasAnsweredRoots: Object.hasOwn(saved || {}, 'answeredRoots'),
    hasMode: Object.hasOwn(saved || {}, 'mode'),
    hasIsComplete: Object.hasOwn(saved || {}, 'isComplete'),
  })

  // 统一的进度检查逻辑：检查是否有有效的未完成进度
  const shouldShow =
    saved &&
    typeof saved === 'object' &&
    !saved.isComplete &&
    (saved.progress > 0 || saved.totalAttempts > 0) && // 只要有一项有值就显示
    saved.mode === props.mode // 确保模式匹配

  console.log('检查条件结果:', {
    saved: !!saved,
    isObject: typeof saved === 'object',
    notComplete: !saved?.isComplete,
    progressPositive: saved?.progress > 0,
    hasAttempts: saved?.totalAttempts > 0,
    hasProgressOrAttempts: saved?.progress > 0 || saved?.totalAttempts > 0,
    modeMatch: saved?.mode === props.mode,
    shouldShow,
  })
  console.log('=== TigerPractice 进度检查结束 ===')

  if (shouldShow) {
    console.log('显示恢复对话框')
    showResumeDialog.value = true
  } else {
    console.log('直接开始新练习')
    initPractice()
  }
})

onUnmounted(() => {
  console.log('TigerPractice unmounted, cleaning up...')

  // 清理事件监听器
  if (window._tigerKeydownHandler) {
    document.removeEventListener('keydown', window._tigerKeydownHandler)
    delete window._tigerKeydownHandler
  }

  stopTimer()
  clearAllTimeouts() // 清理所有setTimeout

  // 保存进度（如果不是重新开始且未完成）
  if (!isRestarted.value && !isComplete.value) {
    saveProgress()
  }

  // 清理引擎状态
  engine.reset?.()
})

// 监听完成状态
watch(isComplete, (newVal) => {
  if (newVal) {
    stopTimer()
    clearProgress()
  }
})
</script>

<template>
  <div class="tiger-practice-container">
    <!-- 悬浮恢复对话框 - 放在工具栏上方 -->
    <div v-if="showResumeDialog" class="floating-resume-banner">
      <div class="resume-content">
        <div class="resume-info">
          <span class="resume-icon">💾</span>
          <div class="resume-details">
            <span class="resume-text">{{ resumeText }}</span>
            <span class="resume-stats">
              已完成 {{ Math.round((savedProgress?.progress || 0) * 100) }}% · 练习了
              {{ savedProgress?.answeredRoots || 0 }} 个字根
            </span>
          </div>
        </div>
        <div class="resume-buttons">
          <button class="btn-resume btn-continue" @click="handleResume">继续练习</button>
          <button class="btn-resume btn-restart" @click="handleRestartFromDialog">重新开始</button>
        </div>
      </div>
    </div>

    <!-- 顶部标题栏 -->
    <header class="practice-header">
      <h1 class="practice-title">
        {{ title }}
      </h1>
      <div class="practice-mode">
        <span class="mode-badge" :class="mode">
          {{ mode === 'order' ? '顺序模式' : '随机模式' }}
        </span>
        <span class="mode-badge group-mode">分组练习</span>
      </div>
    </header>

    <!-- 统计栏 -->
    <div class="stats-panel">
      <div class="stat-box">
        <span class="stat-number">{{ progress }}%</span>
        <span class="stat-label">总进度</span>
      </div>
      <div class="stat-box">
        <span
          class="stat-number"
          :class="{ 'text-success': accuracy >= 80, 'text-warning': accuracy < 60 }"
        >
          {{ accuracy }}%
        </span>
        <span class="stat-label">正确率</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{{ groupProgress.current }}</span>
        <span class="stat-label">当前组</span>
      </div>
      <div class="stat-box">
        <span class="stat-number"
          >{{ groupProgress.queueProgress }}/{{ groupProgress.queueTotal }}</span
        >
        <span class="stat-label">队列</span>
      </div>
      <div class="stat-box">
        <span class="stat-number text-success">{{ masteredCount }}</span>
        <span class="stat-label">已掌握</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">{{ formatTime(elapsedTime) }}</span>
        <span class="stat-label">用时</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: progress + '%' }" />
    </div>

    <!-- 组进度信息 -->
    <div v-if="!isComplete && !isPaused" class="group-info">
      <span>第 {{ groupProgress.current }}/{{ groupProgress.total }} 组</span>
      <span>队列: {{ groupProgress.queueProgress }}/{{ groupProgress.queueTotal }}</span>
      <span v-if="currentRootStats">
        当前字根: {{ currentRootStats.consecutiveCorrect }}/{{ engine.config.repetitions }} 遍正确
      </span>
    </div>

    <!-- 主练习区域 -->
    <main v-if="!isComplete && !isPaused" class="practice-main">
      <!-- 字根显示区 -->
      <div class="character-display">
        <div v-if="canDisplayCurrentRoot" class="character">
          {{ currentRoot?.character }}
        </div>
        <div v-else class="character unicode-fallback">
          <span class="unicode-code">{{ charUnicode }}</span>
          <span class="unicode-hint">{{ currentHint }}</span>
        </div>
        <div class="character-hint">
          {{ currentHint }}
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-section">
        <div
          class="input-wrapper"
          :class="{ correct: showResult && isCorrect, wrong: showResult && !isCorrect }"
        >
          <input
            ref="inputRef"
            v-model="userInput"
            type="text"
            class="code-input"
            :placeholder="showResult ? '按 Enter 继续' : '输入编码'"
            :disabled="showResult"
            maxlength="2"
            autocomplete="off"
            spellcheck="false"
            @input="handleInput"
          />
          <div
            v-if="feedback"
            class="feedback-text"
            :class="{ success: isCorrect, error: !isCorrect }"
          >
            {{ feedback }}
          </div>
        </div>
      </div>

      <!-- 虚拟键盘 -->
      <RadicalKeyboard
        :current-code="currentCode"
        :user-input="userInput"
        :show-result="showResult"
        :is-correct="isCorrect"
      />

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn btn-secondary" :disabled="showResult" @click="skipRoot">
          <span class="btn-icon">⏭</span>
          <span>跳过</span>
          <kbd class="key-hint">Ctrl+→</kbd>
        </button>
        <button class="btn btn-secondary" @click="togglePause">
          <span class="btn-icon">{{ isPaused ? '▶' : '⏸' }}</span>
          <span>{{ isPaused ? '继续' : '暂停' }}</span>
          <kbd class="key-hint">Esc</kbd>
        </button>
        <button class="btn btn-secondary" @click="restartPractice">
          <span class="btn-icon">🔄</span>
          <span>重新开始</span>
        </button>
      </div>
    </main>

    <!-- 暂停界面 -->
    <div v-if="isPaused && !isComplete" class="pause-overlay">
      <div class="pause-content">
        <div class="pause-icon">⏸</div>
        <h2>练习已暂停</h2>
        <div class="pause-stats">
          <div class="pause-stat">
            <span class="pause-value">{{ progress }}%</span>
            <span class="pause-label">进度</span>
          </div>
          <div class="pause-stat">
            <span class="pause-value">{{ accuracy }}%</span>
            <span class="pause-label">正确率</span>
          </div>
          <div class="pause-stat">
            <span class="pause-value">{{ masteredCount }}</span>
            <span class="pause-label">已掌握</span>
          </div>
          <div class="pause-stat">
            <span class="pause-value">{{ formatTime(elapsedTime) }}</span>
            <span class="pause-label">用时</span>
          </div>
        </div>
        <button class="btn btn-primary btn-large" @click="togglePause">
          <span class="btn-icon">▶</span>
          <span>继续练习</span>
        </button>
      </div>
    </div>

    <!-- 完成界面 -->
    <div v-if="isComplete" class="complete-overlay">
      <div class="complete-content">
        <div class="complete-icon">🎉</div>
        <h2>练习完成！</h2>
        <div class="complete-stats">
          <div class="complete-stat">
            <span class="complete-value">{{ accuracy }}%</span>
            <span class="complete-label">正确率</span>
          </div>
          <div class="complete-stat">
            <span class="complete-value">{{ masteryRate }}%</span>
            <span class="complete-label">掌握率</span>
          </div>
          <div class="complete-stat">
            <span class="complete-value">{{ masteredCount }}</span>
            <span class="complete-label">已掌握</span>
          </div>
          <div class="complete-stat">
            <span class="complete-value">{{ formatTime(elapsedTime) }}</span>
            <span class="complete-label">用时</span>
          </div>
        </div>
        <div class="complete-message">
          {{
            accuracy >= 90
              ? '太棒了！字根掌握得非常好！'
              : accuracy >= 70
                ? '做得不错！继续加油！'
                : '还需要多练习，坚持就是胜利！'
          }}
        </div>
        <div class="complete-actions">
          <button class="btn btn-primary btn-large" @click="restartPractice">
            <span class="btn-icon">🔄</span>
            <span>再来一次</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <footer class="shortcuts-hint">
      <span class="shortcut"><kbd>Enter</kbd> 提交/继续</span>
      <span class="shortcut"><kbd>Ctrl</kbd>+<kbd>→</kbd> 跳过</span>
      <span class="shortcut"><kbd>Esc</kbd> 暂停</span>
    </footer>
  </div>
</template>

<style scoped>
/* ===== 容器样式 ===== */
.tiger-practice-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
  padding-top: 68px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
}

/* ===== 悬浮恢复对话框 ===== */
.floating-resume-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

.resume-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  max-width: 500px;
}

.resume-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.resume-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.resume-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.resume-text {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.resume-stats {
  font-size: 0.825rem;
  color: #6b7280;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.resume-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.resume-text {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.resume-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-resume {
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-resume:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-resume:active {
  transform: translateY(0);
}

.btn-continue {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
}

.btn-continue::before {
  content: '▶';
  font-size: 0.75rem;
}

.btn-continue:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.btn-restart {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  color: #475569;
  border: 2px solid #e2e8f0;
}

.btn-restart::before {
  content: '↺';
  font-size: 0.875rem;
}

.btn-restart:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  color: #334155;
}

/* ===== 头部样式 ===== */
.practice-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.practice-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.practice-mode {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.mode-badge.order {
  background: #dbeafe;
  color: #1d4ed8;
}

.mode-badge.random {
  background: #fce7f3;
  color: #be185d;
}

.mode-badge.group-mode {
  background: #d1fae5;
  color: #047857;
}

/* ===== 统计面板 ===== */
.stats-panel {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem;
  text-align: center;
  transition: box-shadow 0.2s;
}

.stat-box:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-number {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.stat-number.text-success {
  color: #16a34a;
}

.stat-number.text-warning {
  color: #dc2626;
}

.stat-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ===== 进度条 ===== */
.progress-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* ===== 组信息 ===== */
.group-info {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: #64748b;
  flex-wrap: wrap;
}

/* ===== 主练习区 ===== */
.practice-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

/* 字根显示 */
.character-display {
  text-align: center;
}

.character {
  font-size: 8rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 0.5rem;
  font-family: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
}

.character.unicode-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.unicode-code {
  font-size: 2rem;
  font-family: 'Courier New', monospace;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.unicode-hint {
  font-size: 1rem;
  color: #64748b;
}

.character-hint {
  font-size: 1.125rem;
  color: #64748b;
  font-weight: 500;
}

/* 输入区 */
.input-section {
  width: 100%;
  max-width: 300px;
}

.input-wrapper {
  position: relative;
}

.input-wrapper.correct .code-input {
  border-color: #22c55e;
  background: #f0fdf4;
}

.input-wrapper.wrong .code-input {
  border-color: #ef4444;
  background: #fef2f2;
}

.code-input {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #1e293b;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;
  outline: none;
}

.code-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.code-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.feedback-text {
  position: absolute;
  bottom: -1.75rem;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.feedback-text.success {
  color: #16a34a;
}

.feedback-text.error {
  color: #dc2626;
}

/* ===== 操作按钮 ===== */
.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #475569;
  border-color: #e2e8f0;
}

.btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-secondary {
  background: white;
  color: #475569;
  border-color: #e2e8f0;
}

.btn-large {
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
}

.btn-icon {
  font-size: 1.125rem;
}

.key-hint {
  margin-left: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-family: inherit;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #64748b;
}

/* ===== 暂停/完成覆盖层 ===== */
.pause-overlay,
.complete-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.pause-content,
.complete-content {
  text-align: center;
  padding: 2rem;
}

.pause-icon,
.complete-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.pause-content h2,
.complete-content h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1.5rem 0;
}

.pause-stats,
.complete-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.pause-stat,
.complete-stat {
  text-align: center;
}

.pause-value,
.complete-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.25rem;
}

.pause-label,
.complete-label {
  font-size: 0.875rem;
  color: #64748b;
}

.complete-message {
  font-size: 1.125rem;
  color: #475569;
  margin-bottom: 2rem;
}

.complete-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* ===== 快捷键提示 ===== */
.shortcuts-hint {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.shortcut {
  font-size: 0.75rem;
  color: #64748b;
}

.shortcut kbd {
  padding: 0.25rem 0.5rem;
  font-family: inherit;
  font-size: 0.75rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #475569;
}

/* ===== 响应式设计 ===== */
@media (max-width: 640px) {
  .tiger-practice-container {
    padding: 1rem;
  }

  .floating-resume-banner {
    left: 1rem;
    right: 1rem;
    transform: none;
    top: 70px;
  }

  .resume-content {
    flex-direction: column;
    gap: 1rem;
  }

  .practice-title {
    font-size: 1.5rem;
  }

  .stats-panel {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .stat-box {
    padding: 0.5rem;
  }

  .stat-number {
    font-size: 1.125rem;
  }

  .stat-label {
    font-size: 0.65rem;
  }

  .group-info {
    flex-direction: column;
    gap: 0.5rem;
  }

  .character {
    font-size: 6rem;
  }

  .code-input {
    font-size: 1.25rem;
    padding: 0.875rem 1.25rem;
  }

  .action-buttons {
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
  }

  .pause-stats,
  .complete-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .shortcuts-hint {
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }

  .character {
    font-size: 5rem;
  }

  .shortcuts-hint {
    display: none;
  }
}

/* ===== 无障碍支持 ===== */
@media (prefers-reduced-motion: reduce) {
  .floating-resume-banner {
    animation: none;
  }

  .progress-fill,
  .btn,
  .stat-box,
  .code-input {
    transition: none;
  }
}

@media (prefers-contrast: high) {
  .code-input {
    border-width: 3px;
  }

  .btn {
    border-width: 2px;
  }
}
</style>
