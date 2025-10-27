import base64
import os
from typing import List, Literal, Optional

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[assignment]


router = APIRouter(prefix="/assist", tags=["assist"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "Rachel")
ELEVENLABS_TTS_MODEL_ID = os.getenv("ELEVENLABS_TTS_MODEL_ID", "eleven_multilingual_v2")
ELEVENLABS_TTS_BASE_URL = os.getenv("ELEVENLABS_TTS_BASE_URL", "https://api.elevenlabs.io/v1/text-to-speech")
ELEVENLABS_STT_MODEL_ID = os.getenv("ELEVENLABS_STT_MODEL_ID", "eleven_multilingual_v2")
ELEVENLABS_STT_ENDPOINT = os.getenv("ELEVENLABS_STT_ENDPOINT", "https://api.elevenlabs.io/v1/speech-to-text")
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")


class ConversationMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="Latest user message to send to the assistant.")
    history: List[ConversationMessage] = Field(
        default_factory=list,
        description="Chronological message history to supply to OpenAI."
    )
    voice_id: Optional[str] = Field(
        default=None,
        description="Override the default ElevenLabs voice identifier."
    )


class ChatResponse(BaseModel):
    message: str
    audio_base64: Optional[str] = None


class SynthesisRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None


class SynthesisResponse(BaseModel):
    audio_base64: str


class TranscriptionResponse(BaseModel):
    text: str


def _get_openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")
    if OpenAI is None:
        raise HTTPException(status_code=500, detail="openai package not installed on server.")
    return OpenAI(api_key=OPENAI_API_KEY)


async def synthesize_speech(text: str, voice_id: Optional[str]) -> str:
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")

    effective_voice_id = voice_id or ELEVENLABS_VOICE_ID
    url = f"{ELEVENLABS_TTS_BASE_URL.rstrip('/')}/{effective_voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": ELEVENLABS_TTS_MODEL_ID,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.status_code != httpx.codes.OK:
        raise HTTPException(status_code=502, detail=f"Text-to-speech failed: {response.text}")

    return base64.b64encode(response.content).decode("utf-8")


async def transcribe_audio(file: UploadFile) -> str:
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")

    url = ELEVENLABS_STT_ENDPOINT
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "application/json",
    }
    data = {"model_id": ELEVENLABS_STT_MODEL_ID}
    file_bytes = await file.read()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers=headers,
            data=data,
            files={"file": (file.filename or "audio.webm", file_bytes, file.content_type or "audio/webm")},
        )

    if response.status_code != httpx.codes.OK:
        raise HTTPException(status_code=502, detail=f"Speech-to-text failed: {response.text}")

    payload = response.json()
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=502, detail="Speech-to-text response missing text field.")
    return text


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest) -> ChatResponse:
    client = _get_openai_client()

    openai_messages = [
        {"role": message.role, "content": message.content}
        for message in request.history
    ]
    openai_messages.append({"role": "user", "content": request.message})

    def _run_completion():
        return client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            messages=openai_messages,
        )

    completion = await run_in_threadpool(_run_completion)
    try:
        response_text = completion.choices[0].message.content or ""
    except (AttributeError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response from OpenAI.")

    audio_base64 = None
    try:
        audio_base64 = await synthesize_speech(response_text, request.voice_id)
    except HTTPException:
        # Propagate configuration errors, but swallow synthesis issues to keep chat functional.
        raise
    except Exception:
        audio_base64 = None

    return ChatResponse(message=response_text, audio_base64=audio_base64)


@router.post("/tts", response_model=SynthesisResponse)
async def text_to_speech(request: SynthesisRequest) -> SynthesisResponse:
    audio_base64 = await synthesize_speech(request.text, request.voice_id)
    return SynthesisResponse(audio_base64=audio_base64)


@router.post("/stt", response_model=TranscriptionResponse)
async def speech_to_text(file: UploadFile = File(...)) -> TranscriptionResponse:
    text = await transcribe_audio(file)
    return TranscriptionResponse(text=text)
