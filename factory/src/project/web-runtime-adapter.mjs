import { chromium } from 'playwright';
import { serveDir } from '../verify/server.mjs';
import { sha256 } from './contracts.mjs';
import { comparePersistedState } from './persistence-contract.mjs';

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

async function persistenceFrame(page, selector, timeoutMs) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'attached', timeout: timeoutMs });
  const handle = await locator.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  if (!frame) throw new Error('persistence proof iframe unavailable');
  await frame.waitForLoadState('load', { timeout: timeoutMs });
  return frame;
}

async function browserPersistenceRequest(frame, request, timeoutMs) {
  return frame.evaluate(({ request: candidate, timeout }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error(`persistence bridge response timeout for ${candidate.requestId}`));
    }, timeout);
    const onMessage = (event) => {
      if (event.source !== window.parent) return;
      const response = event.data;
      if (response?.protocol !== candidate.protocol || response?.type !== 'response') return;
      if (response?.requestId !== candidate.requestId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(response);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage(candidate, '*');
  }), { request, timeout: timeoutMs });
}

function validateBrowserPersistenceInputs(runtimeContract, persistenceContract, slot, state) {
  const runtime = validateWebRuntimeAdapter(runtimeContract);
  if (!runtime.frameSelector) throw new Error('browser persistence proof requires frameSelector');
  if (persistenceContract?.schemaVersion !== 'project-game.persistence/v1') throw new Error('browser persistence contract invalid');
  if (persistenceContract.bridge?.protocol !== runtime.persistenceBridge.protocol) {
    throw new Error('browser persistence protocol mismatch');
  }
  if (persistenceContract.bridge?.transport !== 'postMessage') throw new Error('browser persistence transport invalid');
  if (persistenceContract.bridge?.childOrigin !== 'opaque') throw new Error('browser persistence child origin must be opaque');
  if (persistenceContract.bridge?.hostAuthority !== true) throw new Error('browser persistence host authority missing');
  if (persistenceContract.bridge?.allowSameOrigin !== false) throw new Error('browser persistence must forbid allow-same-origin');
  if (!Number.isInteger(slot) || slot < 0 || slot >= persistenceContract.slots) throw new Error('browser persistence slot invalid');
  const serialized = JSON.stringify({ schemaVersion: persistenceContract.saveSchemaVersion, state });
  if (Buffer.byteLength(serialized) > persistenceContract.maxBytes) throw new Error('browser persistence state exceeds size limit');
  return runtime;
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

export async function runBrowserPersistenceProof({
  projectRoot,
  contract,
  persistenceContract,
  projectId,
  slot = 0,
  state,
  timeoutMs = 8000
} = {}) {
  const checked = validateBrowserPersistenceInputs(contract, persistenceContract, slot, state);
  const { url, close } = await serveDir(projectRoot);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const checks = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
  let actual = null;
  try {
    const response = await page.goto(`${url}${checked.entry}`, { waitUntil: 'load', timeout: timeoutMs });
    checks.push({ id: 'persistence-page-load', pass: !!response && response.status() < 400, detail: `status=${response?.status() ?? 'missing'}` });
    const sandbox = await page.locator(checked.frameSelector).getAttribute('sandbox');
    checks.push({ id: 'persistence-opaque-origin', pass: sandbox === 'allow-scripts', detail: `sandbox=${sandbox ?? 'missing'}` });

    let frame = await persistenceFrame(page, checked.frameSelector, timeoutMs);
    const saveResponse = await browserPersistenceRequest(frame, {
      protocol: persistenceContract.bridge.protocol,
      type: 'save',
      requestId: 'browser-proof-save',
      projectId,
      slot,
      schemaVersion: persistenceContract.saveSchemaVersion,
      state
    }, timeoutMs);
    checks.push({
      id: 'persistence-save',
      pass: saveResponse?.ok === true && saveResponse?.operation === 'save' && saveResponse?.slot === slot,
      detail: JSON.stringify(saveResponse)
    });

    await page.reload({ waitUntil: 'load', timeout: timeoutMs });
    frame = await persistenceFrame(page, checked.frameSelector, timeoutMs);
    const loadResponse = await browserPersistenceRequest(frame, {
      protocol: persistenceContract.bridge.protocol,
      type: 'load',
      requestId: 'browser-proof-load',
      projectId,
      slot,
      schemaVersion: persistenceContract.saveSchemaVersion
    }, timeoutMs);
    actual = loadResponse?.state ?? null;
    checks.push({
      id: 'persistence-load-after-reload',
      pass: loadResponse?.ok === true && loadResponse?.found === true && loadResponse?.operation === 'load',
      detail: JSON.stringify({ ok: loadResponse?.ok, found: loadResponse?.found, operation: loadResponse?.operation })
    });

    const comparison = comparePersistedState(persistenceContract, state, actual);
    checks.push({
      id: 'persistence-equivalence',
      pass: comparison.pass,
      detail: JSON.stringify(comparison.differences)
    });
    checks.push({
      id: 'persistence-fatal-browser-errors',
      pass: consoleErrors.length === 0 && pageErrors.length === 0,
      detail: [...consoleErrors, ...pageErrors].join(' | ')
    });
  } catch (error) {
    checks.push({ id: 'browser-persistence-proof-execution', pass: false, detail: String(error?.message || error) });
  } finally {
    await browser.close();
    close();
  }

  const failures = checks.filter((check) => !check.pass);
  return Object.freeze({
    schemaVersion: 'project-game.browser-persistence-proof/v1',
    projectId,
    saveSchemaVersion: persistenceContract.saveSchemaVersion,
    slot,
    pass: failures.length === 0,
    checks,
    failures,
    expectedStateSha256: sha256(JSON.stringify(state)),
    actualStateSha256: sha256(JSON.stringify(actual)),
    consoleErrors,
    pageErrors
  });
}
