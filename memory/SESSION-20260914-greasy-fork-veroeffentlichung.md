# SESSION 2026-09-14 — Veröffentlichung auf Greasy Fork

Dieses Dokument hält fest, wie **xDSH Costs (DSH)** am 2026-09-14 auf Greasy Fork
veröffentlicht wurde: Auftrag, Entscheidungsumkehr, Änderungen, Belege, die aufgetretenen
Fehler und die daraus ableitbare Methodik.

- **Art:** Veröffentlichungs-Session — **keine funktionalen Änderungen** am Badge.
- **Ergebnis:** Skript v2.0.1 live unter <https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh>
  (GF-ID **595732**).

## 1. Auftrag

> „Auf Greasyfork veröffentlichen: <https://github.com/immerzu/xDSH_Costs> — **Keine secrets
> hochladen!**"

**Entscheidungsumkehr:** Bis dahin galt im Projekt ausdrücklich „Ziel ist ein **privates
Werkzeug** (DSH-Badge), kein Greasy-Fork-Listing" (HANDOVER Abschnitt 2, ANALYSE Abschnitt 9).
Mit diesem Auftrag ist das **aufgehoben**; `AGENTS.md` wurde entsprechend korrigiert.

## 2. Vorabprüfung „keine Secrets" (Auftragsbestandteil)

Geprüft wurde nicht nur die Upload-Datei, sondern alles, was öffentlich wird:

| Prüfung | Befehl/Mittel | Ergebnis |
|---|---|---|
| Muster in versionierten Dateien | `git grep -E "Bearer …\|sk-…\|api[_-]?key[:=]\|password[:=]\|secret[:=]"` | **keine Treffer** |
| Muster in **allen** Commits | `git rev-list --all` × `git grep … <commit>` | **keine Treffer** (Historie sauber) |
| Lange Zufallsstrings im Skript | `Select-String '[A-Za-z0-9_-]{32,}'` | **keine Treffer** |
| Rohdatei, die GF zieht | `Invoke-WebRequest raw.githubusercontent.com/…/xdsh-costs.user.js` + Musterprüfung | **0 verdächtige Treffer** |
| Nicht versionierte Artefakte | `out/` (Screenshots, `live-probe.json`) | gitignored; **nicht** Teil des Uploads |

