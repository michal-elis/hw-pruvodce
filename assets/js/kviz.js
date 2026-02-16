// assets/js/kviz.js
(() => {
  "use strict";

  const DATA_URL = "assets/data/otazky.json";
  const PICK_COUNT = 10;

  const root = document.getElementById("quizRoot");
  const progressEl = document.getElementById("quizProgress");
  const scoreEl = document.getElementById("quizScore");
  const resetBtn = document.getElementById("quizReset");
  const summaryEl = document.getElementById("quizSummary");

  if (!root || !progressEl || !scoreEl || !resetBtn || !summaryEl) return;

  let QUESTIONS = [];        // aktuálně vybraných 10
  let BANK = [];             // celý JSON
  let answeredCount = 0;
  let score = 0;
  const answered = new Set();

  function updateTop() {
    progressEl.textContent = `${answeredCount} / ${QUESTIONS.length}`;
    scoreEl.textContent = `Skóre: ${score}`;
  }

  async function loadBank() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Nelze načíst otázky (${res.status})`);
    const data = await res.json();

    // základní validace
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Soubor otazky.json je prázdný nebo má špatný formát.");
    }
    return data;
  }

  function pickRandom(arr, n) {
    // Fisher–Yates shuffle copy, potom slice
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  function resetState() {
    root.innerHTML = "";
    summaryEl.hidden = true;
    answeredCount = 0;
    score = 0;
    answered.clear();
    updateTop();
  }

  function renderQuestions() {
    resetState();
    for (const q of QUESTIONS) root.appendChild(renderQuestion(q));
  }

  function renderQuestion(q) {
    const wrap = document.createElement("section");
    wrap.className = "quiz-q";
    wrap.dataset.qid = q.id;

    const h = document.createElement("h3");
    h.textContent = q.text;
    wrap.appendChild(h);

    const opts = document.createElement("div");
    opts.className = "quiz-opts";
    wrap.appendChild(opts);

    const name = `quiz_${q.id}`;

    for (const key of ["A", "B", "C", "D"]) {
      const label = document.createElement("label");
      label.className = "quiz-opt";
      label.dataset.opt = key;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = key;
      input.setAttribute("aria-label", `${key}: ${q.options[key]}`);

      const text = document.createElement("div");
      text.innerHTML = `<strong>${key}</strong> — ${escapeHtml(q.options[key])}`;

      label.appendChild(input);
      label.appendChild(text);

      label.addEventListener("click", () => {
        if (answered.has(q.id)) return;
        input.checked = true;
        gradeQuestion(wrap, q, key);
      });

      opts.appendChild(label);
    }

    return wrap;
  }

  function gradeQuestion(wrap, q, chosen) {
    answered.add(q.id);
    answeredCount++;

    const isCorrect = chosen === q.correct;
    if (isCorrect) score++;

    const labels = wrap.querySelectorAll(".quiz-opt");
    for (const lab of labels) {
      const opt = lab.dataset.opt;
      const inp = lab.querySelector("input");
      if (inp) inp.disabled = true;

      if (opt === q.correct) lab.classList.add("correct");
      if (opt === chosen && !isCorrect) lab.classList.add("wrong");
    }

    const expl = document.createElement("div");
    expl.className = "quiz-expl";
    expl.innerHTML = isCorrect
      ? `<strong>Správně.</strong> ${escapeHtml(q.explanation)}`
      : `<strong>Špatně.</strong> Správně je <strong>${q.correct}</strong>. ${escapeHtml(q.explanation)}`;

    wrap.appendChild(expl);

    updateTop();
    maybeShowSummary();
  }

  function maybeShowSummary() {
    if (answeredCount !== QUESTIONS.length) return;
    const percent = Math.round((score / QUESTIONS.length) * 100);
    summaryEl.hidden = false;
    summaryEl.innerHTML = `
      <strong>Hotovo.</strong> Výsledek: ${score} / ${QUESTIONS.length} (${percent} %).
      <div class="muted" style="margin-top:8px;">
        Tip: Projdi si chyby a vrať se k části videa, která je vysvětluje.
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  resetBtn.addEventListener("click", () => {
    QUESTIONS = pickRandom(BANK, PICK_COUNT);
    renderQuestions();
  });

  (async () => {
    try {
      BANK = await loadBank();
      QUESTIONS = pickRandom(BANK, PICK_COUNT);
      renderQuestions();
    } catch (err) {
      resetState();
      root.innerHTML = `<div class="quiz-summary">
        <strong>Chyba:</strong> ${escapeHtml(err.message)}
        <div class="muted" style="margin-top:8px;">
          Tip: Na GitHub Pages to funguje. Lokálně otevři web přes Live Server (ne přes file://).
        </div>
      </div>`;
    }
  })();
})();
