import os
import json
import anthropic
from typing import Any

SONNET = "claude-sonnet-4-6"
HAIKU  = "claude-haiku-4-5-20251001"

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def generate_with_claude(
    prompt: str,
    model: str,
    expected_fields: list[str],
    max_tokens: int = 4096,
    system: str = (
        "You are a precise JSON generator. "
        "Always respond with valid JSON only. "
        "No markdown, no explanation, no code blocks."
    ),
) -> dict[str, Any]:
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()

    # Strip markdown code blocks if Claude wraps output anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\nRaw: {raw[:200]}")

    missing = [f for f in expected_fields if f not in data]
    if missing:
        raise ValueError(
            f"Claude output missing required fields: {missing}\n"
            f"Got: {list(data.keys())}"
        )

    return data
