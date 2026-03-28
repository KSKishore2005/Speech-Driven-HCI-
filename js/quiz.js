// ============================================================
// quiz.js — Voice-Based Quiz Engine v2
// Smart Learning Assistant — Backend-aware
// ============================================================

const API_BASE = "http://localhost:5000";

export class QuizEngine {
  constructor(voiceEngine, onUpdate) {
    this.voice        = voiceEngine;
    this.onUpdate     = onUpdate;
    this.questions    = [];
    this.currentIndex = 0;
    this.score        = 0;
    this.active       = false;
    this.awaitingAnswer = false;
    this.currentLesson  = null;
  }

  async startQuiz(lesson) {
    this.currentLesson = lesson;
    this.questions     = [...(lesson.quiz || [])];
    this.currentIndex  = 0;
    this.score         = 0;
    this.active        = true;

    if (!this.questions.length) {
      await this.voice.speak("I don't have quiz questions for this lesson yet. Ask me something else!");
      this.active = false;
      return;
    }

    this.onUpdate({ type: "quiz_start", data: { lesson, total: this.questions.length } });

    await this.voice.speak(
      `Let's test your knowledge on ${lesson.title}! ${this.questions.length} question${this.questions.length !== 1 ? "s" : ""}. ` +
      `Say A, B, C, D — or 'first', 'second', 'third', 'fourth'. Let's go!`
    );

    await this._askQuestion();
  }

  async _askQuestion() {
    if (this.currentIndex >= this.questions.length) {
      await this._endQuiz();
      return;
    }

    const q = this.questions[this.currentIndex];
    this.awaitingAnswer = true;
    const letters = ["A", "B", "C", "D"];
    const optText = q.options.map((o, i) => `Option ${letters[i]}: ${o}`).join(". ");

    this.onUpdate({
      type: "question",
      data: {
        index:    this.currentIndex,
        total:    this.questions.length,
        question: q.question,
        options:  q.options,
        hint:     q.hint || "",
      },
    });

    await this.voice.speak(
      `Question ${this.currentIndex + 1} of ${this.questions.length}. ${q.question}. ${optText}. What's your answer?`
    );
  }

  async handleAnswer(answerIndex) {
    if (!this.active || !this.awaitingAnswer) return false;
    this.awaitingAnswer = false;

    const q = this.questions[this.currentIndex];
    const letters = ["A", "B", "C", "D"];

    // Try backend validation first (gets AI explanation)
    let result = null;
    if (this.currentLesson?.id) {
      try {
        const res = await fetch(`${API_BASE}/quiz/check`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            lesson_id:      this.currentLesson.id,
            question_index: this.currentIndex,
            answer_index:   answerIndex,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) result = await res.json();
      } catch (_) {}
    }

    // Fallback: local check
    const isCorrect  = result ? result.correct : (answerIndex === q.answer);
    const correctIdx = result ? result.correct_index : q.answer;
    const explanation = result?.ai_explanation || q.hint || "";

    this.onUpdate({
      type: "answer",
      data: { correct: isCorrect, selected: answerIndex, correct_index: correctIdx },
    });

    if (isCorrect) {
      this.score++;
      await this.voice.speak(
        `Correct! Excellent work! ${q.options[correctIdx]} is right. ${explanation}`
      );
    } else {
      await this.voice.speak(
        `Not quite. The correct answer was Option ${letters[correctIdx]}: ${q.options[correctIdx]}. ${explanation}`
      );
    }

    this.currentIndex++;
    await new Promise(r => setTimeout(r, 800));
    await this._askQuestion();
    return true;
  }

  async _endQuiz() {
    this.active = false;
    const total   = this.questions.length;
    const pct     = Math.round((this.score / total) * 100);
    let msg = pct >= 80
      ? `Outstanding! ${this.score}/${total} — ${pct}%! You've mastered the topic!`
      : pct >= 50
      ? `Well done! ${this.score}/${total} — ${pct}%. Keep practicing!`
      : `${this.score}/${total} — ${pct}%. Don't give up — review the lesson and try again!`;

    this.onUpdate({ type: "quiz_end", data: { score: this.score, total, percentage: pct, message: msg } });
    await this.voice.speak(msg + " Ready to learn more?");
  }

  async repeatQuestion() {
    if (!this.active || this.currentIndex >= this.questions.length) return;
    this.awaitingAnswer = false;
    await this._askQuestion();
  }

  isActive()         { return this.active; }
  isAwaitingAnswer() { return this.awaitingAnswer; }
}
