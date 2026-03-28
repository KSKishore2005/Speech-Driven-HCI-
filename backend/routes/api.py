# =============================================================
# routes/api.py — All API Endpoints
# Smart Learning Assistant Backend
# =============================================================

from flask import Blueprint, request, jsonify
from services import intent_service, content_service, ability_service, ai_service
from utils.helpers import normalize_text, error_response, success_response
import sys

api = Blueprint("api", __name__)

# In-memory conversation store (per session via simple dict)
# For production: use Redis or Flask-Session
_conversations: dict = {}


# ── Health Check ──────────────────────────────────────────────
@api.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "message": "Smart Learning Assistant backend is running 🚀",
        "version": "2.0.0",
        "endpoints": [
            "GET  /",
            "POST /ask",
            "GET  /lessons",
            "GET  /lessons/<lesson_id>",
            "GET  /subjects/<subject_id>",
            "POST /quiz/check",
            "GET  /quiz/<lesson_id>/<int:question_index>",
            "POST /adapt",
        ],
    })


# ── Main Ask Endpoint ─────────────────────────────────────────
@api.route("/ask", methods=["POST"])
def ask():
    """
    Main query endpoint — handles ALL user messages.

    Request body:
    {
        "message":       "Explain photosynthesis",
        "mode":          "voice" | "text" | "visually-impaired" | "hearing-impaired" | "motor-impaired" | "normal",
        "session_id":    "abc123",         (optional)
        "lesson_id":     "sci_2",          (optional, current lesson context)
        "voice_attempts": 2,               (optional, for ability detection)
        "text_attempts":  0,               (optional)
    }

    Response:
    {
        "response":       "Photosynthesis is...",
        "speech_response": "speech-friendly version",
        "intent":         "learn",
        "subject":        "science",
        "user_type":      "visually_impaired",
        "ui_mode":        "visually-impaired",
        "lesson":         { ...lesson object... } | null,
        "status":         "ok"
    }
    """
    data = request.get_json(silent=True)
    if not data or "message" not in data:
        return jsonify(error_response("Missing 'message' field")[0]), 400

    raw_message = str(data.get("message", "")).strip()
    mode        = str(data.get("mode", "text")).strip()
    session_id  = str(data.get("session_id", "default"))
    lesson_id   = data.get("lesson_id")

    if not raw_message:
        return jsonify(error_response("Empty message")[0]), 400

    if len(raw_message) > 2000:
        return jsonify(error_response("Message too long (max 2000 chars)")[0]), 400

    # Normalize input
    message = normalize_text(raw_message)

    # Detect intent
    intent_result = intent_service.detect_intent(message)
    intent  = intent_result["intent"]
    subject = intent_result.get("subject")

    # Detect user ability
    ability = ability_service.detect_ability(
        mode=mode,
        voice_attempts=int(data.get("voice_attempts", 0)),
        text_attempts=int(data.get("text_attempts", 0)),
        total_time_ms=int(data.get("total_time_ms", 0)),
        click_count=int(data.get("click_count", 0)),
    )
    user_type = ability["user_type"]
    ui_mode   = ability["ui_mode"]

    # Get conversation history for this session
    history = _conversations.get(session_id, [])

    # Get current lesson context
    lesson_context = None
    if lesson_id:
        lesson_context = content_service.get_lesson_by_id(lesson_id)
    elif subject and intent in ("learn", "explain"):
        lesson_context = content_service.find_lesson_by_keywords(message, subject_id=subject)
    elif intent in ("learn", "explain") and not subject:
        lesson_context = content_service.find_lesson_by_keywords(message)

    # Build OpenAI response
    ai_result = ai_service.ask_openai(
        message=raw_message,
        mode=mode,
        user_type=user_type,
        lesson_context=lesson_context,
        conversation_history=history,
    )

    # Check for errors
    if ai_result.get("error"):
        print(f"[API] ⚠️ AI service error: {ai_result['error']}", file=sys.stderr)
    else:
        print(f"[API] ✅ AI response generated ({len(ai_result['response'])} chars)", file=sys.stderr)

    # Update conversation history
    history.append({"role": "user", "content": raw_message})
    history.append({"role": "assistant", "content": ai_result["response"]})
    _conversations[session_id] = history[-20:]  # keep last 10 exchanges

    return jsonify({
        "response":        ai_result["response"],
        "speech_response": ai_result["speech_response"],
        "intent":          intent,
        "subject":         subject,
        "user_type":       user_type,
        "ui_mode":         ui_mode,
        "lesson":          lesson_context,
        "tokens_used":     ai_result["tokens_used"],
        "status":          "ok",
    })


