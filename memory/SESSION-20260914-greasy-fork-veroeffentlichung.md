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

- [x] **Neuinstallation im Alltagsbrowser** des Nutzers — **erledigt** (2026-09-14 vom Nutzer
      bestätigt: Skript läuft dort, Tooltip-Zeile `xDSH Costs v2.0.x` im Badge sichtbar; siehe
      Abschnitt 10).
- [x] **Sync-Probe:** am 2026-09-14 mit v2.0.2 durchgeführt — der Webhook zog nicht von selbst,
      der Admin-Trigger sofort (Messwerte in Abschnitt 10).
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

### 9.1 Wirksamkeitsprüfung (Subagenten, 2 Runden)

**Runde 1 (Retrieval):** Ein Subagent mit frischem Kontext bekam die Aufgabe „Skript erstmals
veröffentlichen" und **ohne** Hinweis auf den Skill. Ergebnis: Skill selbst gefunden und geladen
✓, Sackgassen korrekt gemieden ✓, HTTP-Verifikation genutzt ✓ — **aber** er musste die
Existenzprüfung selbst erfinden; der Skill verlangte sie nirgends. Genau daraus hätte ein
Duplikat entstehen können (`new` für ein bereits existierendes Skript).

**Nachschärfung:** Schritt **0 „Existenzprüfung — Pflicht, sonst Duplikat"** in Ablauf B,
neuer Fallstrick („`new` ohne Existenzprüfung = Duplikat"), Merksatz in „Wichtig"
(„Vor jedem Schreiben messen"), Hinweis zur Nicht-Prüfbarkeit des Webhooks per HTTP, sowie der
Falschtreffer-Hinweis beim Secret-Muster (`[A-Za-z0-9_-]{32,}` trifft auch Pfade/Hashes).

**Runde 2 (Re-Test, gleiche Aufgabe ohne Existenz-Hinweis):** Skill geladen ✓, Ist-Zustand
**zuerst gemessen** (`/scripts/595732.json`, `/versions.json`, lokale vs. GF-Version,
`gf-admin-sync --dry-run`), daraus „Update/Sync, kein `new`" abgeleitet ✓, identische Version
korrekt als „kein Upload nötig" erkannt ✓, schreibende Schritte nur beschrieben statt
ausgeführt ✓. **Lücke geschlossen.**

### 9.2 Nebenbefund aus Runde 2: Sync ist live bestätigt

Der Subagent hat die GF-Admin-Sync-Felder read-only ausgelesen (`gf-admin-sync.mjs --dry-run`):

```
SYNC_IDENTIFIER   "https://raw.githubusercontent.com/immerzu/xDSH_Costs/main/xdsh-costs.user.js"
SYNC_AUTOMATIC 1  MANUAL 0
INFO_SYNC_IDENTIFIER "https://raw.githubusercontent.com/immerzu/xDSH_Costs/main/description.md"
INFO_MARKUP_MD 1  HTML 0
```

Damit ist unabhängig belegt, dass der Auto-Sync (Skript **und** Zusatzinfos) tatsächlich
eingerichtet ist — nicht nur zum Zeitpunkt des Setzens, sondern im Ist-Zustand.

### 9.3 Aufteilung: generischer globaler Skill + projektspezifischer lokaler Skill

Nutzerauftrag: „Der Skill soll speziell für unser Skript nur lokal abgelegt werden."

| Wo | Was |
|---|---|
| `C:\Users\lolo\.dsh\skills\greasy-fork-publish\SKILL.md` (global) | **generisch**: Sackgassen, Secret-Raster, HTTP-Verifikation, Ablauf A/B/C, Admin-Sync-Felder, immerzu-Konventionen. Die xDSH-spezifischen Werte wurden **entfernt** — dort steht nur noch ein Verweis. |
| `F:\001_Coding_Projekte\xDSH_Costs\.dsh\skills\xdsh-costs-release\SKILL.md` (**lokal**) | **projektspezifisch**: GF-ID 595732, Slug, Sync-URLs, GM-Schlüssel, Testreihenfolge, Verteilkopie, projektspezifische Fallen, konkrete Verifikationskommandos. |

**Warum `.dsh\skills\` und nicht `skills\`:** Die Discovery des Harness
(`@deepseek-ai/dsh-skill-filesystem`) scannt im Projekt genau
`<projekt>/.dsh/skills` und `<projekt>/.agents/skills` — ein reiner `skills/`-Ordner wird
**nicht** gefunden. Beide Orte liegen innerhalb des Projektordners; `.dsh\skills\` erfüllt damit
„nur lokal im Projekt" **und** ist als Skill ladbar (Katalog-Eintrag `xdsh-costs-release`
verifiziert).

**Nur lokal, nicht public:** Das Repo ist öffentlich, deshalb steht `/.dsh/` in `.gitignore`.
Nachgewiesen mit `git check-ignore -v .dsh/skills/xdsh-costs-release/SKILL.md`
(→ `.gitignore:18:/.dsh/`) und `git status --short --ignored` (→ `!! .dsh/`).

**Lehre für künftige Skills dieses Projekts:** generische Mechanik → globaler Skill;
Projektwerte (IDs, Pfade, Reihenfolgen) → lokaler Skill unter `.dsh\skills\`, per `.gitignore`
ausgenommen. Nie Kopien in beiden Welten pflegen — sonst driften sie auseinander.

### 9.4 Dritte Testrunde: Update-Fall („Bitte das Update ausliefern")

Ein dritter Subagent bekam den **Update**-Fall (Datei geändert → ausliefern), wieder **ohne**
Hinweis auf die Skills. Ergebnis:

- Beide Skills selbst gefunden und geladen: `xdsh-costs-release` → darin benannter
  Required-Sub-Skill `greasy-fork-publish`.
- Korrekte Kette: Diff prüfen → `@version` erhöhen → Changelog → Tests → Verteilkopie + Hash →
  Secret-Prüfung → Commit/Push → GF-Verifikation über `check`/JSON. **Kein** `new`
  (Duplikat-Regel griff), Fallback-Kette (Admin-Trigger, manueller `version`-Upload) korrekt.
- Selbst read-only gemessen: Sync-Felder (`SYNC_AUTOMATIC 1`, `INFO_MARKUP_MD 1`), Parser
  **16/16**, `git grep` **Exit 1** (= keine Secrets).
- **Zusatzbefund:** Er hat die Prämisse der Aufgabe widerlegt („es gibt nichts auszuliefern" —
  Arbeitsbaum clean, kein Diff seit v2.0.1) statt blind zu committen. Genau das Verhalten, das
  die Regel „vor jedem Schreiben messen" bezweckt.

**Nachgeschärft** (im lokalen Skill): neuer Abschnitt „Update-Fall (Auto-Sync) — Erfolgsmarken
und Erwartungen" mit der Vorbedingung „Diff muss existieren", einer Erfolgsmarken-Tabelle
(u. a. `git grep` **Exit 1 = Gutzeichen**, `git ls-remote` als read-only Remote-Check) und den
**zwei noch offenen Punkten**: ob der Repo-Webhook wirklich feuert und ob die GF-Versionsnotiz
beim Sync leer bleibt — beides ist erst im **ersten echten Sync-Lauf** beobachtbar.

**Ehrliche Einordnung (Antwort auf „Wird das nächste Update besser funktionieren?"):**
Der **Ablauf** ist jetzt abgesichert und getestet — die Fehlerklassen von gestern
(`--import-url`, Duplikat, Verifikation per Browser) sind abgedeckt. **Nicht** bewiesen ist der
Sync-Mechanismus selbst: Er ist eingerichtet, aber noch nie gelaufen. Beim ersten echten Update
also die Verifikationskette fahren und bei Stillstand die Fallbacks nutzen.

## 10. Pilotlauf v2.0.2 — der erste echte Sync (2026-09-14)

Auftrag: „Erstelle eine Version 2.0.2 und teste die Veröffentlichung! Passe anschließend den
Skill an, dass er ohne Fehler durchläuft."

**Die Version (echter, kleiner Nutzen statt Leerlauf):** Der Tooltip zeigt jetzt die
**installierte Skriptversion** (`xDSH Costs v2.0.2`), gelesen aus `GM_info.script.version` über
die neue Funktion `scriptVersion()`. Damit ist sofort erkennbar, welche Fassung der Browser
wirklich geladen hat — Tampermonkey aktualisiert nicht immer im selben Moment. Fehlt `GM_info`
(anderer Manager, Testumgebung), entfällt die Zeile ohne Fehler (try/catch). Sonst nichts
geändert: Endpunkte, Auth, Intervalle, GM-Schlüssel (`xdsb.*`), Badge-Text.

**Ablauf (alles gemessen):**

| Schritt | Ergebnis |
|---|---|
| `node --check` · Parser · Badge | Exit 0 · **16/16** · **4/4** |
| Verteilkopie `!Ausgabe\xdsh-costs-v2.0.2.user.js` | hash-gleich `2561B92941CFEB18…` |
| Secret-Prüfung (`git grep`) | **Exit 1** = keine Treffer |
| Commit + Push | `17755fb`, Push um **05:26:27Z** |
| **Auto-Sync (Webhook)** | **zog nicht** — nach ~4 Min stand GF noch auf `2.0.1` (`code_updated_at 05:00:55Z`) |
| **Admin-Trigger** (`gf-admin-sync.mjs`) | **zog sofort** → GF `2.0.2`, `code_updated_at 05:31:09Z` |
| Versionsseite | nennt `2.0.2` |
| **GF-Versionsnotiz** | **leer** — die Seite enthält „2.0.2", aber keinen Changelog-Text (der Sync setzt ihn nicht) |
| GitHub-Release | `gh release create v2.0.2 … --target main` → Tag `v2.0.2` = `17755fb`, Releases-Seite nicht mehr leer |

**Zwei bisher offene Fragen sind damit beantwortet:** (1) Der Webhook ist **nicht** der
verlässliche Weg — nach dem Push messen und den Admin-Trigger setzen. (2) Die GF-Versionsnotiz
bleibt beim Sync **leer**; für eine sichtbare Notiz braucht es den manuellen Upload mit
`--changelog`.

**Skill-Anpassung (Auftragsteil 2):**

- **Lokal** (`.dsh\skills\xdsh-costs-release\SKILL.md`): Schritt 8 „Sync ziehen lassen — nicht auf
  den Webhook warten", Schritt 9 GitHub-Release, und der Abschnitt „Update-Fall" enthält jetzt
  die **Messtabelle des Pilotlaufs** samt Befehlen (Messung mit Cache-Buster + Admin-Trigger).
- **Global** (`greasy-fork-publish`): Ablauf C neu gefasst — messen → triggern → Fallback,
  Versionsnotiz-Hinweis, GitHub-Releases als optionale Doku (für GF irrelevant).
- **Projektdoku:** `AGENTS.md` und `README.md` behaupteten „GF zieht die Datei automatisch" —
  **korrigiert** auf „GF-Sync anstoßen und verifizieren" plus GitHub-Release-Schritt.

**Nebenbefund:** Der Nutzer monierte zu Recht, dass die Antwort ausblieb, während ein langer
Beobachtungslauf lief („Hallo?"). Lehre: Bei mehrminütigen Messläufen **zwischendurch** antworten
oder den Lauf im Hintergrund führen, statt die Antwort bis zum Ende zurückzuhalten.

**Verifikation am lebenden Badge — erledigt (Nutzerbeobachtung):** Ich hatte behauptet, das Skript
sei im Alltagsbrowser „noch nicht installiert" (so stand es seit 2026-09-10 im Gedächtnis) — das
war **falsch** und vom Nutzer korrigiert. Er hat das Skript in seinem Alltagsbrowser laufen und
dort die neue Tooltip-Zeile `xDSH Costs v2.0.x` gesehen — ein besserer Beweis als jeder Testlauf,
weil er den echten Weg (GF → Tampermonkey → DSH-GUI) abdeckt. Ob die Fassung per
Tampermonkey-Auto-Update von Greasy Fork oder per manuellem Import ankam, ist **nicht gemessen**.
Damit sind zugleich die beiden seit dem 10.09. offenen Punkte „Neuinstallation im Alltagsbrowser"
und „Sichtprüfung im echten DSH-GUI" erledigt (das Badge existiert nur im DSH-Kontext).
**Lehre:** Browser-/Installationszustände **nie aus dem Gedächtnis als Fakt ausgeben** — veraltete
„offen"-Markierungen sind keine Messung; im Zweifel den Nutzer fragen.

**Zustellweg des Nutzers (geklärt 2026-09-14):** Er hat v2.0.2 **manuell importiert** — nicht per
Tampermonkey-Auto-Update. Ursache, gemessen: Im Skript (Repo/Verteilkopie) stehen **keine**
`@updateURL`/`@downloadURL`-Zeilen; Greasy Fork hängt sie erst beim Ausliefern an
(`@downloadURL …/595732/xDSH%20Costs%20%28DSH%29.user.js`,
`@updateURL …/595732/xDSH%20Costs%20%28DSH%29.meta.js`). Ein Datei-Import kennt damit **keine**
Update-Quelle. Zwei Alternativen wurden angeboten (einmalig über die GF-Seite installieren **oder**
Update-URLs in den Metablock aufnehmen); der Nutzer hat entschieden: **weiter manuell importieren**.
→ Konsequenz für jedes Release: die Verteilkopie bereitstellen und den manuellen Import nennen.

**Wichtig zur Abgrenzung (vom Nutzer zu Recht nachgefragt):** Das betrifft **nur seinen Rechner**.
**Wer das Skript von der Greasy-Fork-Seite installiert hat, bekommt Updates automatisch** — GF
schreibt `@downloadURL`/`@updateURL` in die installierte Kopie, und die abgefragte Update-Quelle
`https://update.greasyfork.org/scripts/595732/xDSH%20Costs%20%28DSH%29.meta.js` antwortet
**HTTP 200** mit `@version 2.0.2` (gemessen am 2026-09-14). Für die Öffentlichkeit ist der
GF-Weg also vollständig versorgt; nur der Datei-Import aus `!Ausgabe/` kennt keine Update-Quelle.

## 11. Verweise

- Skript: <https://greasyfork.org/de/scripts/595732-xdsh-costs-dsh>
- Repo: <https://github.com/immerzu/xDSH_Costs>
- Beschreibungs-Konvention: Skill `userscript-beschreibungen-immerzu`
- Upload-/Sync-Verfahren: Skill `greasy-fork-publish`
- Testrezept: [`TESTEN-userscript-xdsh-costs.md`](TESTEN-userscript-xdsh-costs.md)
