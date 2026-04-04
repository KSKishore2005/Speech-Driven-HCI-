# =============================================================
# services/ai_service.py — Groq API Integration
# Smart Learning Assistant Backend
# =============================================================

import os
import sys
import time
from groq import Groq
from utils.helpers import make_speech_friendly

client: Groq = None
_last_request_time = 0
_min_request_interval = 0.5  # Groq is fast - 0.5 second between requests


def _get_client() -> Groq:
    global client
    if client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key.startswith("gsk-your"):
            raise ValueError("GROQ_API_KEY not set. Please add it to your .env file.")
        client = Groq(api_key=api_key)
    return client


def _throttle_request():
    """Enforce minimum interval between requests to avoid rate limits."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _min_request_interval:
        sleep_time = _min_request_interval - elapsed
        print(f"[AI] Throttling: sleeping {sleep_time:.2f}s", file=sys.stderr)
        time.sleep(sleep_time)
    _last_request_time = time.time()


# System persona for the learning assistant
SYSTEM_PROMPT = """You are the "Master Learning Assistant" — an elite, adaptive tutor for differently-abled learners.

### 🌟 Core Directives:
1. **Extreme Conciseness**: Provide "Perfect & Short" answers. Keep explanations to 2-3 high-impact sentences. Avoid fluff.
2. **Proactive Discovery**: End EVERY response with 3 suggested follow-up questions for the user to explore.
3. **Adaptive Tone**: Warm, encouraging, and highly accessible.

### ♿ Accessibility Modalities:
- **VISUALLY IMPAIRED**: Spatial, spoken descriptions. Never say "see".
- **HEARING IMPAIRED**: Text-first. Clear bullet points and bold terms.
- **MOTOR IMPAIRED**: Minimum friction. Briefest explanations.

### 🔄 Suggestion Format (STRICT):
At the very end of your response, always include 3 suggested questions inside this tag:
`<suggestions>Question 1|Question 2|Question 3</suggestions>`

Example: "Binary is a base-2 number system. <suggestions>How do computers use binary?|Convert 5 to binary|Why only 0 and 1?</suggestions>" """


def ask_openai(
    message: str,
    mode: str = "text",
    user_type: str = "normal",
    lesson_context: dict = None,
    conversation_history: list = None,
) -> dict:
    """
    Send a user message to Groq API and return response.
    
    Returns: { response, speech_response, tokens_used, error }
    """
    try:
        c = _get_client()
        print(f"[AI] Got Groq client successfully", file=sys.stderr)
        
        # Throttle to avoid rate limits
        _throttle_request()

        # Build messages array
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add lesson context if available
        if lesson_context:
            context_msg = f"""The student is currently studying: "{lesson_context.get('title', 'Unknown')}"
Subject: {lesson_context.get('subject_title', '')}
Lesson content: {lesson_context.get('content', '')[:800]}
Key points: {', '.join(lesson_context.get('key_points', []))}

Answer their question in context of this lesson when relevant."""
            messages.append({"role": "system", "content": context_msg})

        # Add mode instruction
        mode_instruction = {
            "visually_impaired": "The user is visually impaired. Give a detailed spoken explanation. Never say 'look at' or 'see the diagram'. Use audio-friendly language.",
            "hearing_impaired":  "The user is hearing impaired. Give a well-structured text response. Use clear headings and bullet points where helpful.",
            "motor_impaired":    "The user has motor impairment. Be brief and to-the-point. Avoid requiring the user to navigate or click multiple things.",
            "normal":            "Give a balanced response combining both voice-friendly and text-friendly elements.",
        }.get(user_type, "")

        if mode_instruction:
            messages.append({"role": "system", "content": mode_instruction})

        # Add conversation history (last 6 exchanges)
        if conversation_history:
            for item in conversation_history[-6:]:
                messages.append(item)

        # Add current user message
        messages.append({"role": "user", "content": message})

        # Call Groq API
        # Currently available model: llama-3.1-8b-instant (fast, reliable, free tier)
        response = c.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )

        import re
        text_response = response.choices[0].message.content.strip()
        
        # Extract suggestions via regex
        suggestions = []
        suggestions_match = re.search(r"<suggestions>(.*?)</suggestions>", text_response, re.DOTALL)
        if suggestions_match:
            suggestions_str = suggestions_match.group(1)
            suggestions = [s.strip() for s in suggestions_str.split("|") if s.strip()]
            # Strip the suggestions block from the main text so UI can render it separately
            text_response = re.sub(r"<suggestions>.*?</suggestions>", "", text_response, flags=re.DOTALL).strip()

        speech_response = make_speech_friendly(text_response)
        tokens = response.usage.total_tokens if response.usage else 0

        print(f"[AI] ✅ Groq call successful. Tokens: {tokens}, Suggestions: {len(suggestions)}", file=sys.stderr)

        return {
            "response":        text_response,
            "speech_response": speech_response,
            "suggestions":     suggestions,
            "tokens_used":     tokens,
            "error":           None,
        }

    except ValueError as e:
        # API key not set
        error_msg = str(e)
        print(f"[AI] ValueError: {error_msg}", file=sys.stderr)
        return {
            "response":        f"I can help you learn! However, the AI brain is not connected yet. Please set up your Groq API key. Your question was: '{message}'",
            "speech_response": "The AI brain is not connected yet. Please set up your Groq API key in the backend .env file.",
            "tokens_used":     0,
            "error":           error_msg,
        }
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[AI] {error_type}: {error_msg}", file=sys.stderr)
        print(f"[AI] Full error: {repr(e)}", file=sys.stderr)
        
        # Return more helpful error based on error type
        if "rate" in error_msg.lower() or "429" in error_msg:
            response = "🚨 Groq Rate Limit: Too many requests. Please wait a moment and try again."
            print(f"[AI] RATE LIMIT: Waiting required", file=sys.stderr)
        elif "authentication" in error_msg.lower() or "api_key" in error_msg.lower() or "401" in error_msg:
            response = "🔑 Groq Authentication Failed: Your API key is invalid. Please check your .env file."
        elif "connection" in error_msg.lower() or "network" in error_msg.lower():
            response = "🌐 Network Error: Cannot reach Groq servers. Please check your internet connection."
        elif "timeout" in error_msg.lower():
            response = "⏱️ Request Timeout: Groq server is slow. Please try again."
        else:
            response = f"❌ Error ({error_type}): {error_msg[:50]}... Please try again."
        
        return {
            "response":        response,
            "speech_response": "I'm sorry, I had a problem. Please try again.",
            "tokens_used":     0,
            "error":           error_msg,
        }


def generate_quiz_explanation(question: str, correct_answer: str, user_type: str = "normal") -> str:
    """Generate a brief explanation for why an answer is correct."""
    try:
        c = _get_client()
        prompt = f"In 1-2 sentences, explain why '{correct_answer}' is the correct answer to: '{question}'. Be concise and educational."
        resp = c.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a concise educational assistant."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=120,
            temperature=0.5,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[AI] Quiz explanation error: {e}", file=sys.stderr)
        return f"The correct answer is {correct_answer}."
