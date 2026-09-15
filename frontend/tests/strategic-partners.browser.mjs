// Run with RUNTIME_NODE_MODULES set to the bundled dependencies and Vite running.
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/strategic-partners') ? { items: [
    { id: 'one', name: 'Parceiro de teste', partnershipType: 'operation', publicDescription: 'Contribuição cultural. '.repeat(25), destinationUrl: 'https://example.com' },
    { id: 'two', name: 'Instituição teste', partnershipType: 'institutional', logoUrl: 'data:image/png;base64,broken', destinationUrl: 'javascript:alert(1)' }
  ] } : { items: [] } }));
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/parceiros');
  const toggle = page.locator('.partner-tile-toggle').first();
  await toggle.waitFor();
  assert.equal(await page.locator('.strategic-partners-principles').count(), 0);
  assert.equal(await page.locator('.partner-tile-action').first().evaluate(el => getComputedStyle(el).color), 'rgb(219, 227, 237)');
  assert.equal(await page.locator('.partner-group').count(), 2);
  await toggle.focus();
  await page.keyboard.press('Enter');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  await page.getByRole('link', { name: /Visitar parceiro/ }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/parceiros');
  await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.click();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: 'Conheça a parceria com Instituição teste', exact: true }).click();
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(process.env.TEMP, '77gira-partners-mobile.png'), fullPage: true });
  console.log('PASS: grouping, keyboard, reveal, return, safe external link and mobile overflow');
} finally { await browser.close(); }
