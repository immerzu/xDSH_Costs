# Design: Auslagerung „xDSH Costs" nach `F:\001_Coding_Projekte\xDSH_Costs`

- **Datum:** 2026-09-10
- **Status:** freigegeben (Nutzer-Entscheidungen 1–3 eingeholt)
- **Quelle:** `F:\001_Coding_Projekte\xDeepSeek_Billing_Badge` (Userscript v1.1.0, kein Git-Repo)
- **Ziel:** `F:\001_Coding_Projekte\xDSH_Costs` (leer, kein Git-Repo)

## 1. Auftrag

Das Projekt, das **Kosten und Guthaben im DSH-Web-GUI** als schwebendes Badge anzeigt,
wird in den neuen Projektordner `xDSH_Costs` ausgelagert und dabei umbenannt.
Das Schwesterprojekt `xDeepSeek_Token_Badge` (Kontext-Füllstand, Greasy-Fork 595207 mit
Auto-Sync, Repo `immerzu/xDeepSeek_Token_Badge`) ist **nicht** Teil dieses Umzugs und
bleibt unverändert.

## 2. Entscheidungen des Nutzers

| Frage | Entscheidung |
|---|---|
| Umfang | Nur `xDeepSeek_Billing_Badge` (nicht das Token-Badge) |
| Struktur | Inhalt **direkt** in `xDSH_Costs` (kein Unterordner) |
| Alter Ordner | **Löschen nach Verifikation** (Hash-/Dateivergleich) |
| Git | **Neu initialisieren** in `xDSH_Costs` (kein GitHub-Repo in diesem Schritt) |
| Benennung | Skript umbenennen: `xdsh-costs.user.js`, `@name` „xDSH Costs" |
| Testartefakte | `out/` wird mitgenommen (per `.gitignore` ausgenommen) |
| GM-Speicher | Schlüssel-Präfix **`xdsb.*` bleibt unverändert** (kein Datenverlust) |
| Version | **2.0.0** (neue Identität, im CHANGELOG dokumentiert) |
| Tampermonkey | Nur Doku-Hinweis; Neuinstallation macht der Nutzer |

## 3. Zielstruktur

```
F:\001_Coding_Projekte\xDSH_Costs\
  xdsh-costs.user.js                       Quelle, v2.0.0, @name "xDSH Costs (DSH)"
  !Ausgabe\
    xdsh-costs-v2.0.0.user.js              Verteilkopie (hash-gleich zur Quelle)
    xdsh-costs-v2.0.0.user.js Archiv der Vorgängerversion (unverändert)
  AGENTS.md  README.md  CHANGELOG.md  .gitignore
  docs\specs\2026-09-10-xdsh-costs-umzug-design.md   diese Spec
  memory\
    README.md  HANDOVER_20260910.md
    ANALYSE-20260910-deepseek-platform-dashboard-endpunkte.md
    TESTEN-userscript-xdsh-costs.md
  test\parse.test.mjs
  tools\{verify-badge,verify-dsh-tm,verify-dsh-tm-live,live-check,live-parse,tm-import-diagnose}.mjs
  out\                                      Testartefakte (gitignored)
```

## 4. Änderungen im Detail

### 4.1 Userscript (`xdsh-costs.user.js`)

| Stelle | vorher | nachher |
|---|---|---|
| Dateiname | `xdsh-costs.user.js` | `xdsh-costs.user.js` |
| `@name` | `xDSH Costs (DSH)` | `xDSH Costs (DSH)` |
| `@version` | `1.1.0` | `2.0.0` |
| Kopfkommentar | `xDSH Costs (DSH)` | `xDSH Costs (DSH)` |
| Badge-DOM-Id | `xdsh-costs-badge` | `xdsh-costs-badge` |
| Log-Präfix | `[xDSH Costs]` | `[xDSH Costs]` |
| GM-Keys | `xdsb.token`, `xdsb.tokenAt`, `xdsb.snapshot`, `xdsb.pos` | **unverändert** |

`@namespace`, `@match`, `@grant`, `@connect`, `@description`(+`:en`), `@license` bleiben.
Die reinen Funktionen zwischen `// #region PURE` / `// #endregion PURE` bleiben inhaltlich
unangetastet — sie sind die einzige Quelle der Wahrheit für die Tests.

