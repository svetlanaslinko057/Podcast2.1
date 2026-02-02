import os
from openai import AsyncOpenAI
from dotenv import load_dotenv
import logging
from typing import BinaryIO

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize OpenAI client with Emergent LLM Key (optional)
emergent_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=emergent_key) if emergent_key else None

async def transcribe_audio(audio_file: BinaryIO, filename: str = "audio.mp3") -> dict:
    """
    Транскрибувати аудіо за допомогою OpenAI Whisper
    
    Args:
        audio_file: аудіофайл (file-like object)
        filename: ім'я файлу
    
    Returns:
        dict з текстом транскрипції та додатковою інформацією
    """
    if not client:
        logger.warning("OpenAI client not configured")
        return {"text": "", "segments": [], "error": "OpenAI API key not configured"}
    
    try:
        # Prepare file for OpenAI
        audio_file.name = filename
        
        # Transcribe using Whisper
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            language="uk"  # Українська мова за замовчуванням
        )
        
        # Extract segments with timestamps
        segments = []
        if hasattr(response, 'segments'):
            for segment in response.segments:
                segments.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text
                })
        
        return {
            "text": response.text,
            "segments": segments,
            "duration": response.duration if hasattr(response, 'duration') else None
        }
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise

async def generate_tags_from_transcript(transcript: str) -> list:
    """
    Генерація тегів з транскрипції за допомогою AI
    """
    if not client:
        logger.warning("OpenAI client not configured for tag generation")
        return ["podcast", "audio", "content"]
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Ти асистент, який генерує релевантні теги для подкастів. Поверни список з 5-7 тегів у форматі JSON array. Теги мають бути українською мовою."
                },
                {
                    "role": "user",
                    "content": f"Згенеруй теги для цього подкасту на основі транскрипції: {transcript[:1000]}"
                }
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        # Parse tags from response
        import json
        tags_text = response.choices[0].message.content
        try:
            tags = json.loads(tags_text)
            if isinstance(tags, list):
                return tags
        except Exception:
            # Якщо не JSON, витягнути теги з тексту
            tags = [tag.strip().strip('"').strip("'") for tag in tags_text.split(',')]
            return tags[:7]
        
        return []
    except Exception as e:
        logger.error(f"Tag generation failed: {str(e)}")
        return []