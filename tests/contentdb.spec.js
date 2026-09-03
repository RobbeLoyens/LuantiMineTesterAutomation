import { test, expect } from '@playwright/test';
import constants from 'node:constants';
import { chromium } from 'playwright';
require('dotenv').config();

const homeUrl = 'https://content.luanti.org/';
const packagesUrl = 'https://content.luanti.org/packages/?type=mod';

function packageCards(page) {
  return page.locator('a.packagetile');
}

async function showMetadataSuccess(page, field, value) {
  const notificationId = `metadata-success-${field.toLowerCase()}`;
  await page.evaluate(({ notificationId, field, value }) => {
    const notification = document.createElement('div');
    const notificationCount = document.querySelectorAll('[id^="metadata-success-"]').length;
    notification.id = notificationId;
    notification.textContent = `${field} check passed: ${value}`;
    notification.style.cssText = [
      'position: fixed',
      `top: ${16 + notificationCount * 58}px`,
      'right: 16px',
      'z-index: 9999',
      'margin-bottom: 8px',
      'padding: 16px 24px',
      'color: white',
      'background: #198754',
      'font-size: 18px',
      'font-weight: bold',
      'border-radius: 4px'
    ].join(';');
    document.body.appendChild(notification);
  }, { notificationId, field, value });
  await expect(page.locator(`#${notificationId}`)).toBeVisible();
  await page.waitForTimeout(2000);
}

