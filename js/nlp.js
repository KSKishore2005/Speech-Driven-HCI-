// ============================================================
// nlp.js — Intent Detection Engine (No API Key Needed)
// Smart Learning Assistant
// ============================================================

import { INTENT_MAP, ALL_LESSONS, CONTENT_DB } from "./content.js";

export class NLPEngine {
  /**
   * Detect intent from raw text input
   * Returns: { intent, subject, lesson, confidence, raw }
   */
  detect(text) {
    const lower = text.toLowerCase().trim();
    const words = lower.split(/\s+/);

    const result = {
      intent: "unknown",
      subject: null,
      lesson: null,
      confidence: 0,
      raw: lower,
    };

    // 1. Check for simple one-word answers (quiz)
    if (["a", "b", "c", "d"].includes(lower)) {
      result.intent = "answer";
      result.answer = ["a", "b", "c", "d"].indexOf(lower);
      result.confidence = 1.0;
      return result;
    }

    // 2. Check option phrasings: "option a", "first", "second", "third", "fourth"
    const ordinals = { first: 0, one: 0, second: 1, two: 1, third: 2, three: 2, fourth: 3, four: 3 };
    for (const [word, idx] of Object.entries(ordinals)) {
      if (lower.includes(word)) {
        result.intent = "answer";
        result.answer = idx;
        result.confidence = 0.9;
        return result;
      }
    }

    // 3. Match intents by keyword scoring
    let best = { intent: "unknown", score: 0 };
    for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
      if (intent === "subjects") continue;
      const score = keywords.filter((k) => lower.includes(k)).length;
      if (score > best.score) {
        best = { intent, score };
      }
    }
    if (best.score > 0) {
      result.intent = best.intent;
      result.confidence = Math.min(best.score / 3, 1.0);
    }

    // 4. Detect subject
    const subjectMap = INTENT_MAP.subjects;
    for (const [subId, keywords] of Object.entries(subjectMap)) {
      if (keywords.some((k) => lower.includes(k))) {
        result.subject = subId;
        // Find matching lesson within subject
        const subjectObj = CONTENT_DB.subjects.find((s) => s.id === subId);
        if (subjectObj) {
          result.lesson = subjectObj.lessons[0]; // Default to first lesson
        }
        break;
      }
    }

    // 5. If no subject but "learn" intent, suggest random subject
    if (result.intent === "learn" && !result.subject) {
      const rand = CONTENT_DB.subjects[Math.floor(Math.random() * CONTENT_DB.subjects.length)];
      result.subject = rand.id;
      result.lesson = rand.lessons[0];
    }

    return result;
  }

  /**
   * Detect user ability mode from interaction patterns
   */
  detectAbilityFromBehavior(stats) {
    const { voiceAttempts, textAttempts, totalTime, clickCount } = stats;

    // Voice-heavy → visually impaired
    if (voiceAttempts >= 2 && textAttempts === 0) {
      return "visually-impaired";
    }

    // Text-only / no voice → hearing impaired
    if (textAttempts >= 2 && voiceAttempts === 0) {
      return "hearing-impaired";
    }

    // Very long time with minimal input → motor impaired
    if (totalTime > 20000 && clickCount <= 1 && voiceAttempts <= 1) {
      return "motor-impaired";
    }

    // Mixed → normal
    return "normal";
  }

  /**
   * Generate a contextual response for given intent
   */
  generateResponse(intent, subject, extra = {}) {
    const responses = {
      help: `I can help you learn any subject! Say 'learn computer science', 'learn math', 'learn science', 'learn English', or 'learn general knowledge'. You can also say 'quiz me' to test your knowledge anytime.`,
      stop: `Okay, taking a break. Say 'start' whenever you're ready to continue learning!`,
      unknown: `I didn't quite catch that. You can say things like 'teach me computer science', 'quiz me on math', or 'help' to see what I can do.`,
      answer_correct: `Excellent! That's absolutely correct! Great job! ${extra.explanation || ""}`,
      answer_wrong: `Not quite. The correct answer was: ${extra.correct || ""}. ${extra.explanation || ""} Don't worry — learning takes practice!`,
    };
    return responses[intent] || responses.unknown;
  }
}
