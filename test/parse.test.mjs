// parse.test.mjs — Tests der reinen Funktionen aus xdsh-costs.user.js.
//
// Die reinen Funktionen stehen im Userscript zwischen den Markern
// "// #region PURE" und "// #endregion PURE" (keine DOM-/GM-Abhängigkeiten).
// Der Test extrahiert genau diesen Block und prüft ihn direkt — so bleibt eine
// einzige Quelle der Wahrheit (das Userscript selbst).
//
// Aufruf: node test/parse.test.mjs
//
// Die Fixtures bilden die von der Platform gelieferte Antwortform ab
// (Belege: CodexBar-Provider-Doku/-Parser für DeepSeek; Zahlen anonymisiert).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(here, '..', 'xdsh-costs.user.js');
const src = fs.readFileSync(scriptPath, 'utf8');

const match = src.match(/\/\/ #region PURE[^\n]*\n([\s\S]*?)\/\/ #endregion PURE/);
if (!match) {
  console.error('FEHLER: PURE-Region im Userscript nicht gefunden.');
  process.exit(2);
}

const PURE = new Function(
  `${match[1]}
   return { num, parseToken, localDayIso, symbolFor, fmtMoney,
            toppedUpFromSummary, dailyCostFromUsage, relTime, classifyFailure };`,
)();

// ---------------------------------------------------------------------------
// Fixtures (Form der echten Antworten)
// ---------------------------------------------------------------------------
const summaryFixture = {
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
};

const costFixtureToday = '2026-09-10';
const costFixture = {
  code: 0,
  msg: 'ok',
  data: {
    biz_code: 0,
    biz_msg: 'ok',
    biz_data: [
      {
        currency: 'USD',
        total: [
          { model: 'deepseek-chat', usage: [{ type: 'PROMPT_CACHE_HIT_TOKEN', amount: '410.25' }] },
        ],
        days: [
          {
            date: '2026-09-09',
            data: [
              {
                model: 'deepseek-chat',
                usage: [
                  { type: 'PROMPT_CACHE_HIT_TOKEN', amount: '0.21' },
                  { type: 'PROMPT_CACHE_MISS_TOKEN', amount: '0.05' },
                  { type: 'RESPONSE_TOKEN', amount: '0.02' },
                  { type: 'REQUEST', amount: '0' },
                ],
              },
            ],
          },
          {
            date: costFixtureToday,
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
};

// ---------------------------------------------------------------------------
// Mini-Testrahmen
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
    console.log(`  FAIL ${name} → ${e.message}`);
  }
}
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label || 'Wert'}: erwartet ${b}, bekommen ${a}`);
}
function close(actual, expected, label) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > 0.000001) {
    throw new Error(`${label || 'Zahl'}: erwartet ${expected}, bekommen ${actual}`);
  }
}

console.log('xDSH Costs — Parser-Tests\n');

check('num: String mit Punkt/ohne Komma', () => {
  close(PURE.num('17.48'), 17.48, 'num("17.48")');
  close(PURE.num('1,234.56'), 1234.56, 'num("1,234.56")');
  close(PURE.num(3), 3, 'num(3)');
  eq(PURE.num(''), null, 'num("")');
  eq(PURE.num('abc'), null, 'num("abc")');
  eq(PURE.num(null), null, 'num(null)');
});

check('parseToken: Roh-String', () => {
  const t = 'eyJhbGciOiJIUzI1NiJ9.abcdefghijklmnopqrstuvwxyz0123456789';
  eq(PURE.parseToken(t), t);
});

check('parseToken: JSON-Wrapper {value}', () => {
  const t = 'eyJhbGciOiJIUzI1NiJ9.abcdefghijklmnopqrstuvwxyz0123456789';
  eq(PURE.parseToken(JSON.stringify({ value: t })), t);
  eq(PURE.parseToken(JSON.stringify(t)), t);
  eq(PURE.parseToken(JSON.stringify({ foo: 'bar' })), null);
  eq(PURE.parseToken('null'), null);
  eq(PURE.parseToken(''), null);
});

check('toppedUpFromSummary: Topped-up = normal_wallets (USD)', () => {
  const w = PURE.toppedUpFromSummary(summaryFixture);
  eq(w.currency, 'USD');
  close(w.toppedUp, 17.48, 'toppedUp');
  close(w.total, 17.48, 'total');
});

check('toppedUpFromSummary: Gratisguthaben zählt zu total, nicht zu toppedUp', () => {
  const w = PURE.toppedUpFromSummary({
    data: { biz_data: { normal_wallets: [{ balance: 10, currency: 'USD' }], bonus_wallets: [{ balance: 2.5, currency: 'USD' }] } },
  });
  close(w.toppedUp, 10, 'toppedUp');
  close(w.granted, 2.5, 'granted');
  close(w.total, 12.5, 'total');
});

check('toppedUpFromSummary: Mehrere Wallets einer Währung werden addiert', () => {
  const w = PURE.toppedUpFromSummary({
    data: { biz_data: { normal_wallets: [{ balance: 10, currency: 'USD' }, { balance: 7.48, currency: 'USD' }] } },
  });
  close(w.toppedUp, 17.48, 'toppedUp');
});

check('toppedUpFromSummary: ohne Wallets → null', () => {
  eq(PURE.toppedUpFromSummary({ data: { biz_data: {} } }), null);
  eq(PURE.toppedUpFromSummary(null), null);
  eq(PURE.toppedUpFromSummary({ code: 40003 }), null);
});

check('dailyCostFromUsage: Tageskosten ohne REQUEST-Typ', () => {
  const c = PURE.dailyCostFromUsage(costFixture, costFixtureToday);
  close(c.cost, 1.45, 'Tageskosten (0.91+0.33+0.21)');
  eq(c.currency, 'USD');
});

check('dailyCostFromUsage: Monatssumme über alle Tage', () => {
  const c = PURE.dailyCostFromUsage(costFixture, costFixtureToday);
  close(c.monthCost, 1.73, 'Monatssumme (0.28 + 1.45)');
  eq(c.dayCount, 2);
});

check('dailyCostFromUsage: Tag ohne Eintrag → cost null, Monat bleibt', () => {
  const c = PURE.dailyCostFromUsage(costFixture, '2026-09-11');
  eq(c.cost, null, 'Tageskosten ohne Eintrag');
  close(c.monthCost, 1.73, 'Monatssumme');
});

check('dailyCostFromUsage: Tage außerhalb des Monats zählen nicht in die Monatssumme', () => {
  const crossMonth = {
    data: {
      biz_data: [
        {
          currency: 'USD',
          days: [
            { date: '2026-08-31', data: [{ model: 'm', usage: [{ type: 'RESPONSE_TOKEN', amount: '5.00' }] }] },
            { date: '2026-09-01', data: [{ model: 'm', usage: [{ type: 'RESPONSE_TOKEN', amount: '0.40' }] }] },
            { date: '2026-09-10', data: [{ model: 'm', usage: [{ type: 'RESPONSE_TOKEN', amount: '1.05' }] }] },
          ],
        },
      ],
    },
  };
  const c = PURE.dailyCostFromUsage(crossMonth, '2026-09-10');
  close(c.cost, 1.05, 'Tageskosten');
  close(c.monthCost, 1.45, 'Monatssumme (nur September)');
  eq(c.monthDays, 2, 'Tage im Monat');
  eq(c.dayCount, 3, 'gelieferte Tage insgesamt');
});

check('dailyCostFromUsage: biz_data als Objekt statt Array wird toleriert', () => {
  const obj = { data: { biz_data: { currency: 'USD', days: [{ date: '2026-09-10', data: [{ model: 'm', usage: [{ type: 'RESPONSE_TOKEN', amount: '1.45' }] }] }] } } };
  const c = PURE.dailyCostFromUsage(obj, '2026-09-10');
  close(c.cost, 1.45, 'Tageskosten');
});

check('fmtMoney/symbolFor', () => {
  eq(PURE.fmtMoney(17.48, 'USD'), '$17.48');
  eq(PURE.fmtMoney(1.5, 'USD'), '$1.50');
  eq(PURE.fmtMoney(12, 'CNY'), '¥12.00');
  eq(PURE.fmtMoney(null, 'USD'), '--');
  eq(PURE.symbolFor('USD'), '$');
  eq(PURE.symbolFor('CNY'), '¥');
});

check('localDayIso: lokaler Tag, nullgepolstert', () => {
  eq(PURE.localDayIso(new Date(2026, 8, 10, 14, 15)), '2026-09-10');
  eq(PURE.localDayIso(new Date(2026, 0, 5, 1, 0)), '2026-01-05');
});

check('relTime', () => {
  const now = Date.parse('2026-09-10T12:00:00Z');
  eq(PURE.relTime('2026-09-10T11:59:50Z', now), 'gerade eben');
  eq(PURE.relTime('2026-09-10T11:57:00Z', now), 'vor 3 Min');
  eq(PURE.relTime('2026-09-10T10:00:00Z', now), 'vor 2 Std');
  eq(PURE.relTime('kaputt', now), 'unbekannt');
});

check('classifyFailure: Auth vs. WAF vs. sonstiges', () => {
  eq(PURE.classifyFailure(401, '').kind, 'auth');
  eq(PURE.classifyFailure(403, '<html>awswaf challenge</html>').kind, 'error');
  eq(PURE.classifyFailure(200, '{"code":40003,"msg":"expired"}').kind, 'auth');
  eq(PURE.classifyFailure(500, '').kind, 'error');
  eq(PURE.classifyFailure(0, '').note, 'Netzwerkfehler');
});

console.log(`\n${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length) {
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
