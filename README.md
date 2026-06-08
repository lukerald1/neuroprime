# NeuroPrime

Telegram-first AI miniapp console для ВКР/демо.

## Что внутри

- Telegram-бот с нижней кнопкой `OPEN`.
- Miniapp с вкладками: каталог, нейросети, цены, кейсы, заявки, профиль.
- Backend API на Node.js.
- Локальная SQLite-база для профилей, заявок и истории.

## Локальный запуск

Создайте `.env` по примеру `.env.example`:

```env
BOT_TOKEN=0000000000:REPLACE_ME
PORT=3000
PUBLIC_MINIAPP_URL=http://localhost:3000/miniapp/
DB_PATH=data/miniapp.sqlite
```

Запуск bot + miniapp:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
```

Прямой запуск:

```powershell
node src/main.mjs
```

Только miniapp/backend без Telegram-бота:

```powershell
node scripts/dev-webapp.mjs
```

Открыть miniapp локально:

```text
http://localhost:3000/miniapp/
```

## Деплой на Render

Создайте Render Web Service из GitHub-репозитория.

Настройки:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

Environment variables:

```env
BOT_TOKEN=токен_бота
PUBLIC_MINIAPP_URL=https://your-service.onrender.com/miniapp/
DB_PATH=data/miniapp.sqlite
NODE_VERSION=24.14.0
```

После деплоя откройте:

```text
https://your-service.onrender.com/miniapp/
```

В Telegram отправьте `/start`; снизу должна появиться кнопка `OPEN`.

## Важно

- `.env` нельзя коммитить.
- `data/` нельзя коммитить: там локальная SQLite-база.
- Для Telegram WebApp нужен публичный HTTPS URL, поэтому `localhost` подходит только для локальной проверки.
- На бесплатном Render локальная SQLite-база не является надежным постоянным хранилищем после redeploy/restart.
