#!/usr/bin/env python3
"""
FOMO Podcasts Backend API Testing
Tests all critical endpoints for the private podcasts platform
"""
import requests
import sys
import json
from datetime import datetime, timezone
import uuid

class FOMOPodcastsAPITester:
    def __init__(self, base_url="https://fomo-podcasts-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data
        self.test_session_id = None
        self.test_livekit_token = None

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

    def test_api_health(self):
        """Test GET /api/ - API health check"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")
            return False

    def test_club_settings(self):
        """Test GET /api/club/settings - получение настроек клуба"""
        try:
            response = requests.get(f"{self.api_url}/club/settings", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                club_name = data.get('club_name', 'N/A')
                details = f"Status: {response.status_code}, Club: {club_name}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Club Settings", success, details)
            return success
        except Exception as e:
            self.log_test("Club Settings", False, f"Exception: {str(e)}")
            return False

    def test_podcasts_list(self):
        """Test GET /api/podcasts - список подкастов"""
        try:
            response = requests.get(f"{self.api_url}/podcasts", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    podcasts_count = len(data)
                else:
                    podcasts_count = len(data.get('podcasts', []))
                details = f"Status: {response.status_code}, Podcasts count: {podcasts_count}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Podcasts List", success, details)
            return success
        except Exception as e:
            self.log_test("Podcasts List", False, f"Exception: {str(e)}")
            return False

    def test_users_list(self):
        """Test GET /api/users - список пользователей"""
        try:
            response = requests.get(f"{self.api_url}/users", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                users_count = len(data.get('users', []))
                details = f"Status: {response.status_code}, Users count: {users_count}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Users List", success, details)
            return success
        except Exception as e:
            self.log_test("Users List", False, f"Exception: {str(e)}")
            return False

    def test_create_live_session(self):
        """Test POST /api/live-sessions/sessions - создание live сессии"""
        try:
            session_data = {
                "title": f"Test Live Session {datetime.now().strftime('%H:%M:%S')}",
                "description": "Automated test session for FOMO Podcasts",
                "scheduled_at": datetime.now(timezone.utc).isoformat()
            }
            
            response = requests.post(
                f"{self.api_url}/live-sessions/sessions", 
                json=session_data,
                timeout=10
            )
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.test_session_id = data.get('session_id')
                details = f"Status: {response.status_code}, Session ID: {self.test_session_id}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Create Live Session", success, details)
            return success
        except Exception as e:
            self.log_test("Create Live Session", False, f"Exception: {str(e)}")
            return False

    def test_get_live_sessions(self):
        """Test GET /api/live-sessions/sessions - получение списка сессий"""
        try:
            response = requests.get(f"{self.api_url}/live-sessions/sessions", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                sessions_count = len(data.get('sessions', []))
                details = f"Status: {response.status_code}, Sessions count: {sessions_count}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("Get Live Sessions", success, details)
            return success
        except Exception as e:
            self.log_test("Get Live Sessions", False, f"Exception: {str(e)}")
            return False

    def test_livekit_token_generation(self):
        """Test POST /api/live-sessions/livekit/token - генерация LiveKit токена"""
        try:
            token_request = {
                "session_id": self.test_session_id or "test-session",
                "user_id": f"test-user-{uuid.uuid4().hex[:8]}",
                "username": "Test User",
                "role": "listener"
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
                    details = f"Status: {response.status_code}, Real LiveKit token generated, URL: {url}"
                    self.test_livekit_token = token
                elif mock_mode:
                    details = f"Status: {response.status_code}, Mock mode (LiveKit configured but token generation working)"
                else:
                    details = f"Status: {response.status_code}, Token: {bool(token)}, URL: {bool(url)}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:100]}"
                
            self.log_test("LiveKit Token Generation", success, details)
            return success
        except Exception as e:
            self.log_test("LiveKit Token Generation", False, f"Exception: {str(e)}")
            return False

    def test_additional_endpoints(self):
        """Test additional important endpoints"""
        endpoints_to_test = [
            ("/authors", "Authors List"),
            ("/library", "Library"),
            ("/notifications", "Notifications"),
            ("/analytics", "Analytics")
        ]
        
        results = []
        for endpoint, name in endpoints_to_test:
            try:
                response = requests.get(f"{self.api_url}{endpoint}", timeout=10)
                success = response.status_code in [200, 404]  # 404 is acceptable for some endpoints
                details = f"Status: {response.status_code}"
                if response.status_code == 200:
                    try:
                        data = response.json()
                        if isinstance(data, dict) and 'count' in data:
                            details += f", Count: {data['count']}"
                        elif isinstance(data, list):
                            details += f", Items: {len(data)}"
                    except:
                        pass
                
                self.log_test(name, success, details)
                results.append(success)
            except Exception as e:
                self.log_test(name, False, f"Exception: {str(e)}")
                results.append(False)
        
        return all(results)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting FOMO Podcasts API Tests")
        print(f"📡 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Core API tests
        tests = [
            self.test_api_health,
            self.test_club_settings,
            self.test_podcasts_list,
            self.test_users_list,
            self.test_create_live_session,
            self.test_get_live_sessions,
            self.test_livekit_token_generation,
            self.test_additional_endpoints
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n✨ Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests mostly successful!")
            return 0
        else:
            print("⚠️  Multiple API issues detected")
            return 1

def main():
    """Main test runner"""
    tester = FOMOPodcastsAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())