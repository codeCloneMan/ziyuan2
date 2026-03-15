/**
 * 分组练习引擎 V2 - 组合式函数
 * 实现智能分组练习逻辑：
 * - 每组5-10个字根
 * - 每个字根练习3-6遍（组内随机循环）
 * - 错误3次以上的字根加入下一组
 * - 下一组减少一个字根以保持总数
 */

import { ref, computed } from 'vue'
import { shuffleArray } from './safeUtils.js'

// 默认配置
const DEFAULT_CONFIG = {
  groupSize: 8, // 每组字根数量 (5-10)
  repetitions: 4, // 每字根练习遍数 (3-6)
  errorThreshold: 3, // 错误阈值，超过则加入下一组
  maxGroupSize: 10, // 最大组大小
  minGroupSize: 5, // 最小组大小
}

export function useGroupPractice(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // 状态
  const allRoots = ref([])
  const currentGroup = ref([]) // 当前组的原始字根列表
  const practiceQueue = ref([]) // 练习队列（当前组的字根复制多次后打乱）
  const currentQueueIndex = ref(0) // 当前在队列中的位置
  const currentGroupIndex = ref(0) // 当前组索引
  const completedGroups = ref([]) // 已完成的组
  const errorRoots = ref([]) // 当前组的错误字根
  const rootStats = ref({}) // 每个字根的练习统计
  const isComplete = ref(false)
  const isPaused = ref(false)

  // 统计数据
  const totalCorrect = ref(0)
  const totalWrong = ref(0)
  const totalAttempts = ref(0)
  const startTime = ref(null)
  const elapsedTime = ref(0)

  // 计算属性 - 当前字根
  const currentRoot = computed(() => {
    if (practiceQueue.value.length === 0) return null
    return practiceQueue.value[currentQueueIndex.value]
  })

  // 总进度（基于字根完成数）
  const progress = computed(() => {
    if (allRoots.value.length === 0) return 0
    const completedCount = masteredCount.value
    return Math.round((completedCount / allRoots.value.length) * 100)
  })

  // 正确率
  const accuracy = computed(() => {
    if (totalAttempts.value === 0) return 0
    return Math.round((totalCorrect.value / totalAttempts.value) * 100)
  })

  // 掌握率（连续答对达到重复次数的字根）
  const masteryRate = computed(() => {
    if (allRoots.value.length === 0) return 0
    return Math.round((masteredCount.value / allRoots.value.length) * 100)
  })

  // 已掌握数量
  const masteredCount = computed(() => {
    return Object.values(rootStats.value).filter((s) => s.consecutiveCorrect >= cfg.repetitions)
      .length
  })

  // 剩余数量
  const remainingCount = computed(() => {
    return allRoots.value.length - masteredCount.value
  })

  // 组进度信息
  const groupProgress = computed(() => {
    const totalRootsInQueue = currentGroup.value.length * cfg.repetitions
    const currentInQueue = currentQueueIndex.value % totalRootsInQueue
    const currentRootInGroup = Math.floor(currentQueueIndex.value / cfg.repetitions)

    return {
      current: currentGroupIndex.value + 1,
      total: Math.ceil(allRoots.value.length / cfg.groupSize),
      repetition: (currentQueueIndex.value % cfg.repetitions) + 1,
      maxRepetitions: cfg.repetitions,
      rootInGroup: Math.min(currentRootInGroup + 1, currentGroup.value.length),
      groupSize: currentGroup.value.length,
      queueProgress: currentQueueIndex.value,
      queueTotal: practiceQueue.value.length,
    }
  })

  // 创建练习队列 - 将字根复制多次后随机打乱
  const createPracticeQueue = (roots) => {
    const queue = []
    // 将每个字根复制repetitions次
    for (const root of roots) {
      for (let i = 0; i < cfg.repetitions; i++) {
        queue.push({ ...root })
      }
    }
    // 随机打乱
    return shuffleArray(queue)
  }

  // 初始化练习
  const initPractice = (roots, mode = 'order') => {
    allRoots.value = [...roots]

    // 如果是随机模式，打乱所有字根
    if (mode === 'random') {
      allRoots.value = shuffleArray(allRoots.value)
    }

    // 重置状态
    currentGroupIndex.value = 0
    completedGroups.value = []
    errorRoots.value = []
    rootStats.value = {}
    isComplete.value = false
    isPaused.value = false
    totalCorrect.value = 0
    totalWrong.value = 0
    totalAttempts.value = 0
    startTime.value = Date.now()
    elapsedTime.value = 0

    // 创建第一组
    createNextGroup()
  }

  // 创建下一组
  const createNextGroup = () => {
    const startIdx = currentGroupIndex.value * cfg.groupSize
    const endIdx = Math.min(startIdx + cfg.groupSize, allRoots.value.length)

    // 基础新字根
    let newRoots = allRoots.value.slice(startIdx, endIdx)

    // 如果上一组有错误字根，加入下一组并减少一个新字根
    if (errorRoots.value.length > 0) {
      // 移除一个新字根（如果还有的话）
      if (newRoots.length > cfg.minGroupSize) {
        newRoots.pop()
      }
      // 添加错误字根
      newRoots = [...newRoots, ...errorRoots.value]
      // 打乱顺序
      newRoots = shuffleArray(newRoots)
    }

    // 限制组大小
    if (newRoots.length > cfg.maxGroupSize) {
      newRoots = newRoots.slice(0, cfg.maxGroupSize)
    }

    currentGroup.value = newRoots
    practiceQueue.value = createPracticeQueue(newRoots)
    currentQueueIndex.value = 0
    errorRoots.value = []
  }

  // 验证输入
  const validateInput = (input, correctCode) => {
    if (!currentRoot.value) return { isCorrect: false, stats: null }

    const rootId = `${currentRoot.value.character}-${currentRoot.value.code}`
    const isCorrect = input.toLowerCase().trim() === correctCode.toLowerCase().trim()

    // 初始化字根统计
    if (!rootStats.value[rootId]) {
      rootStats.value[rootId] = {
        attempts: 0,
        correct: 0,
        wrong: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        lastCorrect: false,
      }
    }

    const stats = rootStats.value[rootId]
    stats.attempts++
    totalAttempts.value++

    if (isCorrect) {
      stats.correct++
      stats.consecutiveCorrect++
      stats.consecutiveWrong = 0
      stats.lastCorrect = true
      totalCorrect.value++
    } else {
      stats.wrong++
      stats.consecutiveWrong++
      stats.consecutiveCorrect = 0
      stats.lastCorrect = false
      totalWrong.value++

      // 记录错误字根（如果错误超过阈值）
      if (stats.consecutiveWrong >= cfg.errorThreshold) {
        const alreadyAdded = errorRoots.value.some((r) => `${r.character}-${r.code}` === rootId)
        if (!alreadyAdded) {
          errorRoots.value.push(currentRoot.value)
        }
      }
    }

    return { isCorrect, stats }
  }

  // 移动到下一个
  const next = () => {
    currentQueueIndex.value++

    // 如果队列已完成
    if (currentQueueIndex.value >= practiceQueue.value.length) {
      // 记录完成的组
      completedGroups.value.push({
        index: currentGroupIndex.value,
        roots: [...currentGroup.value],
        errorRoots: [...errorRoots.value],
      })

      currentGroupIndex.value++

      // 检查是否所有字根都已掌握
      if (masteredCount.value >= allRoots.value.length) {
        isComplete.value = true
        return 'complete'
      }

      // 创建下一组（包含错误字根）
      createNextGroup()
      return 'next-group'
    }

    return 'next-root'
  }

  // 跳过当前字根
  const skip = () => {
    currentQueueIndex.value++

    if (currentQueueIndex.value >= practiceQueue.value.length) {
      completedGroups.value.push({
        index: currentGroupIndex.value,
        roots: [...currentGroup.value],
        errorRoots: [...errorRoots.value],
      })

      currentGroupIndex.value++

      if (masteredCount.value >= allRoots.value.length) {
        isComplete.value = true
        return 'complete'
      }

      createNextGroup()
      return 'next-group'
    }

    return 'next-root'
  }

  // 暂停/继续
  const togglePause = () => {
    isPaused.value = !isPaused.value
    if (!isPaused.value) {
      // 恢复时更新时间基准
      startTime.value = Date.now() - elapsedTime.value * 1000
    }
  }

  // 更新用时
  const updateElapsedTime = () => {
    if (!isPaused.value && startTime.value) {
      elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000)
    }
  }

  // 获取字根统计
  const getRootStats = (rootId) => {
    return (
      rootStats.value[rootId] || {
        attempts: 0,
        correct: 0,
        wrong: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
      }
    )
  }

  // 导出序列化状态（用于保存进度）
  const serializeState = () => {
    return {
      currentGroupIndex: currentGroupIndex.value,
      currentQueueIndex: currentQueueIndex.value,
      currentGroup: currentGroup.value,
      practiceQueue: practiceQueue.value,
      completedGroups: completedGroups.value,
      errorRoots: errorRoots.value,
      rootStats: rootStats.value,
      totalCorrect: totalCorrect.value,
      totalWrong: totalWrong.value,
      totalAttempts: totalAttempts.value,
      elapsedTime: elapsedTime.value,
      isComplete: isComplete.value,
      timestamp: Date.now(),
    }
  }

  // 恢复状态
  const deserializeState = (state, roots, mode = 'order') => {
    allRoots.value = [...roots]
    if (mode === 'random') {
      allRoots.value = shuffleArray(allRoots.value)
    }

    // 恢复状态
    currentGroupIndex.value = state.currentGroupIndex || 0
    currentQueueIndex.value = state.currentQueueIndex || 0
    currentGroup.value = state.currentGroup || []
    practiceQueue.value = state.practiceQueue || []
    completedGroups.value = state.completedGroups || []
    errorRoots.value = state.errorRoots || []
    rootStats.value = state.rootStats || {}
    totalCorrect.value = state.totalCorrect || 0
    totalWrong.value = state.totalWrong || 0
    totalAttempts.value = state.totalAttempts || 0
    elapsedTime.value = state.elapsedTime || 0
    isComplete.value = state.isComplete || false

    // 如果没有队列或当前组，重新创建
    if (practiceQueue.value.length === 0 && currentGroup.value.length === 0) {
      createNextGroup()
    }

    // 确保队列索引在有效范围内
    if (currentQueueIndex.value >= practiceQueue.value.length) {
      currentQueueIndex.value = 0
    }

    // 恢复时间基准
    startTime.value = Date.now() - elapsedTime.value * 1000
  }

  // 重置状态
  const reset = () => {
    console.log('GroupPracticeEngine: 重置引擎状态')
    allRoots.value = []
    currentGroup.value = []
    practiceQueue.value = []
    currentQueueIndex.value = 0
    currentGroupIndex.value = 0
    completedGroups.value = []
    errorRoots.value = []
    rootStats.value = {}
    isComplete.value = false
    isPaused.value = false
    totalCorrect.value = 0
    totalWrong.value = 0
    totalAttempts.value = 0
    elapsedTime.value = 0
    startTime.value = null // 重置时间基准，但不调用stopTimer（由组件管理）
    console.log('GroupPracticeEngine: 引擎状态已重置')
  }

  return {
    // 状态
    currentRoot,
    currentGroup,
    practiceQueue,
    isComplete,
    isPaused,
    rootStats,

    // 计算属性
    progress,
    accuracy,
    masteryRate,
    masteredCount,
    remainingCount,
    groupProgress,

    // 统计
    totalCorrect,
    totalWrong,
    totalAttempts,
    elapsedTime,

    // 方法
    initPractice,
    createNextGroup,
    validateInput,
    next,
    skip,
    togglePause,
    updateElapsedTime,
    getRootStats,
    serializeState,
    deserializeState,
    reset,

    // 配置
    config: cfg,
  }
}
