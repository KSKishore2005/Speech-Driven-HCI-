// ============================================================
// app.js — Main App v2 (Backend + OpenAI + Enhanced Voice)
// Smart Learning Assistant
// ============================================================

import { VoiceEngine } from "./voice.js";
import { AdaptiveEngine } from "./adapter.js";
import { QuizEngine } from "./quiz.js";
import { GestureEngine } from "./gesture.js";
import { NLPEngine } from "./nlp.js";

// ── Config ────────────────────────────────────────────────────
const API_BASE    = "http://localhost:5000";
const SESSION_ID  = `sess_${Date.now()}`;

// ── App States ────────────────────────────────────────────────
const STATE = {
  IDLE: "idle",
  WELCOMING: "welcoming",
  WAITING: "waiting",
  PROCESSING: "processing",
  QUIZZING: "quizzing",
};

class SmartLearningApp {
  constructor() {
    this.voice   = new VoiceEngine();
    this.adapter = new AdaptiveEngine();
    this.quiz    = new QuizEngine(this.voice, (e) => this._onQuizEvent(e));
    this.nlp     = new NLPEngine();
    this.gesture = new GestureEngine((g) => this._onGesture(g));

    this.state          = STATE.IDLE;
    this.currentLesson  = null;
    this.currentSubject = null;
    this._backendOnline = false;

    // Stats for ability detection
    this._stats = {
      voiceAttempts: 0,
      textAttempts:  0,
      clickCount:    0,
      startTime:     Date.now(),
    };

    this._bindDOM();
    this._bindVoiceEvents();
    this._bindAdapterEvents();
    this._start();
  }

