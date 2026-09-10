// live-check.mjs — Live-Probe der DeepSeek-Platform-Dashboard-Endpunkte.
//
// Öffnet die Platform im echten Browser (reasonix-Profil) und BLEIBT OFFEN,
// bis das Fenster geschlossen wird (oder --max-minutes abläuft). Sobald ein
// Platform-Login erkannt wird, werden die Dashboard-Endpunkte abgefragt und die
// echten Antworten in eine JSON-Datei geschrieben.
//
// Steuerung über Umgebungsvariablen (CLI-Argumente erreichen Node bei pwsh-Aufrufen
// nicht zuverlässig — deshalb sind ENV-Variablen der verlässliche Weg):
//   DSB_URL            Ziel-URL            (Default https://platform.deepseek.com/usage)
//   DSB_OUT            Ausgabedatei        (Default out/live-probe.json)
//   DSB_MAX_MINUTES    Sicherheitskappe    (Default 45)
//   DSB_PROBE_EVERY_S  Re-Probe-Intervall  (Default 120)
//
// Ausgabe: JSON-Datei; der Token wird nie im Klartext geschrieben (nur Länge/Präfix).
// Kosten:  ausschließlich Lese-Aufrufe der Web-Session (wie ein Seitenaufruf),
//          kein API-Key, keine Abrechnung.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LIB = 'C:\\Users\\lolo\\.dsh\\browser-tools\\lib.mjs';
const { launchBrowser, arg, mark } = await import(pathToFileURL(LIB).href);

const env = process.env;
const url = arg('--url', env.DSB_URL || 'https://platform.deepseek.com/usage');
const outFile = arg('--out', env.DSB_OUT || 'out/live-probe.json');
const maxMinutes = Number(arg('--max-minutes', env.DSB_MAX_MINUTES || '45'));
const probeEverySec = Number(arg('--probe-every', env.DSB_PROBE_EVERY_S || '120'));

mark('LIVE', `args url=${url} out=${outFile} maxMinutes=${maxMinutes} probeEvery=${probeEverySec}`);

// Liest den Token-Rohwert + Diagnoseform (JSON-Schlüssel), ohne ihn preiszugeben.
const READ_TOKEN = `(() => {
  const mask = (s) => s.length <= 16 ? '(kurz)' : s.slice(0, 10) + '…' + s.slice(-4) + ' (len ' + s.length + ')';
  const out = { raw: null, shape: null, keys: [], appKit: null, href: location.href, title: document.title };
  try { out.keys = Object.keys(localStorage); } catch (e) { out.keysError = String(e); }
  try {
    const raw = localStorage.getItem('userToken');
    out.raw = raw;
    if (raw === null) {
      out.shape = 'FEHLT';
    } else {
      const trimmed = String(raw).trim();
      out.shape = 'len=' + trimmed.length + ' head=' + mask(trimmed);
      try {
        const obj = JSON.parse(trimmed);
        if (obj === null) out.shape += ' | JSON=null';
        else if (typeof obj === 'string') out.shape += ' | JSON-String';
        else if (typeof obj === 'object') out.shape += ' | JSON-Objekt keys=' + Object.keys(obj).join(',');
        else out.shape += ' | JSON-' + typeof obj;
      } catch (e) {
        out.shape += ' | kein JSON';
      }
    }
  } catch (e) { out.shape = 'Fehler: ' + String(e); }
  try {
    const ui = localStorage.getItem('__appKit_userInfo');
    if (ui) out.appKit = 'len=' + ui.length + ' head=' + mask(String(ui).trim());
  } catch (e) { /* egal */ }
  return out;
})()`;

const context = await launchBrowser();
const page = context.pages()[0] ?? (await context.newPage());

let lastProbe = 0;
let probes = [];
let closed = false;
context.on('close', () => { closed = true; });

