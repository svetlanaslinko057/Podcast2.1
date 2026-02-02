# FOMO Voice Club - PRD (Product Requirements Document)

## Project Overview

**Название:** FOMO Voice Club  
**Тип:** Приватная подкаст-платформа с репутационной экономикой  
**GitHub:** https://github.com/ventureguro-create/FOMO-Podcasts-lw

**Last Updated:** February 2, 2026

---

## Архитектура

### Tech Stack
| Компонент | Технология |
|-----------|------------|
| Frontend | React 19 + TailwindCSS + Radix UI |
| Backend | FastAPI + Motor (async MongoDB) |
| Database | MongoDB |
| Voice | LiveKit Cloud (`wss://podcast-4hfb3nr6.livekit.cloud`) |
| Messaging | Telegram Bot (@Podcast_FOMO_bot) |
| Audio | WaveSurfer.js |

### Интеграции
| Integration | Status | Keys Location |
|-------------|--------|---------------|
| LiveKit | ✅ Active | `backend/.env` |
| Telegram | ✅ Configured | `backend/.env` |
| MongoDB | ✅ Active | `backend/.env` |

---

## User Personas

### 1. Owner (Владелец)
- Полный доступ
- Управление админами
- Создание Live сессий
- Wallet: `0xOwnerWallet123456789`

### 2. Admin (Администратор)
- Создание контента
- Модерация
- Выдача бейджей
- Wallet: `0xAdminWallet987654321`

### 3. Listener (Слушатель)
- Прослушивание подкастов
- Участие в Live
- Накопление XP
- Wallet: `0xListenerWallet111222333`

---

## Core Requirements

### Аутентификация
- Wallet-based auth (MetaMask/WalletConnect)
- Telegram OAuth
- Role-based access (owner, admin, speaker, listener)

### Подкасты
- Загрузка/запись
- Аудио плеер с waveform
- Лайки, комментарии, теги

### Live Sessions
- LiveKit голосовые комнаты (1-2 участника бесплатно)
- Telegram Voice Chat для слушателей
- WebSocket чат
- Hand Raise система
- Floating Player при сворачивании

### XP и Бейджи
- XP за активность
- 5 уровней прокачки
- Автоматические и ручные бейджи

---

## What's Been Implemented

### Фаза 1 (Feb 2, 2026) - Деплой и инициализация
- [x] Клонирование и деплой с GitHub
- [x] Инициализация базы (4 пользователя, Club Settings)
- [x] LiveKit интеграция с реальными токенами
- [x] Telegram бот конфигурация
- [x] Тестовый подкаст с реальным аудио
- [x] Админ панель
- [x] Progress/XP страница
- [x] Telegram Connect
- [x] Live Sessions с LiveKit

### Фаза 2 (Feb 2, 2026) - Документация
- [x] README.md
- [x] docs/ARCHITECTURE.md
- [x] docs/API.md
- [x] docs/CONFIGURATION.md
- [x] docs/ADMIN_PANEL.md
- [x] docs/LIVE_SESSIONS.md
- [x] docs/TELEGRAM.md
- [x] docs/QUICK_START.md
- [x] backend/.env.example

---

## Prioritized Backlog

### P0 (Critical)
- [ ] E2E тест Live Session flow
- [ ] Recording Bot запуск как сервис
- [ ] Wallet connect интеграция

### P1 (Important)
- [ ] Больше тестовых подкастов
- [ ] AI summary (интеграция OpenAI)
- [ ] Push notifications

### P2 (Nice to have)
- [ ] RSS feed
- [ ] Мультиязычность
- [ ] Mobile app

---

## Next Tasks

1. **E2E тестирование:**
   - Создать Live Session
   - Присоединиться как speaker
   - Завершить и проверить сохранение

2. **Recording Bot:**
   - Добавить в supervisor
   - Настроить webhook

3. **Production:**
   - Заменить тестовые кошельки
   - Настроить HTTPS
   - MongoDB Atlas

---

## Документация

| Документ | Путь | Описание |
|----------|------|----------|
| README | `/README.md` | Главный файл |
| Архитектура | `/docs/ARCHITECTURE.md` | Структура проекта |
| API | `/docs/API.md` | Все эндпоинты |
| Конфиг | `/docs/CONFIGURATION.md` | Где ключи, как получить |
| Админка | `/docs/ADMIN_PANEL.md` | Описание админ панели |
| Live | `/docs/LIVE_SESSIONS.md` | Live сессии + LiveKit |
| Telegram | `/docs/TELEGRAM.md` | Боты, каналы, OAuth |
| Quick Start | `/docs/QUICK_START.md` | Быстрый запуск |
| .env example | `/backend/.env.example` | Шаблон конфига |

---

## Ключи и конфигурация

### LiveKit
```
API Key: APIWrnERKLL3FHq
API Secret: lyFL5ewBGB2FK2iOizIjenTYeM9lgBAXHIAlEA99eNBC
URL: wss://podcast-4hfb3nr6.livekit.cloud
```

### Telegram
```
Bot Token: 8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E
Bot Username: Podcast_FOMO_bot
Notifications Channel: @P_FOMO (-1002475795498)
Recording Channel: @Podcast_F (-1003133850361)
```

### Тестовые кошельки
```
Owner: 0xOwnerWallet123456789
Admin: 0xAdminWallet987654321
Listener: 0xListenerWallet111222333
```
