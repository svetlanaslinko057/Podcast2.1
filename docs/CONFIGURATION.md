# ⚙️ Конфигурация

## Обзор

Проект использует `.env` файлы для хранения конфигурации:

```
backend/.env    → Серверные ключи (MongoDB, LiveKit, Telegram)
frontend/.env   → Клиентские настройки (URL бэкенда, LiveKit)
```

---

## Backend Configuration

### Расположение
```
backend/.env
```

### Полный шаблон

```env
# ============================================
# DATABASE
# ============================================
# MongoDB connection string
MONGO_URL="mongodb://localhost:27017"

# Database name
DB_NAME="fomo_voice_club"

# CORS allowed origins (comma-separated)
CORS_ORIGINS="*"

# ============================================
# LIVEKIT - Голосовые комнаты
# ============================================
# Получить на https://cloud.livekit.io
# Бесплатный tier: до 2 участников в комнате

# API Key (начинается с API...)
LIVEKIT_API_KEY="APIWrnERKLL3FHq"

# API Secret (длинная строка)
LIVEKIT_API_SECRET="lyFL5ewBGB2FK2iOizIjenTYeM9lgBAXHIAlEA99eNBC"

# WebSocket URL (формат: wss://xxx.livekit.cloud)
LIVEKIT_URL="wss://podcast-4hfb3nr6.livekit.cloud"

# ============================================
# TELEGRAM
# ============================================
# Основной бот для уведомлений
TELEGRAM_BOT_TOKEN="8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E"
TELEGRAM_BOT_USERNAME="Podcast_FOMO_bot"

# Канал для уведомлений
TELEGRAM_NOTIFICATIONS_CHANNEL="P_FOMO"
TELEGRAM_NOTIFICATIONS_CHANNEL_ID="-1002475795498"

# Канал для записей сессий
TELEGRAM_RECORDING_CHANNEL="Podcast_F"
TELEGRAM_RECORDING_CHANNEL_ID="-1003133850361"
```

---

## Frontend Configuration

### Расположение
```
frontend/.env
```

### Шаблон

```env
# Backend API URL
REACT_APP_BACKEND_URL=https://your-domain.com

# LiveKit WebSocket URL (тот же что и в backend)
REACT_APP_LIVEKIT_URL=wss://podcast-4hfb3nr6.livekit.cloud

# WebSocket port (для dev сервера)
WDS_SOCKET_PORT=443

# Health check (отключить для production)
ENABLE_HEALTH_CHECK=false
```

---

## Получение ключей

### 🎤 LiveKit Cloud

1. **Регистрация:**
   - Перейти на https://cloud.livekit.io
   - Создать бесплатный аккаунт

2. **Создание проекта:**
   - Нажать "Create Project"
   - Выбрать регион (ближайший)

3. **Получение ключей:**
   - Перейти в Settings → API Keys
   - Скопировать:
     - **API Key** (пример: `APIWrnERKLL3FHq`)
     - **API Secret** (длинная строка)
   - Перейти в Settings → General
   - Скопировать **WebSocket URL** (пример: `wss://podcast-xxx.livekit.cloud`)

4. **Лимиты бесплатного плана:**
   - 1-2 участника в комнате
   - 100 минут/месяц
   - Достаточно для тестирования

### 📱 Telegram Bot

1. **Создание бота:**
   ```
   1. Открыть @BotFather в Telegram
   2. Отправить /newbot
   3. Ввести имя бота (например: FOMO Podcasts Bot)
   4. Ввести username (например: podcast_fomo_bot)
   5. Скопировать токен
   ```

2. **Настройка каналов:**
   ```
   1. Создать канал для уведомлений (например: @P_FOMO)
   2. Создать канал для записей (например: @Podcast_F)
   3. Добавить бота как админа в оба канала
   4. Получить ID каналов через @userinfobot
   ```

3. **Права бота в каналах:**
   - Post messages
   - Edit messages
   - Delete messages

---

## Переменные окружения в коде

### Backend (Python)

```python
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# LiveKit
livekit_key = os.environ.get('LIVEKIT_API_KEY', '')
livekit_secret = os.environ.get('LIVEKIT_API_SECRET', '')
livekit_url = os.environ.get('LIVEKIT_URL', '')

# Telegram
telegram_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
```

### Frontend (React)

```javascript
// Доступ через process.env
const API_URL = process.env.REACT_APP_BACKEND_URL;
const LIVEKIT_URL = process.env.REACT_APP_LIVEKIT_URL;

// Использование
fetch(`${API_URL}/api/podcasts`)
```

---

## Проверка конфигурации

### Скрипт проверки

```bash
# Создать check_config.py
cd backend
python3 << 'EOF'
import os
from dotenv import load_dotenv

load_dotenv()

required_vars = [
    'MONGO_URL',
    'DB_NAME',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'LIVEKIT_URL',
    'TELEGRAM_BOT_TOKEN'
]

print("Checking configuration...\n")

for var in required_vars:
    value = os.environ.get(var, '')
    status = '✅' if value else '❌'
    masked = value[:10] + '...' if len(value) > 10 else value
    print(f"{status} {var}: {masked if value else 'NOT SET'}")

print("\nConfiguration check complete!")
EOF
```

### Ожидаемый вывод

```
Checking configuration...

✅ MONGO_URL: mongodb://...
✅ DB_NAME: fomo_voice...
✅ LIVEKIT_API_KEY: APIWrnERKL...
✅ LIVEKIT_API_SECRET: lyFL5ewBGB...
✅ LIVEKIT_URL: wss://podca...
✅ TELEGRAM_BOT_TOKEN: 8293451127...

Configuration check complete!
```

---

## Безопасность

### ⚠️ ВАЖНО

1. **Никогда не коммитьте `.env` файлы в Git!**
   ```gitignore
   # .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Используйте `.env.example` для шаблонов:**
   ```bash
   # Создать пример без реальных значений
   cp backend/.env backend/.env.example
   # Заменить значения на плейсхолдеры
   ```

3. **В production используйте secrets manager:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets

---

## Troubleshooting

### Ошибка: LiveKit токен не генерируется

```
Проверить:
1. LIVEKIT_API_KEY начинается с 'API'
2. LIVEKIT_API_SECRET не пустой
3. LIVEKIT_URL начинается с 'wss://'
```

### Ошибка: MongoDB connection failed

```
Проверить:
1. MongoDB запущен: systemctl status mongodb
2. MONGO_URL правильный
3. Порт 27017 открыт
```

### Ошибка: Telegram bot не отвечает

```
Проверить:
1. Токен правильный (через @BotFather)
2. Бот добавлен в каналы как админ
3. Channel ID начинается с '-100'
```
