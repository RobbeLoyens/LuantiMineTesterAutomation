import { test, expect } from '@playwright/test';
import constants from 'node:constants';
import { chromium } from 'playwright';
require('dotenv').config();

const homeUrl = 'https://content.luanti.org/';
const packagesUrl = 'https://content.luanti.org/packages/?type=mod';

function packageCards(page) {
  return page.locator('a.packagetile');
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

  test('search returns the requested package', async () => {
    const searchBox = page.getByPlaceholder('Search all packages');
    await searchBox.fill('mesecons');
    await searchBox.press('Enter');

    await expect(page).toHaveURL(/\/packages\/\?/);
    await expect(page.getByRole('link', { name: /Mesecons/i }).first()).toBeVisible();
  });

  test('tags filtering updates results', async () => {        
    await expect(page.getByText('Filter by tags', { exact: true })).toBeVisible();
    const before = await packageCards(page).first().innerText();
    await page.getByRole('link', { name: /Building Mechanics and Tools/ }).click();
    await expect(page).toHaveURL(/tag=building_mechanics/);
    const after = await packageCards(page).first().innerText();

    expect(after).not.toBe(before);
  });

  test('clicking result loads a different page', async () => {       
    const firstPageName = await page.getByRole('heading', { name: 'Filter By Tags' })
    await page.getByRole('link', { name: 'Circuits Sheriff-Unit-3' }).click();
    await expect(page).toHaveURL(/circuits/);
    const secondPageName = await page.getByRole('heading', { name: 'Circuits' }).innerText();
    expect(secondPageName).not.toBe(firstPageName);
  });
  
  test('downloading package is possible', async () => {
    const downloadButton = page.getByRole('link', { name: 'Download' }).first();
    await expect(downloadButton).toBeVisible();
    const downloadUrl = await downloadButton.getAttribute('href');
    expect(downloadUrl).toMatch(/packages\/Sheriff-Unit-3\/circuits\/releases\/37925\/download\//);

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