# ── Lessons Endpoints ─────────────────────────────────────────
@api.route("/lessons", methods=["GET"])
def get_lessons():
    """Return all subjects and lessons (summary only)."""
    subjects = content_service.get_all_subjects()
    return jsonify({"subjects": subjects, "status": "ok"})


@api.route("/lessons/<lesson_id>", methods=["GET"])
def get_lesson(lesson_id: str):
    """Return a specific lesson by ID."""
    lesson = content_service.get_lesson_by_id(lesson_id)
    if not lesson:
        return jsonify(error_response(f"Lesson '{lesson_id}' not found")[0]), 404
    return jsonify({"lesson": lesson, "status": "ok"})


@api.route("/subjects/<subject_id>", methods=["GET"])
def get_subject(subject_id: str):
    """Return a subject and all its lessons."""
    subject = content_service.get_subject_by_id(subject_id)
    if not subject:
        return jsonify(error_response(f"Subject '{subject_id}' not found")[0]), 404
    return jsonify({"subject": subject, "status": "ok"})


# ── Quiz Endpoints ────────────────────────────────────────────
@api.route("/quiz/<lesson_id>/<int:question_index>", methods=["GET"])
def get_quiz_question(lesson_id: str, question_index: int):
    """Return a quiz question (without answer)."""
    q = content_service.get_quiz_question(lesson_id, question_index)
    if not q:
        return jsonify(error_response("Question not found")[0]), 404
    return jsonify({"question": q, "status": "ok"})


@api.route("/quiz/check", methods=["POST"])
def check_quiz_answer():
    """
    Validate a quiz answer.
    Request: { "lesson_id": "cs_1", "question_index": 0, "answer_index": 1 }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify(error_response("Invalid JSON")[0]), 400

    lesson_id      = data.get("lesson_id")
    question_index = data.get("question_index", 0)
    answer_index   = data.get("answer_index")
    user_type      = data.get("user_type", "normal")

    if lesson_id is None or answer_index is None:
        return jsonify(error_response("Missing lesson_id or answer_index")[0]), 400

    result = content_service.check_quiz_answer(lesson_id, int(question_index), int(answer_index))
    if "error" in result:
        return jsonify(error_response(result["error"])[0]), 404

    # TODO: AI explanation disabled for now (was timing out)
    # To enable: uncomment below and add timeout to OpenAI client
    # if result.get("correct") and result.get("correct_answer"):
    #     try:
    #         explanation = ai_service.generate_quiz_explanation(
    #             result["question"], result["correct_answer"], user_type
    #         )
    #         result["ai_explanation"] = explanation
    #     except Exception:
    #         result["ai_explanation"] = ""

    result["status"] = "ok"
    return jsonify(result)


# ── Ability Detection Endpoint ────────────────────────────────
@api.route("/adapt", methods=["POST"])
def adapt():
    """
    Detect user ability from interaction stats.
    Request: { "mode": "voice", "voice_attempts": 3, "text_attempts": 0, ... }
    """
    data = request.get_json(silent=True) or {}
    result = ability_service.detect_ability(
        mode=data.get("mode", "normal"),
        voice_attempts=int(data.get("voice_attempts", 0)),
        text_attempts=int(data.get("text_attempts", 0)),
        total_time_ms=int(data.get("total_time_ms", 0)),
        click_count=int(data.get("click_count", 0)),
    )
    return jsonify({**result, "status": "ok"})
