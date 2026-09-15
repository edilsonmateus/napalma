// Run with RUNTIME_NODE_MODULES pointing to the bundled dependencies and local Vite running.
// All API traffic is intercepted; this test never creates real houses.
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let posts = 0;
let fail = false;
let lead = { id: "mock-lead", venueName: "Casa de teste", status: "mapped", temperature: "warm", address: "Rua Teste", neighborhood: "Centro", region: "Centro", city: "São Paulo" };
await page.route("**/api/**", async (route) => {
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
  if (route.request().url().includes("convert-to-venue")) {
    posts++;
    assert.equal(route.request().postDataJSON().state, "SP");
    await new Promise(resolve => setTimeout(resolve, 200));
    if (!fail) lead = { ...lead, convertedVenueId: "mock-venue" };
    return route.fulfill({ status: fail ? 422 : 201, headers: { "Access-Control-Allow-Origin": "*" }, json: fail ? { message: "Complete endereço na oportunidade." } : { item: { id: "mock-venue", name: "Casa de teste" } } });
  }
  if (route.request().method() === "PATCH") {
    lead = { ...lead, ...route.request().postDataJSON() };
    return route.fulfill({ json: { item: lead }, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  if (route.request().url().includes("/acquisition/leads")) return route.fulfill({ json: { items: route.request().url().includes("timeline") ? [] : [lead], summary: {} }, headers: { "Access-Control-Allow-Origin": "*" } });
  return route.fulfill({ json: {}, headers: { "Access-Control-Allow-Origin": "*" } });
});
await page.route("**/__conversion_test", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
const React = (await import('/node_modules/.vite/deps/react.js')).default;
const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
const dialogSource=await (await fetch('/src/components/common/AcquisitionConversionDialog.jsx')).text();
const hookSource=await (await fetch('/src/hooks/useEventsQuery.js')).text();
const routerUrl=dialogSource.match(/"([^" ]*react-router-dom.js[^" ]*)"/)[1];
const queryUrl=hookSource.match(/"([^" ]*@tanstack_react-query.js[^" ]*)"/)[1];
const {MemoryRouter}=await import(routerUrl);
const {QueryClient,QueryClientProvider}=await import(queryUrl);
const {default: Dialog}=await import('/src/components/common/AcquisitionConversionDialog.jsx');
await import('/src/styles/globals.css');
const {default: Admin}=window.location.hash === '#admin' ? await import('/src/pages/admin/AcquisitionAdminPanel.jsx') : {default:null};
function App(){ const [open,setOpen]=React.useState(false); return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setOpen(true)},'Abrir teste'),open && React.createElement(Dialog,{lead:{id:'mock-lead',venueName:'Casa de teste',status:'closed',address:'Rua Teste',neighborhood:'Centro',region:'Centro',city:'São Paulo'},onClose:()=>setOpen(false)})); }
createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(MemoryRouter,null,React.createElement(Admin || App))));
</script></body></html>` }));
try {
  await page.goto("http://127.0.0.1:5173/__conversion_test");
  await page.getByRole("button", { name: "Abrir teste" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.getByRole("button", { name: "Abrir teste" }).evaluate(el => el === document.activeElement), true);
  await page.getByRole("button", { name: "Abrir teste" }).click();
  await page.getByRole("button", { name: "Confirmar criação da casa" }).evaluate(el => { el.click(); el.click(); });
  await page.getByRole("heading", { name: "Casa interna criada" }).waitFor();
  assert.equal(posts, 1);
  assert.equal(await page.getByRole("link", { name: "Abrir ficha da casa" }).getAttribute("href"), "/settings/venues/mock-venue");
  await page.getByRole("button", { name: "Concluir" }).click();
  fail = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir teste" }).click();
  await page.getByLabel("Descrição inicial (opcional)").fill("Descrição preservada");
  await page.getByRole("button", { name: "Confirmar criação da casa" }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.getByLabel("Descrição inicial (opcional)").inputValue(), "Descrição preservada");
  assert.equal(await page.getByRole("button", { name: "Confirmar criação da casa" }).isEnabled(), true);
  const bounds = await page.getByRole("dialog").boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await page.screenshot({ path: path.join(process.env.TEMP, "77gira-conversion-mobile.png") });
  fail = false;
  lead = { ...lead, status: "mapped", convertedVenueId: null };
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:5173/__conversion_test#admin");
  await page.reload();
  await page.locator(".acquisition-action-edit").click();
  await page.locator(".acquisition-form select[name=status]").selectOption("closed");
  await page.getByRole("button", { name: "Salvar oportunidade" }).click();
  await page.getByRole("button", { name: "Criar casa interna", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar criação da casa" }).click();
  await page.getByRole("heading", { name: "Casa interna criada" }).waitFor();
  await page.getByRole("button", { name: "Concluir" }).click();
  await page.getByRole("link", { name: "Abrir ficha da casa" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Criar casa interna", exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS: cancel, focus restoration, single submission, success link, error recovery, mobile fit, save closed and convert from the actual acquisition panel.");
} catch (error) { console.error("Browser errors:", errors); throw error; } finally { await browser.close(); }
