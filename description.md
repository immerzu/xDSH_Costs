Zeigt **Topped-up-Balance** und **Tageskosten** des DeepSeek-API-Kontos als schwebendes Badge unten rechts im **DSH-Web-GUI**.

- Läuft nur im DSH-Web-GUI (`127.0.0.1`/`localhost`, erkannt an `window.__DSH_BOOT__`) und auf `platform.deepseek.com`.
- `platform.deepseek.com` einmal eingeloggt öffnen — danach kennt das Skript den Login-Token und läuft dauerhaft weiter.
- **Kein API-Key, keine Modellaufrufe, keine Token-Kosten:** Es liest ausschließlich die Dashboard-Endpunkte (`/api/v0/users/get_user_summary`, `/api/v0/usage/cost`), die die Platform-Seite selbst aufruft.
- **Datenschutz:** kein Server, kein Tracking, keine Datenübertragung außer an `platform.deepseek.com`.
- Bedienung: Klick öffnet die Usage-Seite, Ziehen verschiebt das Badge (Position wird gemerkt), Tooltip zeigt Guthaben, Gratisguthaben, Monatskosten und Aktualisierungszeit.
- Aktualisierung: alle 5 Minuten, zusätzlich beim Tab-Fokus; ohne frischen Wert markiert ⏳ nach 30 Minuten den letzten Stand.

Die Dashboard-Endpunkte sind privat und können sich ändern — dann zeigt das Badge einen Fehlerzustand statt Zahlen. MIT-Lizenz.

Показывает **пополненный баланс** и **расходы за сегодня** аккаунта DeepSeek API в виде плавающего бейджа в правом нижнем углу **веб-интерфейса DSH**.

- Работает только в веб-интерфейсе DSH (`127.0.0.1`/`localhost`, определяется по `window.__DSH_BOOT__`) и на `platform.deepseek.com`.
- Один раз откройте `platform.deepseek.com` в статусе «вошёл» — после этого скрипт знает токен входа и работает дальше постоянно.
- **Без API-ключа, без вызовов моделей, без расходов на токены:** читаются только эндпоинты дашборда (`/api/v0/users/get_user_summary`, `/api/v0/usage/cost`), которые вызывает сама страница платформы.
- **Конфиденциальность:** никакого сервера, никакого трекинга, передача данных только на `platform.deepseek.com`.
- Управление: клик открывает страницу Usage, перетаскивание перемещает бейдж (позиция запоминается), подсказка показывает баланс, бонусный баланс, расходы за месяц и время обновления.
- Обновление: каждые 5 минут и дополнительно при фокусе вкладки; если свежих данных нет 30 минут, ⏳ помечает последнее значение.

Эндпоинты дашборда приватные и могут измениться — тогда бейдж показывает состояние ошибки вместо цифр. Лицензия MIT.

Shows the **topped-up balance** and **today's cost** of the DeepSeek API account as a floating badge in the bottom right corner of the **DSH web GUI**.

- Runs only in the DSH web GUI (`127.0.0.1`/`localhost`, detected via `window.__DSH_BOOT__`) and on `platform.deepseek.com`.
- Open `platform.deepseek.com` once while signed in — after that the script knows the login token and keeps working.
- **No API key, no model calls, no token costs:** it only reads the dashboard endpoints (`/api/v0/users/get_user_summary`, `/api/v0/usage/cost`) that the platform page itself calls.
- **Privacy:** no server, no tracking, no data transfer other than to `platform.deepseek.com`.
- Usage: click opens the usage page, drag moves the badge (position is remembered), the tooltip shows balance, free credit, monthly cost and the last update time.
- Refresh: every 5 minutes and additionally on tab focus; without a fresh value ⏳ marks the last known state after 30 minutes.

The dashboard endpoints are private and may change — in that case the badge shows an error state instead of numbers. MIT license.
