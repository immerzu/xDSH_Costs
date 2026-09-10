# SESSION 2026-09-10 — Projektumzug nach `xDSH_Costs` und GitHub-Anlage

Dieses Dokument hält **alle neuen Erkenntnisse** der Session fest, in der das Projekt vom
alten Ordner `F:\001_Coding_Projekte\xDeepSeek_Billing_Badge` nach
`F:\001_Coding_Projekte\xDSH_Costs` umgezogen, das Userscript auf **xDSH Costs (DSH) v2.0.0**
umbenannt und das GitHub-Repo `immerzu/xDSH_Costs` angelegt wurde.

- **Art:** reine Umzugs-/Infrastruktur-Session — **keine funktionalen Änderungen** am Badge.
- **Ergänzt:** `HANDOVER_20260910.md` (Abschnitte 9–11), `AGENTS.md`, `TESTEN-userscript-xdsh-costs.md`.

## 1. Auftrag und Entscheidungen

Auftrag 1: „Unser Projekt zum Anzeigen der Kosten und des Guthabens in DSH lagerst du in den
neuen Projektordner `F:\001_Coding_Projekte\xDSH_Costs` aus!"
Auftrag 2: „Du GitHub-Repo immerzu/xDSH_Costs anlegen + pushen!"

| Frage | Entscheidung des Nutzers |
|---|---|
| Umfang | **Nur** das Billing-Projekt; `xDeepSeek_Token_Badge` (GF 595207) bleibt unberührt |
| Struktur | Inhalt **direkt** in `xDSH_Costs` (kein Unterordner) |
| Alter Ordner | **Löschen nach Verifikation** |
| Git | **Neu initialisieren** (keine Historie zu übernehmen — es gab keine) |
| Benennung | Skript umbenennen → `xdsh-costs.user.js`, `@name` „xDSH Costs (DSH)" |
| Testartefakte | `out/` mitnehmen (gitignored) |
| GM-Speicher | Schlüssel-Präfix **`xdsb.*` bewusst unverändert** |
| Version | **2.0.0** (neue Skript-Identität) |
| Tampermonkey | Nur Doku-Hinweis; Neuinstallation macht der Nutzer |
| Sichtbarkeit | **public** |
| Archiv | Vorgängerversion 1.1.0 **mit ins Repo** |

## 2. Was genau geändert wurde

**Umbenannt (4 Artefakte):**

| vorher | nachher |
|---|---|
| `xdeepseek-billing-badge.user.js` | `xdsh-costs.user.js` |
| `!Ausgabe\xdeepseek-billing-badge-v1.1.0.user.js` | `!Ausgabe\xdsh-costs-v2.0.0.user.js` (neu erzeugt) |
| `memory\TESTEN-userscript-billing-badge.md` | `memory\TESTEN-userscript-xdsh-costs.md` |
| Vorgängerversion | verschoben nach `Archiv\xdeepseek-billing-badge-v1.1.0.user.js` (Inhalt unverändert) |

**Im Skript:**

- `@name` `xDeepSeek Billing Badge (DSH)` → `xDSH Costs (DSH)`, `@version` 1.1.0 → 2.0.0.
- Badge-DOM-Id `xdsb-billing-badge` → `xdsh-costs-badge`; Log-Präfix `[BillingBadge]` → `[xDSH Costs]`.
- Kopfkommentar angepasst.
- **Unverändert:** `@namespace`, `@match`, `@grant`, `@connect`, `@description`(+`:en`), `@license`,
  die `PURE`-Region und — ausdrücklich — die **GM-Schlüssel `xdsb.token`, `xdsb.tokenAt`,
  `xdsb.snapshot`, `xdsb.pos`**.

