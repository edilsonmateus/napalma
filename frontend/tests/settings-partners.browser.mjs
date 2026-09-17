// Local UI checks with simulated API responses; no production writes.
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('77gira.has_seen_onboarding', 'true'));
  await page.route('**/api/**', route => route.fulfill({ json: { items: [] } }));
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5174/settings');
  const invitation = page.getByRole('link', { name: 'Conhecer nossos parceiros' });
  await invitation.waitFor();
  async function checkAlignment() {
    const edges = await page.locator('.settings-screen > .page-header, .settings-screen > .settings-profile, .settings-screen > .settings-content-stack, .settings-screen > .settings-partners-invitation, .settings-screen > .settings-institutional-footer').evaluateAll(elements => elements.map(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })));
    for (const edge of edges) {
      assert(Math.abs(edge.left - edges[0].left) < 1);
      assert(Math.abs(edge.right - edges[0].right) < 1);
    }
  }
  await checkAlignment();
  assert.equal(await page.locator('a[href="/parceiros"]').count(), 1);
  for (const selector of ['.settings-profile', '.settings-share-actions']) {
    assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
  }
  await page.getByRole('button', { name: 'QR Code Pro Amigo', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await checkAlignment();
  await invitation.scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(process.env.TEMP, '77gira-settings-partners.png'), fullPage: true });
  await invitation.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/parceiros');
  console.log('PASS: borders removed, unique CTA, QR preserved, mobile layout and keyboard navigation');
} finally { await browser.close(); }
