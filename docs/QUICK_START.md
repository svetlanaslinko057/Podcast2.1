# 🚀 Быстрый старт

## Минимальные требования

- Python 3.11+
- Node.js 18+
- MongoDB 6+
- LiveKit Cloud аккаунт

---

## 1. Клонирование

```bash
git clone https://github.com/ventureguro-create/FOMO-Podcasts-lw.git
cd FOMO-Podcasts-lw
```

---

## 2. Backend

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Установить зависимости
pip install -r requirements.txt

# Создать .env файл
cat > .env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fomo_voice_club"
CORS_ORIGINS="*"

LIVEKIT_API_KEY="YOUR_LIVEKIT_API_KEY"
LIVEKIT_API_SECRET="YOUR_LIVEKIT_API_SECRET"
LIVEKIT_URL="wss://YOUR_PROJECT.livekit.cloud"

TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
TELEGRAM_BOT_USERNAME="YOUR_BOT_USERNAME"
TELEGRAM_NOTIFICATIONS_CHANNEL="YOUR_CHANNEL"
TELEGRAM_NOTIFICATIONS_CHANNEL_ID="-100XXXXXXXXX"
TELEGRAM_RECORDING_CHANNEL="YOUR_RECORDING_CHANNEL"
TELEGRAM_RECORDING_CHANNEL_ID="-100XXXXXXXXX"
EOF

# Инициализировать базу
python init_platform.py

# Запустить сервер
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

---

## 3. Frontend

```bash
cd frontend

# Установить зависимости
yarn install

# Создать .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
EOF

# Запустить
yarn start
```

---

## 4. Проверка

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## 5. Тестовые данные

После `init_platform.py` доступны:

| Пользователь | Wallet | Роль |
|--------------|--------|------|
| Club Owner | 0xOwnerWallet123456789 | owner |
| Club Admin | 0xAdminWallet987654321 | admin |
| Test Listener | 0xListenerWallet111222333 | listener |

---

## Быстрый запуск всего сразу

Создайте `start.sh`:

```bash
#!/bin/bash

# Запустить MongoDB
mongod --fork --logpath /var/log/mongodb.log

# Запустить Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 &

# Запустить Frontend
cd ../frontend
yarn start &

echo "🚀 FOMO Voice Club запущен!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8001"
```

```bash
chmod +x start.sh
./start.sh
```

---

## Получение LiveKit ключей

1. Перейти на https://cloud.livekit.io
2. Создать аккаунт (бесплатно)
3. Создать проект
4. Settings → API Keys → скопировать:
   - API Key
   - API Secret
   - WebSocket URL
