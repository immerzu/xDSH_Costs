# SESSION 2026-11-01 — Peak-Flamme und Release v2.0.3

## 1. Auftrag und Darstellung

Während der DeepSeek-Peak-Zeit soll rechts im vorhandenen Badge ausschließlich eine kleine
Flamme (`🔥`) erscheinen. Außerhalb der Peak-Zeit gibt es keine Flamme. Text, Geldbeträge,
Zustandsfarben sowie Breite und Höhe des Badges bleiben unverändert.

## 2. Preisregel und Zeitbasis

- Peak: Montag bis Freitag, 01:00–04:00 und 06:00–10:00 UTC; Start inklusive, Ende exklusive.
- Off-Peak: alle übrigen Zeiten, alle Wochenenden und chinesische Feiertage vollständig.
- Die Rechnung verwendet `Date`/UTC aus der Systemzeit des jeweiligen Rechners; lokale Zeitzone
  und Sommerzeit verändern die UTC-Fenster nicht.
- Primärquelle Preisregel: <https://api-docs.deepseek.com/quick_start/pricing/>
- Amtlicher Feiertagsplan 2026: Staatsrat der Volksrepublik China,
  <https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm>.

Hinterlegt sind die vollständigen amtlichen Zeiträume 2026: 01.–03.01., 15.–23.02.,
04.–06.04., 01.–05.05., 19.–21.06., 25.–27.09. und 01.–07.10. Für ein Jahr ohne hinterlegten
Plan erkennt das Skript als Rückfall den gesetzlichen Feiertagskern (feste Feiertage,
Qingming-Formel und Mondkalender über `Intl`). Nach Veröffentlichung des nächsten amtlichen
Jahresplans ist `CHINA_HOLIDAY_RANGES` zu ergänzen.

## 3. Umsetzung

- `isPeakTime(date)` und Feiertagshilfen liegen in der extrahierten `PURE`-Region.
- Die Flamme ist `position:absolute` im rechten Innenabstand; sie nimmt nicht am Flex-Layout teil
  und kann daher die Außenmaße nicht vergrößern. Nach visueller Nutzerkorrektur bleibt sie mit
  `right:1px` vollständig innerhalb der Anzeige. Asymmetrisches, in Summe unverändertes Padding
  (`6px 16px 6px 8px`) schafft Abstand zum Geldbetrag, ohne die Badge-Breite zu ändern;
  `translateY(-58%)` plus `top:calc(50% - 1px)` gleicht die sichtbare Emoji-Glyphe nach der
  abschließenden Nutzerkorrektur optisch zur Textzeile aus.
- `updatePeakIndicator()` aktualisiert ausschließlich die lokale Anzeige alle 30 Sekunden und
  beim Sichtbarwerden des Tabs. Es entsteht kein zusätzlicher API-Aufruf.
- Der normale Badge-Text ist bytegenau unverändert. Der Tooltip erhält während Peak lediglich
  `🔥 Peak-Zeit: regulärer Tarif`.
- Version auf 2.0.3 erhöht; `CHANGELOG.md`, `README.md`, Testrezept und Projektgedächtnis ergänzt.

## 4. Verifikation

| Prüfung | Ergebnis |
|---|---|
| `node --check xdsh-costs.user.js` | Exit 0 |
| `node test/parse.test.mjs` | **19/19**; UTC-Grenzen, Wochenende, Feiertag sowie deutsche Winterzeit (`UTC+1`) und Sommerzeit (`UTC+2`) enthalten |
| `node tools/verify-badge.mjs` | **4/4** im echten Chromium, Headerprüfungen weiter grün |
| Layout mit/ohne Flamme | jeweils **202.3125 × 30.796875 px** |
| visueller Ausschnitt | `out/badge-peak-layout-crop.png` |
| Verteilkopie | 37.374 Bytes, SHA-256 `C0D977A5722D1B4CBCAA7766F172D9EF50710597F37938B217E34FF200E9510C`, hash-gleich zur Quelle |

Das frühere Verzeichnis `C:\Users\lolo\.dsh\browser-tools` enthielt beim Lauf kein
`playwright-core`/`lib.mjs` mehr. `verify-badge.mjs` erhielt deshalb einen nicht-destruktiven
Fallback auf die mit Codex ausgelieferte Playwright-Installation und die normale lokale
Chrome-Datei; `DSB_CHROME` kann den Pfad weiterhin explizit setzen.

## 5. Veröffentlichung und Belege

| Schritt | Ergebnis |
|---|---|
| Secret-Prüfung | Arbeitsstand und gesamte Git-Historie ohne Treffer |
| Code-Commit + Push | `ec98747e2568f3a4c78170d38296b35296ec73f4`, lokal = `origin/main` |
| GitHub-Rohdatei | `@version 2.0.3`, 37.374 Bytes, kein Secret-Muster |
| GF-Admin-Felder | eingeloggt; Skript-URL korrekt; `automatic`; Zusatzinfos-URL korrekt; `markdown` |
| GF-Admin-Trigger | „Jetzt aktualisieren und synchronisieren" erfolgreich |
| Öffentliche GF-Seite | `2.0.3`, aktualisiert 01.11.2026, 36,5 KB, Peak-Hinweis sichtbar |
| GF-Versionsseite | `2.0.3` vorhanden |
| GF-Updatequelle | `.meta.js` meldet `@version 2.0.3` |
| GitHub-Release | `v2.0.3`, Ziel `ec98747`, veröffentlicht 2026-11-01 05:28 MEZ |

Der Nutzer erhält das Update weiterhin per **manuellem Import** von
`!Ausgabe\xdsh-costs-v2.0.3.user.js`; im Alltagsbrowser ist die Installation noch offen.

## 6. Browser-/Cloudflare-Lehren und Cookie-Erhalt

- Ausschließlich das separate Chrome-for-Testing-Profil aus
  `C:\Users\lolo\.dsh\playwright-mcp-config.json` verwenden — **niemals** den Yandex-/Alltagsbrowser.
- Der Nutzer hat sich am 2026-11-01 im separaten Profil bei Greasy Fork angemeldet.
  **Cookies, Cookie-Datenbank, Sessions und Profildaten dieses Browsers niemals löschen.** Fenster
  nach der Arbeit normal schließen; der Login muss für kommende Releases erhalten bleiben.
- Der automatisierte Login-Aufruf geriet in eine Cloudflare-Prüfschleife. Der einmalige Login
  funktionierte im selben separaten Profil bei direktem Start ohne Automationskennzeichen.
  Danach konnte Playwright das persistierte Login für Admin-Prüfung und Sync verwenden.
- Wiederholte schnelle Sprachsuchseiten können Cloudflare erneut auslösen. Nach hinreichendem
  Beweis (öffentliche Seite, Versionsseite, `meta.js`) keine Prüfschleifen fortsetzen.
- Abschlusskontrolle: 0 Prozesse des separaten Profils; Cookie-Datenbank vorhanden (196.608
  Bytes) und beim Bereinigen der reinen Exit-Markierung hash-unverändert; `profile.exit_type`
  steht wieder auf `Normal`.
