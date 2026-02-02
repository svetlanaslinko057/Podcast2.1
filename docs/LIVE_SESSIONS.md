# 🎙️ Live Sessions

## Обзор

Live Sessions - это голосовые трансляции в реальном времени с:

- **LiveKit** для голоса спикера (1-2 человека)
- **Telegram** для слушателей в голосовом чате
- **WebSocket** для чата в реальном времени
- **Автозапись** для сохранения подкаста

---

## Архитектура

```
┌─────────────────┐
│ Спикер (Админ)│    ┌─────────────────┐
│  Микрофон     │───▶│  LiveKit Cloud  │
└─────────────────┘    │  (WebRTC)       │
                        └────────┬────────┘
                               │
        ┌─────────────────────┼─────────────────────┐
        ▼                      ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Слушатель 1   │   │ Слушатель 2   │   │ Telegram      │
│ (Браузер)    │   │ (Браузер)    │   │ Voice Chat    │
└───────────────┘   └───────────────┘   └───────────────┘
                                                   │
                                          ┌───────┴───────┐
                                          │ Recording Bot │
                                          │ (сохранение)  │
                                          └───────┬───────┘
                                                  │
                                          ┌───────┴───────┐
                                          │   Подкаст     │
                                          │  (библиотека) │
                                          └───────────────┘
```

---

## Создание сессии

### Через UI

1. Перейти на `/live`
2. Нажать "Create Live Session"
3. Заполнить форму:
   - Название сессии
   - Описание
4. Получить RTMP URL для Telegram

### Через API

```bash
curl -X POST "https://your-domain.com/api/live-sessions/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Live Session",
    "description": "Talking about tech",
    "host_id": "owner-001"
  }'
```

**Ответ:**
```json
{
  "session_id": "uuid",
  "rtmp_url": "rtmps://dc4-1.rtmp.t.me/s/...",
  "stream_key": "...",
  "status": "scheduled",
  "telegram_instructions": {
    "step_1": "Open OBS or streaming software",
    "step_2": "Set RTMP URL",
    "step_3": "Start streaming",
    "step_4": "Session will go live"
  }
}
```

---

## Присоединение к сессии

### Как спикер

1. Перейти на `/live/{session_id}`
2. Разрешить доступ к микрофону
3. Начать говорить

**Получение токена:**
```bash
curl -X POST "https://your-domain.com/api/live-sessions/livekit/token" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "uuid",
    "user_id": "owner-001",
    "username": "Club Owner",
    "role": "speaker"
  }'
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "url": "wss://podcast-4hfb3nr6.livekit.cloud",
  "room": "session-uuid",
  "mock_mode": false
}
```

### Как слушатель

1. Перейти на `/live/{session_id}`
2. Слушать трансляцию
3. Писать в чат
4. Поднимать руку (Hand Raise)

---

## Статусы сессии

```
scheduled → active → ended
    │                    │
    │                    └──▶ создание подкаста
    │
    └────▶ cancelled
```

| Статус | Описание |
|--------|----------|
| `scheduled` | Сессия создана, ожидает запуска |
| `active` | Сессия в эфире |
| `ended` | Сессия завершена |
| `cancelled` | Сессия отменена |

---

## LiveKit интеграция

### Конфигурация

```env
# backend/.env
LIVEKIT_API_KEY="APIWrnERKLL3FHq"
LIVEKIT_API_SECRET="lyFL5ewBGB2FK2iOizIjenTYeM9lgBAXHIAlEA99eNBC"
LIVEKIT_URL="wss://podcast-4hfb3nr6.livekit.cloud"

# frontend/.env
REACT_APP_LIVEKIT_URL="wss://podcast-4hfb3nr6.livekit.cloud"
```

### Код генерации токена

```python
# backend/routes/live_sessions.py

from livekit import api

def generate_livekit_token(session_id, user_id, username, is_speaker):
    token = api.AccessToken(
        os.environ['LIVEKIT_API_KEY'],
        os.environ['LIVEKIT_API_SECRET']
    )
    token.with_identity(user_id)
    token.with_name(username)
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=f"session-{session_id}",
        can_publish=is_speaker,      # Только speaker может говорить
        can_subscribe=True           # Все могут слушать
    ))
    return token.to_jwt()
```

### Frontend подключение

```jsx
// frontend/src/pages/LiveRoomView.jsx

import { useRoom, useParticipant } from '@livekit/components-react';

const LiveRoom = ({ token, serverUrl }) => {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
    >
      <AudioRenderer />
      <ParticipantsList />
    </LiveKitRoom>
  );
};
```

---

## Floating Player (Сворачивание)

При выходе из Live Room сессия сворачивается в виджет.

### Компонент

```jsx
// frontend/src/components/FloatingLivePlayer.jsx

const FloatingLivePlayer = ({ session, onExpand, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="animate-pulse bg-red-500 w-3 h-3 rounded-full" />
        <span>{session.title}</span>
        <button onClick={onExpand}>Развернуть</button>
        <button onClick={onClose}>Закрыть</button>
      </div>
      <AudioRenderer />
    </div>
  );
};
```

### Поведение

- При переходе на другую страницу → появляется виджет
- Клик на виджет → возврат в Live Room
- Закрытие → отключение от сессии
- Аудио продолжает играть в фоне

---

## Hand Raise (Поднятие руки)

### Логика

1. Слушатель нажимает "Поднять руку"
2. Запрос добавляется в очередь
3. Спикер видит очередь
4. Спикер приглашает слушателя
5. Слушатель получает право говорить

### Приоритет

Очередь сортируется по:
1. XP пользователя
2. Времени ожидания
3. Истории выступлений

---

## Telegram интеграция

### RTMP стриминг

При создании сессии генерируется RTMP URL:

```
rtmps://dc4-1.rtmp.t.me/s/{stream_key}
```

Этот URL используется для стриминга в Telegram Voice Chat.

### Recording Bot

Бот мониторит канал `@Podcast_F` и:
1. Скачивает запись после завершения
2. Создает подкаст в библиотеке
3. Отправляет уведомление

**Запуск бота:**
```bash
cd backend
python telegram_recording_bot.py
```

---

## Файлы

| Файл | Описание |
|------|----------|
| `frontend/src/pages/LiveManagement.jsx` | Список и создание сессий |
| `frontend/src/pages/LiveRoomView.jsx` | Комната Live сессии |
| `frontend/src/components/FloatingLivePlayer.jsx` | Виджет свернутой сессии |
| `backend/routes/live_sessions.py` | API Live сессий |
| `backend/live_websocket_manager.py` | WebSocket чат |
| `backend/telegram_recording_bot.py` | Бот записи |

---

## API Endpoints

```
POST /api/live-sessions/sessions           # Создать сессию
GET  /api/live-sessions/sessions           # Список сессий
GET  /api/live-sessions/sessions/{id}      # Детали сессии
POST /api/live-sessions/sessions/{id}/start # Начать
POST /api/live-sessions/sessions/{id}/end   # Завершить
POST /api/live-sessions/livekit/token      # Получить токен
```
