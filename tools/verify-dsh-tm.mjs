// verify-dsh-tm.mjs — Integrationstest im Profil MIT Tampermonkey.
//
// Anders als verify-badge.mjs (Wegwerf-Profil, gemockte API) prüft dieser Lauf die
// echte Kette: Tampermonkey injiziert das installierte Userscript auf einer
// DSH-ähnlichen Seite (window.__DSH_BOOT__), das Skript nutzt die echten GM_*-APIs
// und stellt eine ECHTE Anfrage an platform.deepseek.com.
//
// Erwartung: mit einem absichtlich ungültigen Token antwortet die API mit einem
// Login-/Auth-Fehler — das Badge muss also "Login nötig" zeigen. Damit ist bewiesen,
// dass Injektion, GM_xmlhttpRequest und die Fehlerklassifikation real funktionieren.
//
// Aufruf: node tools/verify-dsh-tm.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIB = 'C:\\Users\\lolo\\.dsh\\browser-tools\\lib.mjs';
const { launchBrowser, mark } = await import(pathToFileURL(LIB).href);

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8799;
const FAKE_TOKEN = 'ungueltiger-testtoken-0123456789-abcdefghij';

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>DSH (Test)</title></head>
<body><div id="root"></div>
<script>
  window.__DSH_BOOT__ = { test: true };
  // Absichtlich ungültiger Token: die echte API muss ihn ablehnen.
  localStorage.setItem('userToken', JSON.stringify({ value: '${FAKE_TOKEN}', __version: '0' }));
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const context = await launchBrowser();
try {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });

  let text = '';
  let title = '';
  const deadline = Date.now() + 45000; // echte Netzwerkanfrage + evtl. WAF
  for (;;) {
    const el = await page.$('#xdsh-costs-badge [data-role="text"]').catch(() => null);
    if (el) {
      text = ((await el.textContent()) || '').trim();
      title = (await page.getAttribute('#xdsh-costs-badge', 'title').catch(() => '')) || '';
      if (text && !text.includes('lädt')) break;
    }
    if (Date.now() > deadline) break;
    await page.waitForTimeout(500);
  }

  const injected = !!(await page.$('#xdsh-costs-badge'));
  const shot = path.join(here, '..', 'out', 'badge-tm-real.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot }).catch(() => {});

  // Konsole des Skripts mitlesen (DEBUG ist aus, Fehler wären aber sichtbar).
  const ok = injected && text.length > 0 && /Login nötig|nicht angemeldet/.test(text);
  mark('TM-TEST', `injiziert=${injected} text="${text}"`);
  mark('TM-TEST', `title="${title.replace(/\n/g, ' | ')}"`);
  mark('TM-TEST', `shot=${shot}`);
  mark('TM-TEST', ok ? 'OK — Injektion + echte API-Anfrage + Fehlerklassifikation funktionieren' : 'FEHLGESCHLAGEN');
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  mark('TM-TEST', `FEHLER ${e.message}`);
  process.exitCode = 4;
} finally {
  await context.close().catch(() => {});
  server.close();
}
