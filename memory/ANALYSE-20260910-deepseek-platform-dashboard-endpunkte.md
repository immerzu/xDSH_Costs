# ANALYSE 2026-09-10 — DeepSeek-Platform: Dashboard-Endpunkte, Auth und Antwortformen

Zentrale technische Analyse des Projekts. Alle Zahlen sind **gemessen**, nicht abgeleitet;
jede Zeile mit Messwert stammt aus einem echten Lauf (Datum jeweils 2026-09-10) und ist über
die Werkzeuge in `tools/` reproduzierbar.

---

## 1. Frage: Wie kommt man an Kontostand und Tageskosten?

Die Platform-Seite lädt ihre Werte über **private JSON-Endpunkte** derselben Origin. Drei sind
relevant (alle `GET`, alle brauchen `Authorization: Bearer <userToken>`):

| Endpunkt | Liefert | Gemessen |
|---|---|---|
| `/api/v0/users/get_user_summary` | Kontostände (aufgeladen + Gratis) | HTTP 200, **301 Bytes** |
| `/api/v0/usage/cost?month=M&year=YYYY` | Kosten pro Tag und Modell | HTTP 200, **48 935 Bytes** |
| `/api/v0/usage/amount?month=M&year=YYYY` | Tokens/Requests pro Tag und Modell | HTTP 200, **47 977 Bytes** |

