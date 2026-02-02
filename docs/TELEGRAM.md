# 📱 Telegram интеграция

## Обзор

Telegram используется для:

- **Авторизации** через Telegram Login Widget
- **Уведомлений** о новых подкастах и сессиях
- **Voice Chat** для слушателей Live сессий
- **Записи** сессий для сохранения подкастов

---

## Боты

### Основной бот (@Podcast_FOMO_bot)

**Назначение:**
- OAuth авторизация
- Отправка уведомлений
- Интеракция с пользователями

**Файл:** `backend/telegram_bot.py`

**Запуск:**
```bash
cd backend
python telegram_bot.py
```

### Recording Bot

**Назначение:**
- Мониторинг канала @Podcast_F
- Скачивание записей голосовых чатов
- Создание подкастов в библиотеке

**Файл:** `backend/telegram_recording_bot.py`

**Запуск:**
```bash
cd backend
python telegram_recording_bot.py
```

---

## Каналы

| Канал | ID | Назначение |
|--------|-----|----------|
| @P_FOMO | -1002475795498 | Уведомления |
| @Podcast_F | -1003133850361 | Записи сессий |

---

## Конфигурация

### Переменные окружения

```env
# backend/.env

# Основной бот
TELEGRAM_BOT_TOKEN="8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E"
TELEGRAM_BOT_USERNAME="Podcast_FOMO_bot"

# Канал уведомлений
TELEGRAM_NOTIFICATIONS_CHANNEL="P_FOMO"
TELEGRAM_NOTIFICATIONS_CHANNEL_ID="-1002475795498"

# Канал записей
TELEGRAM_RECORDING_CHANNEL="Podcast_F"
TELEGRAM_RECORDING_CHANNEL_ID="-1003133850361"
```

### Получение Channel ID

1. Добавить @userinfobot в канал
2. Переслать любое сообщение из канала боту
3. Бот покажет ID канала (начинается с `-100`)

---

## Telegram Connect (Подключение)

### Страница настроек

**URL:** `/settings/telegram`

**Функции:**
- Подключение Telegram аккаунта
- Управление уведомлениями
- Отключение

### Login Widget

```html
<!-- Telegram Login Widget -->
<script
  async
  src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="Podcast_FOMO_bot"
  data-size="large"
  data-radius="10"
  data-auth-url="https://your-domain.com/api/telegram/oauth/callback"
  data-request-access="write"
></script>
```

### OAuth Flow

```
1. Пользователь нажимает "Подключить Telegram"
2. Открывается Telegram для подтверждения
3. Telegram перенаправляет на callback URL
4. Backend сохраняет telegram_chat_id в профиль
5. Пользователь получает уведомления в Telegram
```

---

## Уведомления

### Типы уведомлений

| Тип | Канал | Описание |
|------|--------|----------|
| `new_podcast` | Общий + личный | Новый подкаст опубликован |
| `live_starting` | Общий + личный | Live сессия начинается |
| `new_comment` | Личный | Комментарий к вашему контенту |
| `new_subscriber` | Личный | Новый подписчик |
| `badge_awarded` | Личный | Вы получили бейдж |

### Отправка уведомления

**В канал:**
```python
from services.telegram_service import send_channel_notification

await send_channel_notification(
    channel_id=TELEGRAM_NOTIFICATIONS_CHANNEL_ID,
    message="🎙️ Новый подкаст: My Podcast",
    parse_mode="HTML"
)
```

**Личное:**
```python
from services.telegram_service import send_personal_notification

await send_personal_notification(
    chat_id=user.telegram_chat_id,
    message="💬 Новый комментарий от @user"
)
```

---

## Recording Bot

### Логика работы

```
1. Бот мониторит канал @Podcast_F
2. При появлении аудио файла:
   a. Скачивает файл
   b. Извлекает метаданные (длительность, размер)
   c. Сохраняет в /recordings/
   d. Создает запись в БД podcasts
   e. Отправляет уведомление в @P_FOMO
```

### Код

```python
# backend/telegram_recording_bot.py

from telegram.ext import Application, MessageHandler, filters
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def handle_audio(update, context):
    """Handle incoming audio files"""
    message = update.message
    audio = message.audio or message.voice or message.document
    
    if audio:
        # Download file
        file = await context.bot.get_file(audio.file_id)
        file_path = f"/app/recordings/{audio.file_unique_id}.mp3"
        await file.download_to_drive(file_path)
        
        # Create podcast
        podcast = {
            "id": str(uuid.uuid4()),
            "title": f"Recording {datetime.now().strftime('%Y-%m-%d')}",
            "audio_url": f"/static/recordings/{audio.file_unique_id}.mp3",
            "duration": audio.duration,
            "source": "telegram_recording"
        }
        await db.podcasts.insert_one(podcast)
        
        # Send notification
        await send_notification(f"🎙️ Новая запись: {podcast['title']}")

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(
        filters.AUDIO | filters.VOICE | filters.Document.AUDIO,
        handle_audio
    ))
    app.run_polling()
```

### Запуск как сервис

```bash
# Создать systemd service
sudo nano /etc/systemd/system/telegram-recording-bot.service
```

```ini
[Unit]
Description=Telegram Recording Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/app/backend
ExecStart=/usr/bin/python3 telegram_recording_bot.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable telegram-recording-bot
sudo systemctl start telegram-recording-bot
```

---

## API Endpoints

```
GET  /api/telegram/bot-info           # Информация о боте
GET  /api/telegram/personal-status/{user_id}  # Статус подключения
POST /api/telegram/oauth/callback     # OAuth callback
POST /api/telegram/disconnect/{user_id}  # Отключить Telegram
```

---

## Файлы

| Файл | Описание |
|------|----------|
| `frontend/src/pages/TelegramSettings.jsx` | UI настроек |
| `frontend/src/components/TelegramConnect.jsx` | Виджет подключения |
| `backend/routes/telegram.py` | API роуты |
| `backend/services/telegram_service.py` | Сервис отправки |
| `backend/telegram_bot.py` | Основной бот |
| `backend/telegram_recording_bot.py` | Recording бот |

---

## Troubleshooting

### Бот не отправляет сообщения

1. Проверьте токен в `.env`
2. Убедитесь что бот админ канала
3. Проверьте Channel ID (должен начинаться с `-100`)

### OAuth не работает

1. Проверьте TELEGRAM_BOT_USERNAME в `.env`
2. Убедитесь что callback URL доступен
3. Проверьте что домен добавлен в настройки бота в @BotFather
