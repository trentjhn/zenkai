import pytest
from unittest.mock import patch, MagicMock
from backend.pipeline.claude_client import generate_with_claude, SONNET, HAIKU


async def test_generate_returns_parsed_json():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"title": "CoT", "hook": "Think step by step"}')]
    with patch("backend.pipeline.claude_client.client.messages.create", return_value=mock_response):
        result = await generate_with_claude(
            prompt="Generate concept explanation",
            model=SONNET,
            expected_fields=["title", "hook"]
        )
    assert result["title"] == "CoT"
    assert result["hook"] == "Think step by step"


async def test_generate_raises_on_missing_fields():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"title": "CoT"}')]  # missing "hook"
    with patch("backend.pipeline.claude_client.client.messages.create", return_value=mock_response):
        with pytest.raises(ValueError, match="missing required fields"):
            await generate_with_claude(
                prompt="Generate",
                model=SONNET,
                expected_fields=["title", "hook"]
            )


async def test_generate_strips_markdown_code_blocks():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='```json\n{"title": "CoT", "hook": "test"}\n```')]
    with patch("backend.pipeline.claude_client.client.messages.create", return_value=mock_response):
        result = await generate_with_claude(
            prompt="Generate",
            model=HAIKU,
            expected_fields=["title", "hook"]
        )
    assert result["title"] == "CoT"


async def test_generate_raises_on_invalid_json():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="not json at all")]
    with patch("backend.pipeline.claude_client.client.messages.create", return_value=mock_response):
        with pytest.raises(ValueError, match="invalid JSON"):
            await generate_with_claude(
                prompt="Generate",
                model=SONNET,
                expected_fields=["title"]
            )


def test_model_constants():
    assert SONNET == "claude-sonnet-4-6"
    assert HAIKU == "claude-haiku-4-5-20251001"
