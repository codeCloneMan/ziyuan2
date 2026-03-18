<script setup>
/**
 * 字根展示画廊组件
 * 提供所有字根的浏览、搜索、筛选和排序功能
 */
import { ref, computed } from 'vue'
import { allRoots } from '../data/rootData.js'
import RootCard from './RootCard.vue'

// 搜索关键词
const searchQuery = ref('')

// 选中的分类
const selectedCategory = ref('all')

// 选中的编码
const selectedCode = ref('')

// 排序方式
const sortBy = ref('code') // 'code' | 'frequency' | 'difficulty'

// 每页显示数量
const itemsPerPage = 50
const currentPage = ref(1)

// 获取所有分类
const categories = computed(() => {
  const cats = new Set(allRoots.map(root => root.category).filter(Boolean))
  return ['all', ...Array.from(cats)]
})

// 获取所有编码
const codes = computed(() => {
  const codeSet = new Set(allRoots.map(root => root.code))
  return Array.from(codeSet).sort()
})

// 过滤后的字根列表
const filteredRoots = computed(() => {
  let result = [...allRoots]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(root => 
      root.character.includes(query) ||
      root.hint.toLowerCase().includes(query) ||
      root.code.toLowerCase().includes(query) ||
      (root.category && root.category.toLowerCase().includes(query))
    )
  }
  
  // 分类过滤
  if (selectedCategory.value !== 'all') {
    result = result.filter(root => root.category === selectedCategory.value)
  }
  
  // 编码过滤
  if (selectedCode.value) {
    result = result.filter(root => root.code === selectedCode.value)
  }
  
  // 排序
  if (sortBy.value === 'code') {
    result.sort((a, b) => a.code.localeCompare(b.code))
  } else if (sortBy.value === 'character') {
    // 按字符 Unicode 排序
    result.sort((a, b) => a.character.localeCompare(b.character))
  }
  
  return result
})

// 分页后的字根列表
const paginatedRoots = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredRoots.value.slice(start, end)
})

// 统计信息
const totalCount = computed(() => filteredRoots.value.length)
const totalPages = computed(() => Math.ceil(filteredRoots.value.length / itemsPerPage))

// 重置分页
const resetPagination = () => {
  currentPage.value = 1
}

// 监听筛选变化，重置分页
const handleCategoryChange = () => {
  resetPagination()
}

const handleCodeChange = () => {
  resetPagination()
}

const handleSearch = () => {
  resetPagination()
}

// 处理字根点击
const handleRootClick = (root) => {
  console.log('点击字根:', root)
  // 可以在这里添加更多交互，比如显示详情弹窗
}
</script>

<template>
  <div class="roots-gallery">
    <!-- 头部统计 -->
    <div class="gallery-header">
      <h2 class="gallery-title">字根大全</h2>
      <div class="gallery-stats">
        <span class="stat">共 {{ totalCount }} 个字根</span>
        <span v-if="totalCount !== allRoots.length" class="stat-highlight">
          (筛选自 {{ allRoots.length }} 个)
        </span>
      </div>
    </div>

    <!-- 搜索和筛选区 -->
    <div class="filter-section">
      <!-- 搜索框 -->
      <div class="search-wrapper">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          type="search"
          placeholder="搜索字根、提示、编码或分类..."
          class="search-input"
        />
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      <!-- 分类筛选 -->
      <div class="filter-group">
        <label class="filter-label">分类：</label>
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat"
            :class="['category-tab', { active: selectedCategory === cat }]"
            @click="selectedCategory = cat; handleCategoryChange()"
          >
            {{ cat === 'all' ? '全部' : cat }}
          </button>
        </div>
      </div>

      <!-- 编码筛选 -->
      <div class="filter-group">
        <label class="filter-label">编码：</label>
        <select
          v-model="selectedCode"
          @change="handleCodeChange"
          class="filter-select"
        >
          <option value="">全部</option>
          <option v-for="code in codes" :key="code" :value="code">
            {{ code.toUpperCase() }}
          </option>
        </select>
      </div>

      <!-- 排序选项 -->
      <div class="filter-group">
        <label class="filter-label">排序：</label>
        <select
          v-model="sortBy"
          class="filter-select"
        >
          <option value="code">按编码</option>
          <option value="character">按字符</option>
        </select>
      </div>
    </div>

    <!-- 字根网格 -->
    <div class="roots-grid">
      <RootCard
        v-for="root in paginatedRoots"
        :key="`${root.character}-${root.code}-${root.hint}`"
        :root="root"
        @click="handleRootClick"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="totalCount === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      <p class="empty-text">没有找到匹配的字根</p>
      <button class="clear-btn" @click="searchQuery = ''; selectedCategory = 'all'; selectedCode = ''; resetPagination()">
        清除筛选
      </button>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        :disabled="currentPage === 1"
        @click="currentPage--"
        class="page-btn"
      >
        ← 上一页
      </button>
      
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 页
      </span>
      
      <button
        :disabled="currentPage === totalPages"
        @click="currentPage++"
        class="page-btn"
      >
        下一页 →
      </button>
    </div>
  </div>
</template>

<style scoped>
.roots-gallery {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem 2rem;
}

/* 头部 */
.gallery-header {
  margin-bottom: 2rem;
}

.gallery-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gallery-stats {
  font-size: 1rem;
  color: var(--vp-c-text-2);
}

.stat-highlight {
  color: #667eea;
  font-weight: 500;
}

/* 筛选区 */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

/* 搜索框 */
.search-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: rgba(255, 255, 255, 0.95);
  outline: none;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

/* 筛选组 */
.filter-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-tab {
  padding: 0.5rem 1rem;
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-tab:hover {
  border-color: #667eea;
  background: rgba(248, 250, 252, 0.95);
}

.category-tab.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: #667eea;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 筛选下拉框 */
.filter-select {
  padding: 0.5rem 1rem;
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 6px;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  outline: none;
}

/* 字根网格 */
.roots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.125rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.clear-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.clear-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 0;
}

.page-btn {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-2px);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

/* 暗色模式 */
.dark .gallery-title {
  color: #f1f5f9;
}

.dark .filter-section {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .search-input {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .search-input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
  background: rgba(30, 41, 59, 0.8);
}

.dark .category-tab {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.dark .category-tab:hover {
  border-color: #8b5cf6;
  background: rgba(30, 41, 59, 0.8);
}

.dark .category-tab.active {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  border-color: #8b5cf6;
}

.dark .filter-select {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.dark .page-btn {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.dark .page-btn:hover:not(:disabled) {
  border-color: #8b5cf6;
  background: rgba(30, 41, 59, 0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .roots-gallery {
    padding: 1rem;
  }
  
  .gallery-title {
    font-size: 1.5rem;
  }
  
  .filter-section {
    padding: 1rem;
  }
  
  .roots-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 1rem;
  }
  
  .category-tabs {
    gap: 0.25rem;
  }
  
  .category-tab {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .roots-grid {
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 0.75rem;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-label {
    margin-bottom: 0.25rem;
  }
}
</style>
