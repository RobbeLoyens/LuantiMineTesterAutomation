import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
require('dotenv').config();

function randomPassword(length = 12) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

async function demoPause(page, milliseconds = 800) {
  await page.waitForTimeout(milliseconds);
}

async function expectLoginRejected(page, signInButton) {
  await expect(page).toHaveURL(/\/user\/login\/?$/);
  await expect(signInButton).toBeVisible();
}

test.describe.serial('headed sequence', () => {
  test.setTimeout(0);
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    // launch with explicit window size/position to emulate maximizing
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: 'test-results/videos',
        size: { width: 1280, height: 720 }
      }
    });
    page = await context.newPage();
    await page.goto('https://content.luanti.org');   
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

    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await demoPause(page);
    await expect(page).toHaveURL(/\/user\/login\/?$/);
    await expect(page.locator('#username')).toBeVisible();
  });

  test('negative TC - unknown username', async () => {
    const password = process.env.TEST_PASSWORD;
    const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
    await expect(page).toHaveURL(/\/user\/login\/?$/);
    const incorrectUsername = 'RobbeLLLoyens';
    await page.fill('#username', incorrectUsername);
    await demoPause(page);
    await page.fill('#password', password);
    await demoPause(page);
    await signInButton.click();
    await demoPause(page);
    await expectLoginRejected(page, signInButton);
  });

  test('negative TC - password too short', async () => {
    const username = process.env.TEST_USERNAME;
    const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
    await expect(page).toHaveURL(/\/user\/login\/?$/);
    await page.fill('#username', username);
    await demoPause(page);
    await page.fill('#password', 'ab');
    await demoPause(page);
    await signInButton.click();
    await demoPause(page);
    await expectLoginRejected(page, signInButton);
  });

  test('negative TC - incorrect password', async () => {
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;
    const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
    await expect(page).toHaveURL(/\/user\/login\/?$/);
    await page.fill('#username', username);
    await demoPause(page);
    let incorrectPassword = randomPassword();
    while (incorrectPassword === password) {
      incorrectPassword = randomPassword();
    }
    await page.fill('#password', incorrectPassword);
    await demoPause(page);
    await signInButton.click();
    await demoPause(page);
    await expectLoginRejected(page, signInButton);
  });

  test('login with secure password', async () => {
    const password = process.env.TEST_PASSWORD;
    const username = process.env.TEST_USERNAME;
    const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
    await expect(page).toHaveURL(/\/user\/login\/?$/);
    await page.fill('#username', username);
    await demoPause(page);
    await page.fill('#password', password);
    await demoPause(page);
    const rememberMe = page.locator('#remember_me');
    if (await rememberMe.isChecked()) {
      await rememberMe.uncheck();
      await demoPause(page);
    }
    await signInButton.click();
    await demoPause(page);

    const navigationMenu = page.locator('#navbarColor01');
    const profileMenu = page.locator('xpath=//*[@id="navbarColor01"]/ul[2]/li[4]');
    const profileDropdown = profileMenu.locator('[role="button"]');
    const firstName = username.match(/^[A-Z][a-z]*/)?.[0] || username;

    await expect(page.locator('main')).toBeVisible();
    await expect(navigationMenu).toBeVisible();
    await expect(profileDropdown).toBeVisible();
    await expect(profileDropdown).toContainText(firstName);
  });

  test('logout', async () => {
    const profileMenu = page.locator('xpath=//*[@id="navbarColor01"]/ul[2]/li[4]');
    const profileDropdown = profileMenu.locator('[role="button"]');
    await profileDropdown.click();
    await demoPause(page);
    const logoutButton = profileMenu.locator('a[href*="/logout"]');
    await logoutButton.click();
    await demoPause(page);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  })
});
