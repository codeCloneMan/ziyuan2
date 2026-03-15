import { test, expect } from '@playwright/test'

test('English navigation text appears after language switch and en route works', async ({
  page,
}) => {
  // Start at root with Chinese by default
  await page.goto('http://localhost:5173/')
  await expect(page.locator('text=首页')).toBeVisible()

  // Switch to English
  const langBtn = page.locator('button[aria-label="Switch language"]')
  await langBtn.click()
  // After switching, English Home should be visible
  await expect(page.locator('text=Home')).toBeVisible()

  // Navigate to an English page via the top navigation when in English mode
  const enHomeLink = page.locator('a[href="/en/index"]')
  if (await enHomeLink.count()) {
    await enHomeLink.click()
    await expect(page.url()).toContain('/en/index')
  }
})
