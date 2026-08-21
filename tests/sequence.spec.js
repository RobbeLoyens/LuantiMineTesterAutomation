import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
require('dotenv').config();

test.describe.serial('headed sequence', () => {
  test.setTimeout(0);
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    // launch with explicit window size/position to emulate maximizing
    browser = await chromium.launch({ headless: false, args: ['--start-maximized', '--window-size=1920,1080', '--window-position=0,0'] });
    context = await browser.newContext({ viewport: null });
    page = await context.newPage();
    // try to resize the window from the page to fill the screen (simulates clicking maximize)
   
  });

  // Keep the browser open in a final test so we can wait without hook timeouts

  test('open Luanti package page', async () => {
    const url = 'https://content.luanti.org/packages/Luanti';
    const response = await page.goto(url, { waitUntil: 'load' });
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/Luanti/);
    // try toggling browser fullscreen (F11) so the window becomes fullscreen
    try {
      await page.keyboard.press('F11');
      await page.waitForTimeout(500);
    } catch (e) {
      // ignore if the keypress isn't supported in this environment
    }
  });

  test('login with secure password', async ({ page }) => {
    const password = process.env.TEST_PASSWORD;
    const username = process.env.TEST_USERNAME;
    const goToSignInButton = page.locator('#navbarColor01 > ul.navbar-nav.ms-auto > li:nth-child(1) > a');
    const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
    await page.click(goToSignInButton);
    await page.fill('#password', password);
    await page.fill('#username', username);
    await page.click(signInButton );

    await expect(page.locator('.dashboard')).toBeVisible();
  });

  test('click Minitest game button', async () => {
    const selectors = [
      'a.packagetile:has-text("Minetest Game")',
      'a[href*="minetest_game"]',
      '[title="Minetest Game"]',
      'text="Minetest Game"',
      'button:has-text("Minetest Game")',
      'a:has-text("Minetest Game")',
      '[aria-label="Minetest Game"]'
    ];
    let clicked = false;
    for (const sel of selectors) {
      const loc = page.locator(sel);
      if (await loc.count() > 0) {
        await loc.first().scrollIntoViewIfNeeded();
        await expect(loc.first()).toBeVisible({ timeout: 5000 });
        await loc.first().click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      const fs = require('fs');
      const dumpPath = 'tests/page-dump.html';
      fs.writeFileSync(dumpPath, await page.content(), 'utf8');
      throw new Error(`Minitest game button not found — page content written to ${dumpPath}`);
    }
  });
 

  test('click gallery next three times', async () => {
    const sel = '#galleryCarousel > div > button.carousel-control-next';
    const btn = page.locator(sel).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 3; i++) {
      await btn.click();
      await page.waitForTimeout(3000);
    }
  });

  test('click gallery prev four times', async () => {
    const sel = '#galleryCarousel > div > button.carousel-control-prev';
    const btn = page.locator(sel).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 5; i++) {
      await btn.click();
      await page.waitForTimeout(3000);
    }
  });

  test('verify Dependencies section', async () => {
    const informationTab = page.locator('#tab-info');
    await expect(informationTab).toBeVisible();
    await informationTab.click();

    const informationPanel = page.locator('#information');
    await expect(informationPanel).toBeVisible();
    await expect(informationPanel).toContainText('Dependencies');
    await expect(informationPanel).toContainText('No required dependencies');
  });
 
  test('close browser automatically', async () => {
    await browser.close();
  });

});
