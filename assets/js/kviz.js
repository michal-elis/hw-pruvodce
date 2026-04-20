// assets/js/kviz.js
(() => {
  "use strict";

  const DATA_URL = "/assets/data/otazky.json";
  const PICK_COUNT = 10;
  const DISPLAY_LABELS = ["A", "B", "C"];

  const root = document.getElementById("quizRoot");
  const progressEl = document.getElementById("quizProgress");
  const scoreEl = document.getElementById("quizScore");
  const resetBtn = document.getElementById("quizReset");
  const summaryEl = document.getElementById("quizSummary");

  if (!root || !progressEl || !scoreEl || !resetBtn || !summaryEl) return;

  let QUESTIONS = [];
  let BANK = [];
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

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Soubor otazky.json je prázdný nebo má špatný formát.");
    }

    return data;
  }

  function pickRandom(arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  function pickOptions(q) {
    const allKeys = Object.keys(q.options);
    const correctKey = q.correct;
    const wrongKeys = allKeys.filter((key) => key !== correctKey);

    const pickedWrong = pickRandom(wrongKeys, 2);
    const selectedKeys = pickRandom([correctKey, ...pickedWrong], 3);

    return selectedKeys.map((originalKey, index) => ({
      originalKey,
      displayLabel: DISPLAY_LABELS[index],
      text: q.options[originalKey]
    }));
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
    const optionItems = pickOptions(q);

    for (const item of optionItems) {
      const label = document.createElement("label");
      label.className = "quiz-opt";
      label.dataset.opt = item.originalKey;
      label.dataset.display = item.displayLabel;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = item.originalKey;
      input.setAttribute("aria-label", `${item.displayLabel}: ${item.text}`);

      const text = document.createElement("div");
      text.innerHTML = `<strong>${item.displayLabel}</strong> — ${escapeHtml(item.text)}`;

      label.appendChild(input);
      label.appendChild(text);

      label.addEventListener("click", () => {
        if (answered.has(q.id)) return;
        input.checked = true;
        gradeQuestion(wrap, q, item.originalKey);
      });

      opts.appendChild(label);
    }

    return wrap;
  }

  function gradeQuestion(wrap, q, chosenOriginalKey) {
    answered.add(q.id);
    answeredCount++;

    const isCorrect = chosenOriginalKey === q.correct;
    if (isCorrect) score++;

    const labels = wrap.querySelectorAll(".quiz-opt");
    let correctDisplayLabel = "";

    for (const lab of labels) {
      const originalKey = lab.dataset.opt;
      const displayLabel = lab.dataset.display;
      const inp = lab.querySelector("input");
      if (inp) inp.disabled = true;

      if (originalKey === q.correct) {
        lab.classList.add("correct");
        correctDisplayLabel = displayLabel;
      }

      if (originalKey === chosenOriginalKey && !isCorrect) {
        lab.classList.add("wrong");
      }
    }

    const expl = document.createElement("div");
    expl.className = "quiz-expl";
    expl.innerHTML = isCorrect
      ? `<strong>Správně.</strong> ${escapeHtml(q.explanation)}`
      : `<strong>Špatně.</strong> Správně je <strong>${correctDisplayLabel}</strong>. ${escapeHtml(q.explanation)}`;

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