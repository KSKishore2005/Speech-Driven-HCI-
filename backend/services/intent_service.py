# =============================================================
# services/intent_service.py — Intent Detection
# Smart Learning Assistant Backend
# =============================================================

import re

# Intent keyword map — ordered by priority
INTENT_RULES = [
    ("greeting",    ["hello", "hi", "hey", "good morning", "good evening", "good afternoon", "howdy", "namaste"]),
    ("quiz",        ["quiz", "test me", "test my knowledge", "question", "challenge", "examine", "practice test", "assess me"]),
    ("learn",       ["learn", "teach", "explain", "tell me", "what is", "what are", "how does", "study", "lesson", "show me", "describe", "define", "meaning of"]),
    ("next",        ["next", "continue", "go on", "move on", "proceed", "forward", "next lesson", "whats next"]),
    ("repeat",      ["repeat", "again", "say again", "come again", "once more", "replay", "say that again"]),
    ("help",        ["help", "what can you do", "how do i", "guide", "commands", "features", "capabilities"]),
    ("stop",        ["stop", "quit", "exit", "pause", "end session", "done", "bye", "goodbye", "cancel"]),
    ("yes",         ["yes", "yeah", "yep", "yup", "sure", "okay", "ok", "correct", "right", "true", "absolutely"]),
    ("no",          ["no", "nope", "nah", "wrong", "false", "incorrect", "not really"]),
]

ANSWER_OPTIONS = {
    "a": 0, "b": 1, "c": 2, "d": 3,
    "option a": 0, "option b": 1, "option c": 2, "option d": 3,
    "first": 0, "one": 0, "1": 0,
    "second": 1, "two": 1, "2": 1,
    "third": 2, "three": 2, "3": 2,
    "fourth": 3, "four": 3, "4": 3,
}

SUBJECT_KEYWORDS = {
    "cs":      ["computer", "programming", "coding", "software", "algorithm", "cpu", "python", "code", "internet", "network", "binary", "hardware"],
    "math":    ["math", "mathematics", "algebra", "numbers", "binary", "calculate", "equation", "calculus", "geometry"],
    "science": ["science", "physics", "chemistry", "biology", "matter", "atom", "element", "photosynthesis", "plant"],
    "english": ["english", "grammar", "language", "speech", "noun", "verb", "adjective", "writing", "parts of speech"],
    "gk":      ["geography", "world", "general knowledge", "countries", "continents", "ocean", "capital", "history"],
}


def detect_intent(text: str) -> dict:
    """
    Detect intent from normalized user text.
    Returns: { intent, subject, answer_index, confidence }
    """
    lower = text.lower().strip()

    # 1. Check for quiz answer (single letter or ordinal)
    for phrase, idx in ANSWER_OPTIONS.items():
        if lower == phrase or lower.startswith(phrase + " "):
            return {"intent": "answer", "answer_index": idx, "subject": None, "confidence": 0.95}

    # 2. Match intents by keyword scoring
    best_intent = "unknown"
    best_score = 0
    for intent, keywords in INTENT_RULES:
        score = sum(1 for k in keywords if k in lower)
        if score > best_score:
            best_score = score
            best_intent = intent

    # 3. Detect subject
    subject = None
    for subj, keywords in SUBJECT_KEYWORDS.items():
        if any(k in lower for k in keywords):
            subject = subj
            break

    confidence = min(best_score / 2.0, 1.0) if best_score > 0 else 0.1

    return {
        "intent": best_intent,
        "subject": subject,
        "answer_index": None,
        "confidence": round(confidence, 2),
    }
