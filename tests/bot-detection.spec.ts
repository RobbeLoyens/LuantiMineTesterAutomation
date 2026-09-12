import { test, expect } from '@playwright/test';
import { BotDetectionError, handleBotDetection } from './helpers/bot-detection';

test('fails clearly when a CAPTCHA challenge is present', async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Verify you are not a robot</h1>
      <iframe src="https://example.test/captcha"></iframe>
    </main>
  `);

  await expect(handleBotDetection(page)).rejects.toBeInstanceOf(BotDetectionError);
});

test('allows ordinary pages through', async ({ page }) => {
  await page.setContent('<main><h1>ContentDB package</h1></main>');

  await expect(handleBotDetection(page)).resolves.toBeUndefined();
});