Referenz für Form und Semantik (nicht für die Auth-Wege dieses Projekts): das macOS-Tool
**CodexBar** dokumentiert dieselben Endpunkte —
[`docs/deepseek.md`](https://github.com/steipete/CodexBar/blob/main/docs/deepseek.md) und die
Parser [`DeepSeekUsageFetcher.swift`](https://github.com/steipete/CodexBar/blob/main/Sources/CodexBarCore/Providers/DeepSeek/DeepSeekUsageFetcher.swift) /
[`DeepSeekUsageCostParser.swift`](https://github.com/steipete/CodexBar/blob/main/Sources/CodexBarCore/Providers/DeepSeek/DeepSeekUsageCostParser.swift).

## 2. Auth: Token ja — Cookies nein (widerlegte Annahme)

Der Nutzer fragte: „Geht das nicht auch über Cookies? Ich bin doch sowieso auf der Webseite
angemeldet." Die Antwort ist **nein**, und zwar gemessen — im eingeloggten Platform-Tab,
gleiche Origin, einmal mit und einmal ohne Header:

| Aufruf | Status | Körper |
|---|---|---|
| `get_user_summary` **mit** `Authorization: Bearer …` | 200 | 301 Bytes echte Daten |
| `get_user_summary` **ohne** Header (Cookies via `credentials: 'include'`) | 200 | **48 Bytes**: `{"code":40002,"msg":"Missing Token","data":null}` |
| `usage/cost` ohne Header | 200 | ebenfalls `Missing Token` |
| `usage/amount` ohne Header | 200 | ebenfalls `Missing Token` |

Konsequenzen:

- **Der Token ist Pflicht**; Cookies authentifizieren die API nicht. (Die Platform legt ihren
  Login nicht als Session-Cookie ab, sondern in `localStorage`.)
- Achtung: Der Fehler kommt als **HTTP 200 mit Fehlercode im Körper** — wer nur auf den
  Statuscode schaut, hält die Antwort für gültig. Deshalb prüft das Skript beides
  (`toppedUpFromSummary` liefert `null` → `classifyFailure`).
- Cookies werden trotzdem mitgesendet (`anonymous: false` bzw. `credentials: 'include'`) —
  nützlich gegen die AWS-WAF-Schicht, aber ohne Beweiswert für die Authentifizierung.
- Frühere CodexBar-Versionen hatten ein `cookieHeader`-Feld; das ist **kein** Beleg dafür, dass
  die API heute per Cookie authentifiziert (die Doku nennt es ausdrücklich „legacy").

## 3. Woher der Token kommt

- Ort: `localStorage.userToken` auf `https://platform.deepseek.com`.
- Form: appKit-Wrapper — **`{"value":"<token>","__version":"0"}`**, gemessen 92 Zeichen roh.
- **Vor dem Login:** `{"value":null,"__version":"0"}` (30 Zeichen). Das ist **kein** Token;
  `parseToken` verwirft es über Längen- und Whitespace-Prüfung.
- `readPlatformToken()` liest über `unsafeWindow.localStorage`; der Token-Wächter legt ihn als
  `xdsb.token` in den GM-Speicher, damit die DSH-Seite ihn ohne Platform-Besuch nutzen kann.

## 4. Antwortformen und Parserregeln

### Kontostand

```
{ code, data: { biz_code, biz_msg, biz_data: {
    normal_wallets: [ { balance: 17.3845545288, currency: "USD" } ],
    bonus_wallets:  [ { balance: 0, currency: "USD" } ] } } }
```

- „Topped-up balance" = Summe `normal_wallets` je Währung (USD bevorzugt).
- Gratisguthaben = `bonus_wallets` → nur für Tooltip/Gesamtsumme, **nicht** für die Badge-Zahl.
- Rohwert ist ein Float mit vielen Nachkommastellen; die Platform zeigt gerundet **$17.38**,
  das Badge ebenfalls (`toFixed(2)`).

### Kosten

```
{ code, data: { biz_code, biz_msg, biz_data: [ { currency: "USD", total: [...],
    days: [ { date: "2026-09-10", data: [ { model: "…", usage: [
        { type: "PROMPT_CACHE_HIT_TOKEN",  amount: "0.91" },
        { type: "PROMPT_CACHE_MISS_TOKEN", amount: "0.33" },
        { type: "RESPONSE_TOKEN",          amount: "0.21" },
        { type: "REQUEST",                 amount: "0" } ] } ] } ] } ] } }
```

- **Tageskosten** = Summe aller `amount` eines Tages, **ohne** Typ `REQUEST`.
- `biz_data` wird als **Array** geliefert (Parser toleriert auch ein Objekt).
- Beträge sind **Strings** (z. B. `"0.91"`).
- **Zeitraum:** die Antwort enthält den **kompletten angefragten Monat** — gemessen
  `2026-09-01 … 2026-09-30`, also 30 Einträge inklusive künftiger Tage ohne Beträge. Die
  Monatssumme wird trotzdem auf `YYYY-MM` des heutigen Tages gefiltert.
- Gemessene Werte: **$1.56 heute**, **$37.04 im September** (erste Probe) bzw. **$1.59 / $37.08**
  (End-to-End-Lauf wenige Minuten später) — die Werte laufen also live mit.

## 5. Die DOM-Falle (warum die Seite NICHT ausgelesen wird)

Im selben Lauf, in dem die API $1.56 Tageskosten lieferte, zeigte die Seite:

| DOM-Element | Wert |
|---|---|
| Karte „Topped-up balance" | **$17.38** — deckt sich exakt mit der API |
| Kachel „Cost" (Zeile der Statistik-Karten) | **$86.01** — **nicht** die Tageskosten |

Die „Cost"-Kachel folgt dem **gewählten Zeitfilter** (Today/Month/…). Wer sie ausliest und als
Tageswert beschriftet, schreibt dauerhaft falsche Zahlen ins Badge. Deshalb:

- **Kein DOM-Scraping** (bewusst, siehe Kommentar im Skriptkopf).
- Nur die API, deren Zeitbezug eindeutig aus dem Datum des Tageseintrags folgt.

Lehre allgemein: Bei solchen Dashboards ist der sichtbare Wert ohne den zugehörigen Filter
wertlos.

## 6. AWS-WAF

- Frische/leere Browserprofile bekommen auf `platform.deepseek.com` eine
  **„Human Verification"** (Puzzle „Die Uhren auswählen"). Ohne Lösung sieht der Nutzer nur die
  Challenge, und `localStorage` enthält nur `aws*`-Schlüssel.
- Nach dem Lösen bleibt der WAF-Token im Profil; danach laden die Seiten normal.
- Für das Badge selbst ist das irrelevant: es ruft **keine HTML-Seiten** ab, sondern nur die
  JSON-Endpunkte (die den `aws-waf-token` als Cookie mitbekommen).

## 7. Umgebungs-Fallstricke (teuer erkauft)

1. **CLI-Argumente erreichen Node bei pwsh-Aufrufen nicht zuverlässig.** Bestätigt: ein Aufruf
   mit `--await-login 1500` lief mit Wartezeit 0 und schloss das Fenster sofort. → Werkzeuge über
   **ENV-Variablen** steuern (`DSB_URL`, `DSB_OUT`, `DSB_MAX_MINUTES`, `DSB_PROBE_EVERY_S`,
   `DSB_KEEP_OPEN_S`).
2. **Profil-Trennung:** `reasonix-profil` ist nicht der Alltagsbrowser. Dort war kein
   Platform-Login (Cookies: nur `.deepseek.com ds_cookie_preference`, `aws-waf-token`,
   `chat.deepseek.com smidV2`) — es wird nichts gelöscht, die Profile sind einfach verschieden.
3. **Profil-Lock:** `live-check`/`verify-dsh-tm*`/`tm-import` brauchen das Profil exklusiv.
   `verify-badge.mjs` nutzt bewusst ein Wegwerf-Profil und kollidiert nicht.
4. **Playwright-Routing erreicht keine Extension-Requests.** `GM_xmlhttpRequest` läuft im
   Hintergrund der Extension — Mocks greifen dort nicht. Echte GM-Aufrufe müssen gegen die echte
   API getestet werden (genau das macht `verify-dsh-tm.mjs`).
5. **CORS im Test:** Für die gemockte Cross-Origin-Anfrage müssen Preflight (`OPTIONS`) und
   `access-control-allow-origin` (gespiegelte Origin, `allow-credentials: true`) beantwortet
   werden; Cross-Site-Cookies brauchen `SameSite=None; Secure`.
6. **Messung schärfen:** Nach `page.reload()` muss die Request-Liste geleert werden, sonst zählt
   die Anfrage des ersten Seitenaufbaus mit (hat im Test einen Fehlalarm erzeugt).
7. **`tm-import.mjs`** bricht nach dem Klick auf „Installieren" mit „Target page, context or
   browser has been closed" ab — Tampermonkey **schließt den Bestätigungs-Tab nach Erfolg
   selbst**. Die Installation ist trotzdem erfolgreich. Prüfen im Dashboard
   (`options.html#nav=installed`) oder `tools/tm-import-diagnose.mjs` nutzen.
8. **Test-Extraktion der PURE-Region:** Der Regex muss den Rest der Marker-Zeile schlucken
   (`/\/\/ #region PURE[^\n]*\n([\s\S]*?)\/\/ #endregion PURE/`), sonst wird der Kommentartext
   als Code ausgewertet.

## 8. Codeanker im Userscript

| Thema | Stelle |
|---|---|
| Konstanten (Intervalle, Schlüssel) | `CFG` am Dateikopf |
| Reine, testbare Logik | `// #region PURE` … `// #endregion PURE` (`num`, `parseToken`, `localDayIso`, `fmtMoney`, `toppedUpFromSummary`, `dailyCostFromUsage`, `relTime`, `classifyFailure`) |
| HTTP + Auth-Header + Cookies | `httpGet(url, token)` (`anonymous: false` / `credentials: 'include'`) |
| Token-Quelle | `pageLocalStorage()`, `readPlatformToken()` |
| Abruf + Snapshot | `fetchSnapshot(token, source)`, `saveSnapshot`, `loadSnapshot` |
| Badge-DOM + Zustände | `ensureBadge`, `renderBadge`, `viewFromResult`, `freshView`, `buildStaleView`, `noDataView`, `loadingView`, `badgeText`, `badgeTitle` |
| Position + Interaktion | `applySavedPosition`, `installBadgeInteractions` (Ziehen, Klick öffnet `/usage`) |
| Rollen | `isDshPage()` (Gate über `window.__DSH_BOOT__` oder Port 3080), `startDshBadge()`, `startPlatformPush()` |

## 9. Bewusste Nicht-Entscheidungen

- **Kein API-Key** (Nutzer-Vorgabe: keine Token-Kosten) — obwohl `https://api.deepseek.com/user/balance`
  den Kontostand ebenfalls liefern würde; die **Tageskosten gibt es dort nicht**.
- **Kein DSH-Plugin** — ein natives Badge in der Session-Kopfzeile wäre optisch integrierter,
  brächte aber ein eigenes Plugin-Paket, Build/Restart und Update-Fragilität mit.
- **Kein DOM-Scraping** (Abschnitt 5).
- **Kein Greasy-Fork-Upload** — privates Werkzeug.

## 10. Offene Fragen

- Verhält sich `GM_xmlhttpRequest` aus der **echten DSH-Seite** anders als aus der Testseite
  (Header `Origin: http://127.0.0.1:3080`, WAF-Bewertung)? Im End-to-End-Lauf kam der Wert aus
  dem Push der Platform-Seite (Quelle `platform`); der direkte GM-Abruf mit gültigem Token aus
  der DSH-Rolle ist noch nicht isoliert gemessen.
- Läuft der Token irgendwann ab? Verhalten ist abgedeckt (Zustand „Login nötig"), die
  Lebensdauer ist unbekannt.
- Ändern sich die privaten Endpunkte? Dann zeigt das Badge einen Fehlerzustand; der Parser ist
  defensiv (Array/Objekt, String/Zahl), aber nicht Hellseher.
