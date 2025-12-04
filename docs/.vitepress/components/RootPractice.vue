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
  
  const roots = [...allRoots]
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
  const roots = [...allRoots]
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
  
  // 清除之前的进度
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
  
  if (isCrossPractice.value) {
    // 如果是十字练习模式，重新初始化
    initCrossPractice()
    return
  }
  
  if (practiceMode.value === 'order') {
    practiceRoots.value = [...allRoots]
  } else {
    practiceRoots.value = shuffleArray([...allRoots])
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
  
  // 保存进度
  if (!isCrossPractice.value) {
    saveProgress(
      practiceMode.value,
      correctCount.value,
      answeredRoots.value,
      practiceRoots.value,
      isComplete.value
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
  }
}

// 新增：保存十字练习进度
const saveCrossPracticeProgress = (progressData) => {
  try {
    localStorage.setItem('crossPracticeProgress_all', JSON.stringify(progressData))
    console.log('十字练习进度已保存')
  } catch (error) {
    console.error('保存十字练习进度失败:', error)
  }
}

// 新增：加载十字练习进度
const loadCrossPracticeProgress = () => {
  try {
    const saved = localStorage.getItem('crossPracticeProgress_all')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('加载十字练习进度失败:', error)
    return null
  }
}

// 新增：清除十字练习进度
const clearCrossPracticeProgress = () => {
  localStorage.removeItem('crossPracticeProgress_all')
  console.log('十字练习进度已清除')
}

// 新增：清除十字练习状态
const clearCrossPracticeState = () => {
  localStorage.removeItem('crossPracticeState_all')
  console.log('十字练习状态已清除')
}

// 新增：保存十字练习状态（包括是否启用、当前组等）
const saveCrossPracticeState = (stateData) => {
  try {
    localStorage.setItem('crossPracticeState_all', JSON.stringify(stateData))
    console.log('十字练习状态已保存')
  } catch (error) {
    console.error('保存十字练习状态失败:', error)
  }
}

// 新增：加载十字练习状态
const loadCrossPracticeState = () => {
  try {
    const saved = localStorage.getItem('crossPracticeState_all')
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
      // 答对后保存进度
      if (!isCrossPractice.value) {
        saveProgress(
          practiceMode.value,
          correctCount.value,
          answeredRoots.value,
          practiceRoots.value,
          isComplete.value
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
        
        // 也保存十字练习进度
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
            isComplete.value
          )
        } else if (answeredRoots.value >= 1 && isCrossPractice.value) {
          saveCrossPracticeState({
            isCrossPractice: true,
            practiceMode: practiceMode.value,
            currentGroup: currentGroup.value,
            groupRepetitions: groupRepetitions.value,
            completedGroups: completedGroups.value
          })
          
          // 也保存十字练习进度
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
    if (!isCrossPractice.value) {
      saveProgress(
        practiceMode.value,
        correctCount.value,
        answeredRoots.value,
        practiceRoots.value,
        isComplete.value
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
  const crossProgress = loadCrossPracticeProgress() // 确保同时加载进度
  
  if (crossState && crossState.isCrossPractice) {
    savedCrossState.value = crossState
    
    // 合并状态和进度数据
    if (crossProgress) {
      savedCrossState.value.currentGroup = Number(crossProgress.currentGroup || crossState.currentGroup) || 0
      savedCrossState.value.groupRepetitions = Number(crossProgress.groupRepetitions || crossState.groupRepetitions) || 0
      savedCrossState.value.completedGroups = Number(crossProgress.completedGroups || crossState.completedGroups) || 0
    }
    
    // 检查是否有未完成的十字练习
    if (crossProgress && Number(crossProgress.completedGroups) < Math.ceil(allRoots.length / 10)) {
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
      saveProgress(
        practiceMode.value,
        correctCount.value,
        answeredRoots.value,
        practiceRoots.value,
        isComplete.value
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
  <div class="root-practice">
    <div class="practice-area" :class="{ 'fonts-loaded': fontLoaded }">
      <div class="stats">
        <span>🎯 正确率: {{ accuracy }}%</span>
        <span>📊 进度: {{ progress }}</span>
        <span v-if="isCrossPractice" class="cross-progress">{{ crossPracticeProgress }}</span>
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

      <!-- 恢复进度对话框（普通练习） -->
      <div v-if="showResumeDialog && !isCrossPractice" class="resume-overlay">
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

      <!-- 恢复进度对话框（十字练习） -->
      <div v-if="showCrossResumeDialog" class="resume-overlay">
        <div class="resume-dialog">
          <div class="resume-icon">✳️</div>
          <h2>发现未完成的十字练习</h2>
          <p>检测到您之前有未完成的十字练习，要继续吗？</p>
          <div class="progress-info">
            <!-- 修正：从合并数据中正确获取 groupRepetitions -->
            <span>✅ 当前进度: 第 {{ Number(savedCrossState?.currentGroup) + 1 }}/{{ Math.ceil(allRoots.length / 10) }} 组 (已练习 {{ Number(savedCrossState?.groupRepetitions) || 0 }}/3 遍)</span>
          </div>
          <div class="dialog-buttons">
            <button @click="handleCrossResume" class="resume-btn">
              ✅ 继续练习
            </button>
            <button @click="handleCrossRestart" class="restart-btn">
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
            <button @click="() => {
              if (isCrossPractice) {
                clearCrossPracticeProgress()
                clearCrossPracticeState()
              } else {
                clearProgress()
              }
            }" class="completion-clear-btn">
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
      <button @click="toggleCrossPractice" class="cross-btn" :class="{ 'cross-active': isCrossPractice }">
        ✳️ 十字练习
      </button>
      <button @click="startPractice(true)" class="restart-btn" :disabled="!fontLoaded">
        🔄 重新开始
      </button>
    </div>
    
    <div class="font-info" v-if="fontLoaded">
      <p v-if="!isCrossPractice">💡 提示：练习进度会永久保存到本地，关闭页面后仍可继续。</p>
      <p v-else>💡 提示：十字练习将字根分为每组10个，每组需练习3遍才能进入下一组。进度永久保存。</p>
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
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cross-progress {
  color: #e74c3c;
  font-size: 0.9rem;
}

.character-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1.2rem 0;
  flex-direction: column;
}

.character-display {
  position: relative;
  min-height: 3rem;
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
  padding: 0.4rem 1rem;
  border-radius: 20px;
  min-width: 80px;
  text-align: center;
  margin-top: 0.3rem;
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
  margin: 1rem 0;
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
  margin: 0.8rem 0;
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
  padding: 1.5rem;
  text-align: center;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  animation: fadeIn 0.3s ease;
}

.resume-icon {
  font-size: 2.5rem;
  margin-bottom: 0.8rem;
  color: #3498db;
}

.resume-dialog h2 {
  font-size: 1.6rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.resume-dialog p {
  color: #7f8c8d;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0.8rem;
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
  gap: 0.8rem;
  justify-content: center;
}

.resume-btn, .restart-btn {
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
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
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  max-width: 90%;
}

.completion-icon {
  font-size: 3.5rem;
  margin-bottom: 0.8rem;
  color: #27ae60;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.completion-content h2 {
  font-size: 1.8rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.completion-content p {
  font-size: 1.1rem;
  color: #3498db;
  margin: 0.4rem 0;
  font-weight: bold;
}

.completion-buttons {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  margin-top: 1.2rem;
}

.completion-restart-btn {
  padding: 0.7rem 1.8rem;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.4);
}

.completion-restart-btn:hover {
  background: #219653;
  transform: translateY(-2px);
  box-shadow: 0 3px 12px rgba(39, 174, 96, 0.6);
}

.completion-clear-btn {
  padding: 0.7rem 1.8rem;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(149, 165, 166, 0.4);
}

.completion-clear-btn:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
  box-shadow: 0 3px 12px rgba(149, 165, 166, 0.6);
}

.controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0.8rem;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
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
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
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
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.restart-btn:hover {
  background: #c0392b;
  transform: translateY(-1px);
}

.restart-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
}

.font-info {
  margin-top: 0.8rem;
  padding: 0.4rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #7f8c8d;
  text-align: center;
}
</style>