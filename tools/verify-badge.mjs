// verify-badge.mjs — Verhaltens-Test des Badges in einem echten Chromium.
//
// Startet einen lokalen Testserver, der eine DSH-ähnliche Seite ausliefert
// (setzt window.__DSH_BOOT__), injiziert das lokale Userscript und beantwortet
// die beiden Dashboard-Endpunkte über Playwright-Routing mit Fixtures.
// Geprüft wird der tatsächlich gerenderte Badge-Text in vier Zuständen.
//
// Aufruf: node tools/verify-badge.mjs
// Exit:   0 = alle Fälle grün, 1 = Fehlschlag

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const requireFromTools = createRequire('C:\\Users\\lolo\\.dsh\\browser-tools\\package.json');
const { chromium } = requireFromTools('playwright-core');
const LIB = 'C:\\Users\\lolo\\.dsh\\browser-tools\\lib.mjs';
const { CHROME } = await import(pathToFileURL(LIB).href);

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(here, '..', 'xdsh-costs.user.js');
const PORT = 8799;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TOKEN = 'test-token-abcdefghijklmnopqrstuvwxyz-0123456789';

// --- Fixtures (Tagesdatum dynamisch, damit „heute" immer passt) -------------
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const yesterday = new Date(now.getTime() - 86400000);
const yesterdayIso = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

const summaryBody = JSON.stringify({
  code: 0,
  msg: 'ok',
  data: {
    biz_code: 0,
    biz_msg: 'ok',
    biz_data: {
      normal_wallets: [{ balance: 17.48, currency: 'USD' }],
      bonus_wallets: [{ balance: 0, currency: 'USD' }],
    },
  },
});

