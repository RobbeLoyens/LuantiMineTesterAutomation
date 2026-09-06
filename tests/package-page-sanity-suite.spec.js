import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
require('dotenv').config();

const packageUrl = 'https://content.luanti.org/packages/Luanti/minetest_game/';

test.describe.serial('ContentDB package page sanity suite', () => {
  test.setTimeout(0);

  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
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
  });

  test('Page Load Sanity', async () => {
    const response = await page.goto(packageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/\/packages\/Luanti\/minetest_game\/?$/);

    await expect(page.locator('main')).toBeVisible();

    const title = await page.locator('h1').first().innerText();
    expect(title).toBeTruthy();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('Author Metadata Sanity', async () => {
    const authorLink = page.locator('main a[href^="/users/"]').first();
    await expect(authorLink).toBeVisible();

    const authorName = (await authorLink.innerText()).trim();
    expect(authorName).toBeTruthy();

    const authorHref = await authorLink.getAttribute('href');
    expect(authorHref).toBeTruthy();

    await authorLink.click();
    await expect(page).toHaveURL(/\/users\//);

    const packageLinks = page.locator('a[href*="/packages/"]');
    const packageCount = await packageLinks.count();
    expect(packageCount).toBeGreaterThan(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/packages\/Luanti\/minetest_game\/?$/);
  });

  test('License & Version Sanity', async () => {
    const licenseField = page.locator('main').getByText(/License/i).first();
    await expect(licenseField).toBeVisible();
    const licenseText = (await licenseField.innerText()).trim();
    expect(licenseText).toBeTruthy();

    const versionField = page.locator('main').getByText(/Version|Release|Last updated/i).first();
    await expect(versionField).toBeVisible();
    const versionText = (await versionField.innerText()).trim();
    expect(versionText).toBeTruthy();

    const versionHistory = page.locator('main').getByText(/Version history|Releases/i).first();
    if (await versionHistory.isVisible()) {
      await versionHistory.scrollIntoViewIfNeeded();
    }

    const versionRows = page.locator('main a[href*="/releases/"]');
    const versionCount = await versionRows.count();
    expect(versionCount).toBeGreaterThan(0);

    const firstVersionText = (await versionRows.first().innerText()).trim();
    expect(firstVersionText).toBeTruthy();
  });

  test('Tags & Category Sanity', async () => {
    const tagLinks = page.locator('main a[href*="/packages/?tag="]');
    const tagCount = await tagLinks.count();
    expect(tagCount).toBeGreaterThan(0);

    const firstTag = tagLinks.first();
    await expect(firstTag).toBeVisible();

    const firstTagText = (await firstTag.innerText()).trim();
    expect(firstTagText).toBeTruthy();

    await firstTag.click();
    await expect(page).toHaveURL(/tag=/);

    const resultCards = page.locator('a.packagetile');
    const resultCount = await resultCards.count();
    expect(resultCount).toBeGreaterThan(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/packages\/Luanti\/minetest_game\/?$/);
  });

  test('Screenshot Carousel Sanity', async () => {
    const carousel = page.locator('#galleryCarousel').first();
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toBeVisible();

    const nextButton = page.locator('#galleryCarousel > div > button.carousel-control-next').first();
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 3; i++) {
      await nextButton.click();
      await page.waitForTimeout(3000);
    }

    const prevButton = page.locator('#galleryCarousel > div > button.carousel-control-prev').first();
    await expect(prevButton).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 5; i++) {
      await prevButton.click();
      await page.waitForTimeout(3000);
    }
  });

  test('Related Packages Sanity', async () => {
    const relatedHeading = page.getByRole('heading', { name: /Related Packages/i }).first();
    const relatedExists = (await relatedHeading.count()) > 0;

    if (!relatedExists) {
      const fallbackLinks = page.locator('main a[href*="/packages/"]').filter({ hasNotText: /Download|Website|Source|Forums|Issue Tracker/ });
      await expect(fallbackLinks.first()).toBeVisible();
      return;
    }

    await relatedHeading.scrollIntoViewIfNeeded();
    await expect(relatedHeading).toBeVisible();

    const relatedLinks = page.locator('main a[href*="/packages/"]').filter({ hasNotText: /Download|Website|Source|Forums|Issue Tracker/ });
    const relatedCount = await relatedLinks.count();
    expect(relatedCount).toBeGreaterThan(0);

    const firstRelated = relatedLinks.first();
    await expect(firstRelated).toBeVisible();

    const relatedHref = await firstRelated.getAttribute('href');
    expect(relatedHref).toBeTruthy();

    await firstRelated.click();
    await expect(page).toHaveURL(/\/packages\//);

    await page.goBack();
    await expect(page).toHaveURL(/\/packages\/Luanti\/minetest_game\/?$/);
  });

  test('Download Button Sanity', async () => {
    const downloadButton = page.getByRole('link', { name: /Download/i }).first();
    await expect(downloadButton).toBeVisible();

    const downloadHref = await downloadButton.getAttribute('href');
    expect(downloadHref).toBeTruthy();
    expect(downloadHref.trim().length).toBeGreaterThan(0);

    const response = await page.request.get(`https://content.luanti.org${downloadHref}`);
    expect(response.status()).toBe(200);
  });

  test('OpenGraph Metadata Sanity', async () => {
    const ogTitle = await page.locator('meta[name="og:title"], meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[name="og:description"], meta[property="og:description"]').getAttribute('content');
    const ogImage = await page.locator('meta[name="og:image"], meta[property="og:image"]').getAttribute('content');

    expect(ogTitle).toBeTruthy();
    expect(ogImage).toBeTruthy();

    expect((ogTitle || '').trim().length).toBeGreaterThan(0);
    expect((ogImage || '').trim().length).toBeGreaterThan(0);

    if (ogDescription !== null) {
      expect(ogDescription.trim().length).toBeGreaterThan(0);
    }
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });
});
