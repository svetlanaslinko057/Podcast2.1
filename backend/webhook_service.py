"""
Webhook Service for FOMO Podcasts Platform
Handles webhook delivery with retry logic and Telegram integration
"""

import httpx
import asyncio
import logging
import hashlib
import hmac
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Supported webhook events
WEBHOOK_EVENTS = [
    'podcast.created',
    'podcast.updated',
    'podcast.deleted',
    'comment.created',
    'reaction.added',
    'follower.new',
    'live.started',
    'live.ended',
]

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [1, 5, 15]  # seconds (exponential-ish backoff)


class WebhookService:
    """Service for managing and triggering webhooks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    async def trigger_webhooks(self, event: str, data: Dict):
        """
        Trigger all active webhooks subscribed to this event
        
        Args:
            event: Event name (e.g., 'podcast.created')
            data: Event data payload
        """
        if event not in WEBHOOK_EVENTS:
            logger.warning(f"Unknown webhook event: {event}")
            return
        
        # Find all active webhooks subscribed to this event
        webhooks = await self.db.webhooks.find({
            'is_active': True,
            'events': event
        }).to_list(100)
        
        logger.info(f"Triggering {len(webhooks)} webhooks for event: {event}")
        
        # Trigger webhooks concurrently
        tasks = [self._trigger_webhook(webhook, event, data) for webhook in webhooks]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _trigger_webhook(self, webhook: Dict, event: str, data: Dict):
        """
        Trigger a single webhook with retry logic
        
        Args:
            webhook: Webhook document from database
            event: Event name
            data: Event payload
        """
        webhook_id = webhook['id']
        url = webhook['url']
        secret = webhook.get('secret')
        
        # Check if Telegram integration is configured
        telegram_bot_token = webhook.get('telegram_bot_token')
        telegram_chat_id = webhook.get('telegram_chat_id')
        
        # Send Telegram notification if configured
        if telegram_bot_token and telegram_chat_id:
            try:
                from services.telegram_service import telegram_service
                
                # Send formatted notification based on event type
                if event == 'podcast.created':
                    await telegram_service.send_podcast_notification(
                        telegram_bot_token,
                        telegram_chat_id,
                        data
                    )
                elif event == 'live.started':
                    await telegram_service.send_live_notification(
                        telegram_bot_token,
                        telegram_chat_id,
                        data
                    )
                elif event == 'comment.created':
                    await telegram_service.send_comment_notification(
                        telegram_bot_token,
                        telegram_chat_id,
                        data
                    )
                elif event == 'follower.new':
                    await telegram_service.send_follower_notification(
                        telegram_bot_token,
                        telegram_chat_id,
                        data
                    )
                else:
                    # Generic message for other events
                    message = f"🔔 Событие: {event}\n\nДанные: {json.dumps(data, indent=2, ensure_ascii=False)}"
                    await telegram_service.send_message(
                        telegram_bot_token,
                        telegram_chat_id,
                        message[:4000]  # Telegram limit
                    )
            except Exception as e:
                logger.error(f"Telegram notification failed: {e}")
        
        # Continue with regular webhook call
        # Prepare payload
        payload = {
            'event': event,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'data': data
        }
        
        # Add signature if secret is provided
        headers = {'Content-Type': 'application/json'}
        if secret:
            signature = self._generate_signature(payload, secret)
            headers['X-Webhook-Signature'] = signature
        
        # Try sending with retries
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await self.client.post(
                    url,
                    json=payload,
                    headers=headers
                )
                
                success = 200 <= response.status_code < 300
                
                # Log the webhook call
                await self._log_webhook_call(
                    webhook_id=webhook_id,
                    event=event,
                    payload=payload,
                    status_code=response.status_code,
                    response_body=response.text[:500],  # Limit response body
                    attempt=attempt,
                    success=success
                )
                
                # Update webhook stats
                await self._update_webhook_stats(webhook_id, success)
                
                if success:
                    logger.info(f"Webhook {webhook_id} triggered successfully (attempt {attempt})")
                    return
                else:
                    logger.warning(f"Webhook {webhook_id} failed with status {response.status_code}")
                    
            except Exception as e:
                error_message = str(e)
                logger.error(f"Webhook {webhook_id} error (attempt {attempt}): {error_message}")
                
                # Log the error
                await self._log_webhook_call(
                    webhook_id=webhook_id,
                    event=event,
                    payload=payload,
                    error_message=error_message,
                    attempt=attempt,
                    success=False
                )
            
            # Wait before retry (except on last attempt)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAYS[attempt - 1])
        
        # All retries failed
        await self._update_webhook_stats(webhook_id, success=False)
    
    async def test_webhook(self, url: str, secret: Optional[str] = None) -> Dict:
        """
        Test a webhook URL with a sample payload
        
        Args:
            url: Webhook URL to test
            secret: Optional secret for signature
        
        Returns:
            Dict with test results
        """
        payload = {
            'event': 'webhook.test',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'data': {
                'message': 'This is a test webhook from FOMO Podcasts'
            }
        }
        
        headers = {'Content-Type': 'application/json'}
        if secret:
            signature = self._generate_signature(payload, secret)
            headers['X-Webhook-Signature'] = signature
        
        try:
            response = await self.client.post(
                url,
                json=payload,
                headers=headers,
                timeout=5.0
            )
            
            return {
                'success': 200 <= response.status_code < 300,
                'status_code': response.status_code,
                'response': response.text[:200],
                'error': None
            }
            
        except Exception as e:
            return {
                'success': False,
                'status_code': None,
                'response': None,
                'error': str(e)
            }
    
    async def send_telegram_notification(
        self,
        bot_token: str,
        chat_id: str,
        message: str,
        parse_mode: str = 'HTML'
    ) -> bool:
        """
        Send notification to Telegram
        
        Args:
            bot_token: Telegram bot token
            chat_id: Telegram chat/channel ID
            message: Message text
            parse_mode: Message formatting (HTML or Markdown)
        
        Returns:
            Success status
        """
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        payload = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': parse_mode
        }
        
        try:
            response = await self.client.post(url, json=payload, timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Telegram notification failed: {e}")
            return False
    
    def _generate_signature(self, payload: Dict, secret: str) -> str:
        """
        Generate HMAC signature for webhook payload
        
        Args:
            payload: Webhook payload
            secret: Secret key
        
        Returns:
            Hex signature string
        """
        payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def _log_webhook_call(
        self,
        webhook_id: str,
        event: str,
        payload: Dict,
        status_code: Optional[int] = None,
        response_body: Optional[str] = None,
        error_message: Optional[str] = None,
        attempt: int = 1,
        success: bool = False
    ):
        """Log webhook call to database"""
        log_entry = {
            'webhook_id': webhook_id,
            'event': event,
            'payload': payload,
            'status_code': status_code,
            'response_body': response_body,
            'error_message': error_message,
            'attempt': attempt,
            'success': success,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.webhook_logs.insert_one(log_entry)
    
    async def _update_webhook_stats(self, webhook_id: str, success: bool):
        """Update webhook statistics"""
        update = {
            '$inc': {
                'total_calls': 1,
                'successful_calls': 1 if success else 0,
                'failed_calls': 0 if success else 1
            },
            '$set': {
                'last_triggered_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
        
        await self.db.webhooks.update_one(
            {'id': webhook_id},
            update
        )


# Global webhook service instance (will be initialized in server.py)
webhook_service: Optional[WebhookService] = None
