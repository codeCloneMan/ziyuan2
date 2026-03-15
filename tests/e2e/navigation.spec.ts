import { test, expect } from '@playwright/test';

test('TopBar basic navigation and language toggle', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  // TopBar should be visible
  await expect(page.locator('header.topbar')).toBeVisible();
  // Open mobile menu if present
  const menuBtn = page.locator('button[aria-label="Toggle menu"]');
  if (await menuBtn.count()) {
    await menuBtn.click();
    await expect(page.locator('nav.mobile-menu')).toBeVisible();
  }
  // Language toggle
  const langBtn = page.locator('button[aria-label="Switch language"]');
  if (await langBtn.count()) {
    await langBtn.click();
    // After toggling, try to find a Chinese or English text
    await expect(page.locator('text=/首页|Home/')).toBeVisible();
  }
  // Fashion theme toggle
  const fashionBtn = page.locator('button[aria-label="Toggle fashion style"]');
  if (await fashionBtn.count()) {
    await fashionBtn.click();
    // background test: class on body should exist
    const body = await page.evaluate(() => document.body.classList.contains('theme-fashion'));
    expect(body).toBeTruthy();
  }
});
