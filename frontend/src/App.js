import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { WalletProvider } from './context/WalletContext';
import { AuthProvider } from './context/AuthContext';
import { LiveProvider } from './context/LiveContext';
import { PlayerProvider } from './components/GlobalPlayer';
import { Navigation } from './components/Navigation';
import { FloatingLivePlayer } from './components/FloatingLivePlayer';
import { Home } from './pages/Home';
import { AuthorProfile } from './pages/AuthorProfile';
import { PodcastDetail } from './pages/PodcastDetail';
import { CreatePodcast } from './pages/CreatePodcast';
import { CreatorWorkspace } from './pages/CreatorWorkspace';
import { TelegramSettings } from './pages/TelegramSettings';
import { ProfileSettings } from './pages/ProfileSettings';
import { MyProfile } from './pages/MyProfile';
import { Dashboard } from './pages/Dashboard';
import { Moderator } from './pages/Moderator';
import { Library } from './pages/Library';
import { Analytics } from './pages/Analytics';
import { StreamingSettings } from './pages/StreamingSettings';
import { TranscriptViewer } from './pages/TranscriptViewer';
import { BrowserRecording } from './pages/BrowserRecording';
import { NFTSettings } from './pages/NFTSettings';
import { SocialIntegrations } from './pages/SocialIntegrations';
import { ArchivedLibrary } from './pages/ArchivedLibrary';
import { LiveRoom } from './pages/LiveRoom';
import { LiveStreams } from './pages/LiveStreams';
import { Messages } from './pages/Messages';
import { Notifications } from './pages/Notifications';
import { Alerts } from './pages/Alerts';
import { SocialHub } from './pages/SocialHub';
import { RSSWebhooks } from './pages/RSSWebhooks';
import { AuthPage } from './pages/AuthPage';
import { AdvancedSearch } from './pages/AdvancedSearch';
import { Members } from './pages/Members';
import { Leaderboard } from './pages/Leaderboard';
import { MyProgress } from './pages/MyProgress';
import { AdminPanel } from './pages/AdminPanel';
import { Analytics as ClubAnalytics } from './pages/ClubAnalytics';
import { LiveManagement } from './pages/LiveManagement';
import { LiveRoom as LiveRoomView } from './pages/LiveRoomView';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <LiveProvider>
            <PlayerProvider>
              <div className="App">
                <Navigation />
                <Toaster 
                  position="top-right" 
                  theme="light"
                  duration={1500}
                  toastOptions={{
                    style: {
                      padding: '12px 16px',
                      fontSize: '14px',
                      maxWidth: '320px',
                    },
                    className: 'sonner-toast',
                  }}
                  visibleToasts={3}
                  closeButton={true}
                />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/register" element={<AuthPage />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/progress" element={<MyProgress />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/analytics" element={<ClubAnalytics />} />
                  <Route path="/workspace" element={<CreatorWorkspace />} />
                  <Route path="/profile" element={<MyProfile />} />
                  <Route path="/author/:authorId" element={<AuthorProfile />} />
                  <Route path="/podcast/:podcastId" element={<PodcastDetail />} />
                  <Route path="/podcast/:podcastId/transcript" element={<TranscriptViewer />} />
                  <Route path="/live/:sessionId" element={<LiveRoomView />} />
                  <Route path="/live-management" element={<LiveManagement />} />
                  <Route path="/live" element={<LiveManagement />} />
                  <Route path="/lives" element={<LiveStreams />} />
                  <Route path="/create" element={<CreatePodcast />} />
                  <Route path="/record" element={<BrowserRecording />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:recipientId" element={<Messages />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/social" element={<SocialHub />} />
                  <Route path="/search" element={<AdvancedSearch />} />
                  <Route path="/settings" element={<ProfileSettings />} />
                  <Route path="/settings/telegram" element={<TelegramSettings />} />
                  <Route path="/settings/streaming" element={<StreamingSettings />} />
                  <Route path="/settings/nft" element={<NFTSettings />} />
                  <Route path="/settings/social" element={<SocialIntegrations />} />
                  <Route path="/settings/webhooks" element={<RSSWebhooks />} />
                  <Route path="/library/archived" element={<ArchivedLibrary />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/moderator" element={<Moderator />} />
                  <Route path="/analytics/:authorId" element={<Analytics />} />
                </Routes>
                {/* Floating Live Player - shows when user leaves live room */}
                <FloatingLivePlayer />
              </div>
            </PlayerProvider>
          </LiveProvider>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;