const tokenFrom = (read) => {
  const raw = read && read.raw;
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  let candidate = null;
  try {
    const obj = JSON.parse(trimmed);
    if (typeof obj === 'string') candidate = obj;
    else if (obj && typeof obj === 'object') {
      for (const k of ['value', 'token', 'access_token', 'accessToken', 'userToken']) {
        if (typeof obj[k] === 'string') { candidate = obj[k]; break; }
      }
    }
  } catch (e) {
    candidate = /^["'].*["']$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
  }
  return candidate && candidate.length >= 20 && !/\s/.test(candidate) ? candidate : null;
};

const probe = async (token) => {
  return page.evaluate(async (tk) => {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    const res = { at: now.toISOString(), period: { month, year }, href: location.href, api: {}, dom: {} };
    try {
      const txt = document.body ? document.body.innerText : '';
      const grab = (label) => {
        const nodes = [...document.querySelectorAll('div,span,p,h1,h2,h3')];
        const hit = nodes.find((n) => n.childElementCount === 0 && n.textContent.trim() === label);
        if (!hit) return null;
        let box = hit;
        for (let i = 0; i < 6 && box.parentElement; i++) {
          box = box.parentElement;
          const m = box.innerText.match(/\$\s?[\d,]+\.\d{2}/);
          if (m) return m[0];
        }
        return null;
      };
      res.dom.toppedUpValue = grab('Topped-up balance');
      res.dom.costValue = grab('Cost');
      res.dom.excerpt = txt.slice(0, 1500);
    } catch (e) {
      res.dom.error = String(e);
    }
    const calls = {
      summary: '/api/v0/users/get_user_summary',
      cost: `/api/v0/usage/cost?month=${month}&year=${year}`,
      amount: `/api/v0/usage/amount?month=${month}&year=${year}`,
    };
    // Jeden Endpunkt zweimal abfragen: mit Bearer-Token und OHNE (nur Session-Cookies).
    // Damit ist belegt, welcher Weg die Anfrage authentifiziert.
    for (const [name, u] of Object.entries(calls)) {
      for (const mode of ['bearer', 'cookie']) {
        const headers = { Accept: 'application/json' };
        if (mode === 'bearer') headers.Authorization = 'Bearer ' + tk;
        try {
          const r = await fetch(u, { headers, credentials: 'include' });
          const text = await r.text();
          const key = mode === 'bearer' ? name : name + 'NoAuth';
          res.api[key] = {
            status: r.status,
            len: text.length,
            body: text.length > 120000 ? text.slice(0, 120000) + '…TRUNC' : text,
          };
        } catch (e) {
          const key = mode === 'bearer' ? name : name + 'NoAuth';
          res.api[key] = { error: String(e) };
        }
      }
    }
    return res;
  }, token);
};

try {
  mark('LIVE', `open ${url}`);
  await page
    .goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    .catch(() => page.waitForTimeout(5000));

  const deadline = Date.now() + maxMinutes * 60 * 1000;
  let announced = '';

  while (Date.now() < deadline) {
    if (closed) break;
    let read = null;
    try {
      read = await page.evaluate(READ_TOKEN);
    } catch (e) {
      if (closed) break;
      await page.waitForTimeout(3000);
      continue;
    }

    const token = tokenFrom(read);
    const status = `url=${read.href} title="${read.title}" token=${token ? 'OK' : 'fehlt'} shape=${read.shape}`;
    if (status !== announced) {
      mark('LIVE', status);
      announced = status;
    }

    if (token && Date.now() - lastProbe > probeEverySec * 1000) {
      lastProbe = Date.now();
      try {
        const result = await probe(token);
        probes.push(result);
        fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
        fs.writeFileSync(
          path.resolve(outFile),
          JSON.stringify({ url, probes }, null, 2),
          'utf8',
        );
        const api = Object.entries(result.api)
          .map(([k, v]) => `${k}=${v.status}${v.len !== undefined ? '/' + v.len : ''}`)
          .join(' ');
        mark('LIVE', `PROBE ok ${api} domToppedUp=${result.dom.toppedUpValue} domCost=${result.dom.costValue}`);
        mark('LIVE', `PROBE out=${path.resolve(outFile)}`);
      } catch (e) {
        mark('LIVE', `PROBE error ${e.message}`);
      }
    }

    await page.waitForTimeout(5000);
  }

  mark('LIVE', `ende probes=${probes.length}${closed ? ' (Fenster geschlossen)' : ' (Zeitkappe erreicht)'}`);
} catch (e) {
  console.error(`LIVE:ERROR ${e.message}`);
} finally {
  const keepOpenSec = Number(env.DSB_KEEP_OPEN_S || '0');
  if (!closed && keepOpenSec > 0) {
    mark('LIVE', `Fenster bleibt ${keepOpenSec}s offen — danach schließt es sich.`);
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        if (closed) { clearInterval(timer); resolve(); }
      }, 2000);
      setTimeout(() => { clearInterval(timer); resolve(); }, keepOpenSec * 1000);
    });
  }
  await context.close().catch(() => {});
}
