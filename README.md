# Smart Learning Assistant — Complete Setup Guide
# =====================================================

## 🚀 Quick Start (2 Steps)

### Step 1 — Start the Frontend
```
npx serve . --listen 5500
```
Open: http://localhost:5500

### Step 2 — Start the Backend (New Terminal)
```
cd backend
python app.py
```
Backend runs at: http://localhost:5000

---

## 🔑 Add OpenAI API Key (to unlock AI brain)

1. Get your key from: https://platform.openai.com/api-keys
2. Create `backend/.env` file:

```
OPENAI_API_KEY=sk-your-actual-key-here
FLASK_PORT=5000
FLASK_ENV=development
```

3. Restart Flask: `python app.py`
4. You'll see: `OpenAI key: ✅ Set`

---

## 📁 Complete Project Structure

```
smart-learning-assistant/
│
├── index.html                  ← Main app (open in browser)
├── css/
│   ├── main.css                ← Design system + animations
│   └── themes.css              ← 4 adaptive themes
├── js/
│   ├── app.js                  ← App controller (connects to backend)
│   ├── voice.js                ← Enhanced TTS + STT engine
│   ├── adapter.js              ← UI mode switcher
│   ├── quiz.js                 ← Quiz engine (backend-aware)
│   ├── nlp.js                  ← Fallback intent detection
│   └── content.js              ← Static lesson fallback
│
└── backend/
    ├── app.py                  ← Flask app entry point
    ├── .env                    ← Your API keys (create this!)
    ├── .env.example            ← Template
    ├── requirements.txt
    ├── routes/
    │   └── api.py              ← All API endpoints
    ├── services/
    │   ├── ai_service.py       ← OpenAI GPT-4o
    │   ├── intent_service.py   ← Intent detection
    │   ├── content_service.py  ← Lesson lookup
    │   └── ability_service.py  ← User type detection
    ├── data/
    │   └── lessons.json        ← 5 subjects, 9 lessons, 20+ quiz questions
    └── utils/
        └── helpers.py          ← Text normalization utilities
```

---

## 🌐 API Reference (Postman Testing)

### Health Check
```
GET http://localhost:5000/
```

### Ask Any Question (Main endpoint)
```
POST http://localhost:5000/ask
Content-Type: application/json

{
  "message": "Explain photosynthesis",
  "mode": "voice",
  "session_id": "test_session_1"
}
```

### Get All Lessons
```
GET http://localhost:5000/lessons
```

### Get Specific Lesson
```
GET http://localhost:5000/lessons/sci_2
```

### Check Quiz Answer
```
POST http://localhost:5000/quiz/check
Content-Type: application/json

{
  "lesson_id": "cs_1",
  "question_index": 0,
  "answer_index": 0
}
```

### Detect User Ability
```
POST http://localhost:5000/adapt
Content-Type: application/json

{
  "mode": "voice",
  "voice_attempts": 3,
  "text_attempts": 0
}
```

---

## 🎯 Voice Commands (say these or type)

| Command | Effect |
|---|---|
| "explain photosynthesis" | AI explains the topic |
| "teach me computer science" | Opens CS subject |
| "quiz me" | Starts quiz on current lesson |
| "next" | Next lesson |
| "repeat" | Re-reads current lesson |
| "help" | Lists commands |
| "A" / "B" / "first" / "second" | Quiz answers |

---

## 🧩 4 Adaptive Modes

| Mode | Trigger | Theme |
|---|---|---|
| 👁️ Visually Impaired | 2+ voice, 0 text inputs | Gold, large buttons, auto-listen |
| 👂 Hearing Impaired | 2+ text, 0 voice inputs | Teal, captions, mic hidden |
| ✋ Motor Impaired | Long idle, minimal input | Red, 80px targets, voice-only |
| 🌐 Standard | Mixed usage | Purple, voice+text hybrid |

---

## 🔧 Voice Input Fixes (v2)

- **Retry logic**: auto-retries 3× on `no-speech` / network errors
- **Silence detection**: stops listening after 6s of silence
- **State machine**: prevents mic from firing while TTS is speaking
- **Chrome bug fix**: watchdog timer prevents TTS from freezing
- **Auto-listen**: in visually-impaired/motor mode, mic re-opens after each reply
- **Interim results**: see live transcription while speaking

---

## 🏆 Viva Talking Points

> "Our system implements a 4-layer intelligence stack: the frontend captures voice input using the Web Speech API, the Flask backend processes it with NLP intent detection, GPT-4o generates adaptive responses based on user ability type, and the UI dynamically re-themes itself based on behavioral signals — all without any user configuration."
