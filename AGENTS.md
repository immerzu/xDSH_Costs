# Projekt: xDSH Costs (DSH)

Tampermonkey-Userscript: zeigt Topped-up-Balance und Tageskosten des DeepSeek-API-Kontos
als schwebendes Badge im DSH-Web-GUI.

## Projektgedächtnis — zuerst lesen

`memory/README.md` ist der Index des Projektgedächtnisses. **Vor** Arbeiten am Skript lesen,
**nach** Arbeiten ergänzen:

| Dokument | Inhalt |
|---|---|
| [`memory/HANDOVER_20260910.md`](memory/HANDOVER_20260910.md) | Auftrag, Entscheidungen, Bau, Verifikation, Umgebungs-Lehren, Blocker, offene Punkte (Abschnitte 9–11: Umzug, GitHub, Restfehler) |
| [`memory/SESSION-20260910-umzug-und-github.md`](memory/SESSION-20260910-umzug-und-github.md) | **Umzug + GitHub im Detail:** Entscheidungen, Änderungen, Belege/Commits, wiederverwendbare Methodik, Tampermonkey-Umstieg |
| [`memory/ANALYSE-20260910-deepseek-platform-dashboard-endpunkte.md`](memory/ANALYSE-20260910-deepseek-platform-dashboard-endpunkte.md) | Endpunkte, **Auth-Beweis (Token ja / Cookies nein)**, Token-Herkunft, Antwortformen, DOM-Falle, WAF, Codeanker |
| [`memory/TESTEN-userscript-xdsh-costs.md`](memory/TESTEN-userscript-xdsh-costs.md) | Testrezept in 6 Stufen mit Befehlen und erwarteten Checks |
| [`memory/SESSION-20260914-greasy-fork-veroeffentlichung.md`](memory/SESSION-20260914-greasy-fork-veroeffentlichung.md) | **Greasy-Fork-Veröffentlichung (v2.0.1/v2.0.2, GF-ID 595732):** Auftrag, Secret-Prüfung, Sync-Einrichtung, Belege, Fehler/Lehren; Abschnitt 10: **Pilotlauf des Syncs mit v2.0.2** |

## Installation in Tampermonkey (wichtig nach Umbenennungen)

Das Skript hat **zwei Identitäten**, die Tampermonkey unterscheidet: der `@name` bestimmt, ob ein
Import ein **Update** oder ein **neues Skript** ist.

- Aktueller Stand: `@name` **xDSH Costs (DSH)**, Datei `xdsh-costs.user.js`, v2.0.2
  (auf Greasy Fork veröffentlicht, GF-ID 595732).
- **Jede Änderung des `@name` ist für Tampermonkey ein neues Skript.** Dann gilt: neues Skript
  importieren **und den alten Eintrag löschen**, sonst laufen beide parallel.
- Die **GM-Speicher-Schlüssel `xdsb.token` / `xdsb.tokenAt` / `xdsb.snapshot` / `xdsb.pos` sind
  bewusst stabil** (Stand 2.0.0). Sie **nicht** umbenennen, ohne eine Migration einzubauen —
  sonst ist der Platform-Token im Skript-Speicher weg und das Badge zeigt vorübergehend
  „nicht angemeldet", bis `platform.deepseek.com` einmal besucht wurde.
- Import-Werkzeug und Fallstricke: `TESTEN-userscript-xdsh-costs.md`, Abschnitt
  „Installation / Update in Tampermonkey".

## Repository

| | |
|---|---|
| GitHub | <https://github.com/immerzu/xDSH_Costs> (**public**), Branch `main` |
| Erstanlage | 2026-09-10, `gh repo create immerzu/xDSH_Costs --public --source . --remote origin --push` |
| Nicht im Repo | `!Ausgabe/` (Verteilkopien) und `out/` (Testartefakte) — per `.gitignore`; `Archiv/` ist bewusst versioniert |

