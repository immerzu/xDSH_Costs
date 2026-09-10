// live-parse.mjs — prüft die Parser gegen die ECHTEN Antworten aus out/live-probe.json.
//
// Nutzt exakt die reinen Funktionen des Userscripts (PURE-Region) und zeigt, was das
// Badge mit den echten Daten anzeigen würde — inkl. Abgleich mit den DOM-Werten der
// Platform-Seite, die live-check.mjs mitgeschnitten hat.
//
// Aufruf: node tools/live-parse.mjs [--file out/live-probe.json]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const fileArg = args.indexOf('--file');
const probeFile = path.resolve(fileArg !== -1 && args[fileArg + 1] ? args[fileArg + 1] : path.join(here, '..', 'out', 'live-probe.json'));

const scriptPath = path.join(here, '..', 'xdsh-costs.user.js');
const src = fs.readFileSync(scriptPath, 'utf8');
const match = src.match(/\/\/ #region PURE[^\n]*\n([\s\S]*?)\/\/ #endregion PURE/);
if (!match) {
  console.error('FEHLER: PURE-Region nicht gefunden.');
  process.exit(2);
}
const PURE = new Function(
  `${match[1]}
   return { toppedUpFromSummary, dailyCostFromUsage, fmtMoney, localDayIso };`,
)();

if (!fs.existsSync(probeFile)) {
  console.error(`FEHLER: ${probeFile} fehlt — erst "node tools/live-check.mjs" laufen lassen.`);
  process.exit(2);
}
const probeData = JSON.parse(fs.readFileSync(probeFile, 'utf8'));
const probes = probeData.probes || [];
if (!probes.length) {
  console.error('FEHLER: keine Probe in der Datei (kein Login erkannt).');
  process.exit(2);
}
const last = probes[probes.length - 1];

const parseBody = (entry) => {
  if (!entry || typeof entry.body !== 'string') return null;
  try {
    return JSON.parse(entry.body);
  } catch (e) {
    return null;
  }
};

console.log(`Probe vom ${last.at} — ${probes.length} Probe(n) in ${path.basename(probeFile)}\n`);

let failures = 0;
const status = (name, entry) => {
  const s = entry && entry.status;
  const ok = s === 200;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: HTTP ${s}${entry && entry.len ? `, ${entry.len} Bytes` : ''}`);
  return ok;
};

console.log('Endpunkte:');
status('get_user_summary', last.api.summary);
status('usage/cost', last.api.cost);
status('usage/amount', last.api.amount);

const day = PURE.localDayIso(new Date(last.at));
const wallet = PURE.toppedUpFromSummary(parseBody(last.api.summary));
const cost = PURE.dailyCostFromUsage(parseBody(last.api.cost), day);

console.log(`\nAuswertung (Tag ${day}):`);
if (!wallet) {
  failures += 1;
  console.log('  FAIL Topped-up konnte nicht gelesen werden');
} else {
  console.log(`  ok   Topped-up : ${PURE.fmtMoney(wallet.toppedUp, wallet.currency)}  (Gratis ${PURE.fmtMoney(wallet.granted, wallet.currency)}, gesamt ${PURE.fmtMoney(wallet.total, wallet.currency)})`);
}
if (!cost) {
  failures += 1;
  console.log('  FAIL Kosten konnten nicht gelesen werden');
} else {
  const todayTxt = cost.cost === null ? 'kein Eintrag für heute' : PURE.fmtMoney(cost.cost, cost.currency);
  console.log(`  ok   Kosten heute : ${todayTxt}`);
  console.log(`  ok   Kosten Monat : ${cost.monthCost === null ? '--' : PURE.fmtMoney(cost.monthCost, cost.currency)}  (${cost.dayCount} Tage geliefert)`);
}

console.log('\nAbgleich mit der Platform-Seite (DOM, im Browser mitgeschnitten):');
console.log(`  DOM „Topped-up balance" : ${last.dom.toppedUpValue ?? '(nicht gefunden)'}`);
console.log(`  DOM „Cost"-Kachel       : ${last.dom.costValue ?? '(nicht gefunden)'}   ← hängt am gewählten Zeitfilter`);

const domToppedUp = last.dom.toppedUpValue ? Number(String(last.dom.toppedUpValue).replace(/[^0-9.]/g, '')) : null;
if (wallet && domToppedUp !== null && Number.isFinite(domToppedUp)) {
  const diff = Math.abs(wallet.toppedUp - domToppedUp);
  const ok = diff < 0.02;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} API-Topped-up vs. DOM: ${wallet.toppedUp} vs. ${domToppedUp} (Differenz ${diff.toFixed(2)})`);
}

if (wallet && cost) {
  console.log(`\nBadge-Anzeige mit echten Daten:  💳 ${PURE.fmtMoney(wallet.toppedUp, wallet.currency)} · heute ${cost.cost === null ? '--' : PURE.fmtMoney(cost.cost, cost.currency)}`);
}

console.log(`\n${failures ? failures + ' Problem(e)' : 'alles grün'}`);
process.exit(failures ? 1 : 0);
