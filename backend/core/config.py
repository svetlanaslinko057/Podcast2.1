"""Application configuration"""
import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment"""
    
    # Database
    mongo_url: str = Field(default="mongodb://localhost:27017", alias="MONGO_URL")
    db_name: str = Field(default="fomo_voice_club", alias="DB_NAME")
    
    # CORS
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")
    
    # LiveKit
    livekit_api_key: str = Field(default="", alias="LIVEKIT_API_KEY")
    livekit_api_secret: str = Field(default="", alias="LIVEKIT_API_SECRET")
    livekit_url: str = Field(default="", alias="LIVEKIT_URL")
    
    # Telegram
    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_bot_username: str = Field(default="", alias="TELEGRAM_BOT_USERNAME")
    telegram_notifications_channel: str = Field(default="", alias="TELEGRAM_NOTIFICATIONS_CHANNEL")
    telegram_notifications_channel_id: str = Field(default="", alias="TELEGRAM_NOTIFICATIONS_CHANNEL_ID")
    telegram_recording_channel: str = Field(default="", alias="TELEGRAM_RECORDING_CHANNEL")
    telegram_recording_channel_id: str = Field(default="", alias="TELEGRAM_RECORDING_CHANNEL_ID")
    
    @property
    def cors_origins_list(self) -> List[str]:
        return self.cors_origins.split(',')
    
    @property
    def livekit_configured(self) -> bool:
        return bool(self.livekit_api_key and self.livekit_api_secret and self.livekit_url)
    
    @property
    def telegram_configured(self) -> bool:
        return bool(self.telegram_bot_token)
    
    class Config:
        env_file = ".env"
        extra = "ignore"


# Global settings instance
settings = Settings()
