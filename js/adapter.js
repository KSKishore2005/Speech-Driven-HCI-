// ============================================================
// adapter.js — Ability Detection + UI Adaptation Engine
// Smart Learning Assistant
// ============================================================

export class AdaptiveEngine {
  constructor() {
    this.currentMode = "normal";
    this.interactionStats = {
      voiceAttempts: 0,
      textAttempts: 0,
      clickCount: 0,
      startTime: Date.now(),
      totalTime: 0,
    };
    this.modeListeners = [];
  }

  // Register a callback when mode changes
  onModeChange(fn) {
    this.modeListeners.push(fn);
  }

  recordVoiceAttempt() {
    this.interactionStats.voiceAttempts++;
    this._checkAutoDetect();
  }

  recordTextAttempt() {
    this.interactionStats.textAttempts++;
    this._checkAutoDetect();
  }

  recordClick() {
    this.interactionStats.clickCount++;
  }

  _checkAutoDetect() {
    const s = this.interactionStats;
    s.totalTime = Date.now() - s.startTime;

    let detectedMode = "normal";

    if (s.voiceAttempts >= 2 && s.textAttempts === 0) {
      detectedMode = "visually-impaired";
    } else if (s.textAttempts >= 2 && s.voiceAttempts === 0) {
      detectedMode = "hearing-impaired";
    } else if (s.totalTime > 15000 && s.clickCount <= 1 && s.voiceAttempts <= 0 && s.textAttempts <= 0) {
      detectedMode = "motor-impaired";
    }

    if (detectedMode !== this.currentMode && detectedMode !== "normal") {
      this.setMode(detectedMode, "auto-detected");
    }
  }

  setMode(mode, reason = "manual") {
    const prev = this.currentMode;
    this.currentMode = mode;
    this._applyUIMode(mode);
    this.modeListeners.forEach((fn) => fn({ mode, prev, reason }));
    console.log(`[AdaptiveEngine] Mode: ${prev} → ${mode} (${reason})`);
  }

  _applyUIMode(mode) {
    const body = document.body;
    // Remove all previous modes
    body.removeAttribute("data-mode");
    document.querySelectorAll(".mode-panel").forEach((el) => el.classList.remove("active"));

    body.setAttribute("data-mode", mode);

    // Show the correct mode panel
    const panel = document.getElementById(`panel-${mode}`);
    if (panel) panel.classList.add("active");

    // Update mode badge
    const badge = document.getElementById("mode-badge");
    const modeConfig = {
      "visually-impaired": { label: "👁️ Visually Impaired Mode", color: "#f59e0b" },
      "hearing-impaired": { label: "👂 Hearing Impaired Mode", color: "#10b981" },
      "motor-impaired": { label: "✋ Motor Impaired Mode", color: "#ef4444" },
      normal: { label: "🌐 Standard Mode", color: "#6c63ff" },
    };
    const cfg = modeConfig[mode] || modeConfig.normal;
    if (badge) {
      badge.textContent = cfg.label;
      badge.style.background = cfg.color + "22";
      badge.style.borderColor = cfg.color;
      badge.style.color = cfg.color;
    }

    // Apply accessibility overrides
    this._applyAccessibilityFeatures(mode);
  }

  _applyAccessibilityFeatures(mode) {
    const root = document.documentElement;

    switch (mode) {
      case "visually-impaired":
        root.style.setProperty("--font-size-base", "20px");
        root.style.setProperty("--contrast-boost", "1");
        root.style.setProperty("--btn-min-size", "64px");
        break;
      case "hearing-impaired":
        root.style.setProperty("--font-size-base", "16px");
        root.style.setProperty("--caption-display", "block");
        root.style.setProperty("--btn-min-size", "48px");
        break;
      case "motor-impaired":
        root.style.setProperty("--font-size-base", "22px");
        root.style.setProperty("--btn-min-size", "80px");
        root.style.setProperty("--tap-target", "80px");
        break;
      default:
        root.style.setProperty("--font-size-base", "16px");
        root.style.setProperty("--btn-min-size", "48px");
        break;
    }
  }

  getAnnouncement(mode) {
    const announcements = {
      "visually-impaired": `I've switched to Visually Impaired Mode. I will read everything aloud for you. Just speak your commands and I'll guide you through everything.`,
      "hearing-impaired": `Switching to Hearing Impaired Mode. All responses will be shown as text on your screen. No audio dependency.`,
      "motor-impaired": `Switching to Motor Impaired Mode. I've made all buttons larger and you can control everything by voice. Minimal clicking required.`,
      normal: `Welcome! You're in Standard Mode with full voice and text support.`,
    };
    return announcements[mode] || announcements.normal;
  }

  getMode() {
    return this.currentMode;
  }
}
