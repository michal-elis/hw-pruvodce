// assets/js/kviz.js

(() => {
  "use strict";

  // Cesta k JSON souboru s otázkami.
  const DATA_URL = "/assets/data/otazky.json";

  // Počet otázek, které se vyberou do jednoho pokusu.
  const PICK_COUNT = 10;

  // Popisky odpovědí, které se zobrazí uživateli.
  const DISPLAY_LABELS = ["A", "B", "C"];

  // Načtení hlavních HTML prvků kvízu podle jejich ID.
  const root = document.getElementById("quizRoot");
  const progressEl = document.getElementById("quizProgress");
  const scoreEl = document.getElementById("quizScore");
  const resetBtn = document.getElementById("quizReset");
  const summaryEl = document.getElementById("quizSummary");

  // Pokud některý prvek na stránce chybí, skript se ukončí.
  if (!root || !progressEl || !scoreEl || !resetBtn || !summaryEl) return;

  // QUESTIONS = otázky vybrané pro aktuální pokus.
  // BANK = celá databanka otázek načtená z JSON souboru.
  let QUESTIONS = [];
  let BANK = [];

  // Počet zodpovězených otázek a aktuální skóre.
  let answeredCount = 0;
  let score = 0;

  // Set ukládá ID otázek, které už byly zodpovězené.
  // Brání tomu, aby uživatel odpověděl na stejnou otázku vícekrát.
  const answered = new Set();

  // Aktualizuje horní informace o průběhu a skóre.
  function updateTop() {
    progressEl.textContent = `${answeredCount} / ${QUESTIONS.length}`;
    scoreEl.textContent = `Skóre: ${score}`;
  }

  // Načte databanku otázek ze souboru otazky.json.
  async function loadBank() {
    // cache: "no-store" pomáhá tomu, aby se nenačítala stará uložená verze JSONu.
    const res = await fetch(DATA_URL, { cache: "no-store" });

    // Pokud se soubor nepodaří načíst, vyhodí se chyba.
    if (!res.ok) throw new Error(`Nelze načíst otázky (${res.status})`);

    const data = await res.json();

    // Kontrola, jestli JSON opravdu obsahuje pole otázek.
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Soubor otazky.json je prázdný nebo má špatný formát.");
    }

    return data;
  }

  // Náhodně promíchá pole a vrátí z něj požadovaný počet položek.
  function pickRandom(arr, n) {
    const copy = arr.slice();

    // Fisher-Yates shuffle - jednoduché náhodné promíchání pole.
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    // Vrátí jen požadovaný počet prvků.
    return copy.slice(0, Math.min(n, copy.length));
  }

  // Vybere odpovědi pro jednu otázku.
  // Vždy vezme správnou odpověď a k ní dvě náhodné špatné.
  function pickOptions(q) {
    const allKeys = Object.keys(q.options);
    const correctKey = q.correct;
    const wrongKeys = allKeys.filter((key) => key !== correctKey);

    // Výběr dvou špatných odpovědí.
    const pickedWrong = pickRandom(wrongKeys, 2);

    // Správná odpověď + dvě špatné se ještě promíchají.
    const selectedKeys = pickRandom([correctKey, ...pickedWrong], 3);

    // Původní klíče odpovědí z JSONu se převedou na zobrazované A, B, C.
    return selectedKeys.map((originalKey, index) => ({
      originalKey,
      displayLabel: DISPLAY_LABELS[index],
      text: q.options[originalKey]
    }));
  }

  // Vynuluje aktuální stav kvízu.
  function resetState() {
    root.innerHTML = "";
    summaryEl.hidden = true;
    answeredCount = 0;
    score = 0;
    answered.clear();
    updateTop();
  }

  // Vykreslí všechny otázky aktuálního pokusu.
  function renderQuestions() {
    resetState();

    for (const q of QUESTIONS) {
      root.appendChild(renderQuestion(q));
    }
  }

  // Vytvoří HTML pro jednu otázku.
  function renderQuestion(q) {
    const wrap = document.createElement("section");
    wrap.className = "quiz-q";
    wrap.dataset.qid = q.id;

    // Nadpis otázky.
    const h = document.createElement("h3");
    h.textContent = q.text;
    wrap.appendChild(h);

    // Kontejner pro možnosti odpovědí.
    const opts = document.createElement("div");
    opts.className = "quiz-opts";
    wrap.appendChild(opts);

    // Název skupiny radio buttonů.
    // Každá otázka musí mít vlastní name, aby šla vybrat jen jedna odpověď.
    const name = `quiz_${q.id}`;

    // Výběr a promíchání odpovědí pro danou otázku.
    const optionItems = pickOptions(q);

    // Vytvoření jednotlivých možností odpovědi.
    for (const item of optionItems) {
      const label = document.createElement("label");
      label.className = "quiz-opt";

      // Ukládá se původní klíč odpovědi z JSONu.
      label.dataset.opt = item.originalKey;

      // Ukládá se zobrazované písmeno A/B/C.
      label.dataset.display = item.displayLabel;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = item.originalKey;
      input.setAttribute("aria-label", `${item.displayLabel}: ${item.text}`);

      const text = document.createElement("div");

      // Text odpovědi se escapuje, aby se do stránky nevložil nechtěný HTML kód.
      text.innerHTML = `<strong>${item.displayLabel}</strong> — ${escapeHtml(item.text)}`;

      label.appendChild(input);
      label.appendChild(text);

      // Po kliknutí na odpověď se otázka hned vyhodnotí.
      label.addEventListener("click", () => {
        // Pokud už byla otázka zodpovězena, další kliknutí se ignoruje.
        if (answered.has(q.id)) return;

        input.checked = true;
        gradeQuestion(wrap, q, item.originalKey);
      });

      opts.appendChild(label);
    }

    return wrap;
  }

  // Vyhodnotí jednu otázku.
  function gradeQuestion(wrap, q, chosenOriginalKey) {
    // Otázka se označí jako zodpovězená.
    answered.add(q.id);
    answeredCount++;

    // Kontrola správnosti odpovědi.
    const isCorrect = chosenOriginalKey === q.correct;
    if (isCorrect) score++;

    const labels = wrap.querySelectorAll(".quiz-opt");
    let correctDisplayLabel = "";

    // Projde všechny možnosti odpovědí u dané otázky.
    for (const lab of labels) {
      const originalKey = lab.dataset.opt;
      const displayLabel = lab.dataset.display;
      const inp = lab.querySelector("input");

      // Po odpovědi se možnosti vypnou, aby uživatel nemohl měnit odpověď.
      if (inp) inp.disabled = true;

      // Správná odpověď se označí třídou correct.
      if (originalKey === q.correct) {
        lab.classList.add("correct");
        correctDisplayLabel = displayLabel;
      }

      // Pokud uživatel vybral špatnou odpověď, označí se třídou wrong.
      if (originalKey === chosenOriginalKey && !isCorrect) {
        lab.classList.add("wrong");
      }
    }

    // Vytvoří se vysvětlení pod otázkou.
    const expl = document.createElement("div");
    expl.className = "quiz-expl";

    expl.innerHTML = isCorrect
      ? `<strong>Správně.</strong> ${escapeHtml(q.explanation)}`
      : `<strong>Špatně.</strong> Správně je <strong>${correctDisplayLabel}</strong>. ${escapeHtml(q.explanation)}`;

    wrap.appendChild(expl);

    // Aktualizuje se skóre a případně se zobrazí závěrečný výsledek.
    updateTop();
    maybeShowSummary();
  }

  // Zobrazí závěrečné vyhodnocení, pokud uživatel odpověděl na všechny otázky.
  function maybeShowSummary() {
    if (answeredCount !== QUESTIONS.length) return;

    const percent = Math.round((score / QUESTIONS.length) * 100);

    summaryEl.hidden = false;
    summaryEl.innerHTML = `
      <strong>Hotovo.</strong> Výsledek: ${score} / ${QUESTIONS.length} (${percent} %).
      <div class="muted" style="margin-top:8px;">
        Tip: Projdi si chyby a vrať se k té části výukových materiálů, která je vysvětluje.
      </div>
    `;
  }

  // Pomocná funkce pro bezpečné vložení textu do HTML.
  // Nahrazuje speciální znaky za HTML entity.
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Kliknutí na tlačítko pro nový pokus.
  // Vybere se nových 10 náhodných otázek a kvíz se znovu vykreslí.
  resetBtn.addEventListener("click", () => {
    QUESTIONS = pickRandom(BANK, PICK_COUNT);
    renderQuestions();
  });

  // Hlavní spuštění kvízu po načtení skriptu.
  (async () => {
    try {
      // Načtení celé databanky otázek.
      BANK = await loadBank();

      // Výběr otázek pro aktuální pokus.
      QUESTIONS = pickRandom(BANK, PICK_COUNT);

      // Vykreslení kvízu do stránky.
      renderQuestions();
    } catch (err) {
      // Pokud nastane chyba, zobrazí se uživateli zpráva místo kvízu.
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