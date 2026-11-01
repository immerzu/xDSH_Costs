# SESSION 2026-11-01 — Peak-Flamme (lokaler Kandidat v2.0.3)

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

## 5. Offene Zustände

- v2.0.3 ist lokal gebaut und getestet, aber **nicht** committed, gepusht, auf Greasy Fork
  synchronisiert, als GitHub-Release angelegt oder in Tampermonkey installiert.
- Für eine Veröffentlichung gilt unverändert die komplette Kette aus `AGENTS.md`, einschließlich
  Secret-Prüfung, Verteilkopie/Hash, Push, GF-Admin-Trigger, GF-Verifikation und GitHub-Release.
- Der Nutzer erhält Updates weiterhin per manuellem Import der Verteilkopie.