  // ── DOM Bindings ─────────────────────────────────────────────
  _bindDOM() {
    this.$orb         = document.getElementById("voice-orb");
    this.$micBtn      = document.getElementById("mic-btn");
    this.$gestureBtn  = document.getElementById("gesture-btn");
    this.$textInput   = document.getElementById("text-input");
    this.$sendBtn     = document.getElementById("send-btn");
    this.$gestureWidget= document.getElementById("gesture-widget");
    this.$gestureFb   = document.getElementById("gesture-feedback");
    this.$transcript  = document.getElementById("transcript-text");
    this.$response    = document.getElementById("response-text");
    this.$caption     = document.getElementById("caption-bar");
    this.$subjectGrid = document.getElementById("subject-grid");
    this.$lessonPanel = document.getElementById("lesson-panel");
    this.$quizPanel   = document.getElementById("quiz-panel");
    this.$statusDot   = document.getElementById("status-dot");
    this.$statusLabel = document.getElementById("status-label");
    this.$modeSelector = document.getElementById("mode-selector");
    this.$apiStatus   = document.getElementById("api-status");

    // Mic button
    this.$micBtn?.addEventListener("click", () => {
      this._stats.clickCount++;
      this.adapter.recordClick();

      let wasSpeaking = this.voice.isSpeaking;
      if (wasSpeaking) {
        this.voice.stopSpeaking();
      }

      if (this.voice.isListening && !wasSpeaking) {
        this.voice.stopListening();
      } else {
        setTimeout(() => this._activateMic(), wasSpeaking ? 150 : 0);
      }
    });

    // Gesture button
    this.$gestureBtn?.addEventListener("click", () => {
      this._stats.clickCount++;
      this.adapter.recordClick();
      if (this.gesture.isActive) {
        this.gesture.stop();
        this.$gestureWidget?.classList.add("hidden");
        this.$gestureBtn?.classList.remove("active");
        if(this.$gestureFb) this.$gestureFb.textContent = "Camera off";
      } else {
        this.$gestureWidget?.classList.remove("hidden");
        this.$gestureBtn?.classList.add("active");
        if(this.$gestureFb) this.$gestureFb.textContent = "Initializing camera...";
        this.gesture.start().then(() => {
          if(this.$gestureFb) this.$gestureFb.textContent = "Ready: Show gesture";
        });
      }
    });

    // Text send
    this.$sendBtn?.addEventListener("click", () => this._sendText());
    this.$textInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this._sendText(); }
    });
    this.$textInput?.addEventListener("input", () => {
      this._stats.textAttempts++;
      this.adapter.recordTextAttempt();
    });

    // Mode selector
    this.$modeSelector?.addEventListener("change", (e) => {
      const mode = e.target.value;
      this.adapter.setMode(mode, "manual");
      this.voice.adaptForMode(mode);
      if (mode !== "hearing-impaired") {
        this.voice.speak(this.adapter.getAnnouncement(mode));
      }
    });

    // Keyboard shortcut: Space = mic
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT"
          && document.activeElement?.tagName !== "TEXTAREA"
          && document.activeElement?.tagName !== "SELECT"
          && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        this.$micBtn?.click();
      }
    });

    // Build subject grid from backend (or fallback to static)
    this._loadSubjects();
  }

  // ── Load Subjects (from backend or static fallback) ──────────
  async _loadSubjects() {
    if (!this.$subjectGrid) return;
    try {
      const res = await fetch(`${API_BASE}/lessons`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        this._backendOnline = true;
        this._updateApiStatus(true);
        console.log("✅ Backend connected. Subjects loaded:", data.subjects);
        this._buildSubjectGrid(data.subjects);
        return;
      }
    } catch (err) {
      console.error("❌ Backend connection failed:", err.message);
    }
    this._backendOnline = false;
    this._updateApiStatus(false);
    console.warn("⚠️ Using local fallback (backend offline)");
    this._buildStaticSubjectGrid();
  }

  _buildSubjectGrid(subjects) {
    if (!this.$subjectGrid) return;
    this.$subjectGrid.innerHTML = "";
    subjects.forEach((sub) => {
      const colorMap = { cs: "#6c63ff", math: "#f59e0b", science: "#10b981", english: "#ec4899", gk: "#3b82f6" };
      const color = colorMap[sub.id] || "#6c63ff";
      const card = document.createElement("button");
      card.className = "subject-card";
      card.id = `subject-${sub.id}`;
      card.setAttribute("aria-label", `Learn ${sub.title}`);
      card.style.setProperty("--subject-color", color);
      card.innerHTML = `
        <span class="subject-icon">${sub.icon}</span>
        <span class="subject-title">${sub.title}</span>
        <span class="subject-lessons">${sub.lesson_count} lesson${sub.lesson_count !== 1 ? "s" : ""}</span>
      `;
      card.addEventListener("click", () => {
        this._stats.clickCount++;
        this.adapter.recordClick();
        this._askBackend(`teach me about ${sub.title}`, "text", sub.lessons?.[0]?.id);
      });
      this.$subjectGrid.appendChild(card);
    });
  }

  _buildStaticSubjectGrid() {
    const subjects = [
      { id: "cs",      title: "Computer Science", icon: "💻", color: "#6c63ff", lessons: 3 },
      { id: "math",    title: "Mathematics",       icon: "📐", color: "#f59e0b", lessons: 2 },
      { id: "science", title: "Science",           icon: "🔬", color: "#10b981", lessons: 2 },
      { id: "english", title: "English",           icon: "📝", color: "#ec4899", lessons: 1 },
      { id: "gk",      title: "General Knowledge", icon: "🌍", color: "#3b82f6", lessons: 1 },
    ];
    this._buildSubjectGrid(subjects.map(s => ({ ...s, lesson_count: s.lessons })));
  }

  _updateApiStatus(online) {
    if (!this.$apiStatus) return;
    this.$apiStatus.textContent = online ? "🟢 AI Connected" : "🟡 Local Mode";
    this.$apiStatus.style.color = online ? "var(--clr-success)" : "var(--clr-warning)";
  }

  // ── Voice Events ─────────────────────────────────────────────
  _bindVoiceEvents() {
    this.voice.onTranscript = ({ interim, final, isFinal }) => {
      if (this.$transcript) {
        this.$transcript.textContent = isFinal ? `🎤 You: "${final}"` : `🎤 ${interim || "Listening…"}`;
      }
      if (this.$caption) {
        this.$caption.textContent = isFinal ? final : interim;
        this.$caption.classList.toggle("visible", !!(interim || final));
      }
      if (isFinal && final.trim()) {
        this._stats.voiceAttempts++;
        this.adapter.recordVoiceAttempt();
        this._handleInput(final.trim(), "voice");
      }
    };

    this.voice.onListenStart = () => {
      this.$orb?.classList.add("listening");
      this.$micBtn?.classList.add("active");
      this.$micBtn?.setAttribute("aria-pressed", "true");
      this._setStatus("listening", "🎤 Listening…");
    };

    this.voice.onListenEnd = () => {
      this.$orb?.classList.remove("listening");
      this.$micBtn?.classList.remove("active");
      this.$micBtn?.setAttribute("aria-pressed", "false");
      if (this.$caption) this.$caption.classList.remove("visible");
      // Don't override if still processing
      if (this.state !== STATE.PROCESSING) {
        this._setStatus("idle", "Ready");
      }
    };

    this.voice.onSpeakStart = (text) => {
      this.$orb?.classList.add("speaking");
      this._displayResponse(text);
      this._setStatus("speaking", "🔊 Speaking…");
    };

    this.voice.onSpeakEnd = () => {
      this.$orb?.classList.remove("speaking");
      if (this.state !== STATE.PROCESSING) {
        this._setStatus("idle", "Click 🎤 or type to continue");
      }
    };

    this.voice.onStatusChange = (msg) => {
      this._setStatus(null, msg);
    };

    this.voice.onError = (err) => {
      const messages = {
        "not-allowed":         "Microphone access denied. Please allow mic in browser settings.",
        "no-speech":           "No speech detected. Try again.",
        "network":             "Network error with speech recognition.",
        "audio-capture":       "No microphone found. Please connect a microphone.",
        "service-not-allowed": "Speech service not allowed. Try Chrome browser.",
      };
      const msg = messages[err] || `Voice error: ${err}`;
      this._showError(msg);
    };
  }

  _bindAdapterEvents() {
    this.adapter.onModeChange(({ mode, reason }) => {
      this.voice.adaptForMode(mode);
      if (reason === "auto-detected") {
        const msg = this.adapter.getAnnouncement(mode);
        this._displayResponse(`🎯 ${msg}`);
        if (mode !== "hearing-impaired") {
          this.voice.speak(msg);
        }
      }
    });
  }

  // ── App Start ─────────────────────────────────────────────────
  async _start() {
    this.state = STATE.WELCOMING;
    this.adapter.setMode("normal");

    if (!this.voice.isSupported) {
      this._displayResponse(
        "⚠️ Your browser doesn't support voice features. Please use Google Chrome for the full experience. You can still type your questions below."
      );
      return;
    }

    // Check backend connectivity
    await this._checkBackend();

    await new Promise(r => setTimeout(r, 600));

    const welcome = this._backendOnline
      ? "Welcome to the Smart Learning Assistant! I'm powered by AI and can answer any question you have. Choose a subject or ask me anything — like 'explain photosynthesis' or 'what is machine learning'. How can I help you today?"
      : "Welcome to the Smart Learning Assistant! I can teach you Computer Science, Mathematics, Science, English, and General Knowledge. Note: The AI backend is not connected, so I'll use my built-in knowledge. How can I help you today?";

    this._displayResponse(welcome);
    await this.voice.speak(welcome);
    this.state = STATE.WAITING;
    this.voice.autoListenAfterSpeak = false;
  }

  async _checkBackend() {
    try {
      const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(2000) });
      this._backendOnline = res.ok;
    } catch (_) {
      this._backendOnline = false;
    }
    this._updateApiStatus(this._backendOnline);
  }

  // ── Input Handling ────────────────────────────────────────────
  _sendText() {
    const text = this.$textInput?.value?.trim();
    if (!text) return;
    if (this.$textInput) this.$textInput.value = "";
    this._stats.textAttempts++;
    this.adapter.recordTextAttempt();
    this._handleInput(text, "text");
  }

  _activateMic() {
    console.log(`🎤 Microphone activation request (mode: ${this.adapter.getMode()})`);
    if (this.adapter.getMode() === "hearing-impaired") {
      const msg = "Voice input is disabled in Hearing Impaired mode.";
      console.warn(`⚠️ ${msg}`);
      this._showError(msg);
      return;
    }
    const started = this.voice.startListening();
    console.log(`🎤 Voice listening started: ${started}`);
    if (!started) {
      console.error("❌ Failed to start listening");
      this._showError("Failed to start listening. Check microphone permissions.");
    }
  }

  async _handleInput(text, source) {
    console.log(`📨 Input received: "${text}" (source: ${source})`);
    if (!text || this.state === STATE.PROCESSING) {
      console.warn(`⚠️ Handler skipped: text=${!!text}, state=${this.state}`);
      return;
    }

    const lowerStr = text.toLowerCase().trim();
    // Interruption / Stop command override
    if (this.voice.isSpeaking && (lowerStr === "stop" || lowerStr.includes("stop") || lowerStr === "[gesture] stop")) {
      console.log("🛑 Audio interrupted by user command");
      this.voice.stopSpeaking();
      this._displayResponse("Audio stopped.");
      this.state = STATE.WAITING;
      this._setStatus("idle", "Click 🎤 or type to continue");
      return;
    }

    // Show what user said
    if (this.$transcript && source === "voice") {
      this.$transcript.textContent = `🎤 You: "${text}"`;
    }

    // Quiz answer handling
    if (this.quiz.isActive() && this.quiz.isAwaitingAnswer()) {
      const answerMap = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      const lower = text.toLowerCase().trim();
      const ordinals = { first: 0, one: 0, second: 1, two: 1, third: 2, three: 2, fourth: 3, four: 3 };

      if (lower.includes("stop") || lower.includes("quit") || lower === "exit" || lower.includes("[gesture] stop")) {
        console.log("🛑 Quiz interrupted by user");
        this.quiz.active = false;
        this.quiz.awaitingAnswer = false;
        this.state = STATE.WAITING;
        this._displayResponse("Quiz stopped.");
        return;
      }

      let ansIdx = answerMap[lower];
      if (ansIdx === undefined) {
        for (const [k, v] of Object.entries(ordinals)) {
          if (lower.startsWith(k) || lower.includes("option " + k)) { ansIdx = v; break; }
        }
      }

      // Check if user spoke the actual text of the option
      if (ansIdx === undefined && this.quiz.questions && this.quiz.questions[this.quiz.currentIndex]) {
        const q = this.quiz.questions[this.quiz.currentIndex];
        for (let i = 0; i < q.options.length; i++) {
          const optLower = q.options[i].toLowerCase().trim();
          // if option text is "CPU" and user says "CPU" or "the CPU", match it.
          if (lower.includes(optLower) || optLower === lower) {
            ansIdx = i;
            break;
          }
        }
      }

      if (ansIdx !== undefined) {
        await this.quiz.handleAnswer(ansIdx);
        return;
      }
      if (lower.includes("repeat") || lower.includes("again")) {
        await this.quiz.repeatQuestion();
        return;
      }

      // If we reach here, input was invalid for quiz
      let errMsg = "I didn't quite catch that. Please say A, B, C, D, or the answer itself.";
      this._displayResponse(errMsg);
      if (this.adapter.getMode() !== "hearing-impaired") {
        await this.voice.speak(errMsg);
      }
      return;
    }

    await this._askBackend(text, source);
  }

  // ── Backend API Call ──────────────────────────────────────────
  async _askBackend(message, source = "text", lessonId = null) {
    console.log(`📤 Sending to backend: "${message}" (source: ${source}, lesson: ${lessonId})`);
    this.state = STATE.PROCESSING;
    this._setStatus("processing", "⏳ Thinking…");
    this.voice.stopSpeaking();

    // Thinking indicator
    this._displayResponse("⏳ Let me think about that…");

    const mode = source === "voice"
      ? "voice"
      : this.adapter.getMode() === "normal" ? "text" : this.adapter.getMode();

    const body = {
      message,
      mode,
      session_id:    SESSION_ID,
      lesson_id:     lessonId || this.currentLesson?.id || null,
      voice_attempts: this._stats.voiceAttempts,
      text_attempts:  this._stats.textAttempts,
      total_time_ms:  Date.now() - this._stats.startTime,
      click_count:    this._stats.clickCount,
    };

    try {
      if (!this._backendOnline) {
        // Offline fallback
        await this._offlineFallback(message);
        return;
      }

      console.log(`📡 Calling ${API_BASE}/ask...`);
      const res = await fetch(`${API_BASE}/ask`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`❌ HTTP ${res.status}: ${errText}`);
        throw new Error(`HTTP ${res.status}: ${errText.substring(0, 100)}`);
      }
      const data = await res.json();
      
      console.log("✅ Backend response received:", {
        intent: data.intent,
        hasLesson: !!data.lesson,
        lesson: data.lesson?.id,
        uiMode: data.ui_mode,
        responseLength: data.response?.length
      });

      // Update adaptive mode if backend detected something different
      if (data.ui_mode && data.ui_mode !== "normal" && this.adapter.getMode() === "normal") {
        this.adapter.setMode(data.ui_mode, "auto-detected");
      }

      // Store lesson context
      if (data.lesson) {
        this.currentLesson  = data.lesson;
        this.currentSubject = data.lesson.subject_id;
        this._showLessonPanel(data.lesson);
      }

      const textResp   = data.response        || "I couldn't generate a response. Please try again.";
      const speechResp = data.speech_response || textResp;

      console.log(`📤 Displaying response: "${textResp.substring(0, 50)}..."`);
      this._displayResponse(textResp);

      // Speak if not in hearing-impaired mode
      if (this.adapter.getMode() !== "hearing-impaired") {
        console.log(`🔊 Speaking response (length: ${speechResp.length} chars)`);
        await this.voice.speak(speechResp);
      }

      // If intent was quiz, start quiz
      if (data.intent === "quiz" && this.currentLesson) {
        await this._startQuiz(this.currentLesson);
      }

    } catch (err) {
      console.error(`❌ Backend error: ${err.name} - ${err.message}`);
      if (err.name === "TimeoutError") {
        const msg = "Request timed out. Backend is not responding. Check if Flask server is running.";
        console.error(msg);
        this._showError(msg);
      } else if (err.message.includes("Failed to fetch")) {
        const msg = "Cannot reach backend. Make sure Flask server is running on http://localhost:5000";
        console.error(msg);
        this._backendOnline = false;
        this._updateApiStatus(false);
        this._showError(msg);
      } else {
        console.error(`Backend error: ${err.message}`);
        this._backendOnline = false;
        this._updateApiStatus(false);
        await this._offlineFallback(message);
      }
    } finally {
      this.state = STATE.WAITING;
      this._setStatus("idle", "Ready");
    }
  }

  async _offlineFallback(message) {
    if (!this.nlp) return;
    const detected = this.nlp.detect(message);
    let response = this.nlp.generateResponse(detected.intent, detected.subject);

    if (detected.intent === "learn" && detected.lesson) {
      this.currentLesson = detected.lesson;
      this.currentSubject = detected.subject;
      this._showLessonPanel(detected.lesson);
      response = `Okay, let's learn about ${detected.lesson.title}. ${detected.lesson.summary} Would you like to take a quiz on this?`;
    } 
    else if (detected.intent === "quiz") {
      if (this.currentLesson) {
          response = `Starting quiz on ${this.currentLesson.title}!`;
          this._displayResponse(response);
          if (this.adapter.getMode() !== "hearing-impaired") {
             await this.voice.speak(response);
          }
          await this._startQuiz(this.currentLesson);
          return;
      } else {
          response = "Please select a subject or ask to learn something first before taking a quiz.";
      }
    }

    this._displayResponse(response);
    if (this.adapter.getMode() !== "hearing-impaired") {
      await this.voice.speak(response);
    }
  }

  // ── Gesture Handling ──────────────────────────────────────────
  _onGesture(gesture) {
    if (this.$gestureFb) {
      this.$gestureFb.textContent = `Recognized: ${gesture.toUpperCase()}`;
    }
    
    // Map gestures to text inputs
    let textInput = "";
    if (gesture === "yes") textInput = "yes";
    if (gesture === "no") textInput = "no";
    if (gesture === "help") textInput = "help";
    if (gesture === "stop") textInput = "stop";
    if (gesture === "next") textInput = "next";
    
    if (textInput) {
       // Visual hint that gesture was used
       if (this.$textInput) this.$textInput.value = `[Gesture] ${textInput}`;
       this._handleInput(textInput, "gesture");
    }
    
    setTimeout(() => {
       if (this.gesture.isActive && this.$gestureFb) {
          this.$gestureFb.textContent = "Ready: Show gesture";
       }
    }, 2500);
  }

  // ── Quiz ──────────────────────────────────────────────────────
  async _startQuiz(lesson) {
    this.state = STATE.QUIZZING;
    if (this.$quizPanel) this.$quizPanel.classList.add("active");
    await this.quiz.startQuiz(lesson);
  }

  _onQuizEvent({ type, data }) {
    const panel = this.$quizPanel;
    if (!panel) return;

    switch (type) {
      case "quiz_start":
        panel.classList.add("active");
        panel.innerHTML = `
          <div class="quiz-header">
            <h2>🧪 Quiz: ${data.lesson.title}</h2>
            <span class="quiz-progress" id="quiz-progress">Q 1/${data.total}</span>
          </div>
          <div id="quiz-question-area"></div>
        `;
        break;

      case "question": {
        const qa = document.getElementById("quiz-question-area");
        if (!qa) break;
        const letters = ["A", "B", "C", "D"];
        document.getElementById("quiz-progress")?.textContent && (
          document.getElementById("quiz-progress").textContent = `Q ${data.index + 1}/${data.total}`
        );
        qa.innerHTML = `
          <div class="quiz-question">${data.question}</div>
          <div class="quiz-options">
            ${data.options.map((opt, i) => `
              <button class="quiz-option" id="qopt-${i}"
                aria-label="Option ${letters[i]}: ${opt}"
                onclick="app.quiz.handleAnswer(${i})">
                <span class="option-letter">${letters[i]}</span>
                <span class="option-text">${opt}</span>
              </button>
            `).join("")}
          </div>
          <div class="quiz-hint">💡 Say A, B, C or D — or click an option</div>
        `;
        break;
      }

      case "answer": {
        document.querySelectorAll(".quiz-option").forEach((el, i) => {
          el.disabled = true;
          if (i === data.correct_index) el.classList.add("correct");
          else if (i === data.selected && !data.correct) el.classList.add("wrong");
        });
        break;
      }

      case "quiz_end": {
        const qa = document.getElementById("quiz-question-area");
        if (!qa) break;
        const emoji = data.percentage >= 80 ? "🏆" : data.percentage >= 50 ? "👍" : "📚";
        qa.innerHTML = `
          <div class="quiz-result">
            <div class="result-emoji">${emoji}</div>
            <div class="result-score">${data.score} / ${data.total}</div>
            <div class="result-percent">${data.percentage}%</div>
            <p>${data.message}</p>
            <div class="result-actions">
              <button class="btn-primary" onclick="location.reload()">🔄 Restart</button>
              <button class="btn-success" onclick="app._askBackend('teach me something new')">📖 Learn More</button>
            </div>
          </div>
        `;
        this.state = STATE.WAITING;
        break;
      }
    }
  }

  // ── Lesson Panel ──────────────────────────────────────────────
  _showLessonPanel(lesson) {
    if (!this.$lessonPanel) return;
    const colorMap = { cs: "#6c63ff", math: "#f59e0b", science: "#10b981", english: "#ec4899", gk: "#3b82f6" };
    const color = colorMap[lesson.subject_id] || "#6c63ff";
    const iconMap = { cs: "💻", math: "📐", science: "🔬", english: "📝", gk: "🌍" };
    const icon  = iconMap[lesson.subject_id] || "📚";

    this.$lessonPanel.classList.add("active");
    this.$lessonPanel.innerHTML = `
      <div class="lesson-header" style="border-color:${color}">
        <span class="lesson-subject-icon">${icon}</span>
        <div>
          <div class="lesson-subject-name">${lesson.subject_title || ""}</div>
          <h2 class="lesson-title" id="lesson-heading">${lesson.title}</h2>
        </div>
      </div>
      <p class="lesson-summary">${lesson.summary}</p>
      ${lesson.key_points?.length ? `
      <div class="lesson-keypoints">
        <h3>Key Points</h3>
        <ul>${lesson.key_points.map(kp => `<li>${kp}</li>`).join("")}</ul>
      </div>` : ""}
      <div class="lesson-actions">
        <button class="btn-primary" onclick="app._askBackend('repeat the lesson on ${lesson.title}')" aria-label="Repeat lesson">🔁 Repeat</button>
        <button class="btn-success" onclick="app._startQuiz(app.currentLesson)" aria-label="Take quiz">🎯 Quiz Me</button>
      </div>
    `;
  }

  // ── UI Helpers ────────────────────────────────────────────────
  _setStatus(state, label) {
    if (this.$statusDot && state) {
      this.$statusDot.className = `status-dot ${state}`;
    }
    if (this.$statusLabel && label) {
      this.$statusLabel.textContent = label;
    }
  }

  _displayResponse(text) {
    if (this.$response) {
      // Ensure we always have text
      const displayText = text || "(No response text)";
      this.$response.textContent = displayText;
      console.log(`📱 UI Response updated: "${displayText.substring(0, 50)}..."`);
    } else {
      console.warn("⚠️ Response element ($response) not found in DOM");
    }
  }

  _showError(msg) {
    console.error(`🚨 ERROR: ${msg}`);
    this._displayResponse(`⚠️ ${msg}`);
    this._setStatus("idle", "Error — try again");
    if (this.adapter.getMode() !== "hearing-impaired") {
      this.voice.speak(`Error: ${msg}`);
    }
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
let app;
window.addEventListener("DOMContentLoaded", () => {
  app = new SmartLearningApp();
  window.app = app;
});
