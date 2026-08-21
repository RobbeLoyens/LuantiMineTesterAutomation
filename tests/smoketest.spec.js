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
    await page.waitForTimeout(1000);
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/Luanti/);
    // try toggling browser fullscreen (F11) so the window becomes fullscreen
    try {
      await page.keyboard.press('F11');
      await page.waitForTimeout(500);
      await page.waitForTimeout(1000);
    } catch (e) {
      // ignore if the keypress isn't supported in this environment
    }
  });

  test('login with secure password', async () => {
    const password = process.env.TEST_PASSWORD;
    const username = process.env.TEST_USERNAME;
    const goToSignInButton = page.locator('#navbarColor01 > ul.navbar-nav.ms-auto > li:nth-child(1) > a');
    const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
    await goToSignInButton.click();
    await page.waitForTimeout(1000);
    await page.fill('#password', password);
    await page.waitForTimeout(1000);
    await page.fill('#username', username);
    await page.waitForTimeout(1000);
    await page.locator('#remember_me').uncheck();
    await page.waitForTimeout(1000);
    await signInButton.click();
    await page.waitForTimeout(1000);

    const profileMenu = page.locator('xpath=//*[@id="navbarColor01"]/ul[2]/li[4]');
    const profileDropdown = profileMenu.locator('[role="button"]');
    await expect(profileDropdown).toBeVisible();
  });

  test('logout', async () => {
    const profileMenu = page.locator('xpath=//*[@id="navbarColor01"]/ul[2]/li[4]');
    const profileDropdown = profileMenu.locator('[role="button"]');
    await profileDropdown.click();
    await page.waitForTimeout(1000);
    const logoutButton = profileMenu.locator('a[href*="/logout"]');
    await logoutButton.click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  })
});
