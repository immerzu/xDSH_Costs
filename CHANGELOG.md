# Changelog

Alle nennenswerten Änderungen an diesem Userscript.

## 2.0.0 — 2026-09-10

Umzug und Umbenennung — **keine funktionalen Änderungen** am Badge.

- **Projekt umgezogen:** `F:\001_Coding_Projekte\xDeepSeek_Billing_Badge` →
  `F:\001_Coding_Projekte\xDSH_Costs` (Projektname jetzt **xDSH Costs**), inklusive
  Projektgedächtnis, Tests und Werkzeugen. Neues Git-Repository im neuen Ordner.
- **Skript umbenannt:** `xdeepseek-billing-badge.user.js` → `xdsh-costs.user.js`,
  `@name` `xDeepSeek Billing Badge (DSH)` → **`xDSH Costs (DSH)`**, Badge-Element-ID
  `xdsb-billing-badge` → `xdsh-costs-badge`, Log-Präfix `[BillingBadge]` → `[xDSH Costs]`.
- **GM-Speicher-Schlüssel bewusst beibehalten:** `xdsb.token`, `xdsb.tokenAt`,
  `xdsb.snapshot`, `xdsb.pos` — dadurch sind Platform-Token und letzter Kontostand nach
  dem Umstieg sofort wieder verfügbar, ohne erneuten Platform-Besuch.
- **Tampermonkey-Hinweis:** Ein neuer `@name` bedeutet für Tampermonkey ein **neues
  Skript** (kein In-Place-Update). Nach dem Import von `xdsh-costs.user.js` den alten
  Eintrag „xDeepSeek Billing Badge (DSH)" **löschen**, damit das Badge nicht doppelt läuft.
- Vorgängerversion als Archiv erhalten: `Archiv\xdeepseek-billing-badge-v1.1.0.user.js`
  (unverändert, hash-gleich zum damaligen Release).
- Verifikation nach dem Umzug: Parser-Tests **16/16**, Badge-Verhalten **4/4** im echten
  Chromium; Syntaxprüfung `node --check` ohne Befund.

## 1.1.0 — 2026-09-10

Live-Prüfung gegen das echte Konto — mit einer widerlegten Annahme und den Folgerungen daraus.

- **Belegt: der Token ist Pflicht.** Ein Aufruf nur mit Session-Cookies antwortet mit
  `{"code":40002,"msg":"Missing Token"}`; die Endpunkte verlangen
  `Authorization: Bearer <userToken>`. Die zwischenzeitliche Cookie-Only-Variante ist damit
  widerlegt und zurückgenommen.
- Session-Cookies werden trotzdem mitgesendet (`GM_xmlhttpRequest` mit `anonymous: false`,
  Rückfallpfad `fetch` mit `credentials: 'include'`) — nützlich für die AWS-WAF-Schicht.
- Fehlerklassifikation erkennt `code`/`biz_code` **40002**/40003 als Login-Problem; der
  Zustandstext lautet `💳 Login nötig — platform.deepseek.com`.
- Monatssumme wird auf den laufenden Kalendermonat gefiltert. Live belegt: die Kostenantwort
  liefert den **kompletten Monat** (2026-09-01 … 2026-09-30, künftige Tage ohne Beträge).
- Testsuite: neuer Fall **`ohne-token-keine-anfrage`** beweist, dass ohne Token gar keine
  Anfrage rausgeht; der Happy-Path-Fall prüft, dass **Cookie und** Bearer-Header ankommen.
- Neu: `tools/live-check.mjs` fragt jeden Endpunkt mit **und ohne** Token ab;
  `tools/live-parse.mjs` wertet die echten Antworten mit genau den Skript-Parsern aus.
- Neu: `tools/verify-dsh-tm.mjs` (echte Tampermonkey-Injektion + echte API) und
  `tools/verify-dsh-tm-live.mjs` (End-to-End mit echtem Konto) sowie
  `tools/tm-import-diagnose.mjs` (Tampermonkey-Import mit Tab-Dokumentation).
- **End-to-End belegt:** Badge zeigte im echten Konto `💳 $17.35 · heute $1.59` (grün),
  Datenweg Platform-Seite → GM-Speicher → DSH-Seite.

## 1.0.0 — 2026-09-10

Erstes Release.

- Zeigt **Topped-up-Balance** und **Tageskosten** des DeepSeek-API-Kontos als schwebendes
  Badge im DSH-Web-GUI (`window.__DSH_BOOT__` bzw. Port 3080).
- Datenquelle: Web-Session-Endpunkte der Platform (`/api/v0/users/get_user_summary`,
  `/api/v0/usage/cost`) — **kein API-Key, keine Modellaufrufe, keine Token-Kosten**.
- Zwei Rollen in einem Skript: Token-Wächter auf `platform.deepseek.com`, Badge in DSH.
- Zustände: frisch / veraltet (⏳ mit letztem Stand) / nicht angemeldet / Session abgelaufen /
  Fehler (inkl. AWS-WAF-Hinweis).
- Bedienung: Klick öffnet `platform.deepseek.com/usage`, Ziehen verschiebt das Badge
  (Position wird gemerkt), Tooltip zeigt Guthaben, Gratisguthaben, Monatskosten und Zeitstempel.
- Auto-Refresh alle 5 Minuten, zusätzlich beim Tab-Fokus; von der Platform-Seite gepushte
  Werte werden sofort übernommen (`GM_addValueChangeListener`).
- Tests: `test/parse.test.mjs` (15 Parser-Fälle), `tools/verify-badge.mjs`
  (4 Badge-Zustände im echten Chromium mit gemockter API), `tools/live-check.mjs`
  (Live-Probe der echten Endpunkte).
