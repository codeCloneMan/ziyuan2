import { test, expect } from '@playwright/test'

test('TopBar 搜索框可输入并跳转到匹配页面', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  const searchInput = page.locator('input[aria-label="顶部搜索"]')
  await expect(searchInput).toBeVisible()
  await searchInput.fill('字根')
  const firstResult = page.locator('[data-testid="topbar-search-result"]').first()
  await expect(firstResult).toBeVisible()
  await firstResult.click()
  await expect(page.url()).toContain('/roots/index')
})

test('TopBar 全局搜索可命中文档正文关键字', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  const searchInput = page.locator('input[aria-label="顶部搜索"]')
  await expect(searchInput).toBeVisible()
  await searchInput.fill('学习建议')
  const rootPageResult = page.locator('[data-testid="topbar-search-result"][href="/roots/index"]')
  await expect(rootPageResult).toBeVisible()
  await rootPageResult.click()
  await expect(page.url()).toContain('/roots/index')
})