## Greasy Fork (veröffentlicht seit 2026-09-14)

| | |
|---|---|
| Skriptseite | <https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh> (**GF-ID 595732**) |
| Skript-Locale | **`de`** (von GF beim Erst-Upload erkannt und danach fix) |
| Auto-Sync Skript | `https://raw.githubusercontent.com/immerzu/xDSH_Costs/main/xdsh-costs.user.js` (`sync_type=automatic`) |
| Auto-Sync Zusatzinfos | `https://raw.githubusercontent.com/immerzu/xDSH_Costs/main/description.md` (`value_markup=markdown`) |
| Metablock-Regel | `@description` **ohne Suffix** = Locale-Sprache (hier Deutsch), weitere Sprachen als `@description:en` / `:ru`; **keine** `@name:xx`-Zeilen; jede Zeile ≤ 500 Zeichen |
| „Zusätzliche Informationen" | `description.md` im Repo-Root, Absätze **DE → RU → EN** |

**Release-Ablauf ab jetzt:** Code ändern → `@version` erhöhen (nie zweimal dieselbe) →
`CHANGELOG.md` → Tests → Verteilkopie → **Commit + Push auf `main`** → **GF-Sync anstoßen und
verifizieren** → **GitHub-Release** (`gh release create v<version> --title … --notes … --target main`).
Der Repo-Webhook zog im Pilotlauf (v2.0.2, 2026-09-14) **nicht** von selbst — der Admin-Trigger
zog sofort. Prüfen mit
`node C:\Users\lolo\.dsh\browser-tools\gf-publish.mjs check --url https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh/versions --version <neu>`
oder per `https://greasyfork.org/scripts/595732.json` (Feld `version`).

**Veröffentlichungsregel:** Vor jedem Upload/Release sicherstellen, dass **keine Secrets** in
Skript, `description.md` oder Repo stehen. Der Platform-Token wird ausschließlich zur Laufzeit
aus `localStorage` gelesen und nie geschrieben — Details und Prüfraster:
[`memory/SESSION-20260914-greasy-fork-veroeffentlichung.md`](memory/SESSION-20260914-greasy-fork-veroeffentlichung.md), Abschnitt 2.

**Projektspezifisches Release-Rezept (nur lokal):** `.dsh\skills\xdsh-costs-release\SKILL.md` —
GF-ID, Sync-URLs, GM-Schlüssel, Testreihenfolge, Verteilkopie und die konkreten
Verifikationskommandos für dieses Skript. Der Ordner ist per `/.dsh/` von Git **ausgenommen**
(das Repo ist public) und darf dort bleiben, wo er ist. Generische Greasy-Fork-Mechanik
(Sackgassen, Secret-Raster, HTTP-Verifikation) steht weiterhin im globalen Skill
`greasy-fork-publish` — nicht doppelt pflegen.

## Ablageregel (verbindlich)

Alle Informationen und Daten zu diesem Projekt liegen ausschließlich hier:
`F:\001_Coding_Projekte\xDSH_Costs` (vormals `xDeepSeek_Billing_Badge`)

- Skriptversionen (Verteilkopien) immer nach `!Ausgabe\xdsh-costs-v<version>.user.js`
  (per `.gitignore` ausgenommen). Vor dem Weitergeben Hash-Gleichheit mit der Quelle prüfen.
- Änderungen immer in `xdsh-costs.user.js` → `@version` erhöhen → `CHANGELOG.md` ergänzen.

## Zweck und Grenzen

- Ziel ist ein **Werkzeug für den eigenen DSH-Arbeitsplatz**, seit 2026-09-14 zusätzlich
  **öffentlich auf Greasy Fork** (GF-ID 595732). Es bleibt ein Einzweck-Skript: Badge im
  DSH-GUI, kein allgemeines Billing-Tool.
