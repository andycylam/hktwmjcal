import { test, expect } from '@playwright/test';

test('HandRack visual regression', async ({ page }) => {
  // Start from the dev server or open built index.html; assume dev server running on 5173
  await page.goto('http://localhost:5173');
  await page.waitForSelector('text=當前手牌');
  // take screenshot of the hand area
  const el = await page.locator('text=當前手牌').first();
  await expect(el).toHaveScreenshot('handrack.png', { animations: 'disabled' });
});
