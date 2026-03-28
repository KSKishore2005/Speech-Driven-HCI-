// ============================================================
// voice.js — ENHANCED Web Speech API Engine v2
// Fixes: retry logic, continuous mode, silence detection,
//        state machine, interim results, error recovery
// ============================================================

export class VoiceEngine {
  constructor() {
    this.synthesis   = window.speechSynthesis;
    this.recognition = null;

    // State
    this.isListening  = false;
    this.isSpeaking   = false;
    this._retryCount  = 0;
    this._maxRetries  = 3;
    this._silenceTimer = null;
    this._startTimer   = null;
    this._blocked      = false;   // true while TTS is speaking

    // Settings (adaptive)
    this.voiceRate   = 0.9;
    this.voicePitch  = 1.0;
    this.voiceVolume = 1.0;
    this.selectedVoice = null;
    this.lang        = "en-US";

    // Callbacks
    this.onTranscript   = null;   // ({ interim, final, isFinal })
    this.onListenStart  = null;
    this.onListenEnd    = null;
    this.onSpeakStart   = null;
    this.onSpeakEnd     = null;
    this.onError        = null;
    this.onStatusChange = null;   // (message: string)

    // Auto-listen after speak
    this.autoListenAfterSpeak = false;
    this.autoListenDelay = 600;   // ms after speech ends

    this._supported = false;
    this._init();
  }