- **Keine Secrets:** Der Platform-Token wird nur zur Laufzeit aus dem `localStorage` des
  jeweiligen Nutzers gelesen — nie im Code, nie im Repo, nie in `description.md`. Jeder
  Nutzer authentifiziert sich mit seinem eigenen Browser-Login.
- Datenquelle sind die **privaten** Dashboard-Endpunkte der Platform-Web-Session
  (`/api/v0/users/get_user_summary`, `/api/v0/usage/cost`). Kein API-Key, keine Modellaufrufe.
- Authentifizierung **zwingend** über `Authorization: Bearer <userToken>` (localStorage der
  Platform-Seite). Cookies werden mitgesendet, authentifizieren aber nicht —
  live belegt: `{"code":40002,"msg":"Missing Token"}`. Kein Server, kein Tracking,
  keine externen Calls außer an `platform.deepseek.com`.

## Tests (vor jedem Release)

```bash
node test/parse.test.mjs      # Parser (reine Funktionen, aus dem Userscript extrahiert)
node tools/verify-badge.mjs   # 4 Badge-Zustände im echten Chromium, gemockte API
```

Die reinen Funktionen liegen im Userscript zwischen `// #region PURE` und
`// #endregion PURE` — dieser Block wird vom Test extrahiert, es gibt also nur eine
Quelle der Wahrheit. **Neue Parser-Fälle immer dort ergänzen, nicht duplizieren.**

`verify-badge.mjs` prüft nicht nur den Badge-Text, sondern auch **welche Header die
Anfrage trägt** (Happy Path: Cookie **und** Bearer) bzw. dass **ohne Token gar keine
Anfrage** rausgeht. Beim Erweitern darauf achten, dass `seen` nach dem `page.reload()`
geleert wird — sonst zählen die Anfragen des ersten Seitenaufbaus mit.

## Wichtige Fallstricke

- **CLI-Argumente erreichen Node bei pwsh-Aufrufen nicht zuverlässig** → Werkzeuge über
  Umgebungsvariablen steuern (`DSB_*`, siehe README).
- **Profil-Lock:** `tools/live-check.mjs` und `tools/verify-badge.mjs` bzw. `tm-import.mjs`
  dürfen nicht gleichzeitig laufen. `verify-badge.mjs` nutzt ein Wegwerf-Profil (kein Konflikt),
  `live-check.mjs` und `tm-import.mjs` brauchen `reasonix-profil` → nacheinander ausführen.
