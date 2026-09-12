import { test, expect } from '@playwright/test';
import { closeDatabase, getExpectedMetadata } from '../db';
import { handleBotDetection } from './helpers/bot-detection';

const author = 'Wuzzy';
const packageName = 'mineclone2';
const packageUrl = `https://content.luanti.org/packages/${author}/${packageName}/`;

test.afterAll(async () => {
  await closeDatabase();
});

test('ContentDB metadata matches PostgreSQL', async ({ page }) => {
  // Read the expected values before opening the page.
  const expected = await getExpectedMetadata(packageName);

  // Open the package page and wait for the rendered content.
  const response = await page.goto(packageUrl, { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response?.status()).toBe(200);
  await handleBotDetection(page);

  // Count the package screenshots displayed in the ContentDB gallery.
  const screenshotItems = page.locator('#galleryCarousel .carousel-item a[href^="/uploads/"]');
  await expect(screenshotItems).toHaveCount(expected.screenshots);
  const screenshotCount = await screenshotItems.count();
  expect(screenshotCount).toBe(expected.screenshots);

  // Extract the latest release version displayed by the release UI.
  const version = await page.locator('[data-release-name]').last().getAttribute('data-release-name');
  expect(version).toBe(expected.latest_version);

  // Count only required dependencies; optional dependencies are in a separate <dd>.
  const requiredDependencies = page
    .getByRole('heading', { name: 'Dependencies', exact: true })
    .locator('xpath=following-sibling::dl[1]')
    .locator('dd')
    .first()
    .locator('a[href^="/modnames/"]');
  const dependencyCount = await requiredDependencies.count();
  expect(dependencyCount).toBe(expected.dependencies);
});