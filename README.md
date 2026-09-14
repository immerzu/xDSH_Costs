# xDSH Costs (DSH)

Userscript für **Tampermonkey**: zeigt **Topped-up-Balance** und **Tageskosten** des
DeepSeek-API-Kontos als schwebendes Badge im **DSH-Web-GUI** — direkt dort, wo man
arbeitet.

```
💳 $17.48 · heute $1.45
```

## Wie es funktioniert

Ein Skript, zwei Rollen (über `@match` gesteuert):

| Rolle | Wo | Aufgabe |
|---|---|---|
| Token-Wächter | `platform.deepseek.com` | liest den Login-Token (`userToken`) aus dem Browser und legt ihn im Skript-Speicher ab |
| Badge | DSH-GUI (`127.0.0.1`/`localhost`, erkannt an `window.__DSH_BOOT__`) | holt Kontostand + Tageskosten, zeigt das Badge unten rechts |

Datenquelle sind **ausschließlich die Lese-Endpunkte der Web-Session**:

```
GET /api/v0/users/get_user_summary          → normal_wallets = „Topped-up balance"
GET /api/v0/usage/cost?month=M&year=YYYY    → Tages- und Monatskosten
```

**Authentifizierung: `Authorization: Bearer <userToken>`** — der Token steht im
Browser-Login von `platform.deepseek.com` (`localStorage.userToken`) und wird von der
Platform-Seite automatisch übernommen. Die Session-Cookies werden zusätzlich mitgesendet
(`GM_xmlhttpRequest` mit `anonymous: false`, im Rückfallpfad `fetch(..., credentials:
'include')`), **authentifizieren die API aber nicht** — live geprüft: ohne Header
antwortet sie mit `{"code":40002,"msg":"Missing Token"}`.

Praktische Folge: Das Badge braucht **einen einmaligen Besuch** auf
`platform.deepseek.com` (eingeloggt), damit der Token im Skript-Speicher landet. Danach
läuft es dauerhaft weiter, auch wenn die Platform-Seite geschlossen ist.

**Kein API-Key, keine Modell-Aufrufe — das kostet keine Tokens.** Es sind dieselben
Aufrufe, die die Platform-Seite selbst beim Öffnen macht.

## Aktualisierung

| Wann | Wie oft |
|---|---|
| DSH-Tab im Hintergrund/Vordergrund | alle **5 Minuten** |
| DSH-Tab bekommt Fokus | sofort, aber frühestens **60 s** nach dem letzten Versuch |
| Platform-Seite zusätzlich geöffnet | alle **60 s**, und jeder neue Wert wird **sofort** ins Badge geschoben |
| Ohne frischen Wert | nach **30 Minuten** markiert das Badge den Stand mit ⏳ |

Die Intervalle stehen als Konstanten oben im Skript (`CFG.REFRESH_MS`,
`CFG.PLATFORM_REFRESH_MS`, `CFG.MIN_REFRESH_MS`, `CFG.STALE_MS`).

## Badge-Zustände

| Anzeige | Bedeutung |
|---|---|
| 🟢 `💳 $17.48 · heute $1.45` | Werte frisch (jünger als 30 Min) |
| 🟡 `… ⏳` | letzter bekannter Stand; Aktualisierung schlug fehl (Grund im Tooltip) |
| ⚪ `💳 nicht angemeldet` | vor dem ersten Abruf |
| 🔴 `💳 Login nötig — platform.deepseek.com` | Cookies/Token ungültig → im Browser bei platform.deepseek.com anmelden |
| 🔴 `💳 HTTP … / WAF blockiert` | Endpunkt antwortet nicht wie erwartet |

Bedienung: **Klick** öffnet `platform.deepseek.com/usage`, **Ziehen** verschiebt das
Badge (Position wird gemerkt), **Tooltip** zeigt Guthaben, Gratisguthaben,
Monatskosten, Tagesdatum und Aktualisierungszeit.

## Installation

**Am einfachsten über Greasy Fork:**
<https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh> → „Installieren" (Tampermonkey
zeigt den üblichen Bestätigungsdialog). Dort ist die Datei automatisch aktuell.

Aus dem Repo bzw. aus `!Ausgabe/`:

1. Tampermonkey im Browser installiert.
2. `xdsh-costs.user.js` (bzw. die Version aus `!Ausgabe/`) in Tampermonkey
   importieren:
   - direkt: Datei in den Tampermonkey-Dashboard-Bereich „Utilities → Import from file" ziehen, oder
   - automatisiert (Automatisierungsprofil): `node C:\Users\lolo\.dsh\browser-tools\tm-import.mjs --file <pfad>`
3. `platform.deepseek.com` einmal öffnen (eingeloggt) — danach kennt das Skript den Token.
4. DSH-GUI neu laden → Badge erscheint unten rechts.

> **Umstieg von der Vorgängerversion (bis 1.1.0, „xDeepSeek Billing Badge (DSH)"):**
> Mit Version 2.0.0 haben Skriptname und Dateiname gewechselt. Tampermonkey sieht darin ein
> **neues Skript** — es gibt kein In-Place-Update. Also: neues Skript importieren und danach
> den alten Tampermonkey-Eintrag **löschen**, sonst laufen beide Badges parallel. Die
> GM-Speicher-Schlüssel (`xdsb.*`) wurden bewusst beibehalten, Token und letzter Stand sind
> also sofort wieder da.

## Greasy Fork (Veröffentlichung)

Veröffentlicht seit 2026-09-14: <https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh>
(GF-ID 595732, Lizenz MIT, Skript-Locale `de`).

- **Auto-Sync ist eingerichtet** (Skript aus `main/xdsh-costs.user.js`, Zusatzinfos aus
  `main/description.md`). Ein manueller Upload ist nicht nötig — der Repo-Webhook zog im
  Pilotlauf (v2.0.2) aber **nicht von selbst**: nach `@version`-Erhöhung und Push wird der Sync
  im GF-Admin angestoßen (`gf-admin-sync.mjs`) und über
  `https://greasyfork.org/scripts/595732.json` (`version`, `code_updated_at`) verifiziert.
  Zu jeder Version entsteht zusätzlich ein GitHub-Release
  (`gh release create v<version> --title … --notes … --target main`).
- **Sprachen:** `@description` ohne Suffix ist die Sprache der GF-Skript-Locale (hier Deutsch);
  `@description:en` und `@description:ru` erzeugen die Einträge für die englische und russische
  Suche. Deshalb **keine** Mischtext-Zeilen („DE / EN / RU" in einer Zeile) und **keine**
  `@name:xx`-Zeilen.
- **Keine Secrets:** Im Skript stehen keine Tokens, Keys oder Zugangsdaten. Der Platform-Token
  wird ausschließlich zur Laufzeit aus dem `localStorage` gelesen (`readPlatformToken()`), nie
  geschrieben und nie geloggt.
- Details, Belege und die Stolpersteine der Erstveröffentlichung:
  [`memory/SESSION-20260914-greasy-fork-veroeffentlichung.md`](memory/SESSION-20260914-greasy-fork-veroeffentlichung.md).

## Entwicklung / Tests

```bash
node test/parse.test.mjs        # 16 Parser-Tests (reine Funktionen aus dem Userscript)
node tools/verify-badge.mjs     # 4 Verhaltensfälle im echten Chromium (gemockte API)
node tools/verify-dsh-tm.mjs    # echte TM-Injektion + echte API (ungültiger Token)
node tools/verify-dsh-tm-live.mjs  # End-to-End mit echtem Konto (Platform-Login nötig)
node tools/live-check.mjs       # Live-Probe der echten Endpunkte (ENV-Steuerung, s. u.)
node tools/live-parse.mjs       # echte Antworten mit den Skript-Parsern auswerten
```

`tools/live-check.mjs` wird über **Umgebungsvariablen** gesteuert (CLI-Argumente
erreichen Node bei pwsh-Aufrufen nicht zuverlässig):

| Variable | Default | Wirkung |
|---|---|---|
| `DSB_URL` | `https://platform.deepseek.com/usage` | Ziel-URL |
| `DSB_OUT` | `out/live-probe.json` | Ausgabedatei der echten Antworten |
| `DSB_MAX_MINUTES` | `45` | Laufzeitkappe; das Fenster bleibt offen, bis du es schließt |
| `DSB_PROBE_EVERY_S` | `120` | Abstand zwischen zwei Proben |

Der Token wird nie im Klartext geschrieben (nur Länge/Präfix).

## Dateien

| Datei | Zweck |
|---|---|
| `xdsh-costs.user.js` | **Das Skript** (Quelle) |
| `!Ausgabe/` | Versionskopien `xdsh-costs-v<version>.user.js` (per `.gitignore` ausgenommen) |
| `test/parse.test.mjs` | Parser-Tests gegen die dokumentierte Antwortform |
| `tools/verify-badge.mjs` | Badge-Verhalten (4 Zustände) im echten Chromium, gemockte API |
| `tools/verify-dsh-tm.mjs` | Integrationstest: echte Tampermonkey-Injektion + echte API (ungültiger Token) |
| `tools/verify-dsh-tm-live.mjs` | End-to-End mit **echtem Konto**: Platform-Seite → Token → Badge auf DSH-Seite |
| `tools/live-check.mjs` | Live-Probe der echten Endpunkte (mit und ohne Token) |
| `tools/live-parse.mjs` | Wertet die echten Antworten mit den Skript-Parsern aus |
| `tools/tm-import-diagnose.mjs` | Tampermonkey-Import mit Diagnose (siehe Fallstricke) |
| `memory/` | **Projektgedächtnis** — Index in [`memory/README.md`](memory/README.md) (Handover, Analyse der Endpunkte/Auth, Testrezept, Greasy-Fork-Veröffentlichung) |
| `description.md` | „Zusätzliche Informationen" für die Greasy-Fork-Seite (Absätze DE → RU → EN), per Auto-Sync gepflegt |
| `docs/specs/` | Design-/Umzugs-Specs (z. B. Umzug nach `xDSH_Costs`, 2026-09-10) |
| `Archiv/` | Vorgängerversionen zur Nachvollziehbarkeit (`xdeepseek-billing-badge-v1.1.0.user.js`) |
| `out/` | Testartefakte (Proben, Screenshots) |

## Live-Belege (2026-09-10, echtes Konto)

| Prüfung | Ergebnis |
|---|---|
| `GET /api/v0/users/get_user_summary` | HTTP 200 — Topped-up **$17.38** |
| `GET /api/v0/usage/cost?month=9&year=2026` | HTTP 200 — **$1.56** heute, **$37.04** im September |
| `GET /api/v0/usage/amount?month=9&year=2026` | HTTP 200 (Tokens/Requests, derzeit nicht angezeigt) |
| gleicher Aufruf **ohne** Authorization-Header (nur Cookies) | `{"code":40002,"msg":"Missing Token"}` → **Cookies authentifizieren nicht** |
| Gegenprobe DOM „Topped-up balance" | **$17.38** → deckt sich exakt mit der API |
| Gegenprobe DOM „Cost"-Kachel | $86.01 → **weicht ab** (Kachel hängt am Zeitfilter) — deshalb kein DOM-Auslesen |
| Zeitraum der Kostenantwort | 2026-09-01 … 2026-09-30 (kompletter Monat, künftige Tage ohne Beträge) |
| End-to-End über Tampermonkey (echtes Konto) | Badge zeigte `💳 $17.35 · heute $1.59` (grün) — Platform-Rolle holt den Token, DSH-Rolle rendert |

Reproduzierbar über `node tools/live-check.mjs` (Browser anmelden, Fenster offen lassen)
und `node tools/live-parse.mjs` (wertet die echten Antworten mit den Skript-Parsern aus).

## Bekannte Grenzen

- Die beiden Dashboard-Endpunkte sind **privat** (nicht dokumentiert) und können sich
  ändern; dann zeigt das Badge einen Fehlerzustand statt Zahlen.
- Der Login-Token läuft ab. Ein Besuch auf `platform.deepseek.com` erneuert ihn; das
  Skript übernimmt ihn automatisch.
- Die Tageskosten werden aus dem lokalen Tagesdatum gebildet (die Platform-Seite nutzt
  dieselbe Tagesgrenze wie der Browser).
- AWS-WAF: Auf der Platform-Seite kann eine „Human Verification" erscheinen. Sie ist
  einmalig im Browser zu lösen; das Badge selbst stellt keine Anfragen an die
  HTML-Seiten, sondern nur an die API-Endpunkte.

MIT-Lizenz.