Begründung, warum das Skript grundsätzlich secret-frei sein kann: Der Platform-Token wird
**ausschließlich zur Laufzeit** aus `localStorage.userToken` des Nutzers gelesen
(`readPlatformToken()`), nie geschrieben und nie geloggt (`README.md`: „Der Token wird nie im
Klartext geschrieben"). Es gibt keinen API-Key, keinen Server und keine Zugangsdaten im Code.
Jeder Nutzer authentifiziert sich mit **seinem eigenen** Browser-Login.

## 3. Was geändert wurde (v2.0.0 → v2.0.1)

| Datei | Änderung |
|---|---|
| `xdsh-costs.user.js` | `@version` 2.0.1 · neue Zeile `@description:ru` · `@description` (de) und `@description:en` nennen jetzt Geltungsbereich (DSH-GUI auf `127.0.0.1`/`localhost`) und Kostenhinweis · **`@name` unverändert** (keine `@name:xx`-Zeilen) |
| `description.md` | **neu** — „Zusätzliche Informationen" als Absätze **DE → RU → EN** (Vorgabe aus `userscript-beschreibungen-immerzu`) |
| `CHANGELOG.md` | Eintrag 2.0.1 (GF-Veröffentlichung, Lokalisierung, Secret-Prüfung, Verifikation) |

Zeilenlängen der `@description`-Zeilen: 244 / 258 / 259 Zeichen — alle unter der
GF-Hartgrenze von 500.

## 4. Belege (gemessen, nicht behauptet)

| Prüfung | Ergebnis |
|---|---|
| `node --check xdsh-costs.user.js` | Exit 0, keine Ausgabe |
| `node test/parse.test.mjs` | **16 bestanden, 0 fehlgeschlagen** |
| `node tools/verify-badge.mjs` | **4/4 Fälle grün** (echtes Chromium, Header geprüft) |
| Hash Quelle ↔ `!Ausgabe\xdsh-costs-v2.0.1.user.js` | identisch `21843ECAD5ACD04E…` |
| GitHub-Push | `f967938` == `origin/main`; Rohdatei liefert `@version 2.0.1`, UTF-8 (Kyrillisch) korrekt |
| GF-Metadaten (`/scripts/595732.json`) | `version 2.0.1` · **`locale "de"`** · `license "MIT License"` · `deleted false` · `code_size 31225` |
| Zusatzinfos auf der Skriptseite | DE-, RU- **und** EN-Absatz nachweislich im HTML |
| Sprachsuchen `/de|/en|/ru/scripts?q=xDSH Costs` | in **allen drei** gelistet, jeweils mit **sprachrichtiger** Beschreibung |
| GF-Admin (Soll-Zustand) | `SYNC_IDENTIFIER` = raw `.user.js`, `SYNC_AUTOMATIC 1` · `INFO_SYNC_IDENTIFIER` = raw `description.md`, `markup=markdown` |

## 5. Aufgetretene Fehler und was daraus folgt

### 5.1 `gf-publish.mjs new --import-url …` funktioniert nicht (2 Varianten)

1. Erster Versuch mit `--import-url`: Abbruch **vor** dem Formular mit
   `GF:ERROR page.waitForTimeout: Target page, context or browser has been closed`.
2. Zweiter Versuch: Formular erschien, aber `GF:ERROR IMPORT_URL_PREFILL_LEER len=0` —
   GF befüllt das Codefeld aus `?import_url=…` offenbar nicht (auch nicht binnen 30 s).

→ **Lehre:** Für die **Erstanlage** den Datei-Upload nehmen (`new --file …`), den
**Auto-Sync danach** über das GF-Admin setzen (`gf-admin-sync.mjs`). Der Umweg kostet zwei
Browserläufe statt einer Vermutungskette.

### 5.2 Ein abgebrochener Lauf legt **nichts** an — aber man muss es prüfen

Nach dem ersten Abbruch war unklar, ob schon ein Skript entstanden war. Nachweis über den
öffentlichen JSON-Endpunkt und die Suche: **kein Treffer** → tatsächlich nichts angelegt.
→ **Lehre:** Nach jedem abgebrochenen Upload **immer erst den Ist-Zustand messen**, bevor
man wiederholt — sonst entstehen Duplikate.

### 5.3 `browse.mjs --eval` erreicht Node bei pwsh-Aufrufen nicht

Dreimal aufgerufen, dreimal ohne `BROWSE:EVAL`-Ausgabe (nur der Markdown-Pfad lief).
Das ist der **bekannte pwsh-CLI-Argument-Fallstrick** des Projekts, hier erneut bestätigt.
→ **Lehre:** Verifikation von GF-Objekten **per HTTP**, nicht per Browser-Eval:

```
https://greasyfork.org/scripts/<id>.json          → id, name, version, locale, license, code_size, deleted
https://greasyfork.org/scripts/<id>/versions.json → jüngste Version + Zeitstempel
https://greasyfork.org/<de|en|ru>/scripts?q=<name> → Listung je Sprachsuche (HTML-Match)
```

Das ist schneller, reproduzierbar und ohne Profil-Lock.

### 5.4 Die GF-Skript-Locale wird beim Erst-Upload festgelegt — und passt zur Default-Zeile

GF hat die Locale als **`de`** erkannt (deutsch kommentierter Code) und sie ist danach fix.
Deshalb gilt die Projektregel: `@description` **ohne Suffix** = Sprache der GF-Locale,
weitere Sprachen als `:xx`-Zeilen. Hier: Default **deutsch** ✓, `@description:en` und
`@description:ru` erzeugen die zusätzlichen Sprach-Einträge ✓, **kein** `:de`-Suffix (wird
ignoriert) und **keine** `@name:xx`-Zeilen.

## 6. Wiederverwendbare Methodik

1. **Reihenfolge:** Metablock/`description.md` fertigstellen → Version erhöhen → Changelog →
   Tests (0/1/2) → Verteilkopie + Hash → **Commit + Push** → GF anlegen → Sync im Admin →
   per HTTP verifizieren → Doku/Gedächtnis + Commit.
   Der Push **vor** dem GF-Schritt ist wichtig, weil die Sync-Quelle die Rohdatei aus
   `main` ist.
2. **Secret-Prüfung als 5-Punkte-Raster** (Code, versionierte Dateien, Historie, Rohdatei,
   nicht versionierte Artefakte) — siehe Abschnitt 2.
3. **Sichtbarkeit immer in allen drei Sprachen** prüfen (`/de`, `/en`, `/ru`) **und** je
   Sprache die Beschreibung gegenprüfen; Listung allein genügt nicht.
4. **GF-Admin-Dry-Run zuerst** (`--dry-run` zeigt den Ist-Zustand der Sync-Felder), dann der
   echte Lauf — sonst verwechselt man „schon gesetzt" mit „gerade gesetzt".

## 7. Betrieb ab jetzt (wichtig für künftige Releases)

- **Auto-Sync ist aktiv:** GF zieht `main/xdsh-costs.user.js` automatisch (Repo-Webhook) —
  ein manueller Upload ist **nicht mehr** nötig, aber weiterhin möglich.
- Änderung also: Code anpassen → `@version` erhöhen → `CHANGELOG.md` → **pushen** →
  Versionsseite prüfen (`gf-publish.mjs check --url …/versions --version <neu>`).
- `description.md` wird ebenfalls synchronisiert (`additional_info_sync`, Markdown) —
  inhaltliche Änderungen dort schlagen nach dem nächsten Sync auf die Skriptseite durch.
- **Nicht** dieselbe `@version` zweimal veröffentlichen (GF lehnt identische Versionen ab).

## 8. Offene Punkte

- [ ] **Neuinstallation im Alltagsbrowser** des Nutzers (dort liegt der Platform-Login) —
      weiterhin offen aus der Vorsession; jetzt zusätzlich bequem über die GF-Seite möglich.
- [ ] **Sync-Probe:** nächste echte Versionserhöhung beobachten (Push → GF zieht automatisch).
- [ ] Optional: GF-Icon/Screenshot pflegen, Support-URL auf das GitHub-Repo setzen.
- [ ] Optional: Refresh-Intervall konfigurierbar, Token-Ansicht (`/api/v0/usage/amount`) im Tooltip.

## 9. Nachgang — Skill `greasy-fork-publish` nachgeschärft (2026-09-14)

Auf Auftrag („Aktualisiere den Skill zum Upload eines Skripts, so dass solche Fehler nicht
wieder passieren") wurde `C:\Users\lolo\.dsh\skills\greasy-fork-publish\SKILL.md` erweitert:

- **Neue Sackgassen-Tabelle** (alle verifiziert): `new --import-url` → `IMPORT_URL_PREFILL_LEER`
  (GF befüllt das Codefeld nicht); `/de/scripts/new` → 404; `browse.mjs --eval` → keine Ausgabe
  (pwsh-Argument-Fallstrick); die Skript-ID steht ohnehin in `GF:NEW_OK`.
- **Neuer Ablauf „Erstveröffentlichung (B)"** in der bewährten Reihenfolge: Repo fertigstellen →
  Secret-Prüfung → Push + Rohdatei-Gegenprobe → `new --file` → Admin-Sync (erst `--dry-run`) →
  HTTP-Verifikation → Doku.
- **Neuer Abschnitt „Verifikation ohne Browser"** (`/scripts/<ID>.json`, `/versions.json`,
  Text-Match, Sprachsuchen) samt Locale-Regel: die Locale wird beim Erst-Upload gesetzt und ist
  danach fix — sie muss zur Sprache der Default-`@description` passen.
- **Neuer Abschnitt „Keine Secrets hochladen"** (5-Punkte-Raster: Skript, versionierte Dateien,
  Historie, Rohdatei, nicht versionierte Artefakte).
- **Fallstricke ergänzt:** Abbruch ≠ Anlage (erst Ist-Zustand messen, sonst Duplikat),
  `GF:NEW_WAIT_URL_TIMEOUT` ist kein sicherer Fehlschlag, Zusatzinfos erscheinen erst nach dem
  Sync-Trigger, `--dry-run` vor jedem schreibenden Aufruf.
- Projektliste um **xDSH Costs (595732)** ergänzt; Katalog-Beschreibung auf Trigger-Stil
  umgestellt (Erscheinen im Skill-Katalog verifiziert).

Das Skill-Verzeichnis liegt **nicht** in einem Git-Repo (`git rev-parse --show-toplevel` →
„not a git repository") — die Änderung ist deshalb nur lokal gesichert.

## 10. Verweise

- Skript: <https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh>
- Repo: <https://github.com/immerzu/xDSH_Costs>
- Beschreibungs-Konvention: Skill `userscript-beschreibungen-immerzu`
- Upload-/Sync-Verfahren: Skill `greasy-fork-publish`
- Testrezept: [`TESTEN-userscript-xdsh-costs.md`](TESTEN-userscript-xdsh-costs.md)
