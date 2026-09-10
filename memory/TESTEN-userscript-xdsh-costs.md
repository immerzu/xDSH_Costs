# TESTEN — xDSH Costs (DSH)

Rezept, wie eine Änderung am Userscript verifiziert wird. **Von oben nach unten** arbeiten:
Jede Stufe ist stärker als die vorige; Stufe 1–3 laufen ohne Login, Stufe 4–6 brauchen den
Platform-Login im Automatisierungsprofil.

Alle Befehle im Projektordner `F:\001_Coding_Projekte\xDeepSeek_Billing_Badge` ausführen.

---

## Stufe 0 — Vorbereitung

```powershell
node --check xdsh-costs.user.js      # Syntax
```

Erwartung: keine Ausgabe, Exit 0. **Pflicht** nach jeder Änderung.

Prüfen, dass kein Browser mit dem Profil läuft (sonst „Profile in use"):

```powershell
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like '*reasonix-profil*' } | Select-Object ProcessId
```

Erwartung: keine Zeile. `verify-badge.mjs` (Wegwerf-Profil) ist davon nicht betroffen.

---

## Stufe 1 — Parser (schnell, ohne Browser)

```powershell
node test/parse.test.mjs
```

Erwartung: `16 bestanden, 0 fehlgeschlagen`, Exit 0.

Prüft die Funktionen aus der `PURE`-Region: Zahl-/Token-Parsing, Topped-up-Summen,
Tages-/Monatskosten (inkl. Monatsfilter und `REQUEST`-Ausnahme), Formatierung, Zeitangaben,
Fehlerklassifikation (Auth vs. WAF vs. HTTP).

**Bei Änderungen an den Parsern:** Fälle in `test/parse.test.mjs` ergänzen, nie Logik duplizieren.

---

## Stufe 2 — Badge-Verhalten (echtes Chromium, gemockte API)

```powershell
node tools/verify-badge.mjs
```

Erwartung: `4/4 Fälle grün`, Exit 0, plus Screenshot `out/badge-happy-path.png`.

| Fall | Erwarteter Badge-Text | Zusätzlich geprüft |
|---|---|---|
| `happy-path` | `💳 $17.48 · heute $1.45` | Anfrage trägt **Bearer-Header und** Cookie |
| `ohne-token-keine-anfrage` | `💳 nicht angemeldet` | **keine** Anfrage verlässt die Seite |
| `login-noetig` | `💳 Login nötig — platform.deepseek.com` | 401/40003 → Auth-Zustand |
| `letzter-stand-bei-fehler` | `💳 $17.48 · heute $1.45 ⏳` | Fehler mit Fallback auf letzten Stand |

Der Test startet einen lokalen Server auf **Port 8799** (DSH-ähnliche Seite mit
`window.__DSH_BOOT__`) und mockt `https://platform.deepseek.com/**` per Playwright-Routing —
inklusive CORS-Preflight.

---

## Stufe 3 — Echte Tampermonkey-Injektion + echte API

```powershell
node tools/verify-dsh-tm.mjs
```

Erwartung: `injiziert=true`, Text `💳 Login nötig — platform.deepseek.com`,
`TM-TEST:OK`, Screenshot `out/badge-tm-real.png`.

Beweist: Tampermonkey injiziert das **installierte** Skript auf einer DSH-ähnlichen Seite, die
echten `GM_*`-APIs funktionieren, `GM_xmlhttpRequest` erreicht die echte API und ein ungültiger
Token (`localStorage.userToken` wird von der Testseite gesetzt) wird korrekt als Login-Problem
klassifiziert.

> Voraussetzung: das Skript ist im Profil installiert (siehe „Installation/Update" unten) und
> entspricht dem aktuellen Stand der Quelle.

---

## Stufe 4 — End-to-End mit echtem Konto

```powershell
node tools/verify-dsh-tm-live.mjs
```

Erwartung: `LIVE-TEST:OK`, Badge grün im Format `💳 $x.xx · heute $y.yy`,
Screenshot `out/badge-tm-live.png`.

Ablauf: (1) `platform.deepseek.com/usage` öffnen → Platform-Rolle holt den Token in den
GM-Speicher und pusht einen Snapshot; (2) DSH-ähnliche Testseite öffnen → DSH-Rolle liest den
Token aus dem GM-Speicher und rendert. **Stärkster Test** — er deckt die komplette Kette ab.

Beispielmessung 2026-09-10: `💳 $17.35 · heute $1.59`, Tooltip `Kosten Monat: $37.08`.

---

## Stufe 5 — Live-Probe der Endpunkte

```powershell
$env:DSB_MAX_MINUTES='2'; $env:DSB_KEEP_OPEN_S='0'; node tools/live-check.mjs
```

Steuerung **nur über Umgebungsvariablen** (CLI-Argumente erreichen Node bei pwsh-Aufrufen nicht
zuverlässig):

| Variable | Default | Wirkung |
|---|---|---|
| `DSB_URL` | `https://platform.deepseek.com/usage` | Ziel-URL |
| `DSB_OUT` | `out/live-probe.json` | Ausgabedatei |
| `DSB_MAX_MINUTES` | `45` | Laufzeitkappe |
| `DSB_PROBE_EVERY_S` | `120` | Abstand zwischen Proben |
| `DSB_KEEP_OPEN_S` | `0` | Fenster danach noch offen halten (für manuellen Login hoch setzen!) |

Erwartete Marken (eingeloggt):

```
LIVE:token=OK shape=len=92 … | JSON-Objekt keys=value,__version
LIVE:PROBE ok summary=200/301 summaryNoAuth=200/48 cost=200/48935 costNoAuth=200/48
             amount=200/47977 amountNoAuth=200/48
```

- `…NoAuth` = derselbe Aufruf **ohne** `Authorization` (nur Cookies) → **48 Bytes** =
  `{"code":40002,"msg":"Missing Token"}`. Kommt dort ein großer Körper, hat sich die Auth-Lage
  geändert → Analyse aktualisieren!
- Nicht eingeloggt: `token=fehlt shape=len=30 … {"value":n…"0"}` → Nutzer muss sich im Fenster
  anmelden (ggf. erst die WAF-Prüfung „Die Uhren auswählen" lösen).

---

## Stufe 6 — Echte Antworten durch die Parser

```powershell
node tools/live-parse.mjs
```

Erwartung: alle Endpunkte `HTTP 200`, Auswertung `ok`, Gegenprobe
`API-Topped-up vs. DOM` mit Differenz < 0.02, am Ende eine Badge-Vorschau mit echten Werten.

Wichtig: Die DOM-„Cost"-Kachel wird **absichtlich nicht** verglichen — sie folgt dem Zeitfilter
und weicht deshalb ab (gemessen $86.01 gegen echte Tageskosten $1.56). Nur `Topped-up` ist
vergleichbar.

---

## Installation / Update in Tampermonkey

```powershell
# Trockenlauf: prüft Erreichbarkeit + Metadaten
node C:\Users\lolo\.dsh\browser-tools\tm-import.mjs --file "!Ausgabe\xdsh-costs-v<version>.user.js" --dry-run

# Echter Import (Achtung: verändert den TM-Zustand des Profils)
node C:\Users\lolo\.dsh\browser-tools\tm-import.mjs --file "!Ausgabe\xdsh-costs-v<version>.user.js"
```

**Fallstrick:** Der Import endet oft mit `TM:ERROR page.waitForTimeout: Target page, context or
browser has been closed`. Das ist **kein** Fehlschlag — Tampermonkey schließt den
Bestätigungs-Tab (`ask.html`) nach erfolgreicher Installation selbst. Deshalb:

```powershell
node tools/tm-import-diagnose.mjs --file "!Ausgabe\xdsh-costs-v<version>.user.js"
```

Dieses Werkzeug dokumentiert den Bestätigungs-Tab **vor** dem Klick (Text, Buttons, Screenshot)
und liest danach das Dashboard. Erwartung: `DIAG:INSTALLIERT=JA` und eine Zeile wie
`xDSH Costs (DSH)	2.0.0	30 KB`.

Alternative Kontrolle ohne eigenes Skript:

```powershell
node C:\Users\lolo\.dsh\browser-tools\browse.mjs "chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/options.html#nav=installed" --wait 8000 --eval "document.body.innerText.includes('xDSH Costs')"
```

---

## Release-Ablauf

1. `@version` im Skript erhöhen (nie zweimal dieselbe).
2. `CHANGELOG.md` ergänzen.
3. Alle Stufen fahren, die zur Änderung passen (Parser-Änderung → 1+6; Badge-Änderung → 2;
   Auth-/Netzänderung → 3+4+5).
4. Kopie nach `!Ausgabe\xdsh-costs-v<version>.user.js` und **Hash-Gleichheit** prüfen:

```powershell
Copy-Item xdsh-costs.user.js !Ausgabe\xdsh-costs-v<version>.user.js -Force
(Get-FileHash xdsh-costs.user.js).Hash -eq (Get-FileHash !Ausgabe\xdsh-costs-v<version>.user.js).Hash
```

5. Import im Automatisierungsprofil (oben), Dashboard-Prüfung, danach Stufe 4.

---

## Fallstricke (Kurzliste)

- Fenster nicht selbst schließen, wenn der Nutzer etwas tun soll (`DSB_KEEP_OPEN_S` hoch setzen).
- Immer nur **ein** Browserlauf mit `reasonix-profil` gleichzeitig.
- `seen` im Verhaltenstest nach `page.reload()` leeren, sonst zählen Anfragen des ersten Aufbaus.
- Playwright-Routing greift **nicht** für `GM_xmlhttpRequest` (Extension-Kontext).
- Der Auth-Fehler der API kommt als **HTTP 200** mit `code 40002` im Körper.