### 4.2 Begleitdateien

- **`test/parse.test.mjs`**: Skriptpfad `../xdsh-costs.user.js`, Testtitel „xDSH Costs".
- **`tools/live-parse.mjs`**: Skriptpfad `../xdsh-costs.user.js`.
- **`tools/tm-import-diagnose.mjs`**: Vorgabedatei `!Ausgabe/xdsh-costs-v2.0.0.user.js`,
  Erkennungsregex auf „xDSH Costs" angepasst (Version 2.0.0).
- **`tools/verify-badge.mjs`**, **`verify-dsh-tm.mjs`**, **`verify-dsh-tm-live.mjs`**:
  Selektor `#xdsh-costs-badge`, Skriptpfad; GM-Key-`localStorage`-Setzungen bleiben `xdsb.*`
  (sie spiegeln den Skript-Speicher).
- **`AGENTS.md`**: Projektname, Ablageregel (neuer Pfad), Dateinamen, Stand.
- **`README.md`**: Titel, Installations-/Dateitabelle, Pfade.
- **`CHANGELOG.md`**: neuer Eintrag `2.0.0` — Umzug, Umbenennung, GM-Keys bewusst stabil,
  **Hinweis**: nach Neuinstallation das alte „xDSH Costs" in Tampermonkey
  entfernen (neuer `@name` = neues Skript, kein In-Place-Update).
- **`memory/*`**: Projektname, Pfadangaben und Befehle (insbesondere das Testrezept) angepasst;
  der historische HANDOVER bleibt inhaltlich erhalten, erhält aber einen Umzugs-Nachtrag.

## 5. Ablauf (Reihenfolge)

1. Zielordner-Existenz und Leerstand prüfen (bereits bestätigt: 0 Einträge).
2. Alle Projektdateien nach `xDSH_Costs` kopieren (`Copy-Item -Recurse`).
3. Umbenennungen/Textanpassungen nach Abschnitt 4 durchführen.
4. `.gitignore` prüfen/anpassen (unverändert gültig: `out/`, `!Ausgabe/`, `_tmp_*`).
5. **Tests im neuen Ordner**: `node test/parse.test.mjs` (erwartet 16/16) und
   `node tools/verify-badge.mjs` (erwartet 4/4).
6. **Verifikation vor Löschen**: Dateiliste alt↔neu vergleichen; SHA256 aller Dateien außer
   der bewusst geänderten vergleichen; Dokumentationsstellen per Grep gegenprüfen
   (keine Treffer mehr auf `xdsh-costs` außer im Archiv).
7. `git init` + erster Commit in `xDSH_Costs`.
8. Alten Ordner `xDeepSeek_Billing_Badge` löschen (nur nach erfolgreichem Schritt 6).
9. Projektgedächtnis aktualisieren: `01_Helfer/memory/HANDOVER_<heute>-xdsh-costs.md` und
   Querverweis im HANDOVER des Billing-Projekts ersetzen (der zieht mit um).

## 6. Erfolgskriterien

- `xDSH_Costs` enthält das vollständige Projekt; `@name` = „xDSH Costs (DSH)", Version 2.0.0.
- Parser-Tests 16/16 und Badge-Verhalten 4/4 grün im neuen Ordner.
- Keine Pfad-/Namensreste auf `xDeepSeek_Billing_Badge` außer im bewusst behaltenen Archiv
  und in historischen Memory-Einträgen (dort als „vormals" markiert).
- Git-Repo mit sauberem Erst-Commit; `out/` und `!Ausgabe/` nicht getrackt.
- Der alte Ordner ist gelöscht; `xDeepSeek_Token_Badge` ist unberührt.

## 7. Nicht Teil dieses Auftrags (bewusst)

- Kein GitHub-Repo `immerzu/xDSH_Costs` (kann später ergänzt werden).
- Keine funktionalen Änderungen am Badge (reine Umbenennung/Umzug).
- Kein automatischer Tampermonkey-Neuimport (nur Doku-Hinweis).
- Kein Eingriff in `xDeepSeek_Token_Badge` oder dessen Greasy-Fork-Sync.