const costBody = JSON.stringify({
  code: 0,
  msg: 'ok',
  data: {
    biz_code: 0,
    biz_msg: 'ok',
    biz_data: [
      {
        currency: 'USD',
        total: [],
        days: [
          {
            date: yesterdayIso,
            data: [{ model: 'deepseek-chat', usage: [{ type: 'RESPONSE_TOKEN', amount: '0.28' }] }],
          },
          {
            date: todayIso,
            data: [
              {
                model: 'deepseek-chat',
                usage: [
                  { type: 'PROMPT_CACHE_HIT_TOKEN', amount: '0.91' },
                  { type: 'PROMPT_CACHE_MISS_TOKEN', amount: '0.33' },
                  { type: 'RESPONSE_TOKEN', amount: '0.21' },
                  { type: 'REQUEST', amount: '0' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});

// --- Testserver (DSH-ähnliche Seite) ---------------------------------------
const page_html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>DSH (Test)</title></head>
<body><div id="root"></div>
<script>window.__DSH_BOOT__ = { test: true, injected: new Date().toISOString() };</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page_html);
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

// --- Chromium (Wegwerf-Profil, headless) -----------------------------------
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'xdsb-verify-'));
const context = await chromium.launchPersistentContext(tmp, {
  headless: true,
  executablePath: CHROME,
  viewport: { width: 1280, height: 800 },
  args: ['--no-sandbox'],
});

await context.addInitScript(() => {
  window.__DSH_BOOT__ = { test: true };
});
await context.addInitScript({ path: scriptPath });

// --- Szenarien --------------------------------------------------------------
const scenarios = [
  {
    name: 'happy-path',
    token: TOKEN,
    cookie: true,
    snapshot: null,
    api: { summary: { status: 200, body: summaryBody }, cost: { status: 200, body: costBody } },
    expectText: '💳 $17.48 · heute $1.45',
    expectInTitle: 'Topped-up: $17.48',
    // Cookies werden mitgeschickt (WAF-Schicht), authentifizieren aber nicht —
    // der Bearer-Token muss trotzdem dabei sein.
    expectHeaders: { authorization: 'Bearer ' + TOKEN, cookieHas: 'ds_session' },
  },
  {
    name: 'ohne-token-keine-anfrage',
    token: null,
    cookie: true,
    snapshot: null,
    api: { summary: { status: 200, body: summaryBody }, cost: { status: 200, body: costBody } },
    expectText: '💳 nicht angemeldet',
    expectInTitle: 'Kein DeepSeek-Platform-Token',
    expectNoRequest: true,
  },
  {
    name: 'login-noetig',
    token: TOKEN,
    cookie: false,
    snapshot: null,
    api: {
      summary: { status: 401, body: '{"code":40003,"msg":"expired"}' },
      cost: { status: 401, body: '{"code":40003,"msg":"expired"}' },
    },
    expectText: '💳 Login nötig — platform.deepseek.com',
    expectInTitle: 'Kein gültiger DeepSeek-Platform-Login',
  },
  {
    name: 'letzter-stand-bei-fehler',
    token: TOKEN,
    cookie: false,
    snapshot: {
      at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      day: todayIso,
      source: 'platform',
      currency: 'USD',
      toppedUp: 17.48,
      granted: 0,
      total: 17.48,
      todayCost: 1.45,
      monthCost: 1.73,
    },
    api: { summary: { status: 500, body: 'boom' }, cost: { status: 500, body: 'boom' } },
    expectText: '💳 $17.48 · heute $1.45 ⏳',
    expectInTitle: 'Aktualisierung fehlgeschlagen',
  },
];

const results = [];
for (const sc of scenarios) {
  const page = await context.newPage();
  const seen = [];

  await context.clearCookies();
  if (sc.cookie) {
    await context.addCookies([
      {
        name: 'ds_session',
        value: 'cookie-session-abcdefghijklmnop',
        domain: 'platform.deepseek.com',
        path: '/',
        secure: true,
        sameSite: 'None',
      },
    ]);
  }

  // Routing für die beiden Endpunkte (inkl. CORS-Preflight).
  await page.route('https://platform.deepseek.com/**', async (route) => {
    const req = route.request();
    const origin = req.headers()['origin'] || ORIGIN;
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization, accept, content-type',
      'access-control-allow-methods': 'GET, OPTIONS',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
    seen.push({ url: req.url(), method: req.method(), headers: req.headers() });
    const u = req.url();
    const spec = u.includes('/users/get_user_summary') ? sc.api.summary : sc.api.cost;
    return route.fulfill({
      status: spec.status,
      headers: { ...cors, 'content-type': 'application/json' },
      body: spec.body,
    });
  });

  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([token, snapshot]) => {
      localStorage.clear();
      if (token) localStorage.setItem('xdsb.token', JSON.stringify(token));
      if (snapshot) localStorage.setItem('xdsb.snapshot', JSON.stringify(snapshot));
    },
    [sc.token, sc.snapshot],
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Vor dem Reload hat das Skript schon einmal angefragt (ohne die jetzt gesetzten
  // Werte) — für die Header-Prüfung zählen nur die Anfragen NACH dem Reload.
  seen.length = 0;

  // Auf das gerenderte Ergebnis warten (max. 10 s).
  const deadline = Date.now() + 10000;
  let text = '';
  let title = '';
  for (;;) {
    const el = await page.$('#xdsh-costs-badge [data-role="text"]');
    if (el) {
      text = (await el.textContent()) || '';
      title = (await page.getAttribute('#xdsh-costs-badge', 'title')) || '';
      if (text.trim() && !text.includes('lädt')) break;
    }
    if (Date.now() > deadline) break;
    await page.waitForTimeout(250);
  }

  const dotColor = await page
    .getAttribute('#xdsh-costs-badge [data-role="dot"]', 'style')
    .catch(() => '');

  if (sc.name === 'happy-path') {
    const shotPath = path.join(here, '..', 'out', 'badge-happy-path.png');
    fs.mkdirSync(path.dirname(shotPath), { recursive: true });
    await page.screenshot({ path: shotPath });
    console.log(`VERIFY:shot ${shotPath}`);
  }

  // Zusätzlich prüfen, WAS die Anfrage mitgeschickt hat (Cookie/Token) bzw. dass
  // ohne Token gar keine Anfrage rausgeht.
  let headerOk = true;
  let headerNote = '';
  if (sc.expectNoRequest) {
    const reqs = seen.filter((r) => r.method === 'GET');
    if (reqs.length) {
      headerOk = false;
      headerNote = `${reqs.length} Anfrage(n) ohne Token gesendet`;
    } else {
      headerNote = 'keine Anfrage gesendet';
    }
  }
  if (sc.expectHeaders) {
    const summaryReq = seen.find((r) => r.method === 'GET' && r.url.includes('get_user_summary'));
    if (!summaryReq) {
      headerOk = false;
      headerNote = 'keine Summary-Anfrage angekommen';
    } else {
      const auth = summaryReq.headers['authorization'] || null;
      if (sc.expectHeaders.authorization !== undefined && auth !== sc.expectHeaders.authorization) {
        headerOk = false;
        headerNote = `authorization=${auth === null ? 'fehlt' : 'vorhanden'}`;
      }
      const cookie = String(summaryReq.headers['cookie'] || '');
      if (sc.expectHeaders.cookieHas && !cookie.includes(sc.expectHeaders.cookieHas)) {
        headerOk = false;
        headerNote = `Cookie "${sc.expectHeaders.cookieHas}" fehlt (gesehen: ${cookie || 'keins'})`;
      }
    }
  }

  const ok = text.trim() === sc.expectText && title.includes(sc.expectInTitle) && headerOk;
  results.push({ name: sc.name, ok, text: text.trim(), title });
  console.log(
    `VERIFY:${ok ? 'ok  ' : 'FAIL'} ${sc.name} → text="${text.trim()}" dot=${(dotColor || '-').slice(0, 60)} headers=${headerOk ? 'ok' : headerNote}`,
  );
  if (!ok) {
    console.log(`VERIFY:     erwartet text="${sc.expectText}" + title~"${sc.expectInTitle}"`);
    console.log(`VERIFY:     bekommen title="${title.replace(/\n/g, ' | ')}"`);
  }
  await page.close();
}

await context.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`VERIFY:${failed.length ? 'FEHLGESCHLAGEN' : 'OK'} ${results.length - failed.length}/${results.length} Fälle grün`);
process.exit(failed.length ? 1 : 0);
