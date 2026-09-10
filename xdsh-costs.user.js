// ==UserScript==
// @name         xDSH Costs (DSH)
// @namespace    https://github.com/immerzu
// @version      2.0.0
// @description  Zeigt Topped-up-Balance und Tageskosten des DeepSeek-API-Kontos als schwebendes Badge im DSH-Web-GUI.
// @description:en  Shows the topped-up balance and today's cost of the DeepSeek API account as a floating badge in the DSH web GUI.
// @author       immerzu
// @match        https://platform.deepseek.com/*
// @match        http://127.0.0.1/*
// @match        http://localhost/*
// @match        https://127.0.0.1/*
// @match        https://localhost/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deepseek.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      platform.deepseek.com
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==

/*
 * xDSH Costs (DSH)
 * -----------------------------
 * Zwei Rollen in einem Skript (über @match gesteuert):
 *
 *  1. platform.deepseek.com  →  liest den Login-Token (`userToken` aus localStorage),
 *     holt Kontostand + Tageskosten über die Dashboard-Endpunkte der Web-Session
 *     und legt das Ergebnis im Skript-Speicher ab.
 *     Bewusst KEIN DOM-Auslesen der Seite: die Kachel „Cost" hängt am gewählten
 *     Zeitfilter (Today/Month) und würde als Tageswert falsch beschriftet.
 *
 *  2. DSH-Web-GUI (127.0.0.1|localhost, erkannt an window.__DSH_BOOT__)  →  holt
 *     dieselben Werte selbst nach und zeigt sie als schwebendes Badge unten rechts.
 *
 * Kein API-Key, keine Modell-Aufrufe: es werden ausschließlich die Lese-Endpunkte
 * benutzt, die die Platform-Seite selbst aufruft — das kostet keine Tokens.
 *
 * Endpunkte (privat, können sich ändern):
 *   GET /api/v0/users/get_user_summary          → normal_wallets = Topped-up
 *   GET /api/v0/usage/cost?month=M&year=YYYY    → Tages-/Monatskosten
 *
 * Authentifizierung: **Authorization: Bearer <userToken>** — der Token steckt im
 * Browser-Login (localStorage von platform.deepseek.com) und wird von der
 * Platform-Seite automatisch übernommen. Session-Cookies werden zusätzlich
 * mitgesendet (hilfreich für die AWS-WAF-Schicht), authentifizieren die
 * API-Endpunkte aber NICHT — live geprüft: ohne Header antwortet die API mit
 * HTTP 40002 „Missing Token".
 */