**In Doku/Tests/Werkzeugen:** Projektname, Pfade und Dateinamen in `AGENTS.md`, `README.md`,
`CHANGELOG.md`, `memory/*`, `test/parse.test.mjs`, `tools/live-parse.mjs`,
`tools/tm-import-diagnose.mjs` (Vorgabedatei + Dashboard-Regex auf „xDSH Costs"/2.0.0),
`tools/verify-badge.mjs`, `tools/verify-dsh-tm.mjs`, `tools/verify-dsh-tm-live.mjs`
(Selektor `#xdsh-costs-badge`).

**Neu angelegt:** `docs/specs/2026-09-10-xdsh-costs-umzug-design.md` (freigegebenes Design),
`Archiv/`, Git-Repo, dieses Dokument.

## 3. Belege (alles gemessen, nicht behauptet)

| Prüfung | Ergebnis |
|---|---|
| `node --check xdsh-costs.user.js` | Exit 0, keine Ausgabe (3× gelaufen) |
| `node test/parse.test.mjs` | **16 bestanden, 0 fehlgeschlagen** (3× gelaufen, u. a. nach dem Löschen des Altordners) |
| `node tools/verify-badge.mjs` | **4/4 Fälle grün** (echtes Chromium, gemockte API, Header geprüft) |
| Hash Quelle ↔ Verteilkopie | identisch `64EE57BB7B303761CEB7CD554C30B695E333A65E0C3A856500586556F3672E1F` |
| Hash-Diff alt↔neu | genau **4 Umbenennungen + 13 inhaltlich geänderte** Dateien, keine unerwartete Abweichung; 0 Dateien fehlten |
| Cross-Referenzen | `git grep` in 01_Helfer / Token_Badge: **keine** Treffer auf alte Namen |
| GitHub | `PUBLIC`, Branch `main`, **18 Dateien**, `pushedAt` 2026-09-10T16:08:01Z |
| lokal vs. remote | `3c7007b` == `3c7007b` (identisch) |

**Commit-Kette:**

| Repo | Commit | Inhalt |
|---|---|---|
| `xDSH_Costs` | `2c9f555` | Projektumzug + Umbenennung v2.0.0 (18 Dateien) |
| `xDSH_Costs` | `6c80a00` | Repo-Doku, `AGENTS.md`-Pfad/Link korrigiert |
| `xDSH_Costs` | `3c7007b` | Restfehler nach Umzug korrigiert (HEAD) |
| `01_Helfer` | `e7e3486`, `528602e`, `06b8cbb` | Gedächtnis: Umzug, Repo, Repo-Stand präzisiert |

## 4. Wiederverwendbare Methodik (der eigentliche Gewinn)

### 4.1 Umzug in der Reihenfolge: kopieren → umbenennen → testen → verifizieren → löschen

Die Reihenfolge ist nicht beliebig. Bewährt:

1. **Leerstand** des Zielordners prüfen (war 0 Einträge).
2. **Kopieren** (`Copy-Item <src>\* <dst> -Recurse -Force`).
3. **Umbenennen/anpassen** im Ziel, Quelle unangetastet lassen.
4. **Tests im Ziel** fahren (unabhängig vom alten Ordner).
5. **Verifikation alt↔neu** per Dateiliste + SHA256-Diff; erst danach löschen.
6. Quelle löschen, dann Testlauf **wiederholen** (beweist Unabhängigkeit vom Altordner).

### 4.2 Massen-Ersetzungen zuverlässig per PowerShell

Bewährtes Muster für Textumzüge (BOM-erhaltend, protokollierend):

```powershell
$bytes = [System.IO.File]::ReadAllBytes($f.FullName)
$hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$text = $text.Replace($alt, $neu)                 # je Paar Trefferzahl protokollieren
[System.IO.File]::WriteAllText($f.FullName, $text, (New-Object System.Text.UTF8Encoding($hasBom)))
```

- Ersetzungspaare **absteigend spezifisch** sortieren (z. B. erst
  `xdeepseek-billing-badge-v1.1.0.user.js`, dann `xdeepseek-billing-badge`), sonst entstehen
  Mischformen.
- **Immer eine Rest-Suche** über alle Dateien anschließen (`Select-String`) und die Treffer
  einzeln bewerten — die Ersetzung ersetzt auch Vorkommen in **Entscheidungstabellen und
  Pfadangaben**, die inhaltlich anders lauten müssen.
- Die inhaltlichen Sonderfälle (Versionstabellen, Changelog-Kopf, Stand-Absätze) danach per
  Edit-Tool schreiben, nicht per Massenersetzung.

### 4.3 Was die Rest-Suche aufgedeckt hat (konkrete Fehler, die man wiederholen könnte)

1. **Projektpfad in Befehlsrezepten:** „Alle Befehle im Projektordner …" zeigte nach der
   Ersetzung auf den **gelöschten** Ordner — die Ersetzung konnte nur den Skriptnamen kennen.
2. **Toter Link in der Design-Spec** auf die umbenannte Testdatei (Spec enthielt den alten
   Dateinamen).
3. **Historische Entscheidungstabelle** im HANDOVER: „Ablage = altes Projekt" ohne
   „vormals"-Hinweis — liest sich sonst wie der aktuelle Stand.
4. **AGENTS.md-Ablageregel** blieb auf dem alten Pfad stehen.

→ **Lehre:** Nach jedem Umzug alle Pfad-/Dateinamen-Vorkommen einzeln sichten; „alle Treffer
sind Dokumentation" ist eine Fehlannahme.

### 4.4 Verifikationswerkzeuge

- **Hash-Diff** über beide Bäume (Dateiliste + SHA256) trennt zuverlässig „bewusst geändert" von
  „unerwartet abweichend". Erwartung vorher formulieren, sonst ist das Ergebnis nicht bewertbar.
- **Testartefakt-Falle:** `tools/verify-badge.mjs` schreibt `out/badge-happy-path.png` neu. Die
  Datei ist nach dem Test **immer** anders — nicht als Umzugsabweichung fehldeuten.
- **`git grep`** in den bekannten Repos statt breitem rekursiven `Select-String` über
  `F:\001_Coding_Projekte` (lief > 120 s in den Timeout).
- **Remote-Prüfung immer über die API** (`gh api repos/.../git/trees/HEAD`, `gh api .../commits`),
  nicht aus dem lokalen Git schließen.

### 4.5 Reihenfolge-Falle beim Erzeugen der Verteilkopie

Passiert in dieser Session: erst die Verteilkopie mit dem **neuen** Namen erzeugt, danach die
**Quelle gelöscht** → Quelle weg (`Get-FileHash` meldete „Pfad nicht gefunden"), weil der
Kopiervorgang auf die bereits umbenannte Zieldatei zeigte. Behoben durch Rückkopie aus
`!Ausgabe/` (Inhalt war identisch).
→ **Lehre:** umbenennen **oder** kopieren, dann **verifizieren**, erst dann löschen.

## 5. Umgebungs-Erkenntnisse (DSH/Windows)

- **Arbeiten außerhalb des Session-Workspace** (`F:\001_Coding_Projekte\xDSH_Costs` liegt
  außerhalb von `01_Helfer`) brauchen dateisystemseitig erweiterten Zugriff. In dieser Session
  wurde nach der ersten echten Verweigerung die Policy auf `danger-full-access` umgestellt.
  Wichtig: Ist die Policy bereits `danger-full-access`, darf **kein** `sandbox_permissions`
  mehr mitgeschickt werden — der Versuch wird abgelehnt
  („not strictly wider than this call's current mode").
- **Sichtbarkeits-/Umfangsentscheidungen** (public/private, Ordner löschen, Version, GM-Keys)
  wurden vorab per Rückfrage geklärt — hat Nacharbeit gespart.
- Git-Warnung „LF will be replaced by CRLF" ist auf diesem System normal und harmlos.
- `gh` ist als `immerzu` eingeloggt (Keyring); Repo-Erstellung in einem Schritt:
  `gh repo create immerzu/xDSH_Costs --public --source <pfad> --remote origin --push --description "…"`.

## 6. Betriebsrelevant: Tampermonkey-Umstieg

- Ein geänderter `@name` ist für Tampermonkey ein **neues Skript** — ein In-Place-Update gibt es
  nicht. Nach dem Import von `!Ausgabe\xdsh-costs-v2.0.0.user.js` muss der alte Eintrag
  „xDeepSeek Billing Badge (DSH)" **gelöscht** werden, sonst laufen zwei Badges parallel.
- Weil die GM-Schlüssel `xdsb.*` **unverändert** blieben, sind Platform-Token und letzter
  Kontostand nach dem Umstieg sofort wieder verfügbar (kein erneuter Platform-Besuch nötig).
- Alternativer Weg ohne Datenverlust-Risiko wäre eine Schlüsselmigration (`xdsb.*` → `xdsh.*`)
  gewesen; bewusst verworfen, weil sie zusätzlichen Code und einen Zwischenzustand bedeutet.

## 7. Ablage- und Release-Regeln (unverändert gültig)

- `!Ausgabe\` = Verteilkopien (`xdsh-costs-v<version>.user.js`), **gitignored**; Hash-Gleichheit
  mit der Quelle vor dem Weitergeben prüfen.
- `Archiv\` = Vorgängerversionen, **bewusst versioniert** (Nachvollziehbarkeit).
- `out\` = Testartefakte, gitignored.
- Änderung immer in `xdsh-costs.user.js` → `@version` erhöhen → `CHANGELOG.md` ergänzen →
  Verteilkopie erzeugen → Tests (siehe `TESTEN-userscript-xdsh-costs.md`).

## 8. Offene Punkte

- [ ] **Neuinstallation im Alltagsbrowser** (dort liegt der Platform-Login) + alten
      Tampermonkey-Eintrag löschen.
- [ ] Sichtprüfung im **echten DSH-GUI** (der End-to-End-Test lief auf einer DSH-ähnlichen Seite).
- [ ] Optional: Refresh-Intervall konfigurierbar machen.
- [ ] Optional: Token-Ansicht (`/api/v0/usage/amount`) im Tooltip ergänzen (Endpunkt HTTP 200 verifiziert).
- [ ] Optional: Repo-Beschreibung/`Topics` auf GitHub ergänzen (derzeit nur Beschreibungstext).