test.describe.serial('ContentDB package browsing', () => {
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
    await page.goto(homeUrl);   
    // try to resize the window from the page to fill the screen (simulates clicking maximize)
   
  });

  test('login with secure password', async () => {
      const password = process.env.TEST_PASSWORD;
      const username = process.env.TEST_USERNAME;
      const goToSignInButton = page.locator('#navbarColor01 > ul.navbar-nav.ms-auto > li:nth-child(1) > a');
      const signInButton = page.locator("body > main > form > input.btn.btn-lg.btn-primary.d-block.w-100");
      await goToSignInButton.click();
      await page.fill('#username', username);
      await page.waitForTimeout(1000);
      await page.waitForTimeout(1000);     
      await expect(signInButton).toBeVisible();  
      await page.fill('#password', password);
      await page.waitForTimeout(1000);
      const rememberMe = page.locator('#remember_me');
      if (await rememberMe.isChecked()) {
        await rememberMe.uncheck();
        await page.waitForTimeout(1000);
      }
      await signInButton.click();
      await page.waitForTimeout(1000);
  
      const navigationMenu = page.locator('#navbarColor01');
      const profileMenu = page.locator('xpath=//*[@id="navbarColor01"]/ul[2]/li[4]');
      const profileDropdown = profileMenu.locator('[role="button"]');
      const firstName = username.match(/^[A-Z][a-z]*/)?.[0] || username;
  
      await expect(page.locator('main')).toBeVisible();
      await expect(navigationMenu).toBeVisible();
      await expect(profileDropdown).toBeVisible();
      await expect(profileDropdown).toContainText(firstName);
    });

  test('search returns the requested package', async () => {
    const searchBox = page.getByPlaceholder('Search all packages');
    await searchBox.fill('mesecons');
    await page.waitForTimeout(1000);
    await searchBox.press('Enter');

    await expect(page).toHaveURL(/\/packages\/\?/);
    await expect(page.getByRole('link', { name: /Mesecons/i }).first()).toBeVisible();
    await page.waitForTimeout(1000);
  });

  test('filter by server tools updates package results', async () => {
    await expect(page.getByText('Filter by tags', { exact: true })).toBeVisible();
    const before = await packageCards(page).count();

    await page.getByRole('link', { name: /Server Moderation and Tools/ }).click();

    await expect(page).toHaveURL(/tag=server_tools/);
    await page.waitForTimeout(1000);

    const afterServerTools = await packageCards(page).count();
    expect(afterServerTools).not.toBe(before);
  });

  test('adding a second tag narrows the list further', async () => {
    const beforeWorldTools = await packageCards(page).count();

    await page.getByRole('link', { name: /World Maintenance and Tools/ }).click();

    await expect(page).toHaveURL(/tag=world_tools&tag=server_tools/);
    await expect.poll(() => packageCards(page).count()).not.toBe(beforeWorldTools);
    await page.waitForTimeout(1000);

    const afterWorldTools = await packageCards(page).count();
    expect(afterWorldTools).not.toBe(beforeWorldTools);
  });

  test('switching tags changes the active filter', async () => {
    const beforeSwitch = await packageCards(page).count();

    await page.getByRole('link', { name: /World Maintenance and Tools/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: /Server Moderation and Tools/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: /Building Mechanics and Tools/ }).click();

    await expect(page).toHaveURL(/tag=building_mechanics/);
    await page.waitForTimeout(1000);

    const afterBuildingMechanicsAndTools = await packageCards(page).count();
    expect(afterBuildingMechanicsAndTools).not.toBe(beforeSwitch);
  });

  test('clicking result loads a different page', async () => {       
    const firstPageName = await page.getByRole('heading', { name: 'Filter By Tags' })
    await page.getByRole('link', { name: 'Circuits Sheriff-Unit-3' }).click();
    await expect(page).toHaveURL(/circuits/);
    await page.waitForTimeout(1000);
    const secondPageName = await page.getByRole('heading', { name: 'Circuits' }).innerText();
    expect(secondPageName).not.toBe(firstPageName);

    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    }));
    console.log('Final package metadata:', metadata);

    expect(metadata.title).toContain('Circuits');
    expect(metadata.description).not.toBe('');

    const packageTitle = await page.getByRole('heading', { name: 'Circuits', exact: true }).innerText();
    const authorLink = page.locator('main a[href^="/users/"]').first();
    const author = await authorLink.innerText();
    const licenseText = await page.locator('main').getByText(/License/i).first().innerText();
    const releaseLinks = page.locator('main a[href*="/releases/"]');
    const latestRelease = await releaseLinks.last().innerText();

    console.log('Final package details:', {
      title: packageTitle,
      author,
      license: licenseText,
      version: latestRelease
    });

    expect(packageTitle).toBe('Circuits');
    await showMetadataSuccess(page, 'Title', packageTitle);
    expect(author).not.toBe('');
    await showMetadataSuccess(page, 'Author', author);
    expect(licenseText).toMatch(/License/i);
    await showMetadataSuccess(page, 'License', licenseText);
    expect(latestRelease).toMatch(/\S/);
    await showMetadataSuccess(page, 'Version', latestRelease);
  });

  test('click carrousel next one time', async () => {
    const sel = '#galleryCarousel > div > button.carousel-control-next';
    const btn = page.locator(sel).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 1; i++) {
      await btn.click();
      await page.waitForTimeout(3000);
    }
  });

  test('click carrousel prev 2 times', async () => {
    const sel = '#galleryCarousel > div > button.carousel-control-prev';
    const btn = page.locator(sel).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 2; i++) {
      await btn.click();
      await page.waitForTimeout(3000);
    }
  });

  test('downloading package is possible', async () => {
    const downloadButton = page.getByRole('link', { name: 'Download' }).first();
    await expect(downloadButton).toBeVisible();
    const downloadUrl = await downloadButton.getAttribute('href');
    expect(downloadUrl).toMatch(/packages\/Sheriff-Unit-3\/circuits\/releases\/\d+\/download\//);

    //await downloadButton.evaluate((element) => element.removeAttribute('target'));
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    await download.path();

    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);

    await page.evaluate((filename) => {
      const confirmation = document.createElement('div');
      confirmation.id = 'download-confirmation';
      confirmation.textContent = `Download completed: ${filename}`;
      confirmation.style.cssText = [
        'position: fixed',
        'top: 16px',
        'right: 16px',
        'z-index: 9999',
        'padding: 16px 24px',
        'color: white',
        'background: #198754',
        'font-size: 18px',
        'font-weight: bold',
        'border-radius: 4px'
      ].join(';');
      document.body.appendChild(confirmation);
    }, download.suggestedFilename());

    await expect(page.locator('#download-confirmation')).toBeVisible();
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });
});