- **Das Automatisierungsprofil ist nicht der Alltagsbrowser.** Dort gibt es keinen
  Platform-Login; für Live-Proben muss man sich im geöffneten Fenster einmal anmelden
  (inkl. AWS-WAF-Puzzle „Human Verification").
- **Badge-Gate:** Im DSH-Kontext läuft das Skript nur auf Seiten mit `window.__DSH_BOOT__`
  bzw. auf Port 3080 — sonst würde es auf jedem lokalen Dev-Server erscheinen.
- **`userToken` in localStorage** ist ein appKit-Wrapper (`{"value":…,"__version":"0"}`);
  vor dem Login steht dort `{"value":null}` — das ist kein Token (Parser prüft Länge/Whitespace).
- **Cookie-Irrtum (belegt widerlegt):** Die Dashboard-Endpunkte authentifizieren **nicht**
  über Session-Cookies. Ohne `Authorization`-Header kommt `{"code":40002,"msg":"Missing Token"}`.
  Der Token ist Pflicht; Cookies werden nur zusätzlich für die WAF-Schicht mitgesendet.
- **`tm-import.mjs` bricht beim ERSTEN Import ab:** Tampermonkey schließt den
  Bestätigungs-Tab (`ask.html`) nach erfolgreicher Installation selbst, danach läuft
  `waitForTimeout` ins Leere (`Target page, context or browser has been closed`).
  Die Installation ist trotzdem erfolgreich → immer im Dashboard prüfen
  (`options.html#nav=installed`) oder `tools/tm-import-diagnose.mjs` verwenden,
  das den Tab vor dem Klick dokumentiert und danach das Dashboard liest.

## Werkzeuge (außerhalb des Projekts)

- `C:\Users\lolo\.dsh\browser-tools\lib.mjs` — Chromium/Profil-Konstanten, `launchBrowser()`
- `C:\Users\lolo\.dsh\browser-tools\tm-import.mjs` — Userscript in Tampermonkey importieren/aktualisieren
- `C:\Users\lolo\.dsh\browser-tools\browse.mjs` — Seite öffnen, JS ausführen, Screenshot
  (Achtung: `--eval` erreicht Node bei pwsh-Aufrufen nicht zuverlässig → für GF lieber HTTP nutzen)
- `C:\Users\lolo\.dsh\browser-tools\gf-publish.mjs` — Greasy Fork: `status`/`new`/`version`/`check`/`dump`
- `C:\Users\lolo\.dsh\browser-tools\gf-admin-sync.mjs` — GF-Admin-Sync (Skript-URL + `description.md`) setzen
- Skills: `tampermonkey-install-update`, `playwright-browser`, `greasy-fork-publish`,
  `userscript-beschreibungen-immerzu`

## Werkzeuge (im Projekt)

| Werkzeug | Zweck |
|---|---|
| `tools/verify-badge.mjs` | 4 Badge-Zustände, Wegwerf-Profil, gemockte API, prüft auch die Header |
| `tools/verify-dsh-tm.mjs` | echte TM-Injektion + echte API (ungültiger Token → „Login nötig") |
| `tools/verify-dsh-tm-live.mjs` | End-to-End mit echtem Konto (Platform-Rolle → Token → DSH-Badge) |
| `tools/live-check.mjs` | Live-Probe der Endpunkte mit **und ohne** Token (ENV-Steuerung) |
| `tools/live-parse.mjs` | echte Antworten durch die Skript-Parser |
| `tools/tm-import-diagnose.mjs` | TM-Import mit Tab-Dokumentation + Dashboard-Prüfung |

## Stand

**v2.0.2** — GF-Metadaten plus neu: der **Tooltip zeigt die installierte Skriptversion**
(`GM_info`). **Vollständig verifiziert**: Parser-Tests 16/16, Badge-Verhalten 4/4 (echtes
Chromium), echte TM-Injektion + echte API, **End-to-End mit echtem Konto**
(`💳 $17.35 · heute $1.59`). In Tampermonkey des Automatisierungsprofils installiert.
**Auf Greasy Fork veröffentlicht** (GF-ID 595732, Locale `de`; **Pilotlauf des Syncs am
2026-09-14 mit v2.0.2 bestanden** — Details:
[`memory/SESSION-20260914-greasy-fork-veroeffentlichung.md`](memory/SESSION-20260914-greasy-fork-veroeffentlichung.md),
Abschnitte 9–10). GitHub-Release `v2.0.2` angelegt.
**Im Alltagsbrowser des Nutzers installiert und im Betrieb bestätigt** (2026-09-14: Nutzer hat die
neue Tooltip-Zeile `xDSH Costs v2.0.x` im laufenden Badge gesehen) — die frühere Angabe „dort noch
offen" war veraltet.

**Hinweis zum Umzug auf 2.0.0 (2026-09-10):** Der `@name` hat sich geändert (vormals
„xDeepSeek Billing Badge (DSH)") — Tampermonkey behandelt das als **neues Skript**, ein
In-Place-Update gibt es nicht. Nach dem Import des neuen Skripts den alten
Tampermonkey-Eintrag löschen, damit das Badge nicht doppelt erscheint. Die
GM-Speicher-Schlüssel (`xdsb.token`, `xdsb.tokenAt`, `xdsb.snapshot`, `xdsb.pos`) wurden
**bewusst nicht** umbenannt, damit Token und letzter Stand sofort wieder verfügbar sind.
