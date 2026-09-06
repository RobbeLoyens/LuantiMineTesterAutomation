import { test, expect } from '@playwright/test';
require('dotenv').config();

const baseUrl = 'https://content.luanti.org';
const loginUrl = `${baseUrl}/user/login/`;

async function login(page) {
  await page.goto(loginUrl);
  await page.fill('#username', process.env.TEST_USERNAME);
  await page.fill('#password', process.env.TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('#navbarColor01')).toBeVisible();
  const protectedLink = page.locator('a[href*="/todo/"]').first();
  await expect(protectedLink).toBeVisible();
  return new URL(await protectedLink.getAttribute('href'), baseUrl).toString();
}

test.describe.serial('session resilience and navigation', () => {
  test('dashboard loads and critical navigation works after login', async ({ page }) => {
    await login(page);

    await expect(page.locator('main')).toBeVisible();
    const packagesLink = page.getByRole('link', { name: 'Mods', exact: true });
    await expect(packagesLink).toBeVisible();
    await packagesLink.click();
    await expect(page).toHaveURL(/\/packages\//);
  });

  test('dashboard survives a refresh after login', async ({ page }) => {
    await login(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
  });

  test('expired session redirects to login', async ({ page, context }) => {
    const dashboardUrl = await login(page);

    await context.clearCookies();
    await page.goto(dashboardUrl);
    await expect(page).toHaveURL(/\/user\/login\//);
    await expect(page.locator('#username')).toBeVisible();
  });

  test('protected page redirects unauthenticated users to login', async ({ page }) => {
    const dashboardUrl = await login(page);
    await page.context().clearCookies();
    await page.goto(dashboardUrl);

    await expect(page).toHaveURL(/\/user\/login\//);
    await expect(page.locator('#username')).toBeVisible();
  });

  test('core CSS and JavaScript assets load', async ({ page }) => {
    const assetFailures = [];
    page.on('response', response => {
      const resourceType = response.request().resourceType();
      if (['stylesheet', 'script'].includes(resourceType) && response.status() >= 400) {
        assetFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(loginUrl, { waitUntil: 'networkidle' });
    expect(assetFailures).toEqual([]);
  });

  test('package API heartbeat responds successfully after login', async ({ page }) => {
    await login(page);

    const response = await page.request.get(`${baseUrl}/api/packages/?type=mod`);
    expect(response.status()).toBeLessThan(400);
  });

  test('login and logout redirects are sane', async ({ page }) => {
    await login(page);

    const profileMenu = page.locator('xpath=//*[@id="navbarColor01"]/ul[2]/li[4]');
    await profileMenu.locator('[role="button"]').click();
    await profileMenu.locator('a[href*="/logout"]').click();

    await expect(page).toHaveURL(/https:\/\/content\.luanti\.org\/?$/);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  });
});
