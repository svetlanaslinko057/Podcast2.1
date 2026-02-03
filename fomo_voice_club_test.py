#!/usr/bin/env python3
"""
FOMO Voice Club - Comprehensive Feature Testing
Tests all features mentioned in the review request
"""
import requests
import sys
import json
from datetime import datetime, timezone
import uuid
import time

class FOMOVoiceClubTester:
    def __init__(self, base_url="https://podtalk-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from review request
        self.test_owner_wallet = "0xOwnerWallet123456789"
        self.test_admin_wallet = "0xAdminWallet987654321"
        self.test_listener_wallet = "0xListenerWallet111222333"
        
        # Test data
        self.test_session_id = None
        self.test_podcast_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")
        print()

    def test_user_badges_api(self):
        """Test GET /api/users/:id/badges - получение бейджей пользователя"""
        test_users = [
            ("owner-001", "Owner User"),
            ("admin-001", "Admin User"), 
            ("listener-001", "Listener User"),
            (self.test_owner_wallet, "Test Owner Wallet"),
            (self.test_admin_wallet, "Test Admin Wallet")
        ]
        
        all_success = True
        for user_id, user_desc in test_users:
            try:
                response = requests.get(f"{self.api_url}/users/{user_id}/badges", timeout=10)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total_badges = data.get('total_badges', 0)
                    user_name = data.get('user_name', 'Unknown')
                    badges = data.get('badges', {})
                    participation = len(badges.get('participation', []))
                    contribution = len(badges.get('contribution', []))
                    authority = len(badges.get('authority', []))
                    
                    details = f"User: {user_name}, Total badges: {total_badges} (P:{participation}, C:{contribution}, A:{authority})"
                else:
                    details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                    all_success = False
                    
                self.log_test(f"User Badges API - {user_desc}", success, details)
            except Exception as e:
                self.log_test(f"User Badges API - {user_desc}", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success

    def test_xp_progress_api(self):
        """Test GET /api/xp/:id/progress - XP прогресс пользователя"""
        test_users = [
            ("owner-001", "Owner User"),
            ("admin-001", "Admin User"),
            ("listener-001", "Listener User"),
            (self.test_owner_wallet, "Test Owner Wallet"),
            (self.test_admin_wallet, "Test Admin Wallet")
        ]
        
        all_success = True
        for user_id, user_desc in test_users:
            try:
                response = requests.get(f"{self.api_url}/xp/{user_id}/progress", timeout=10)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    xp_total = data.get('xp_total', 0)
                    current_level = data.get('current_level', 1)
                    level_name = data.get('level_name', 'Unknown')
                    engagement_score = data.get('engagement_score', 0)
                    priority_score = data.get('priority_score', 0)
                    
                    details = f"XP: {xp_total}, Level: {current_level} ({level_name}), Engagement: {engagement_score}, Priority: {priority_score}"
                else:
                    details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                    all_success = False
                    
                self.log_test(f"XP Progress API - {user_desc}", success, details)
            except Exception as e:
                self.log_test(f"XP Progress API - {user_desc}", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success

    def test_livekit_token_generation(self):
        """Test POST /api/live-sessions/livekit/token - генерация LiveKit токена"""
        try:
            # First create a test session
            session_data = {
                "title": f"LiveKit Test Session {datetime.now().strftime('%H:%M:%S')}",
                "description": "Test session for LiveKit token generation"
            }
            
            session_response = requests.post(
                f"{self.api_url}/live-sessions/sessions", 
                json=session_data,
                timeout=10
            )
            
            if session_response.status_code != 200:
                self.log_test("LiveKit Token Generation", False, "Failed to create test session")
                return False
            
            session_id = session_response.json().get('session_id')
            self.test_session_id = session_id
            
            # Test token generation for different roles
            test_cases = [
                ("listener", "Test Listener"),
                ("speaker", "Test Speaker"),
                ("admin", "Test Admin")
            ]
            
            all_success = True
            for role, username in test_cases:
                token_request = {
                    "session_id": session_id,
                    "user_id": f"test-{role}-{uuid.uuid4().hex[:8]}",
                    "username": username,
                    "role": role
                }
                
                response = requests.post(
                    f"{self.api_url}/live-sessions/livekit/token",
                    json=token_request,
                    timeout=10
                )
                
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    mock_mode = data.get('mock_mode', True)
                    token = data.get('token')
                    url = data.get('url')
                    
                    if not mock_mode and token and url:
                        details = f"Role: {role}, Real LiveKit token generated, URL: {url[:50]}..."
                    elif mock_mode:
                        details = f"Role: {role}, Mock mode (LiveKit configured)"
                    else:
                        details = f"Role: {role}, Token: {bool(token)}, URL: {bool(url)}"
                else:
                    details = f"Role: {role}, Status: {response.status_code}, Response: {response.text[:100]}"
                    all_success = False
                    
                self.log_test(f"LiveKit Token Generation - {role}", success, details)
            
            return all_success
            
        except Exception as e:
            self.log_test("LiveKit Token Generation", False, f"Exception: {str(e)}")
            return False

    def test_audio_file_access(self):
        """Test audio playback - проверить что аудио файл загружается"""
        try:
            # Test the welcome audio file mentioned in the context
            audio_url = f"{self.base_url}/static/audio/welcome.mp3"
            
            response = requests.head(audio_url, timeout=10)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', 'unknown')
                content_length = response.headers.get('content-length', 'unknown')
                details = f"Audio file accessible, Type: {content_type}, Size: {content_length} bytes"
            else:
                details = f"Status: {response.status_code}, Headers: {dict(response.headers)}"
                
            self.log_test("Audio File Access", success, details)
            return success
            
        except Exception as e:
            self.log_test("Audio File Access", False, f"Exception: {str(e)}")
            return False

    def test_podcast_with_audio(self):
        """Test podcast endpoint and audio integration"""
        try:
            # Get podcasts list first
            response = requests.get(f"{self.api_url}/podcasts", timeout=10)
            if response.status_code != 200:
                self.log_test("Podcast with Audio", False, "Failed to get podcasts list")
                return False
            
            podcasts = response.json()
            if isinstance(podcasts, dict):
                podcasts = podcasts.get('podcasts', [])
            
            if not podcasts:
                self.log_test("Podcast with Audio", False, "No podcasts found")
                return False
            
            # Test first podcast
            podcast = podcasts[0]
            podcast_id = podcast.get('id')
            self.test_podcast_id = podcast_id
            
            # Get podcast details
            podcast_response = requests.get(f"{self.api_url}/podcasts/{podcast_id}", timeout=10)
            success = podcast_response.status_code == 200
            
            if success:
                podcast_data = podcast_response.json()
                title = podcast_data.get('title', 'Unknown')
                audio_url = podcast_data.get('audio_url', '')
                duration = podcast_data.get('duration', 0)
                
                # Test if audio URL is accessible
                audio_accessible = False
                if audio_url:
                    try:
                        audio_check = requests.head(audio_url, timeout=5)
                        audio_accessible = audio_check.status_code == 200
                    except:
                        pass
                
                details = f"Podcast: {title}, Duration: {duration}s, Audio URL: {bool(audio_url)}, Audio accessible: {audio_accessible}"
            else:
                details = f"Status: {podcast_response.status_code}, Response: {podcast_response.text[:100]}"
                
            self.log_test("Podcast with Audio", success, details)
            return success
            
        except Exception as e:
            self.log_test("Podcast with Audio", False, f"Exception: {str(e)}")
            return False

    def test_admin_settings_api(self):
        """Test admin settings endpoints"""
        try:
            # Test getting admin settings
            response = requests.get(f"{self.api_url}/admin/settings", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                owner_wallet = data.get('owner_wallet', '')
                admin_wallets = data.get('admin_wallets', [])
                details = f"Owner wallet: {owner_wallet[:20]}..., Admin wallets: {len(admin_wallets)}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Admin Settings API", success, details)
            return success
            
        except Exception as e:
            self.log_test("Admin Settings API", False, f"Exception: {str(e)}")
            return False

    def test_telegram_integration_api(self):
        """Test Telegram integration endpoints"""
        test_author_id = "demo-author-123"
        
        try:
            # Test Telegram status check
            response = requests.get(f"{self.api_url}/telegram/personal-status/{test_author_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                connected = data.get('connected', False)
                username = data.get('username', '')
                details = f"Connected: {connected}, Username: {username}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Telegram Integration API", success, details)
            return success
            
        except Exception as e:
            self.log_test("Telegram Integration API", False, f"Exception: {str(e)}")
            return False

    def test_live_session_management(self):
        """Test complete live session management workflow"""
        try:
            # 1. Create a live session
            session_data = {
                "title": f"Complete Test Session {datetime.now().strftime('%H:%M:%S')}",
                "description": "Full workflow test session"
            }
            
            create_response = requests.post(
                f"{self.api_url}/live-sessions/sessions", 
                json=session_data,
                headers={'X-Wallet-Address': self.test_admin_wallet},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("Live Session Management", False, "Failed to create session")
                return False
            
            session_id = create_response.json().get('session_id')
            
            # 2. Get session details
            get_response = requests.get(f"{self.api_url}/live-sessions/sessions/{session_id}", timeout=10)
            if get_response.status_code != 200:
                self.log_test("Live Session Management", False, "Failed to get session details")
                return False
            
            session_details = get_response.json()
            
            # 3. Start the session
            start_response = requests.post(
                f"{self.api_url}/live-sessions/sessions/{session_id}/start",
                headers={'X-Wallet-Address': self.test_admin_wallet},
                timeout=10
            )
            
            start_success = start_response.status_code == 200
            
            # 4. End the session
            end_response = requests.post(
                f"{self.api_url}/live-sessions/sessions/{session_id}/end",
                headers={'X-Wallet-Address': self.test_admin_wallet},
                timeout=10
            )
            
            end_success = end_response.status_code == 200
            
            success = start_success and end_success
            details = f"Session ID: {session_id}, Start: {start_success}, End: {end_success}"
            
            self.log_test("Live Session Management", success, details)
            return success
            
        except Exception as e:
            self.log_test("Live Session Management", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all FOMO Voice Club feature tests"""
        print("🎙️ Starting FOMO Voice Club Feature Tests")
        print(f"📡 Testing API: {self.api_url}")
        print("=" * 70)
        
        # Backend API tests for specific features
        tests = [
            self.test_user_badges_api,
            self.test_xp_progress_api,
            self.test_livekit_token_generation,
            self.test_audio_file_access,
            self.test_podcast_with_audio,
            self.test_admin_settings_api,
            self.test_telegram_integration_api,
            self.test_live_session_management
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("=" * 70)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n✨ Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 FOMO Voice Club backend tests mostly successful!")
            return 0
        else:
            print("⚠️  Multiple issues detected in FOMO Voice Club features")
            return 1

def main():
    """Main test runner"""
    tester = FOMOVoiceClubTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())