  // ── Initialise ──────────────────────────────────────────────
  _init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("[Voice] SpeechRecognition not supported — text-only mode.");
      return;
    }
    this._supported = true;
    this._buildRecognition();
    this._loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
    }
  }

  _buildRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous      = false;  // one-shot per activation
    this.recognition.interimResults  = true;   // live preview
    this.recognition.lang            = this.lang;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      this._retryCount = 0;
      this._status("🎤 Listening…");
      if (this.onListenStart) this.onListenStart();
    };

    this.recognition.onresult = (e) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final   += t;
        else                       interim += t;
      }
      if (this.onTranscript) {
        this.onTranscript({ interim, final, isFinal: final.trim().length > 0 });
      }
      // Reset silence timer on new speech
      this._resetSilenceTimer();
    };

    this.recognition.onspeechend = () => {
      // User stopped speaking — stop recognition to get final result quickly
      try { this.recognition.stop(); } catch (_) {}
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this._clearSilenceTimer();
      this._status("Ready");
      if (this.onListenEnd) this.onListenEnd();
    };

    this.recognition.onerror = (e) => {
      this.isListening = false;
      this._clearSilenceTimer();

      const recoverable = ["no-speech", "audio-capture", "network", "aborted"];
      const fatal       = ["not-allowed", "service-not-allowed"];

      if (fatal.includes(e.error)) {
        this._status(`❌ Mic error: ${e.error}. Check browser permissions.`);
        if (this.onError) this.onError(e.error);
        if (this.onListenEnd) this.onListenEnd();
        return;
      }

      if (recoverable.includes(e.error) && this._retryCount < this._maxRetries) {
        this._retryCount++;
        const delay = this._retryCount * 500;
        this._status(`Retrying mic (${this._retryCount}/${this._maxRetries})…`);
        setTimeout(() => {
          if (!this.isSpeaking && !this._blocked) {
            this._safeStart();
          }
        }, delay);
      } else {
        if (this.onListenEnd) this.onListenEnd();
        if (this.onError) this.onError(e.error);
        this._status("Mic stopped. Click 🎤 to try again.");
      }
    };
  }

  _loadVoices() {
    const voices = this.synthesis.getVoices();
    if (!voices.length) return;
    const preferred = voices.find(v =>
      v.lang.startsWith("en") && (
        v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("Enhanced") ||
        v.name.includes("Zira") ||
        v.name.includes("David")
      )
    );
    this.selectedVoice = preferred
      || voices.find(v => v.lang.startsWith("en-US"))
      || voices.find(v => v.lang.startsWith("en"))
      || voices[0];
  }

  _safeStart() {
    if (!this._supported || this.isListening || this.isSpeaking || this._blocked) return;
    // Rebuild recognition object occasionally to avoid stale state
    if (this._retryCount > 1) {
      this._buildRecognition();
    }
    try {
      this.recognition.start();
    } catch (err) {
      // "already started" — not an error
      if (!err.message.includes("already started")) {
        console.warn("[Voice] Start error:", err);
      }
    }
  }

  _resetSilenceTimer(ms = 5000) {
    this._clearSilenceTimer();
    this._silenceTimer = setTimeout(() => {
      if (this.isListening) {
        try { this.recognition.stop(); } catch (_) {}
      }
    }, ms);
  }

  _clearSilenceTimer() {
    if (this._silenceTimer) { clearTimeout(this._silenceTimer); this._silenceTimer = null; }
  }

  _status(msg) {
    if (this.onStatusChange) this.onStatusChange(msg);
  }

  // ── Public API ───────────────────────────────────────────────
  get isSupported() { return this._supported; }

  startListening() {
    if (!this._supported)    return false;
    if (this._blocked)       return false;
    if (this.isListening) {
      this.stopListening();
      return false;
    }
    this.synthesis.cancel(); // ensure TTS is silent
    this._safeStart();
    this._resetSilenceTimer(6000); // auto-stop after 6s of silence
    return true;
  }

  stopListening() {
    this._clearSilenceTimer();
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch (_) {}
    }
  }

  async speak(text, options = {}) {
    return new Promise((resolve) => {
      if (!this.synthesis) { resolve(); return; }

      // Cancel any ongoing speech
      this.synthesis.cancel();
      this._blocked = true;
      if (this.isListening) this.stopListening();

      const utt        = new SpeechSynthesisUtterance(text);
      utt.rate         = options.rate   ?? this.voiceRate;
      utt.pitch        = options.pitch  ?? this.voicePitch;
      utt.volume       = options.volume ?? this.voiceVolume;
      utt.lang         = this.lang;
      if (this.selectedVoice) utt.voice = this.selectedVoice;

      utt.onstart = () => {
        this.isSpeaking = true;
        if (this.onSpeakStart) this.onSpeakStart(text);
        this._status("🔊 Speaking…");
      };

      const finish = () => {
        this.isSpeaking = false;
        this._blocked   = false;
        if (this.onSpeakEnd) this.onSpeakEnd();
        this._status("Ready");

        if (this.autoListenAfterSpeak) {
          clearTimeout(this._startTimer);
          this._startTimer = setTimeout(() => {
            if (!this.isSpeaking && !this._blocked) {
              this._safeStart();
            }
          }, this.autoListenDelay);
        }
        resolve();
      };

      utt.onend   = finish;
      utt.onerror = (e) => {
        // Interrupted errors are normal (e.g., user clicked stop)
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("[Voice] TTS error:", e.error);
        }
        this.isSpeaking = false;
        this._blocked   = false;
        resolve();
      };

      // Chrome bug: speechSynthesis sometimes hangs — watchdog timer
      const maxDuration = Math.max(8000, text.length * 80);
      const watchdog = setTimeout(() => {
        if (this.isSpeaking) {
          this.synthesis.cancel();
          finish();
        }
      }, maxDuration);

      utt.onend = () => { clearTimeout(watchdog); finish(); };

      this.synthesis.speak(utt);
    });
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this._blocked   = false;
    }
  }

  // Adapt voice settings for different user modes
  adaptForMode(mode) {
    switch (mode) {
      case "visually-impaired":
        this.voiceRate   = 0.85;
        this.voicePitch  = 1.05;
        this.voiceVolume = 1.0;
        this.autoListenAfterSpeak = true;  // keep listening proactively
        this.autoListenDelay      = 800;
        break;
      case "hearing-impaired":
        this.voiceRate   = 0.9;
        this.voiceVolume = 0.2;  // minimal audio
        this.autoListenAfterSpeak = false;
        break;
      case "motor-impaired":
        this.voiceRate   = 0.8;
        this.voicePitch  = 1.0;
        this.voiceVolume = 1.0;
        this.autoListenAfterSpeak = true;
        this.autoListenDelay      = 1200;
        break;
      default:
        this.voiceRate   = 0.9;
        this.voicePitch  = 1.0;
        this.voiceVolume = 1.0;
        this.autoListenAfterSpeak = false;
    }
  }
}
