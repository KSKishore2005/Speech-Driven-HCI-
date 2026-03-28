# =============================================================
# utils/helpers.py — Text normalization and response formatting
# Smart Learning Assistant Backend
# =============================================================

import re


def normalize_text(text: str) -> str:
    """Lowercase and strip extra whitespace from input."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)          # collapse whitespace
    text = re.sub(r"[^\w\s\?\!\.\,\']", "", text)  # remove special chars
    return text


def make_speech_friendly(text: str) -> str:
    """
    Convert text to a speech-friendly version:
    - Expand abbreviations
    - Remove markdown
    - Replace symbols
    """
    replacements = {
        "CO2": "carbon dioxide",
        "H2O": "water",
        "O2": "oxygen",
        "C6H12O6": "glucose",
        "HTTP": "H T T P",
        "HTTPS": "H T T P S",
        "DNS": "D N S",
        "IP": "I P",
        "CPU": "C P U",
        "→": "leads to",
        "←": "from",
        "×": "times",
        "°C": "degrees Celsius",
        "°F": "degrees Fahrenheit",
        "%": "percent",
        "&": "and",
        "**": "",
        "*": "",
        "#": "",
        "`": "",
        "≥": "greater than or equal to",
        "≤": "less than or equal to",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)

    # Remove markdown headers
    text = re.sub(r"#+\s*", "", text)
    # Remove bullet list markers
    text = re.sub(r"^\s*[-•]\s*", "", text, flags=re.MULTILINE)
    # Collapse multiple newlines
    text = re.sub(r"\n{2,}", ". ", text)
    text = re.sub(r"\n", " ", text)

    return text.strip()


def success_response(data: dict, status: int = 200):
    """Standard success response wrapper."""
    return {**data, "status": "ok"}, status


def error_response(message: str, status: int = 400):
    """Standard error response wrapper."""
    return {"error": message, "status": "error"}, status


def truncate(text: str, max_chars: int = 500) -> str:
    """Truncate text for display."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"
