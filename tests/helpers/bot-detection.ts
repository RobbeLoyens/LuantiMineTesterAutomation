import type { Page } from '@playwright/test';

const BOT_DETECTION_TEXT = /are you human|verify you(?:'re| are) not a robot|captcha|human verification|security check/i;

export class BotDetectionError extends Error {
  constructor(url: string) {
    super(`Bot-detection challenge detected at ${url}`);
    this.name = 'BotDetectionError';
  }
}

async function hasBotDetectionSignal(page: Page): Promise<boolean> {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (BOT_DETECTION_TEXT.test(bodyText)) {
    return true;
  }

  const challengeElements = page.locator([
    'iframe[src*="captcha" i]',
    'iframe[src*="challenge" i]',
    '[id*="captcha" i]',
    '[class*="captcha" i]',
    '[id*="challenge" i]',
    '[class*="challenge" i]',
    'button',
    'h1',
    'h2',
    'h3',
  ].join(', '));

  const elementCount = await challengeElements.count();
  for (let index = 0; index < elementCount; index++) {
    const element = challengeElements.nth(index);
    const text = await element.innerText().catch(() => '');
    const attributes = await element.evaluate((node) => [
      node.getAttribute('id'),
      node.getAttribute('class'),
      node.getAttribute('src'),
      node.getAttribute('title'),
      node.getAttribute('aria-label'),
    ].filter(Boolean).join(' '));

    if (BOT_DETECTION_TEXT.test(`${text} ${attributes}`)) {
      return true;
    }
  }

  return false;
}

export async function handleBotDetection(page: Page): Promise<void> {
  if (!(await hasBotDetectionSignal(page))) {
    return;
  }

  console.warn('Bot-detection challenge detected');
  throw new BotDetectionError(page.url());
}