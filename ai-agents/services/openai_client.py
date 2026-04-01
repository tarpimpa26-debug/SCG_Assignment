import json
import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI

ROOT_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("scg-ai-agents")

USE_OPENAI = os.getenv("USE_OPENAI", "true").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2")

client: Optional[OpenAI] = None
if USE_OPENAI and OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
    logger.info(
        "[Startup] OpenAI client initialized | model=%s | has_api_key=%s",
        OPENAI_MODEL,
        bool(OPENAI_API_KEY),
    )
else:
    logger.warning(
        "[Startup] Running without active OpenAI client | use_openai=%s | has_api_key=%s",
        USE_OPENAI,
        bool(OPENAI_API_KEY),
    )


def call_openai_json(prompt: str, label: str) -> dict:
    if not client:
        raise RuntimeError(f"OpenAI client unavailable for {label}")

    logger.info("[%s] calling OpenAI | model=%s", label, OPENAI_MODEL)

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    output_text = (response.output_text or "").strip()

    logger.info("[%s] OpenAI responded | output_length=%s", label, len(output_text))

    if not output_text:
        raise RuntimeError(f"OpenAI returned empty output_text for {label}")

    try:
        parsed = json.loads(output_text)
        logger.info("[%s] JSON parse success", label)
        return parsed
    except json.JSONDecodeError as exc:
        logger.error("[%s] JSON parse failed | raw=%s", label, output_text)
        raise RuntimeError(f"Failed to parse JSON for {label}: {output_text}") from exc