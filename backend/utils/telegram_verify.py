"""
Telegram Login Widget verification
Based on official Telegram docs: https://core.telegram.org/widgets/login
"""
import hashlib
import hmac
import time
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


def verify_telegram_auth(auth_data: Dict, bot_token: str) -> bool:
    """
    Verify Telegram authentication data
    
    Args:
        auth_data: Dictionary with auth data from Telegram Login Widget
        bot_token: Your Telegram bot token
        
    Returns:
        True if authentication is valid, False otherwise
    """
    check_hash = auth_data.get('hash')
    if not check_hash:
        logger.warning("No hash provided in auth_data")
        return False
    
    # Create data check string (exclude hash from the check)
    auth_data_copy = {k: v for k, v in auth_data.items() if k != 'hash' and v is not None}
    data_check_arr = [f"{k}={v}" for k, v in sorted(auth_data_copy.items())]
    data_check_string = '\n'.join(data_check_arr)
    
    # Create secret key from bot token (SHA256 of bot token)
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Calculate HMAC-SHA256 hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Compare hashes
    is_valid = calculated_hash == check_hash
    
    if not is_valid:
        logger.warning(f"Hash mismatch. Expected: {calculated_hash}, Got: {check_hash}")
    
    return is_valid


def verify_telegram_auth_with_expiry(
    auth_data: Dict,
    bot_token: str,
    max_age_seconds: int = 86400  # 24 hours
) -> tuple[bool, str]:
    """
    Verify Telegram auth with expiration check
    
    Args:
        auth_data: Dictionary with auth data from Telegram Login Widget
        bot_token: Your Telegram bot token
        max_age_seconds: Maximum age of auth_date in seconds
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check auth_date
    auth_date = auth_data.get('auth_date')
    if not auth_date:
        return False, "Missing auth_date"
    
    try:
        auth_timestamp = int(auth_date)
        current_time = int(time.time())
        
        if current_time - auth_timestamp > max_age_seconds:
            return False, "Auth data has expired"
    except (ValueError, TypeError):
        return False, "Invalid auth_date format"
    
    # Verify hash
    if not verify_telegram_auth(auth_data, bot_token):
        return False, "Invalid hash"
    
    return True, ""


def create_telegram_user_data(auth_data: Dict) -> dict:
    """
    Extract user data from Telegram auth response
    
    Args:
        auth_data: Dictionary with auth data from Telegram Login Widget
        
    Returns:
        Dictionary with user information
    """
    return {
        "telegram_id": str(auth_data.get('id', '')),
        "telegram_chat_id": str(auth_data.get('id', '')),  # For personal messages, chat_id = user_id
        "telegram_username": auth_data.get('username'),
        "first_name": auth_data.get('first_name'),
        "last_name": auth_data.get('last_name'),
        "photo_url": auth_data.get('photo_url'),
        "auth_date": auth_data.get('auth_date'),
    }
