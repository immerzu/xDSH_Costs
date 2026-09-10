// tm-import-diagnose.mjs — Diagnose des Tampermonkey-Imports.
//
// Der Standard-Import (browser-tools\tm-import.mjs) bricht nach dem Klick auf
// „Installieren" mit "Target page, context or browser has been closed" ab und
// bestätigt nichts. Dieses Werkzeug dokumentiert den Bestätigungs-Tab VOR dem Klick
// (Text, Buttons, Screenshot), klickt dann und prüft anschließend das Dashboard.
//
// Aufruf: node tools/tm-import-diagnose.mjs --file <pfad>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIB = 'C:\\Users\\lolo\\.dsh\\browser-tools\\lib.mjs';
const { launchBrowser, arg, mark, TM_EXTENSION_ID } = await import(pathToFileURL(LIB).href);

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptFile = path.resolve(arg('file', path.join(here, '..', '!Ausgabe', 'xdsh-costs-v2.0.0.user.js')));
mark('DIAG', `file=${scriptFile} ext=${TM_EXTENSION_ID}`);

const context = await launchBrowser();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pageUrls = () => context.pages().map((p) => p.url()).join(' | ');

try {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${TM_EXTENSION_ID}/options.html#nav=utilities`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  mark('DIAG', `utilities="${(await page.title()).trim()}" inputs=${await page.locator('input[type="file"]').count()}`);

  const [ask] = await Promise.all([
    context.waitForEvent('page', { timeout: 20000 }).catch(() => null),
    page.locator('input[type="file"]').first().setInputFiles(scriptFile),
  ]);
  if (!ask) {
    mark('DIAG', 'NO_ASK_PAGE');
    process.exit(4);
  }

  await ask.waitForLoadState('domcontentloaded').catch(() => {});
  await ask.waitForTimeout(2000);
  mark('DIAG', `ask url=${ask.url()}`);
  mark('DIAG', `ask title="${(await ask.title().catch(() => '?')).trim()}"`);

  const body = await ask.evaluate(() => document.body.innerText).catch((e) => `(nicht lesbar: ${e.message})`);
  mark('DIAG', `ask body="${body.replace(/\s+/g, ' ').slice(0, 400)}"`);

  const buttons = await ask
    .evaluate(() =>
      [...document.querySelectorAll('button, a, input[type=button], input[type=submit]')]
        .map((b) => `${b.tagName}#${b.id || '-'}.${(b.className || '-').toString().slice(0, 24)}="${(b.textContent || b.value || '').trim().slice(0, 30)}"`)
        .slice(0, 25),
    )
    .catch(() => []);
  mark('DIAG', `buttons=${buttons.join(' , ')}`);

  const shot = path.join(here, '..', 'out', 'tm-ask.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await ask.screenshot({ path: shot }).catch(() => {});
  mark('DIAG', `shot=${shot}`);

  const btn = ask.getByRole('button', { name: /Update|Aktualisieren|Installieren|Install/i }).first();
  const btnCount = await btn.count().catch(() => -1);
  mark('DIAG', `install-button count=${btnCount}`);

  await btn.click({ timeout: 15000 }).catch((e) => mark('DIAG', `click-Fehler: ${e.message}`));
  mark('DIAG', 'geklickt');

  for (let i = 0; i < 8; i++) {
    await sleep(600);
    mark('DIAG', `t+${((i + 1) * 0.6).toFixed(1)}s pages=${pageUrls()}`);
  }

  // Ergebnis unabhängig prüfen: Dashboard in neuem Tab.
  let dash;
  try {
    dash = await context.newPage();
    await dash.goto(`chrome-extension://${TM_EXTENSION_ID}/options.html#nav=installed`, { waitUntil: 'domcontentloaded' });
    await dash.waitForTimeout(4000);
    const txt = await dash.evaluate(() => document.body.innerText);
    const treffer = /xDSH Costs/i.test(txt);
    mark('DIAG', `INSTALLIERT=${treffer ? 'JA' : 'NEIN'}`);
    const line = txt.split('\n').find((l) => /xDSH Costs/i.test(l)) || '';
    if (line) mark('DIAG', `zeile="${line.trim()}"`);
    const versionLine = txt.split('\n').filter((l) => /xDSH Costs|2\.0\.0/i.test(l)).join(' | ').slice(0, 200);
    mark('DIAG', `versionsumfeld="${versionLine}"`);
  } catch (e) {
    mark('DIAG', `dashboard-Fehler: ${e.message}`);
  }

  mark('DIAG', 'fertig');
} catch (e) {
  mark('DIAG', `FEHLER ${e.message}`);
  process.exitCode = 4;
} finally {
  await sleep(500);
  await context.close().catch(() => {});
}
