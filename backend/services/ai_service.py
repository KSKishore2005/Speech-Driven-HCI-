# =============================================================
# services/ai_service.py — OpenAI GPT-4o Integration
# Smart Learning Assistant Backend
# =============================================================

import os
from openai import OpenAI
from utils.helpers import make_speech_friendly

client: OpenAI = None


def _get_client() -> OpenAI:
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key.startswith("sk-your"):
            raise ValueError("OPENAI_API_KEY not set. Please add it to your .env file.")
        client = OpenAI(api_key=api_key)
    return client


# System persona for the learning assistant
SYSTEM_PROMPT = """You are a friendly, patient, and encouraging educational assistant called "Smart Learning Assistant".

Your job is to help students — including those with visual, hearing, or motor impairments — learn effectively.

Rules:
1. Always explain things clearly and simply — assume a student who is new to the topic.
2. Use structured explanations: define the concept, give an example, and summarize.
3. If the user is visually impaired (mode=voice), give a full spoken explanation — avoid referring to "looking at" things.
4. If the user is hearing impaired (mode=text), give a detailed text response with good structure.
5. Keep responses concise but complete — aim for 3-5 sentences for simple topics, more for complex ones.
6. Be encouraging! Use phrases like "Great question!", "You're doing well!", "Let's explore this together."
7. If asked for a topic you don't know, admit it gracefully and suggest a related topic.
8. End explanations with: "Would you like a quiz on this, or shall we explore more?"
9. For quiz answers: confirm correct ones enthusiastically, and gently correct wrong ones with the right answer.
"""


def ask_openai(
    message: str,
    mode: str = "text",
    user_type: str = "normal",
    lesson_context: dict = None,
    conversation_history: list = None,
) -> dict:
    """
    Send a user message to OpenAI GPT-4o and return response.
    
    Returns: { response, speech_response, tokens_used }
    """
    try:
        c = _get_client()

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

        # Call GPT-4o
        response = c.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )

        text_response = response.choices[0].message.content.strip()
        speech_response = make_speech_friendly(text_response)
        tokens = response.usage.total_tokens if response.usage else 0

        return {
            "response":        text_response,
            "speech_response": speech_response,
            "tokens_used":     tokens,
            "error":           None,
        }

    except ValueError as e:
        # API key not set — return a graceful fallback
        return {
            "response":        f"I can help you learn! However, the AI brain is not connected yet. Please set up your OpenAI API key. Your question was: '{message}'",
            "speech_response": "The AI brain is not connected yet. Please set up your OpenAI API key in the backend .env file.",
            "tokens_used":     0,
            "error":           str(e),
        }
    except Exception as e:
        return {
            "response":        "I'm sorry, I had trouble processing that. Please try again.",
            "speech_response": "I'm sorry, I had a problem. Please try again.",
            "tokens_used":     0,
            "error":           str(e),
        }


def generate_quiz_explanation(question: str, correct_answer: str, user_type: str = "normal") -> str:
    """Generate a brief explanation for why an answer is correct."""
    try:
        c = _get_client()
        prompt = f"In 1-2 sentences, explain why '{correct_answer}' is the correct answer to: '{question}'. Be concise and educational."
        resp = c.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a concise educational assistant."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=120,
            temperature=0.5,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return f"The correct answer is {correct_answer}."
