// src/utils/progressManager.js

const STORAGE_KEY = 'root_practice_progress_v2'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7天有效期

export const loadProgress = () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (!storedData) return null
    
    const progress = JSON.parse(storedData)
    const now = Date.now()
    
    // 检查数据是否过期
    if (now - progress.timestamp > MAX_AGE) {
      clearProgress()
      return null
    }
    
    // 验证数据结构完整性
    if (!progress || typeof progress !== 'object') {
      clearProgress()
      return null
    }
    
    return progress
  } catch (error) {
    console.error('加载进度失败:', error)
    clearProgress()
    return null
  }
}

export const saveProgress = (mode, correctCount, answeredRoots, practiceRoots, isComplete) => {
  try {
    const progress = {
      mode,
      correctCount,
      answeredRoots,
      practiceRoots: practiceRoots.map(root => ({
        character: root.character,
        code: root.code,
        hint: root.hint
      })),
      isComplete,
      timestamp: Date.now()
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('保存进度失败:', error)
  }
}

export const clearProgress = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('清除进度失败:', error)
  }
}

export const shouldRestoreProgress = (currentProgress) => {
  if (!currentProgress) return false
  
  // 检查是否有未完成的练习
  return !currentProgress.isComplete && 
         currentProgress.answeredRoots > 0 && 
         currentProgress.practiceRoots.length > 0
}