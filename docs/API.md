# 📡 API Документация

## Базовый URL

```
Production: https://your-domain.com/api
Local:      http://localhost:8001/api
```

## Swagger UI

Интерактивная документация: `{BASE_URL}/docs`

---

## 🔐 Аутентификация

Большинство эндпоинтов требуют идентификацию пользователя через:
- `user_id` в query параметрах
- `wallet_address` для админ операций

---

## 📻 Live Sessions

### Получить все сессии

```http
GET /api/live-sessions/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Live Session Title",
      "description": "Description",
      "status": "scheduled",
      "host_id": "owner-001",
      "rtmp_url": "rtmps://dc4-1.rtmp.t.me/s/...",
      "stream_key": "...",
      "participants": [],
      "created_at": "2026-02-02T12:00:00Z"
    }
  ]
}
```

### Создать сессию

```http
POST /api/live-sessions/sessions
Content-Type: application/json

{
  "title": "My Live Session",
  "description": "Session description",
  "host_id": "owner-001"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "rtmp_url": "rtmps://dc4-1.rtmp.t.me/s/...",
  "stream_key": "...",
  "status": "scheduled",
  "telegram_instructions": {
    "step_1": "Open OBS or FFmpeg",
    "step_2": "Set RTMP URL: ...",
    "step_3": "Start streaming"
  }
}
```

### Получить LiveKit токен

```http
POST /api/live-sessions/livekit/token
Content-Type: application/json

{
  "session_id": "uuid",
  "user_id": "owner-001",
  "username": "Club Owner",
  "role": "speaker"  // "speaker" или "listener"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "url": "wss://podcast-4hfb3nr6.livekit.cloud",
  "room": "session-uuid",
  "mock_mode": false
}
```

### Начать сессию

```http
POST /api/live-sessions/sessions/{session_id}/start
```

### Завершить сессию

```http
POST /api/live-sessions/sessions/{session_id}/end
```

---

## 🎙️ Подкасты

### Получить все подкасты

```http
GET /api/podcasts?limit=50&skip=0&author_id=xxx&tag=xxx
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Podcast Title",
    "description": "...",
    "author_id": "owner-001",
    "author_name": "Club Owner",
    "audio_url": "/static/audio/file.mp3",
    "duration": 3600,
    "listens": 100,
    "likes": 25,
    "tags": ["tech", "crypto"],
    "created_at": "2026-02-02T12:00:00Z"
  }
]
```

### Получить подкаст по ID или slug

```http
GET /api/podcasts/{podcast_id}
GET /api/podcasts/welcome-to-fomo-voice-club
```

### Создать подкаст

```http
POST /api/podcasts
Content-Type: application/json

{
  "title": "New Podcast",
  "description": "Description",
  "author_id": "owner-001",
  "tags": ["tag1", "tag2"]
}
```

### Загрузить аудио

```http
POST /api/podcasts/{podcast_id}/upload
Content-Type: multipart/form-data

audio: (binary file)
```

---

## 👤 Пользователи

### Получить всех пользователей

```http
GET /api/users
```

### Получить пользователя

```http
GET /api/users/{user_id}
```

### Получить бейджи пользователя

```http
GET /api/users/{user_id}/badges
```

**Response:**
```json
{
  "user_id": "owner-001",
  "user_name": "Club Owner",
  "total_badges": 3,
  "badges": {
    "participation": [
      {
        "key": "early_member",
        "name": "Early Member",
        "description": "Joined in the first 30 days",
        "icon": "🌟"
      }
    ],
    "contribution": [],
    "authority": [
      {
        "key": "core_member",
        "name": "Core Member",
        "description": "Essential part of community",
        "icon": "⭐"
      }
    ]
  }
}
```

---

## 📈 XP Система

### Получить прогресс пользователя

```http
GET /api/xp/{user_id}/progress
```

**Response:**
```json
{
  "user_id": "owner-001",
  "user_name": "Club Owner",
  "xp_total": 10000,
  "current_level": 5,
  "current_level_name": "Core Voice",
  "next_level": 6,
  "next_level_name": "Legend",
  "xp_to_next_level": 5000,
  "progress_percent": 66,
  "xp_breakdown": {
    "listening_time": 3000,
    "live_attendance": 2500,
    "hand_raises": 100,
    "speeches_given": 200,
    "support_received": 50
  },
  "engagement_score": 85.5,
  "priority_score": 92.3
}
```

### XP Уровни

| Уровень | Название | Требуемый XP |
|---------|----------|-------------|
| 1 | Observer | 0 |
| 2 | Active | 500 |
| 3 | Contributor | 2000 |
| 4 | Speaker | 5000 |
| 5 | Core Voice | 10000 |

---

## 🛡️ Админ панель

### Получить настройки

```http
GET /api/admin/settings
```

**Response:**
```json
{
  "owner_wallet": "0xOwnerWallet123456789",
  "admin_wallets": ["0xAdminWallet987654321"]
}
```

### Обновить настройки

```http
POST /api/admin/settings
Content-Type: application/json

{
  "owner_wallet": "0xNewOwnerWallet",
  "admin_wallets": ["0xAdmin1", "0xAdmin2"]
}
```

---

## 🏢 Клуб

### Получить настройки клуба

```http
GET /api/club/settings
```

**Response:**
```json
{
  "club_name": "FOMO Voice Club",
  "club_description": "Private podcast club",
  "club_owner_wallet": "0x...",
  "max_members": 1000,
  "registration_mode": "open",
  "enable_hand_raise": true
}
```

---

## 🏅 Бейджи

### Доступные бейджи

```http
GET /api/badges/available
```

**Response:**
```json
{
  "participation_badges": [
    {"key": "early_member", "name": "Early Member", "icon": "🌟"},
    {"key": "first_speaker", "name": "First Time Speaker", "icon": "🎤"},
    {"key": "10_sessions", "name": "10 Sessions Attended", "icon": "🎙️"}
  ],
  "contribution_badges": [...],
  "authority_badges": [...],
  "total": 14
}
```

### Выдать бейдж (только Admin/Owner)

```http
POST /api/users/{user_id}/badges?badge_key=early_member&admin_id=owner-001
```

---

## 📱 Telegram

### Информация о боте

```http
GET /api/telegram/bot-info
```

**Response:**
```json
{
  "bot_username": "Podcast_FOMO_bot",
  "bot_name": "FOMO Podcasts Bot"
}
```

### Статус подключения

```http
GET /api/telegram/personal-status/{user_id}
```

---

## ❌ Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request - неверные параметры |
| 401 | Unauthorized - требуется авторизация |
| 403 | Forbidden - недостаточно прав |
| 404 | Not Found - ресурс не найден |
| 500 | Internal Server Error |

**Формат ошибки:**
```json
{
  "detail": "Error message description"
}
```
