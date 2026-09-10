# Projektgedächtnis — xDSH Costs (DSH)

Dieser Ordner ist das dauerhafte Gedächtnis des Projekts. **Vor** Arbeiten am Skript lesen,
**nach** Arbeiten ergänzen (neue Erkenntnisse, Fallstricke, offene Punkte).

## Dokumente

| Dokument | Inhalt | Stand |
|---|---|---|
| [`HANDOVER_20260910.md`](HANDOVER_20260910.md) | Auftrag, Entscheidungen, Bau, Verifikation, Umgebungs-Lehren, Blocker, offene Punkte der Session vom 10.09.2026; **Abschnitte 9–11**: Projektumzug, GitHub-Anlage, Erkenntnisse. | 2026-09-10 |
| [`SESSION-20260910-umzug-und-github.md`](SESSION-20260910-umzug-und-github.md) | **Umzug + GitHub im Detail:** Entscheidungen, exakte Änderungen, Belege/Commit-Kette, wiederverwendbare Methodik (Massen-Ersetzung, Hash-Diff, Rest-Suche), aufgedeckte Fehler, Tampermonkey-Umstieg. | 2026-09-10 |
| [`ANALYSE-20260910-deepseek-platform-dashboard-endpunkte.md`](ANALYSE-20260910-deepseek-platform-dashboard-endpunkte.md) | **Zentrale Analyse:** Endpunkte, Auth-Beweis (Token ja / Cookies nein), Token-Herkunft, Antwortformen, DOM-Falle, WAF, Umgebungs-Fallstricke, Codeanker. | 2026-09-10 |
| [`TESTEN-userscript-xdsh-costs.md`](TESTEN-userscript-xdsh-costs.md) | Rezept, wie eine Änderung verifiziert wird (6 Stufen, Befehle, erwartete Checks, Fallstricke). | 2026-09-10 |

## Kurzfassung des aktuellen Stands

- Skript **v2.0.0**, Quelle `xdsh-costs.user.js`, Verteilkopie
  `!Ausgabe\xdsh-costs-v2.0.0.user.js` (hash-gleich). Die Vorgängerversion 1.1.0 liegt als
  Archiv unter `Archiv\xdeepseek-billing-badge-v1.1.0.user.js` (SHA256 `E16586E4AF4A4585…`).
- **Umzug 2026-09-10:** Projekt von `F:\001_Coding_Projekte\xDeepSeek_Billing_Badge` nach
  `F:\001_Coding_Projekte\xDSH_Costs` umgezogen, Skript von `xdeepseek-billing-badge.user.js`
  in `xdsh-costs.user.js` umbenannt (`@name` „xDSH Costs (DSH)"). Version 2.0.0, weil der
  neue `@name` in Tampermonkey ein **neues** Skript bedeutet. GM-Schlüssel `xdsb.*` blieben
  bewusst unverändert. Details: [`HANDOVER_20260910.md`](HANDOVER_20260910.md), Abschnitt 9.
- **Repository:** <https://github.com/immerzu/xDSH_Costs> (**public**, Branch `main`) — am
  2026-09-10 angelegt und gepusht; `!Ausgabe/` und `out/` sind gitignored, `Archiv/` ist
  bewusst versioniert.
- Badge im DSH-GUI unten rechts: `💳 $17.35 · heute $1.59` (grün), Klick öffnet die Usage-Seite,
  Ziehen verschiebt, Tooltip zeigt Details.
- **Kein API-Key, keine Modellaufrufe** → keine Token-Kosten. Nur die Lese-Endpunkte der
  Platform-Web-Session.
- **Auth ist der Bearer-Token** (nicht Cookies!) — live belegt, siehe Analyse.
- Aktualisierung: DSH alle 5 Min · Fokus sofort (min. 60 s Abstand) · Platform-Tab jede Minute
  mit Sofort-Push · ⏳ nach 30 Min ohne frischen Wert.
- Vollständig verifiziert: 16/16 Parser-Tests, 4/4 Badge-Zustände (Chromium), echte
  TM-Injektion + echte API, **End-to-End am echten Konto** (`💳 $17.35 · heute $1.59`).
  **Nach dem Umzug erneut bestätigt** (3× Testlauf: `node --check` Exit 0, Parser 16/16,
  Badge-Verhalten 4/4) — siehe [`SESSION-20260910-umzug-und-github.md`](SESSION-20260910-umzug-und-github.md), Abschnitt 3.
- Installiert im Automatisierungsprofil (`reasonix-profil`); **im Alltagsbrowser des Nutzers
  noch offen** — dort liegt der Platform-Login. Nach dem Import das **alte** Skript
  („xDeepSeek Billing Badge (DSH)") in Tampermonkey löschen: der neue `@name` ist ein neues
  Skript, und beide Badges würden sonst parallel laufen.
- **Nächster Einstieg:** bei Arbeiten am Skript zuerst `TESTEN-userscript-xdsh-costs.md` fahren;
  bei Unklarheiten zur Platform-Auth die `ANALYSE-…`-Datei lesen (dort der Auth-Beweis).
