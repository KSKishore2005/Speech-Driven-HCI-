# =============================================================
# services/ability_service.py — User Ability Detection
# Smart Learning Assistant Backend
# =============================================================

from typing import Literal

AbilityType = Literal["visually_impaired", "hearing_impaired", "motor_impaired", "normal"]


def detect_ability(
    mode: str,
    voice_attempts: int = 0,
    text_attempts: int = 0,
    total_time_ms: int = 0,
    click_count: int = 0,
) -> dict:
    """
    Detect user ability from interaction mode + behavior stats.

    Rules:
      mode=voice  → assume visually impaired (primary indicator)
      mode=text   → assume hearing impaired (primary indicator)
      Behavior fallback:
        voice_attempts >= 2 and text_attempts == 0 → visually_impaired
        text_attempts >= 2 and voice_attempts == 0 → hearing_impaired
        high idle time and minimal input           → motor_impaired
        mixed usage                                → normal
    """
    # Primary: explicit mode from frontend
    if mode == "voice":
        user_type = "visually_impaired"
    elif mode == "text":
        user_type = "hearing_impaired"
    elif mode == "visually-impaired":
        user_type = "visually_impaired"
    elif mode == "hearing-impaired":
        user_type = "hearing_impaired"
    elif mode == "motor-impaired":
        user_type = "motor_impaired"
    # Secondary: behavioral detection
    elif voice_attempts >= 2 and text_attempts == 0:
        user_type = "visually_impaired"
    elif text_attempts >= 2 and voice_attempts == 0:
        user_type = "hearing_impaired"
    elif total_time_ms > 15000 and (voice_attempts + text_attempts) <= 1:
        user_type = "motor_impaired"
    else:
        user_type = "normal"

    ui_mode = {
        "visually_impaired": "visually-impaired",
        "hearing_impaired":  "hearing-impaired",
        "motor_impaired":    "motor-impaired",
        "normal":            "normal",
    }.get(user_type, "normal")

    return {
        "user_type": user_type,
        "ui_mode": ui_mode,
        "description": _describe(user_type),
    }


def _describe(user_type: str) -> str:
    descriptions = {
        "visually_impaired": "Voice-first mode: all content read aloud, minimal UI dependency.",
        "hearing_impaired":  "Text-first mode: all responses as text, captions enabled, minimal audio.",
        "motor_impaired":    "Voice command mode: large targets, voice-controlled navigation.",
        "normal":            "Hybrid mode: voice and text both supported.",
    }
    return descriptions.get(user_type, "Standard mode.")
