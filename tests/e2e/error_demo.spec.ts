import { test, expect } from '@playwright/test'

// This test is intentionally skipped by default. Set RUN_ERROR_EXAMPLE=1 to run and see a failing scenario.
test.skip(process.env.RUN_ERROR_EXAMPLE !== '1', 'Error demo enabled: this test will fail on purpose for demonstration')
test('deliberate failure demonstration', async () => {
  expect(true).toBe(false)
})