(function () {
    'use strict';

    // =====================================================================
    // Konfiguration
    // =====================================================================
    const CFG = {
        API_BASE: 'https://platform.deepseek.com',
        USAGE_URL: 'https://platform.deepseek.com/usage',
        REFRESH_MS: 5 * 60 * 1000,        // Badge-Aktualisierung im DSH
        PLATFORM_REFRESH_MS: 60 * 1000,   // Nachfassen auf der Platform-Seite
        MIN_REFRESH_MS: 60 * 1000,        // Mindestabstand bei Fokus-Refresh
        STALE_MS: 30 * 60 * 1000,         // ab wann ein Wert als „alt" gilt
        REQUEST_TIMEOUT: 15000,
        DEBUG: false,
        KEY: {
            token: 'xdsb.token',
            tokenAt: 'xdsb.tokenAt',
            snapshot: 'xdsb.snapshot',
            pos: 'xdsb.pos'
        }
    };

    const log = (...a) => { if (CFG.DEBUG) console.log('[xDSH Costs]', ...a); };

    // =====================================================================
    // #region PURE — reine Funktionen (ohne DOM/GM), testbar in Node
    // =====================================================================

    /** Zahl aus "17.48" | 17.48 | "1,234.56" — sonst null. */
    function num(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (typeof value !== 'string') return null;
        const cleaned = value.trim().replace(/,/g, '');
        if (!cleaned) return null;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
    }

    /** Token aus dem localStorage-Rohwert (String oder JSON-Wrapper). */
    function parseToken(raw) {
        if (raw === null || raw === undefined) return null;
        const trimmed = String(raw).trim();
        if (!trimmed) return null;
        try {
            const obj = JSON.parse(trimmed);
            if (typeof obj === 'string') return obj.length >= 20 ? obj : null;
            if (obj && typeof obj === 'object') {
                for (const key of ['value', 'token', 'access_token', 'accessToken', 'userToken']) {
                    const v = obj[key];
                    if (typeof v === 'string' && v.length >= 20 && !/\s/.test(v)) return v;
                }
            }
            return null;
        } catch (e) {
            /* kein JSON → Rohwert prüfen */
        }
        const unquoted = /^["'].*["']$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
        return unquoted.length >= 20 && !/\s/.test(unquoted) ? unquoted : null;
    }

    /** "YYYY-MM-DD" des lokalen Tages. */
    function localDayIso(date) {
        const d = date || new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    const CURRENCY_SYMBOL = { USD: '$', CNY: '¥', EUR: '€' };
    function symbolFor(currency) {
        const cur = String(currency || '').toUpperCase();
        return CURRENCY_SYMBOL[cur] || (cur ? cur + ' ' : '');
    }
    function fmtMoney(value, currency) {
        const n = num(value);
        return n === null ? '--' : symbolFor(currency) + n.toFixed(2);
    }

    /**
     * Topped-up-Balance aus GET /api/v0/users/get_user_summary.
     * Antwort: { code, data: { biz_code, biz_data: { normal_wallets:[{balance,currency}], bonus_wallets:[…] } } }
     * normal_wallets = aufgeladenes Guthaben (die Karte „Topped-up balance"), bonus_wallets = Gratisguthaben.
     */
    function toppedUpFromSummary(json) {
        const biz = json && json.data && json.data.biz_data;
        if (!biz || typeof biz !== 'object') return null;
        const wallets = Array.isArray(biz.normal_wallets) ? biz.normal_wallets : [];
        const bonus = Array.isArray(biz.bonus_wallets) ? biz.bonus_wallets : [];
        const currencies = [...new Set(
            wallets.concat(bonus)
                .map((w) => String((w && w.currency) || '').toUpperCase())
                .filter(Boolean)
        )];
        if (!currencies.length) return null;
        const currency = currencies.includes('USD') ? 'USD' : currencies[0];
        const sum = (list) => list
            .filter((w) => String((w && w.currency) || '').toUpperCase() === currency)
            .reduce((acc, w) => acc + (num(w && w.balance) || 0), 0);
        const toppedUp = sum(wallets);
        const granted = sum(bonus);
        return { currency, toppedUp, granted, total: toppedUp + granted };
    }

    /**
     * Kosten aus GET /api/v0/usage/cost?month=M&year=YYYY.
     * Antwort: { code, data: { biz_code, biz_data: [ { currency, total:[…], days:[ { date, data:[ { model, usage:[ {type, amount} ] } ] } ] } ] } }
     * Tageskosten = Summe aller Beträge des Tages außer Typ REQUEST.
     */
    function dailyCostFromUsage(json, dayIso) {
        const raw = json && json.data && json.data.biz_data;
        const rows = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
        if (!rows.length) return null;
        const row = rows.find((r) => String((r && r.currency) || '').toUpperCase() === 'USD') || rows[0];
        const currency = String((row && row.currency) || 'USD').toUpperCase();
        const days = Array.isArray(row && row.days) ? row.days : [];

        const sumDay = (day) => {
            let total = 0;
            let seen = false;
            const models = Array.isArray(day && day.data) ? day.data : [];
            for (const model of models) {
                const usage = Array.isArray(model && model.usage) ? model.usage : [];
                for (const item of usage) {
                    const type = String((item && item.type) || '').toUpperCase();
                    if (type === 'REQUEST') continue;
                    const v = num(item && item.amount);
                    if (v !== null) { total += v; seen = true; }
                }
            }
            return seen ? total : null;
        };

        // Die Antwort enthält den angefragten Monat vollständig (live geprüft: 2026-09-01
        // bis 2026-09-30, künftige Tage ohne Beträge). Die Monatssumme wird trotzdem auf
        // das Kalenderdatum gefiltert, damit ein weiterer Zeitraum sie nicht verfälscht.
        const monthPrefix = String(dayIso || '').slice(0, 7);
        let monthCost = 0;
        let monthSeen = false;
        let monthDays = 0;
        for (const d of days) {
            const date = String((d && d.date) || '');
            if (monthPrefix && !date.startsWith(monthPrefix)) continue;
            const v = sumDay(d);
            if (v !== null) { monthCost += v; monthSeen = true; monthDays += 1; }
        }
        const today = days.find((d) => String((d && d.date) || '') === dayIso) || null;
        return {
            currency,
            day: dayIso,
            cost: today ? sumDay(today) : null,
            monthCost: monthSeen ? monthCost : null,
            dayCount: days.length,
            monthDays: monthDays
        };
    }

    /** „vor 3 Min" / „gerade eben" — grobe Altersangabe. */
    function relTime(iso, nowMs) {
        const then = Date.parse(iso);
        if (!Number.isFinite(then)) return 'unbekannt';
        const sec = Math.max(0, Math.round(((nowMs || Date.now()) - then) / 1000));
        if (sec < 45) return 'gerade eben';
        if (sec < 3600) return `vor ${Math.round(sec / 60)} Min`;
        if (sec < 86400) return `vor ${Math.round(sec / 3600)} Std`;
        return `vor ${Math.round(sec / 86400)} Tagen`;
    }

    /** Fehlerklassifikation aus HTTP-Status und Antwortkörper. */
    function classifyFailure(status, body) {
        if (status === 0) return { kind: 'error', note: 'Netzwerkfehler' };
        if (status === 401 || status === 403) {
            if (/awswaf|challenge|Human Verification/i.test(String(body || ''))) {
                return { kind: 'error', note: 'WAF blockiert (Platform einmal öffnen)' };
            }
            return { kind: 'auth', note: 'Session abgelaufen' };
        }
        const bodyText = String(body || '');
        if (/"(?:code|biz_code)"\s*:\s*4000[23]/.test(bodyText)) {
            return { kind: 'auth', note: 'Session abgelaufen' };
        }
        if (status === 200 && /"(?:code|biz_code)"\s*:\s*(?!0\b)\d+/.test(bodyText)) {
            return { kind: 'error', note: 'API-Fehler im Antwortkörper' };
        }
        return { kind: 'error', note: 'HTTP ' + status };
    }
    // #endregion PURE

    // =====================================================================
    // Speicher (GM_* mit Rückfall auf localStorage) und Netzzugriff
    // =====================================================================
    const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
    const memStore = {};
    const localStore = (() => {
        try { return window.localStorage; } catch (e) { return null; }
    })();

    function storeGet(key, fallback) {
        if (hasGM) {
            try {
                const v = GM_getValue(key, undefined);
                return v === undefined ? fallback : v;
            } catch (e) { /* weiter unten */ }
        }
        if (localStore) {
            try {
                const raw = localStore.getItem(key);
                if (raw !== null) return JSON.parse(raw);
            } catch (e) { /* ignorieren */ }
        }
        return key in memStore ? memStore[key] : fallback;
    }

    function storeSet(key, value) {
        memStore[key] = value;
        if (hasGM) {
            try { GM_setValue(key, value); return; } catch (e) { /* weiter unten */ }
        }
        if (localStore) {
            try { localStore.setItem(key, JSON.stringify(value)); } catch (e) { /* ignorieren */ }
        }
    }

    /**
     * HTTP-GET über GM_xmlhttpRequest (umgeht CORS) oder fetch als Rückfall.
     * Die Session-Cookies des Zielhosts werden mitgesendet (anonymous: false bzw.
     * credentials: 'include') — die Platform-Session authentifiziert damit auch ohne
     * Bearer-Token. Ist ein Token bekannt, wird er zusätzlich als Header geschickt.
     */
    function httpGet(url, token) {
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = 'Bearer ' + token;
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve) => {
                try {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url,
                        headers,
                        anonymous: false,
                        timeout: CFG.REQUEST_TIMEOUT,
                        onload: (res) => resolve({ status: res.status, body: res.responseText || '' }),
                        ontimeout: () => resolve({ status: 0, body: '', error: 'timeout' }),
                        onerror: (err) => resolve({ status: 0, body: '', error: String((err && err.error) || 'error') })
                    });
                } catch (e) {
                    resolve({ status: 0, body: '', error: String(e && e.message) });
                }
            });
        }
        return fetch(url, { headers, credentials: 'include' })
            .then((r) => r.text().then((body) => ({ status: r.status, body })))
            .catch((e) => ({ status: 0, body: '', error: String(e && e.message) }));
    }

    function pageLocalStorage() {
        try {
            const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            return w.localStorage;
        } catch (e) {
            return null;
        }
    }

    function readPlatformToken() {
        const ls = pageLocalStorage();
        if (!ls) return null;
        try { return parseToken(ls.getItem('userToken')); } catch (e) { return null; }
    }

    // =====================================================================
    // Daten holen und auswerten
    // =====================================================================
    function usagePeriod(date) {
        const d = date || new Date();
        return { month: d.getMonth() + 1, year: d.getFullYear() };
    }

    /**
     * Holt Kontostand + Tageskosten und liefert einen Snapshot.
     * @param {string|null} token Login-Token, optional — ohne Token läuft die
     *        Anfrage allein über die Session-Cookies des Browsers.
     * @returns {Promise<{ok:true, snapshot:object} | {ok:false, kind:string, note:string}>}
     */
    async function fetchSnapshot(token, source) {
        const day = localDayIso();
        const period = usagePeriod();
        const summaryUrl = CFG.API_BASE + '/api/v0/users/get_user_summary';
        const costUrl = CFG.API_BASE + '/api/v0/usage/cost?month=' + period.month + '&year=' + period.year;

        const [summaryRes, costRes] = await Promise.all([
            httpGet(summaryUrl, token),
            httpGet(costUrl, token)
        ]);

        for (const res of [summaryRes, costRes]) {
            if (res.status !== 200) {
                const fail = classifyFailure(res.status, res.body);
                log('fetch failed', res.status, res.error, fail);
                return { ok: false, kind: fail.kind, note: fail.note };
            }
        }

        let summaryJson = null;
        let costJson = null;
        try { summaryJson = JSON.parse(summaryRes.body); } catch (e) { /* unten behandelt */ }
        try { costJson = JSON.parse(costRes.body); } catch (e) { /* unten behandelt */ }

        const wallet = toppedUpFromSummary(summaryJson);
        if (!wallet) {
            const fail = classifyFailure(summaryRes.status, summaryRes.body);
            return { ok: false, kind: fail.kind === 'error' ? 'error' : fail.kind, note: fail.note };
        }
        const cost = dailyCostFromUsage(costJson, day);

        return {
            ok: true,
            snapshot: {
                at: new Date().toISOString(),
                day: day,
                source: source,
                currency: wallet.currency,
                toppedUp: wallet.toppedUp,
                granted: wallet.granted,
                total: wallet.total,
                todayCost: cost ? cost.cost : null,
                monthCost: cost ? cost.monthCost : null
            }
        };
    }

    function saveSnapshot(snapshot) {
        storeSet(CFG.KEY.snapshot, snapshot);
    }

    function loadSnapshot() {
        const raw = storeGet(CFG.KEY.snapshot, null);
        if (!raw) return null;
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return null; }
        }
        return raw;
    }

    // =====================================================================
    // Badge (schwebende Anzeige unten rechts, ziehbar)
    // =====================================================================
    const BADGE_ID = 'xdsh-costs-badge';
    let badgeEl = null;

    function ensureBadge() {
        if (badgeEl && document.body && document.body.contains(badgeEl)) return badgeEl;
        if (!document.body) return null;

        badgeEl = document.createElement('div');
        badgeEl.id = BADGE_ID;
        badgeEl.style.cssText = [
            'position:fixed',
            'right:16px',
            'bottom:16px',
            'z-index:2147483647',
            'display:flex',
            'align-items:center',
            'gap:8px',
            'padding:6px 12px',
            'border-radius:10px',
            'border:1px solid rgba(255,255,255,0.08)',
            'background:rgba(13,13,13,0.82)',
            'color:#fff',
            'font:500 12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
            'letter-spacing:0.02em',
            'box-shadow:0 2px 10px rgba(0,0,0,0.28)',
            'backdrop-filter:blur(6px)',
            'cursor:pointer',
            'user-select:none',
            'opacity:0.94',
            'transition:opacity .2s ease'
        ].join(';');

        const dot = document.createElement('span');
        dot.dataset.role = 'dot';
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#8a8a8a;flex:0 0 auto';
        const text = document.createElement('span');
        text.dataset.role = 'text';
        text.textContent = '💳 …';

        badgeEl.appendChild(dot);
        badgeEl.appendChild(text);
        document.body.appendChild(badgeEl);

        applySavedPosition();
        installBadgeInteractions();
        return badgeEl;
    }

    function renderBadge(view) {
        const el = ensureBadge();
        if (!el) return;
        const dot = el.querySelector('[data-role="dot"]');
        const text = el.querySelector('[data-role="text"]');
        const color = { ok: '#3ddc84', stale: '#e8c341', auth: '#ff6b6b', error: '#ff6b6b', none: '#8a8a8a' }[view.kind] || '#8a8a8a';
        if (dot) {
            dot.style.background = color;
            dot.style.boxShadow = view.kind === 'ok' ? '0 0 6px rgba(61,220,132,0.6)' : 'none';
        }
        if (text) text.textContent = view.text;
        el.title = view.title;
        el.style.opacity = view.kind === 'ok' ? '0.94' : '0.8';
    }

    /** Baut aus einem Ergebnis den Anzeigezustand (Text + Tooltip). */
    function viewFromResult(result, previous) {
        const now = Date.now();
        if (!result.ok) {
            if (result.kind === 'auth') {
                return {
                    kind: 'auth',
                    text: '💳 Login nötig — platform.deepseek.com',
                    title: 'Kein gültiger DeepSeek-Platform-Login (Session-Cookie/Token).\nBitte im Browser bei platform.deepseek.com anmelden — danach aktualisiert sich das Badge selbst.'
                };
            }
            const stale = previous ? buildStaleView(previous, now, result.note) : null;
            if (stale) return stale;
            return {
                kind: 'error',
                text: '💳 ' + (result.note || 'Fehler'),
                title: 'DeepSeek-Kontodaten konnten nicht geladen werden:\n' + (result.note || 'unbekannter Fehler')
            };
        }
        return freshView(result.snapshot, now);
    }

    function freshView(snap, now) {
        const age = now - Date.parse(snap.at);
        const kind = age > CFG.STALE_MS ? 'stale' : 'ok';
        return {
            kind,
            text: badgeText(snap) + (kind === 'stale' ? ' ⏳' : ''),
            title: badgeTitle(snap, now)
        };
    }

    function buildStaleView(snap, now, note) {
        if (!snap || !Number.isFinite(Number(snap.toppedUp))) return null;
        return {
            kind: 'stale',
            text: badgeText(snap) + ' ⏳',
            title: badgeTitle(snap, now) + '\n\nAktualisierung fehlgeschlagen: ' + (note || 'unbekannt')
        };
    }

    function badgeText(snap) {
        const toppedUp = fmtMoney(snap.toppedUp, snap.currency);
        const today = snap.todayCost === null || snap.todayCost === undefined
            ? 'heute --'
            : 'heute ' + fmtMoney(snap.todayCost, snap.currency);
        return '💳 ' + toppedUp + ' · ' + today;
    }

    function badgeTitle(snap, now) {
        const cur = snap.currency;
        const lines = [
            'DeepSeek-API-Konto',
            'Topped-up: ' + fmtMoney(snap.toppedUp, cur),
            'Guthaben gesamt: ' + fmtMoney(snap.total, cur) + (snap.granted ? ' (Gratis: ' + fmtMoney(snap.granted, cur) + ')' : ''),
            'Kosten ' + (snap.day || '') + ': ' + (snap.todayCost === null || snap.todayCost === undefined ? '--' : fmtMoney(snap.todayCost, cur)),
            'Kosten Monat: ' + (snap.monthCost === null || snap.monthCost === undefined ? '--' : fmtMoney(snap.monthCost, cur)),
            'Aktualisiert: ' + relTime(snap.at, now) + (snap.source ? ' (' + snap.source + ')' : ''),
            '',
            'Klick: platform.deepseek.com/usage öffnen · Ziehen: Position ändern'
        ];
        return lines.join('\n');
    }

    function noDataView() {
        return {
            kind: 'none',
            text: '💳 nicht angemeldet',
            title: 'Kein DeepSeek-Platform-Token gefunden.\n\nDie Endpunkte verlangen den Login-Token (localStorage „userToken"); ein Session-Cookie genügt nicht (live geprüft: HTTP 40002 „Missing Token").\n\nBitte platform.deepseek.com einmal öffnen und anmelden — das Skript holt den Token dann selbst.'
        };
    }

    function loadingView() {
        return { kind: 'none', text: '💳 lädt …', title: 'DeepSeek-Kontodaten werden geladen …' };
    }

    // ---------------------------------------------------------------------
    // Position + Interaktion (Ziehen, Klick)
    // ---------------------------------------------------------------------
    function applySavedPosition() {
        const pos = storeGet(CFG.KEY.pos, null);
        if (!pos || typeof pos !== 'object' || !badgeEl) return;
        if (Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
            badgeEl.style.left = pos.left + 'px';
            badgeEl.style.top = pos.top + 'px';
            badgeEl.style.right = 'auto';
            badgeEl.style.bottom = 'auto';
        }
    }

    function installBadgeInteractions() {
        if (!badgeEl || badgeEl.dataset.wired === '1') return;
        badgeEl.dataset.wired = '1';

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        badgeEl.addEventListener('mousedown', (ev) => {
            if (ev.button !== 0) return;
            const rect = badgeEl.getBoundingClientRect();
            dragging = true;
            moved = false;
            startX = ev.clientX;
            startY = ev.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            ev.preventDefault();
        });

        window.addEventListener('mousemove', (ev) => {
            if (!dragging) return;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
            moved = true;
            const left = Math.min(Math.max(0, startLeft + dx), Math.max(0, window.innerWidth - 80));
            const top = Math.min(Math.max(0, startTop + dy), Math.max(0, window.innerHeight - 30));
            badgeEl.style.left = left + 'px';
            badgeEl.style.top = top + 'px';
            badgeEl.style.right = 'auto';
            badgeEl.style.bottom = 'auto';
        });

        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const rect = badgeEl.getBoundingClientRect();
                storeSet(CFG.KEY.pos, { left: Math.round(rect.left), top: Math.round(rect.top) });
            }
        });

        badgeEl.addEventListener('click', (ev) => {
            if (moved) { ev.preventDefault(); return; }
            window.open(CFG.USAGE_URL, '_blank', 'noopener');
        });
    }

    // =====================================================================
    // Rolle 2: Badge im DSH-Web-GUI
    // =====================================================================
    function isDshPage() {
        try {
            const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            if (w && w.__DSH_BOOT__) return true;
        } catch (e) { /* ignorieren */ }
        // Rückfall: das GUI läuft lokal auf Port 3080 (siehe DSH-Laufzeitkontext)
        return (location.hostname === '127.0.0.1' || location.hostname === 'localhost') && location.port === '3080';
    }

    function startDshBadge() {
        let lastAttempt = 0;
        let busy = false;

        const paint = (view) => renderBadge(view);

        const refresh = async (force) => {
            if (busy) return;
            if (!force && Date.now() - lastAttempt < CFG.MIN_REFRESH_MS) return;
            lastAttempt = Date.now();
            busy = true;
            try {
                const snapshot = loadSnapshot();
                // Token ist Pflicht: die API authentifiziert nicht über Cookies
                // (live geprüft: HTTP 40002 „Missing Token").
                const token = storeGet(CFG.KEY.token, null) || readPlatformToken();
                if (!token) {
                    paint(snapshot ? buildStaleView(snapshot, Date.now(), 'kein Login-Token') || noDataView() : noDataView());
                    return;
                }
                const result = await fetchSnapshot(token, 'dsh');
                if (result.ok) {
                    saveSnapshot(result.snapshot);
                    paint(freshView(result.snapshot, Date.now()));
                } else {
                    paint(viewFromResult(result, snapshot));
                }
            } finally {
                busy = false;
            }
        };

        // Erst letzten Stand zeigen, dann (leicht verzögert) frisch holen.
        const cached = loadSnapshot();
        paint(cached ? freshView(cached, Date.now()) : loadingView());

        const boot = () => {
            ensureBadge();
            refresh(true);
        };
        if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 800);
        else window.addEventListener('DOMContentLoaded', () => setTimeout(boot, 800));

        setInterval(() => refresh(false), CFG.REFRESH_MS);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh(false);
        });

        // Von der Platform-Seite gepushte Werte sofort übernehmen.
        if (hasGM && typeof GM_addValueChangeListener === 'function') {
            try {
                GM_addValueChangeListener(CFG.KEY.snapshot, (_name, _old, value) => {
                    const snap = typeof value === 'string' ? safeJson(value) : value;
                    if (snap && Number.isFinite(Number(snap.toppedUp))) paint(freshView(snap, Date.now()));
                });
            } catch (e) { /* ohne Listener läuft der Intervall-Refresh weiter */ }
        }
    }

    function safeJson(text) {
        try { return JSON.parse(text); } catch (e) { return null; }
    }

    // =====================================================================
    // Rolle 1: Platform-Seite — Token sichern, Werte holen und pushen
    // =====================================================================
    function startPlatformPush() {
        const captureToken = () => {
            const token = readPlatformToken();
            if (token) {
                storeSet(CFG.KEY.token, token);
                storeSet(CFG.KEY.tokenAt, new Date().toISOString());
                log('token captured', token.length);
            }
            return token;
        };

        const push = async () => {
            const token = captureToken();
            if (!token) return;   // ohne Token sind die Endpunkte nicht erreichbar
            const result = await fetchSnapshot(token, 'platform');
            if (result.ok) {
                saveSnapshot(result.snapshot);
                log('snapshot pushed', result.snapshot);
            } else {
                log('push failed', result.kind, result.note);
            }
        };

        // Token kann erst nach dem Login erscheinen → mehrfach früh nachfassen.
        [2000, 6000, 15000, 30000].forEach((ms) => setTimeout(push, ms));
        setInterval(() => {
            if (!document.hidden) push();
        }, CFG.PLATFORM_REFRESH_MS);
    }

    // =====================================================================
    // Start
    // =====================================================================
    try {
        if (location.hostname === 'platform.deepseek.com') {
            startPlatformPush();
        } else if (isDshPage()) {
            startDshBadge();
        } else {
            log('kein Zielkontext — nichts zu tun', location.href);
        }
    } catch (e) {
        console.error('[xDSH Costs] Startfehler', e);
    }
})();
