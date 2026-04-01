import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI

ROOT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2").strip()
USE_OPENAI = os.getenv("USE_OPENAI", "false").strip().lower() == "true"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("scg-ai-agents")

_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def can_use_openai() -> bool:
    return USE_OPENAI and bool(OPENAI_API_KEY) and _client is not None


def _strip_json_fence(text: str) -> str:
    cleaned = text.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return cleaned.strip()


def generate_text(system_prompt: str, user_prompt: str) -> str:
    if not can_use_openai():
        raise RuntimeError("OpenAI is not enabled or API key is missing.")

    response = _client.responses.create(
        model=OPENAI_MODEL,
        instructions=system_prompt,
        input=user_prompt,
    )

    output = (response.output_text or "").strip()
    if not output:
        raise RuntimeError("OpenAI returned empty text output.")

    return output


def generate_json(
    system_prompt: str,
    user_prompt: str,
    json_schema: Dict[str, Any],
) -> Dict[str, Any]:
    schema_text = json.dumps(json_schema, ensure_ascii=False, indent=2)

    raw_text = generate_text(
        system_prompt=system_prompt,
        user_prompt=(
            f"{user_prompt}\n\n"
            "Return ONLY valid JSON.\n"
            "Do not include markdown fences.\n"
            "JSON schema:\n"
            f"{schema_text}"
        ),
    )

    cleaned = _strip_json_fence(raw_text)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse OpenAI JSON output: %s", cleaned)
        raise RuntimeError("OpenAI returned invalid JSON.") from exc