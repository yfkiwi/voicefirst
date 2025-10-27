"""
Backend application package.

Loads environment variables from a local .env file before exposing the app factory.
"""

from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root if present so that API keys are available at import time.
load_dotenv()
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)

__all__ = ["create_app"]

from .main import create_app  # noqa: E402,F401
