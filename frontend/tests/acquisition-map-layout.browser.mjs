// Isolated real map component with fictional leads; no account or API writes.
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.route('**/api/**', route => route.abort());
  await page.route('**/*.png', route => route.abort());
  await page.route('**/__map-layout-test', route => route.fulfill({ contentType: 'text/html', body: `
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0"><div id="root" style="max-width:700px;margin:auto;padding:12px"></div>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = await import('/node_modules/.vite/deps/react-dom_client.js');
      const createRoot = ReactDOM.createRoot || ReactDOM.default.createRoot;
      const { TerritoryMap } = await import('/src/pages/admin/AcquisitionAdminPanel.jsx');
      await import('/src/styles/globals.css');
      const root = createRoot(document.getElementById('root'));
      window.renderMap = (overrides = {}) => root.render(React.createElement(TerritoryMap, {
        leads: [{ id: 'test', venueName: 'Casa de teste', latitude: -23.55, longitude: -46.63,
          address: 'Rua Exemplo', addressNumber: '145', neighborhood: 'Centro', region: 'Centro',
          city: 'São Paulo', status: 'mapped', temperature: 'cold', ...overrides }],
        onEdit: lead => { window.editedLead = lead.id; }
      }));
      window.renderMap();
    </script></body></html>` }));
  await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:5174'}/__map-layout-test`);
  const marker = page.locator('.territory-circle-marker');
  await marker.waitFor();
  for (const width of [1100, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
    const size = await page.locator('.territory-map').boundingBox();
    assert(Math.abs(size.width - size.height) < 1, `Map must be square at ${width}`);
    await marker.hover();
    await page.locator('.territory-popup-card').waitFor();
    const popup = await page.locator('.territory-popup-card').boundingBox();
    assert(popup.width <= 242);
    assert(popup.height < 170, `Compact standard card: ${popup.height}`);
    assert.equal(await page.locator('.territory-popup-card p').first().evaluate(el => getComputedStyle(el).marginTop), '0px');
    await page.mouse.move(1, 1);
    await page.locator('.territory-popup-card').waitFor({ state: 'hidden' });
    await marker.click();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(400);
    assert(await page.locator('.territory-popup-card').isVisible(), 'Click must pin preview');
    await page.getByRole('button', { name: 'Casa de teste', exact: true }).click();
    assert.equal(await page.evaluate(() => window.editedLead), 'test');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.evaluate(() => window.renderMap({ venueName: 'Uma casa com nome especialmente longo para verificar quebra de linha', address: '', addressNumber: '', neighborhood: '' }));
  await marker.hover();
  await page.locator('.territory-popup-card').waitFor();
  assert.equal(await page.locator('.territory-popup-location p').count(), 1, 'Do not repeat fallback location');
  await page.screenshot({ path: path.join(process.env.TEMP, '77gira-map-compact.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: square desktop/mobile map, compact card, hover/pin/edit, long names and unique location');
} finally { await browser.close(); }
