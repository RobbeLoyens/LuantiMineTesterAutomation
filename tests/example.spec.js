import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

test('open Luanti in headed browser', async () => {
  const url = 'https://content.luanti.org/packages/Luanti';
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: 'load' });
  const opened = response && response.status() < 400;
  expect(opened).toBeTruthy();
  // find and click the button with title "Minitest game"
  await browser.close();
});