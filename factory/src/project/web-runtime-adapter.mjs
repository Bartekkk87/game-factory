import { chromium } from 'playwright';
import { serveDir } from '../verify/server.mjs';

export const WEB_RUNTIME_ADAPTER_SCHEMA = 'project-game.runtime-adapter/web-v1';

export function validateWebRuntimeAdapter(contract) {
  if (contract?.schemaVersion !== WEB_RUNTIME_ADAPTER_SCHEMA) throw new Error('web runtime adapter schema invalid');
  for (const field of ['entry', 'rootSelector', 'readySelector', 'visibleSelector']) {
    if (typeof contract[field] !== 'string' || !contract[field].trim()) throw new Error(`web runtime adapter missing ${field}`);
  }
  if (contract.persistenceBridge?.protocol !== 'project-game.persistence-bridge/v1') throw new Error('web runtime persistence bridge protocol invalid');
  if (contract.persistenceBridge?.transport !== 'postMessage') throw new Error('web runtime persistence bridge must use postMessage');
  if (contract.persistenceBridge?.allowSameOrigin !== false) throw new Error('web runtime adapter must forbid allow-same-origin');
  if (!contract.interaction?.selector || contract.interaction?.action !== 'click') throw new Error('web runtime adapter requires a click interaction proof');
  if (!contract.interaction?.assertion?.selector || contract.interaction?.assertion?.type !== 'text-change') {
    throw new Error('web runtime adapter requires a text-change assertion');
  }
  return structuredClone(contract);
}

function runtimeLocator(page, contract, selector) {
  return contract.frameSelector
    ? page.frameLocator(contract.frameSelector).locator(selector)
    : page.locator(selector);
}

export async function runBrowserBootProof({ projectRoot, contract, timeoutMs = 8000 } = {}) {
  const checked = validateWebRuntimeAdapter(contract);
  const { url, close } = await serveDir(projectRoot);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
  const checks = [];
  try {
    const response = await page.goto(`${url}${checked.entry}`, { waitUntil: 'load', timeout: timeoutMs });
    checks.push({ id: 'page-load', pass: !!response && response.status() < 400, detail: `status=${response?.status() ?? 'missing'}` });
    if (checked.frameSelector) {
      const sandbox = await page.locator(checked.frameSelector).getAttribute('sandbox');
      checks.push({
        id: 'opaque-origin',
        pass: sandbox === 'allow-scripts',
        detail: `sandbox=${sandbox ?? 'missing'}`
      });
    }
    const root = runtimeLocator(page, checked, checked.rootSelector);
    const ready = runtimeLocator(page, checked, checked.readySelector);
    const visible = runtimeLocator(page, checked, checked.visibleSelector);
    await ready.waitFor({ state: 'visible', timeout: timeoutMs }).catch(() => {});
    checks.push({ id: 'runtime-ready', pass: await ready.isVisible().catch(() => false), detail: checked.readySelector });
    const rootVisible = await root.isVisible().catch(() => false);
    const box = rootVisible ? await root.boundingBox().catch(() => null) : null;
    checks.push({ id: 'game-root-visible', pass: rootVisible && Number(box?.width) > 1 && Number(box?.height) > 1, detail: box ? `${box.width}x${box.height}` : 'not visible' });
    checks.push({ id: 'game-content-visible', pass: await visible.isVisible().catch(() => false), detail: checked.visibleSelector });

    const assertion = runtimeLocator(page, checked, checked.interaction.assertion.selector);
    const before = await assertion.textContent().catch(() => null);
    await runtimeLocator(page, checked, checked.interaction.selector).click({ timeout: timeoutMs }).catch(() => {});
    await page.waitForTimeout(100);
    const after = await assertion.textContent().catch(() => null);
    checks.push({ id: 'gameplay-interaction', pass: before !== null && after !== null && before !== after, detail: `${before ?? 'missing'} -> ${after ?? 'missing'}` });
    checks.push({ id: 'fatal-browser-errors', pass: consoleErrors.length === 0 && pageErrors.length === 0, detail: [...consoleErrors, ...pageErrors].join(' | ') });
  } catch (error) {
    checks.push({ id: 'browser-proof-execution', pass: false, detail: String(error?.message || error) });
  } finally {
    await browser.close();
    close();
  }
  const failures = checks.filter((check) => !check.pass);
  return Object.freeze({
    schemaVersion: 'project-game.browser-boot-proof/v1',
    pass: failures.length === 0,
    checks,
    failures,
    consoleErrors,
    pageErrors
  });
}
