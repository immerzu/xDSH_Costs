# DeepSeek Costs — Windows-Gadget

Zeigt Guthaben und Tagesverbrauch des DeepSeek-Kontos als Leiste auf dem Desktop
(Windows Sidebar / GadgetPack). Gleiche äußere Form wie das Gadget *ShutdownRestart*
(dunkle Leiste, 130 × 38), Inhalt wie das DSH-Badge:

```
●  💳  $19.98   · heute $2.16
```

- **Grüner Punkt** — Guthaben positiv und Daten aktuell. Gelb: Token fehlt. Rot: Token ungültig oder Fehler.
- **Betrag** — Guthaben gesamt (topped-up + Gratis) in USD.
- **heute** — Tageskosten von DeepSeek (alle Verbraucher, nicht nur ein Programm).
- **Flamme** rechts — nur während der DeepSeek-Peak-Zeit (Mo–Fr 01:00–04:00 und 06:00–10:00 UTC).
- **Klick** — öffnet `platform.deepseek.com/usage`; Aktualisierung alle 5 Minuten.

## Datenquelle

Private Dashboard-Endpunkte der DeepSeek-Platform-Session, wie im Userscript:

| Zweck | Aufruf |
|---|---|
| Guthaben | `GET /api/v0/users/get_user_summary` → `normal_wallets` + `bonus_wallets` |
| Tages-/Monatskosten | `GET /api/v0/usage/cost?month=M&year=YYYY` |

Auth: `Authorization: Bearer <userToken>` aus der Platform-Web-Session. Der API-Schlüssel wird
abgelehnt (`code 40003`).

## Token

Das Gadget liest **denselben** Token wie das OpenCode-Plugin:

```
%USERPROFILE%\.config\opencode\secrets\deepseek-platform-token
```

Erste Datenzeile, `#`-Zeilen sind Kommentar, JSON-Wrapper `{"value":"…"}` wird erkannt.
Geholt wird er einmalig über die Konsole auf `platform.deepseek.com`:
`copy(localStorage.getItem('userToken'))`.

## Installation

Ordner `DeepSeekCosts.gadget` nach
`%LOCALAPPDATA%\Microsoft\Windows Sidebar\Gadgets\` kopieren, dann Rechtsklick auf den Desktop →
**Gadgets** → *DeepSeek Costs* doppelklicken.

## Änderungen testen (wichtig)

Die Sidebar hält Gadget-Dateien im Internet-Cache. Nach jeder Änderung:

```powershell
Stop-Process -Name sidebar -Force
RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 8
Start-Process 'C:\Program Files\Windows Sidebar\sidebar.exe'
```

Ohne das Leeren des Caches zeigt die Sidebar weiter die alte Fassung — das hat bei der
Entwicklung mehrfach für Verwirrung gesorgt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `gadget.xml` | Gadget-Beschreibung, `permissions full` (nötig für ActiveX/Netz) |
| `index.html` | Anzeige (ES3-JavaScript, alte MSHTML-Engine) |
| `sync-token.ps1` | holt den Token aus dem Standardbrowser (Local Storage) |

## Automatischer Token (`sync-token.ps1`, seit 24.11.2026)

Der Token muss **nicht** mehr von Hand kopiert werden. Das Gadget ruft
`sync-token.ps1` selbst auf, wenn die Token-Datei fehlt oder DeepSeek sie mit
`40002`/`40003` ablehnt:

1. Das Skript liest die Local-Storage-LevelDB der Browser-Profile
   (`Chrome for Testing`, Chrome, Edge, Brave) mit `FileShare.ReadWrite` — die
   Dateien sind während der Browser-Laufzeit sonst gesperrt.
2. Es sucht die Wertform `{"value":"<token>","__version":"0"}`.
3. Jeder Kandidat wird gegen `get_user_summary` geprüft; nur ein gültiger Token
   wird nach `~\.config\opencode\secrets\deepseek-platform-token` geschrieben.
4. Der Token erscheint nie in einer Ausgabe.

Grenze: Läuft die Web-Session ab, hilft nur eine neue Anmeldung **im Browser** —
das Gadget kann sich nicht selbst anmelden. Die Anmeldung dort ist aber der
normale Weg, keine Zusatzprozedur.

Manuell prüfen:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File sync-token.ps1
```
| `src/background.png` | Leiste, übernommen vom `ShutdownRestart`-Gadget |
| `src/card.png` | Karten-Symbol (Emoji wird in der Engine nicht gerendert) |
| `src/peak.png` | Flamme für die Peak-Zeit |

## Grenzen

- Private Endpunkte können sich ändern (gleiches Risiko wie beim Userscript).
- Der chinesische Feiertagsplan für die Peak-Regel ist **nicht** enthalten — das Gadget rechnet nur
  mit Wochenenden. Das Userscript kennt die Feiertage; hier fehlt die Liste noch.
