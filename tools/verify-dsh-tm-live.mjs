// verify-dsh-tm-live.mjs — End-to-End-Test mit ECHTEM Konto über Tampermonkey.
//
// Ablauf:
//   1. platform.deepseek.com/usage im Profil öffnen  → die Platform-Rolle des
//      Userscripts holt den Login-Token in den GM-Speicher und pusht einen Snapshot.
//   2. Eine DSH-ähnliche lokale Seite öffnen          → die DSH-Rolle liest den Token
//      aus dem GM-Speicher, fragt die echte API über GM_xmlhttpRequest ab und rendert.
//
// Erwartung: ein grünes Badge mit echten Zahlen (Format "💳 $x.xx · heute $y.yy").
//
// Aufruf: node tools/verify-dsh-tm-live.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIB = 'C:\\Users\\lolo\\.dsh\\browser-tools\\lib.mjs';
const { launchBrowser, mark } = await import(pathToFileURL(LIB).href);

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8799;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>DSH (Test)</title></head>
<body><div id="root"></div>
<script>window.__DSH_BOOT__ = { test: true };</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const context = await launchBrowser();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // ---- Phase 1: Token auf der Platform-Seite einsammeln -------------------
  const platform = await context.newPage();
  await platform.goto('https://platform.deepseek.com/usage', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  await sleep(12000);
  const platformTitle = await platform.title().catch(() => '?');
  const platformHref = platform.url();
  mark('LIVE-TEST', `phase1 title="${platformTitle}" url=${platformHref}`);

  // ---- Phase 2: DSH-ähnliche Seite, Badge muss echte Zahlen zeigen --------
  const dsh = await context.newPage();
  await dsh.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });

  let text = '';
  let title = '';
  let dot = '';
  const deadline = Date.now() + 40000;
  for (;;) {
    const el = await dsh.$('#xdsh-costs-badge [data-role="text"]').catch(() => null);
    if (el) {
      text = ((await el.textContent()) || '').trim();
      title = (await dsh.getAttribute('#xdsh-costs-badge', 'title').catch(() => '')) || '';
      dot = (await dsh.getAttribute('#xdsh-costs-badge [data-role="dot"]', 'style').catch(() => '')) || '';
      if (/^\S+ \$\d/.test(text)) break;
    }
    if (Date.now() > deadline) break;
    await sleep(500);
  }

  const shot = path.join(here, '..', 'out', 'badge-tm-live.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await dsh.screenshot({ path: shot }).catch(() => {});

  const gruen = dot.includes('61, 220, 132');
  const formatOk = /^💳 \$\d+\.\d{2} · heute \$\d+\.\d{2}$/.test(text);
  const ok = formatOk && gruen;
  mark('LIVE-TEST', `badge="${text}" gruen=${gruen}`);
  mark('LIVE-TEST', `title="${title.replace(/\n/g, ' | ')}"`);
  mark('LIVE-TEST', `shot=${shot}`);
  mark('LIVE-TEST', ok ? 'OK — End-to-End mit echtem Konto über Tampermonkey' : 'FEHLGESCHLAGEN');
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  mark('LIVE-TEST', `FEHLER ${e.message}`);
  process.exitCode = 4;
} finally {
  await context.close().catch(() => {});
  server.close();
}
