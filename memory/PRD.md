# FOMO Voice Club - PRD (Product Requirements Document)

## Project Overview
Private podcast platform with reputation economy, LiveKit voice rooms, and Telegram integration.

**Last Updated:** February 2, 2026

---

## Architecture

### Tech Stack
- **Frontend:** React 19 + TailwindCSS + Radix UI
- **Backend:** FastAPI + Motor (async MongoDB driver)
- **Database:** MongoDB
- **Voice Rooms:** LiveKit Cloud (wss://podcast-4hfb3nr6.livekit.cloud)
- **Messaging:** Telegram Bot (@Podcast_FOMO_bot)

### Key Integrations
| Integration | Status | Details |
|-------------|--------|---------|
| LiveKit | ✅ Active | Real tokens, 1-2 free participants |
| Telegram Bot | ✅ Configured | @Podcast_FOMO_bot |
| MongoDB | ✅ Active | test_database |

---

## User Personas

### 1. Owner (Club Founder)
- Full admin access
- Can create/manage live sessions
- Award badges, manage members
- Wallet: `0xOwnerWallet123456789`

### 2. Admin (Moderator)
- Can create content
- Moderate users and sessions
- Award participation badges
- Wallet: `0xAdminWallet987654321`

### 3. Listener (Regular Member)
- Listen to podcasts
- Join live sessions
- Earn XP through participation
- Raise hand to speak

---

## Core Requirements (Static)

### Authentication
- Wallet-based authentication
- Telegram OAuth integration
- Role-based access (owner, admin, speaker, listener)

### Podcast System
- Upload/record podcasts
- Audio player with waveform visualization
- Chapters, bookmarks, smart resume
- AI features (summary, quotes, highlights)

### Live Sessions
- LiveKit-powered voice rooms
- Real-time chat via WebSocket
- Hand raise queue with priority scoring
- Session recording to Telegram channel
- Floating player widget when minimized

### XP & Reputation
- XP earned through activities
- Level progression (1-5)
- Badge system (participation, contribution, authority)
- Leaderboard rankings

---

## What's Been Implemented

### Phase 1 (Feb 2, 2026)
- [x] Project deployment from GitHub
- [x] Database initialization (4 users, club settings)
- [x] LiveKit integration with real tokens
- [x] Telegram bot configuration
- [x] Sample podcast with real audio file

### Features Working
- [x] Home page with stats (members, XP, live sessions)
- [x] Progress page (requires wallet connection)
- [x] Admin panel (wallets, members, club settings)
- [x] Live Sessions management
- [x] Live Room with chat and participants
- [x] Podcast detail with audio player
- [x] Telegram Connect settings
- [x] Floating Live Player widget
- [x] Badge system (auto-award + manual)

---

## Prioritized Backlog

### P0 (Critical)
- [ ] Test real LiveKit voice connection end-to-end
- [ ] Configure Telegram Recording Bot webhook
- [ ] Test podcast save after live session ends

### P1 (Important)
- [ ] Add more sample podcasts with real audio
- [ ] Implement wallet connection flow fully
- [ ] Test XP award during live participation

### P2 (Nice to have)
- [ ] AI summary generation with OpenAI
- [ ] Push notifications setup
- [ ] RSS feed generation
- [ ] Multi-language support

---

## Next Tasks

1. **Recording Bot Setup**
   - Start telegram_recording_bot.py as service
   - Configure webhook for Telegram channel monitoring
   - Auto-create podcasts from recordings

2. **Wallet Integration**
   - Connect MetaMask/WalletConnect
   - Map wallets to user roles

3. **Full E2E Testing**
   - Start live session
   - Join as speaker
   - Record audio via LiveKit
   - End session
   - Verify podcast created

---

## Configuration

### Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
TELEGRAM_BOT_TOKEN=8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E
LIVEKIT_API_KEY=APIWrnERKLL3FHq
LIVEKIT_API_SECRET=lyFL5ewBGB2FK2iOizIjenTYeM9lgBAXHIAlEA99eNBC
LIVEKIT_URL=wss://podcast-4hfb3nr6.livekit.cloud

# Frontend (.env)
REACT_APP_BACKEND_URL=https://fomo-podcasts-1.preview.emergentagent.com
REACT_APP_LIVEKIT_URL=wss://podcast-4hfb3nr6.livekit.cloud
```

### Test Wallets
- Owner: `0xOwnerWallet123456789`
- Admin: `0xAdminWallet987654321`
- Listener: `0xListenerWallet111222333`
