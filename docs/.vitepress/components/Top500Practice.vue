<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { top500Roots } from '../data/YongData.js'
import { saveProgress, loadProgress, clearProgress, hasProgress } from '../utils/PracticeProgressManager.js'

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
const showCrossResumeDialog = ref(false) // 新增：十字练习恢复对话框
const savedProgress = ref(null)
const savedCrossState = ref(null) // 保存十字练习状态
// 添加：追踪中文输入状态
const isComposing = ref(false)
// 新增：十字练习相关状态
const isCrossPractice = ref(false) // 是否启用十字练习模式
const currentGroup = ref(0) // 当前组别
const groupRepetitions = ref(0) // 当前组已练习的遍数
const groupRoots = ref([]) // 当前组的字根
const totalGroups = ref(0) // 总组数
const completedGroups = ref(0) // 已完成的组数

const totalRoots = computed(() => practiceRoots.value.length)
const accuracy = computed(() => {
  return totalRoots.value > 0 ? Math.round((correctCount.value / totalRoots.value) * 100) : 0
})
const progress = computed(() => {
  return `${correctCount.value}/${totalRoots.value}`
})

// 新增：计算十字练习的进度
const crossPracticeProgress = computed(() => {
  if (!isCrossPractice.value) return ''
  return `第 ${currentGroup.value + 1}/${totalGroups.value} 组 (已练习 ${groupRepetitions.value}/3 遍)`
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

// 新增：初始化十字练习
const initCrossPractice = () => {
  if (!fontLoaded.value) return
  
  const roots = [...top500Roots]
  totalGroups.value = Math.ceil(roots.length / 10)
  
  // 从保存的进度中恢复
  const savedCrossProgress = loadCrossPracticeProgress()
  if (savedCrossProgress) {
    completedGroups.value = savedCrossProgress.completedGroups || 0
    currentGroup.value = savedCrossProgress.currentGroup || 0
    groupRepetitions.value = savedCrossProgress.groupRepetitions || 0
    
    // 确保值是数字类型
    completedGroups.value = Number(completedGroups.value)
    currentGroup.value = Number(currentGroup.value)
    groupRepetitions.value = Number(groupRepetitions.value)
    
    // 如果已完成所有组，直接标记完成
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

// 新增：加载当前组的字根
const loadCurrentGroup = () => {
  const roots = [...top500Roots]
  const startIdx = currentGroup.value * 10
  const endIdx = Math.min(startIdx + 10, roots.length)
  groupRoots.value = roots.slice(startIdx, endIdx)
  
  // 根据当前模式设置练习顺序
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

// 新增：处理组内练习完成
const handleGroupCompleted = () => {
  groupRepetitions.value++
  
  // 保存当前组的进度
  saveCrossPracticeProgress({
    completedGroups: completedGroups.value,
    currentGroup: currentGroup.value,
    groupRepetitions: groupRepetitions.value,
    lastCompletedTime: new Date().toISOString()
  })
  
  if (groupRepetitions.value >= 3) {
    // 完成当前组
    completedGroups.value++
    saveCrossPracticeProgress({
      completedGroups: completedGroups.value,
      currentGroup: currentGroup.value,
      groupRepetitions: 0,
      lastCompletedTime: new Date().toISOString()
    })
    
    if (completedGroups.value >= totalGroups.value) {
      // 所有组都已完成
      isComplete.value = true
      feedback.value = '🎉 恭喜完成所有十字练习！'
      return
    }
    
    // 进入下一组
    currentGroup.value = completedGroups.value
    groupRepetitions.value = 0
    feedback.value = `✅ 完成第 ${completedGroups.value} 组！进入第 ${currentGroup.value + 1} 组`
  } else {
    // 重新练习当前组
    feedback.value = `✅ 完成第 ${groupRepetitions.value}/3 遍练习，继续下一遍！`
  }
  
  setTimeout(() => {
    loadCurrentGroup()
  }, 1500)
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
  
  // 清除之前的进度 - 使用特定标识符
  if (ignoreSavedProgress) {
    if (isCrossPractice.value) {
      clearCrossPracticeProgress()
      clearCrossPracticeState()
    } else {
      clearProgress('top500')
    }
  }
  
  correctCount.value = 0
  answeredRoots.value = 0
  isComplete.value = false
  progressRestored.value = false
  
  if (isCrossPractice.value) {
    // 如果是十字练习模式，重新初始化
    initCrossPractice()
    return
  }
  
  if (practiceMode.value === 'order') {
    practiceRoots.value = [...top500Roots] // 使用 top500Roots
  } else {
    practiceRoots.value = shuffleArray([...top500Roots]) // 使用 top500Roots
  }
  
  nextRoot()
  
  // 注意：这里不保存进度，因为 answeredRoots = 0
}

// 新增：切换十字练习模式
const toggleCrossPractice = () => {
  if (!fontLoaded.value) return
  
  isCrossPractice.value = !isCrossPractice.value
  
  if (isCrossPractice.value) {
    // 进入十字练习模式
    // 保持当前的练习模式（顺序或乱序）
    initCrossPractice()
  } else {
    // 退出十字练习模式，恢复普通练习
    startPractice(true)
  }
  
  // 保存十字练习状态
  saveCrossPracticeState({
    isCrossPractice: isCrossPractice.value,
    practiceMode: practiceMode.value,
    currentGroup: currentGroup.value,
    groupRepetitions: groupRepetitions.value,
    completedGroups: completedGroups.value
  })
}

const toggleOrderMode = () => {
  if (!fontLoaded.value) return
  
  practiceMode.value = 'order'
  
  if (isCrossPractice.value) {
    // 在十字练习模式下，只重新加载当前组，不重置进度
    loadCurrentGroup()
    
    // 保存状态
    saveCrossPracticeState({
      isCrossPractice: true,
      practiceMode: 'order',
      currentGroup: currentGroup.value,
      groupRepetitions: groupRepetitions.value,
      completedGroups: completedGroups.value
    })
  } else {
    startPractice(true) // 忽略保存的进度，重新开始
  }
}

const toggleShuffleMode = () => {
  if (!fontLoaded.value) return
  
  practiceMode.value = 'shuffle'
  
  if (isCrossPractice.value) {
    // 在十字练习模式下，只重新加载当前组，不重置进度
    loadCurrentGroup()
    
    // 保存状态
    saveCrossPracticeState({
      isCrossPractice: true,
      practiceMode: 'shuffle',
      currentGroup: currentGroup.value,
      groupRepetitions: groupRepetitions.value,
      completedGroups: completedGroups.value
    })
  } else {
    startPractice(true) // 忽略保存的进度，重新开始
  }
}

const nextRoot = () => {
  if (answeredRoots.value < practiceRoots.value.length) {
    currentRoot.value = practiceRoots.value[answeredRoots.value]
    userInput.value = '' // 确保输入框清空
    feedback.value = ''
  } else {
    if (isCrossPractice.value) {
      handleGroupCompleted()
      return
    }
    
    isComplete.value = true
    feedback.value = '🎉 恭喜完成所有字根练习！'
  }
  
  // 保存进度 - 使用特定标识符 'top500'
  saveProgress(
    practiceMode.value,
    correctCount.value,
    answeredRoots.value,
    practiceRoots.value,
    isComplete.value,
    'top500'
  )
}

// 新增：保存十字练习进度
const saveCrossPracticeProgress = (progressData) => {
  try {
    localStorage.setItem('crossPracticeProgress', JSON.stringify(progressData))
    console.log('十字练习进度已保存')
  } catch (error) {
    console.error('保存十字练习进度失败:', error)
  }
}

// 新增：加载十字练习进度
const loadCrossPracticeProgress = () => {
  try {
    const saved = localStorage.getItem('crossPracticeProgress')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('加载十字练习进度失败:', error)
    return null
  }
}

// 新增：清除十字练习进度
const clearCrossPracticeProgress = () => {
  localStorage.removeItem('crossPracticeProgress')
  console.log('十字练习进度已清除')
}

// 新增：清除十字练习状态
const clearCrossPracticeState = () => {
  localStorage.removeItem('crossPracticeState')
  console.log('十字练习状态已清除')
}

// 新增：保存十字练习状态（包括是否启用、当前组等）
const saveCrossPracticeState = (stateData) => {
  try {
    localStorage.setItem('crossPracticeState', JSON.stringify(stateData))
    console.log('十字练习状态已保存')
  } catch (error) {
    console.error('保存十字练习状态失败:', error)
  }
}

// 新增：加载十字练习状态
const loadCrossPracticeState = () => {
  try {
    const saved = localStorage.getItem('crossPracticeState')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('加载十字练习状态失败:', error)
    return null
  }
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
      // 答对后保存进度 - 使用特定标识符 'top500'
      if (!isCrossPractice.value) {
        saveProgress(
          practiceMode.value,
          correctCount.value,
          answeredRoots.value,
          practiceRoots.value,
          isComplete.value,
          'top500'
        )
      } else {
        // 保存十字练习状态
        saveCrossPracticeState({
          isCrossPractice: true,
          practiceMode: practiceMode.value,
          currentGroup: currentGroup.value,
          groupRepetitions: groupRepetitions.value,
          completedGroups: completedGroups.value
        })
        
        // 同时保存十字练习进度
        saveCrossPracticeProgress({
          completedGroups: completedGroups.value,
          currentGroup: currentGroup.value,
          groupRepetitions: groupRepetitions.value,
          lastCompletedTime: new Date().toISOString()
        })
      }
      
      // 答对后直接清空输入框
      userInput.value = ''
      
      if (answeredRoots.value === practiceRoots.value.length) {
        if (isCrossPractice.value) {
          handleGroupCompleted()
          return
        }
        
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
        if (answeredRoots.value >= 1 && !isCrossPractice.value) {
          saveProgress(
            practiceMode.value,
            correctCount.value,
            answeredRoots.value,
            practiceRoots.value,
            isComplete.value,
            'top500'
          )
        } else if (answeredRoots.value >= 1 && isCrossPractice.value) {
          saveCrossPracticeState({
            isCrossPractice: true,
            practiceMode: practiceMode.value,
            currentGroup: currentGroup.value,
            groupRepetitions: groupRepetitions.value,
            completedGroups: completedGroups.value
          })
          
          // 同时保存十字练习进度
          saveCrossPracticeProgress({
            completedGroups: completedGroups.value,
            currentGroup: currentGroup.value,
            groupRepetitions: groupRepetitions.value,
            lastCompletedTime: new Date().toISOString()
          })
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
    
    // 恢复十字练习状态
    if (isCrossPractice.value) {
      saveCrossPracticeState({
        isCrossPractice: true,
        practiceMode: practiceMode.value,
        currentGroup: currentGroup.value,
        groupRepetitions: groupRepetitions.value,
        completedGroups: completedGroups.value
      })
    }
  }
}

const handleCrossResume = () => {
  if (savedCrossState.value) {
    isCrossPractice.value = true
    practiceMode.value = savedCrossState.value.practiceMode || 'shuffle'
    
    // 确保值是数字类型
    currentGroup.value = Number(savedCrossState.value.currentGroup) || 0
    groupRepetitions.value = Number(savedCrossState.value.groupRepetitions) || 0
    completedGroups.value = Number(savedCrossState.value.completedGroups) || 0
    
    progressRestored.value = true
    showCrossResumeDialog.value = false
    
    // 初始化十字练习
    initCrossPractice()
    
    feedback.value = `✅ 已恢复十字练习进度：第 ${currentGroup.value + 1}/${totalGroups.value} 组 (已练习 ${groupRepetitions.value}/3 遍)`
  }
}

const handleCrossRestart = () => {
  showCrossResumeDialog.value = false
  isCrossPractice.value = true
  startPractice(true)
}

const handleRestart = () => {
  showResumeDialog.value = false
  startPractice(true)
}

// >>>>> 关键修正：在这里添加 loadFonts 函数定义 <<<<<
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
// >>>>> loadFonts 函数结束 <<<<<

// 监听页面卸载事件，确保进度保存
const handleBeforeUnload = () => {
  if (fontLoaded.value && !isComplete.value && answeredRoots.value >= 1) {
    // 离开页面时保存进度 - 使用特定标识符 'top500'
    if (!isCrossPractice.value) {
      saveProgress(
        practiceMode.value,
        correctCount.value,
        answeredRoots.value,
        practiceRoots.value,
        isComplete.value,
        'top500'
      )
    } else {
      // 保存十字练习进度和状态
      saveCrossPracticeProgress({
        completedGroups: completedGroups.value,
        currentGroup: currentGroup.value,
        groupRepetitions: groupRepetitions.value,
        lastCompletedTime: new Date().toISOString()
      })
      
      saveCrossPracticeState({
        isCrossPractice: true,
        practiceMode: practiceMode.value,
        currentGroup: currentGroup.value,
        groupRepetitions: groupRepetitions.value,
        completedGroups: completedGroups.value
      })
    }
  }
}

onMounted(async () => {
  // 加载字体
  await loadFonts()
  
  // 检查是否有保存的十字练习状态
  const crossState = loadCrossPracticeState()
  const crossProgress = loadCrossPracticeProgress() // 同时加载进度数据
  
  if (crossState && crossState.isCrossPractice) {
    savedCrossState.value = crossState
    
    // 合并状态和进度数据
    if (crossProgress) {
      savedCrossState.value.currentGroup = Number(crossProgress.currentGroup || crossState.currentGroup) || 0
      savedCrossState.value.groupRepetitions = Number(crossProgress.groupRepetitions || crossState.groupRepetitions) || 0
      savedCrossState.value.completedGroups = Number(crossProgress.completedGroups || crossState.completedGroups) || 0
    }
    
    // 检查是否有未完成的十字练习
    if (crossProgress && Number(crossProgress.completedGroups) < Math.ceil(top500Roots.length / 10)) {
      showCrossResumeDialog.value = true
    } else {
      // 没有需要恢复的进度，直接初始化
      isCrossPractice.value = true
      practiceMode.value = crossState.practiceMode || 'shuffle'
      
      // 确保值是数字类型
      currentGroup.value = savedCrossState.value.currentGroup
      groupRepetitions.value = savedCrossState.value.groupRepetitions
      completedGroups.value = savedCrossState.value.completedGroups
      
      progressRestored.value = true
      
      // 初始化十字练习
      initCrossPractice()
    }
  } else {
    // 加载保存的进度 - 使用特定标识符 'top500'
    const progressData = loadProgress('top500')
    savedProgress.value = progressData
    
    if (progressData && shouldRestoreProgress(progressData)) {
      showResumeDialog.value = true
    } else {
      // 没有可恢复的进度，开始新练习
      practiceMode.value = 'order'
      startPractice(true)
    }
  }
  
  // 添加页面卸载监听
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  // 移除监听器
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // 离开页面时保存进度 - 只有 answeredRoots >= 1 时才保存
  if (fontLoaded.value && !isComplete.value && answeredRoots.value >= 1) {
    if (!isCrossPractice.value) {
      // 使用特定标识符 'top500'
      saveProgress(
        practiceMode.value,
        correctCount.value,
        answeredRoots.value,
        practiceRoots.value,
        isComplete.value,
        'top500'
      )
    } else {
      // 保存十字练习进度
      saveCrossPracticeProgress({
        completedGroups: completedGroups.value,
        currentGroup: currentGroup.value,
        groupRepetitions: groupRepetitions.value,
        lastCompletedTime: new Date().toISOString()
      })
      
      // 保存十字练习状态
      saveCrossPracticeState({
        isCrossPractice: true,
        practiceMode: practiceMode.value,
        currentGroup: currentGroup.value,
        groupRepetitions: groupRepetitions.value,
        completedGroups: completedGroups.value
      })
    }
  }
})
</script>

<template>
  <div class="practice-container">
    <!-- 统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">正确率</span>
        <span class="stat-value" :class="{ 'success': accuracy >= 80, 'warning': accuracy < 80 }">
          {{ accuracy }}%
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">进度</span>
        <span class="stat-value">{{ progress }}</span>
      </div>
      <div class="stat-item" v-if="isCrossPractice">
        <span class="stat-label">十字练习</span>
        <span class="stat-value">{{ crossPracticeProgress }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">模式</span>
        <span class="stat-value">{{ practiceMode === 'order' ? '顺序' : '乱序' }}</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: (answeredRoots / totalRoots) * 100 + '%' }"></div>
      </div>
    </div>

    <!-- 主练习区域 -->
    <div class="practice-area" v-if="!isComplete && fontLoaded">
      <!-- 字根显示 -->
      <div class="root-display">
        <div class="root-character">
          {{ currentRoot?.character || '🎉' }}
        </div>
      </div>
      
      <!-- 提示信息 -->
      <div class="hint-display">
        {{ isComplete ? '完成！' : currentRoot?.hint || '' }}
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <input
          v-model="userInput"
          @input="handleInput"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          :placeholder="isComplete ? '练习完成' : '请输入字根编码'"
          class="code-input"
          :class="{ 'correct': !showFlash && userInput, 'wrong': showFlash }"
          :disabled="isComplete || !fontLoaded"
          maxlength="1"
          autofocus
        />
        
        <!-- 反馈信息 -->
        <div v-if="feedback" class="feedback-message" :class="showFlash ? 'error' : 'success'">
          {{ feedback }}
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button @click="toggleOrderMode" class="btn" :class="{ 'btn-primary': practiceMode === 'order', 'btn-secondary': practiceMode !== 'order' }">
          🔄 顺序练习
        </button>
        <button @click="toggleShuffleMode" class="btn" :class="{ 'btn-primary': practiceMode === 'shuffle', 'btn-secondary': practiceMode !== 'shuffle' }">
          🎲 乱序练习
        </button>
        <button @click="toggleCrossPractice" class="btn" :class="{ 'btn-success': isCrossPractice, 'btn-secondary': !isCrossPractice }">
          ✳️ 十字练习
        </button>
        <button @click="startPractice(true)" class="btn btn-warning" :disabled="!fontLoaded">
          🔄 重新开始
        </button>
      </div>
    </div>

    <!-- 字体加载提示 -->
    <div v-if="!fontLoaded" class="practice-area">
      <div class="font-loading">
        <div class="loading-spinner"></div>
        <p>加载特殊字体中...</p>
      </div>
    </div>

    <!-- 恢复进度对话框（普通练习） -->
    <div v-if="showResumeDialog && !isCrossPractice" class="resume-overlay">
      <div class="resume-dialog">
        <div class="resume-icon">💾</div>
        <h2>发现未完成的练习</h2>
        <p>检测到您之前有未完成的练习，要继续吗？</p>
        <div class="progress-info">
          <span>📝 练习模式: {{ savedProgress?.mode === 'order' ? '顺序练习' : '乱序练习' }}</span>
          <span>✅ 已完成: {{ savedProgress?.answeredRoots || 0 }}/{{ savedProgress?.practiceRoots?.length || top500Roots.length }}</span>
          <span>🎯 正确率: {{ savedProgress ? Math.round((savedProgress.correctCount / savedProgress.answeredRoots) * 100) : 0 }}%</span>
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

    <!-- 恢复进度对话框（十字练习） -->
    <div v-if="showCrossResumeDialog" class="resume-overlay">
      <div class="resume-dialog">
        <div class="resume-icon">✳️</div>
        <h2>发现未完成的十字练习</h2>
        <p>检测到您之前有未完成的十字练习，要继续吗？</p>
        <div class="progress-info">
          <span>✅ 当前进度: 第 {{ Number(savedCrossState?.currentGroup) + 1 }}/{{ Math.ceil(top500Roots.length / 10) }} 组 (已练习 {{ Number(savedCrossState?.groupRepetitions) || 0 }}/3 遍)</span>
        </div>
        <div class="dialog-buttons">
          <button @click="handleCrossResume" class="btn btn-success">
            ✅ 继续练习
          </button>
          <button @click="handleCrossRestart" class="btn btn-danger">
            🔄 重新开始
          </button>
        </div>
      </div>
    </div>

    <!-- 完成界面 -->
    <div v-if="isComplete && fontLoaded" class="complete-screen">
      <div class="complete-content">
        <div class="completion-icon">🎉</div>
        <h2>恭喜完成！</h2>
        <div class="complete-stats">
          <div class="stat">
            <span class="stat-number">{{ accuracy }}%</span>
            <span class="stat-label">正确率</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ progress }}</span>
            <span class="stat-label">完成进度</span>
          </div>
        </div>
        <div class="complete-message">
          {{ accuracy >= 80 ? '太棒了！继续保持！' : '加油！多练习就能提高！' }}
        </div>
        <div class="complete-actions">
          <button @click="startPractice" class="btn btn-large btn-primary">
            🔄 再来一次
          </button>
          <button @click="() => {
            if (isCrossPractice) {
              clearCrossPracticeProgress()
              clearCrossPracticeState()
            } else {
              clearProgress('top500')
            }
          }" class="btn btn-large btn-danger">
            🗑️ 清除进度
          </button>
        </div>
      </div>
    </div>

    <!-- 键盘快捷键提示 -->
    <div class="keyboard-hints">
      <span class="hint">Enter - 提交</span>
      <span class="hint">Tab - 跳过</span>
      <span class="hint">ESC - 暂停</span>
    </div>
  </div>
</template>

<style scoped>
/* 导入统一练习卡片样式 */
@import url('../styles/practice-styles.css');
@import url('../styles/fonts.css');

/* 自定义样式 */
.practice-container {
  position: relative;
}

/* 字体加载提示 */
.font-loading {
  text-align: center;
  padding: 3rem;
}

.font-loading .loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(102, 126, 234, 0.3);
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.font-loading p {
  font-size: 1.2rem;
  color: #666;
  font-weight: 600;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 恢复进度对话框 */
.resume-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.resume-dialog {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  border-radius: 20px;
  padding: 2.5rem;
  text-align: center;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.4s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.resume-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.resume-dialog h2 {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  font-weight: 900;
}

.resume-dialog p {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  line-height: 1.6;
}

.progress-info {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 1.2rem;
  margin-bottom: 1.5rem;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.progress-info span {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #444;
}

.progress-info span:last-child {
  margin-bottom: 0;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* 完成界面 */
.completion-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .root-character {
    font-size: 80px;
  }
  
  .resume-dialog {
    padding: 1.5rem;
  }
  
  .resume-dialog h2 {
    font-size: 1.5rem;
  }
  
  .resume-dialog p {
    font-size: 1rem;
  }
  
  .complete-screen h2 {
    font-size: 2rem;
  }
  
  .stat-number {
    font-size: 2rem;
  }
  
  .control-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .stats-bar {
    grid-template-columns: 1fr;
  }
  
  .root-character {
    font-size: 60px;
  }
  
  .code-input {
    font-size: 1.2rem;
    padding: 1rem;
  }
  
  .hint-display {
    font-size: 1rem;
    padding: 0.8rem 1rem;
  }
  
  .keyboard-hints {
    flex-direction: column;
    align-items: center;
  }
  
  .hint {
    width: 100%;
    justify-content: center;
  }
}
</style>
