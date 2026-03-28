# =============================================================
# services/content_service.py — Lesson Content Engine
# Smart Learning Assistant Backend
# =============================================================

import json
import os
from typing import Optional

_LESSONS_PATH = os.path.join(os.path.dirname(__file__), "../data/lessons.json")

# Cache loaded data in memory
_db: dict = {}


def _load() -> dict:
    global _db
    if not _db:
        with open(_LESSONS_PATH, "r", encoding="utf-8") as f:
            _db = json.load(f)
    return _db


def get_all_subjects() -> list:
    """Return all subjects with lessons (including quiz data for frontend)."""
    db = _load()
    result = []
    for subj in db["subjects"]:
        result.append({
            "id":    subj["id"],
            "title": subj["title"],
            "icon":  subj.get("icon", "📚"),
            "lesson_count": len(subj["lessons"]),
            "lessons": [_safe_lesson(l, subj) for l in subj["lessons"]],
        })
    return result


def get_lesson_by_id(lesson_id: str) -> Optional[dict]:
    """Return a specific lesson by ID (without correct answer indices)."""
    db = _load()
    for subj in db["subjects"]:
        for lesson in subj["lessons"]:
            if lesson["id"] == lesson_id:
                return _safe_lesson(lesson, subj)
    return None


def get_subject_by_id(subject_id: str) -> Optional[dict]:
    """Return a subject and all its lessons."""
    db = _load()
    for subj in db["subjects"]:
        if subj["id"] == subject_id:
            return {
                "id":    subj["id"],
                "title": subj["title"],
                "icon":  subj.get("icon", "📚"),
                "lessons": [_safe_lesson(l, subj) for l in subj["lessons"]],
            }
    return None


def find_lesson_by_keywords(query: str, subject_id: Optional[str] = None) -> Optional[dict]:
    """
    Find the best matching lesson for a user query.
    Optionally filter by subject.
    """
    db = _load()
    query_lower = query.lower()
    best = None
    best_score = 0

    for subj in db["subjects"]:
        if subject_id and subj["id"] != subject_id:
            continue
        for lesson in subj["lessons"]:
            score = 0
            # Match against title
            if any(w in lesson["title"].lower() for w in query_lower.split()):
                score += 3
            # Match against keywords
            for kw in lesson.get("keywords", []):
                if kw in query_lower:
                    score += 2
            # Match against content
            if any(w in lesson["content"].lower() for w in query_lower.split() if len(w) > 3):
                score += 1

            if score > best_score:
                best_score = score
                best = _safe_lesson(lesson, subj)

    return best if best_score > 0 else None


def check_quiz_answer(lesson_id: str, question_index: int, answer_index: int) -> dict:
    """Validate a quiz answer. Returns correctness + explanation."""
    if not isinstance(question_index, int) or not isinstance(answer_index, int):
        return {"error": "Invalid question_index or answer_index type"}
    
    db = _load()
    for subj in db["subjects"]:
        for lesson in subj["lessons"]:
            if lesson["id"] != lesson_id:
                continue
            quiz = lesson.get("quiz", [])
            if not quiz or question_index >= len(quiz) or question_index < 0:
                return {"error": f"Invalid question index: {question_index}"}
            q = quiz[question_index]
            if not q or "answer" not in q or "options" not in q:
                return {"error": "Malformed quiz question"}
            
            correct = int(q["answer"])
            is_correct = answer_index == correct
            
            # Safe access to options
            options = q.get("options", [])
            if correct < 0 or correct >= len(options):
                return {"error": "Quiz configuration error: correct answer out of bounds"}
            if answer_index < 0 or answer_index >= len(options):
                return {"error": "Invalid answer index provided"}
            
            return {
                "correct":        is_correct,
                "selected_index": answer_index,
                "correct_index":  correct,
                "correct_answer": options[correct],
                "selected_answer": options[answer_index],
                "hint":           q.get("hint", ""),
                "question":       q["question"],
            }
    return {"error": "Lesson not found"}


def get_quiz_question(lesson_id: str, question_index: int) -> Optional[dict]:
    """Return a quiz question safely (no answer index)."""
    db = _load()
    for subj in db["subjects"]:
        for lesson in subj["lessons"]:
            if lesson["id"] != lesson_id:
                continue
            quiz = lesson.get("quiz", [])
            if question_index >= len(quiz):
                return None
            q = quiz[question_index]
            return {
                "question":      q["question"],
                "options":       q["options"],
                "hint":          q.get("hint", ""),
                "index":         question_index,
                "total":         len(quiz),
                "lesson_id":     lesson_id,
                "lesson_title":  lesson["title"],
            }
    return None


def _safe_lesson(lesson: dict, subj: dict) -> dict:
    """Return lesson without internal quiz answer indices."""
    quiz_safe = [
        {
            "question": q["question"],
            "options":  q["options"],
            "hint":     q.get("hint", ""),
            "index":    i,
        }
        for i, q in enumerate(lesson.get("quiz", []))
    ]
    return {
        "id":           lesson["id"],
        "title":        lesson["title"],
        "summary":      lesson["summary"],
        "content":      lesson["content"],
        "key_points":   lesson.get("key_points", []),
        "quiz":         quiz_safe,
        "quiz_count":   len(quiz_safe),
        "subject_id":   subj["id"],
        "subject_title": subj["title"],
        "subject_icon": subj.get("icon", "📚"),
    }
