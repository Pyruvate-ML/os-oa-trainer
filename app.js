const GENERATED_BANK_URL = "./data/question-bank.generated.json";

const FALLBACK_BANK = {
  subjects: [
    {
      id: "os",
      name: "Operating Systems",
      mcq: [],
      tf: [],
      terms: []
    },
    {
      id: "coa",
      name: "Computer Organization",
      mcq: [],
      tf: [],
      terms: []
    }
  ]
};

const subjectSelect = document.getElementById("subjectSelect");
const chapterSelect = document.getElementById("chapterSelect");
const typeSelect = document.getElementById("typeSelect");
const generateBtn = document.getElementById("generateBtn");
const reloadBtn = document.getElementById("reloadBtn");
const resetBtn = document.getElementById("resetBtn");
const workspace = document.getElementById("workspace");
const statusEl = document.getElementById("status");

const state = {
  bank: FALLBACK_BANK,
  currentSet: [],
  subjectId: "",
  chapterId: "all",
  type: "mcq",
  submitted: false
};

function setStatus(text) {
  statusEl.textContent = text;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickN(list, n) {
  return shuffle(list).slice(0, n);
}

function validateBank(bank) {
  if (!bank || !Array.isArray(bank.subjects)) throw new Error("Invalid bank: missing subjects");

  bank.subjects.forEach((subject) => {
    if (!subject.id || !subject.name) throw new Error("Each subject requires id and name");
    if (!Array.isArray(subject.mcq) || !Array.isArray(subject.tf) || !Array.isArray(subject.terms)) {
      throw new Error(`Subject ${subject.id} requires mcq, tf and terms arrays`);
    }
  });
}

async function loadGeneratedBank() {
  const res = await fetch(`${GENERATED_BANK_URL}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to fetch generated bank (${res.status})`);
  const parsed = await res.json();
  validateBank(parsed);
  return parsed;
}

function findSubject(subjectId) {
  return state.bank.subjects.find((s) => s.id === subjectId);
}

function getChapterMeta(subject, type) {
  if (type === "terms") return [];

  const source = type === "mcq" ? subject.mcq : type === "tf" ? subject.tf : subject.terms;
  const map = new Map();

  source.forEach((item) => {
    const chapterId = item.chapterId || "misc";
    const chapterName = item.chapterName || chapterId;
    map.set(chapterId, chapterName);
  });

  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function fillSubjects() {
  subjectSelect.innerHTML = "";
  state.bank.subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = `${subject.name} (${subject.id.toUpperCase()})`;
    subjectSelect.append(option);
  });

  state.subjectId = state.bank.subjects[0]?.id || "";
  subjectSelect.value = state.subjectId;
  fillChapters();
}

function fillChapters() {
  const subject = findSubject(subjectSelect.value);
  chapterSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = typeSelect.value === "terms" ? "全科词汇 All Terms" : "全部章节 All Chapters";
  chapterSelect.append(allOption);

  if (!subject) {
    state.chapterId = "all";
    chapterSelect.value = "all";
    return;
  }

  const chapters = getChapterMeta(subject, typeSelect.value);
  chapters.forEach((ch) => {
    const option = document.createElement("option");
    option.value = ch.id;
    option.textContent = `${ch.id} - ${ch.name}`;
    chapterSelect.append(option);
  });

  state.chapterId = "all";
  chapterSelect.value = "all";
  chapterSelect.disabled = typeSelect.value === "terms";
}

function extractOptionsFromStem(text) {
  if (!text || typeof text !== "string") return null;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const optionLines = [];
  const stemLines = [];

  lines.forEach((line) => {
    const match = line.match(/^([A-H])[\.|\)|:|：]\s*(.+)$/i);
    if (match) {
      optionLines.push({ key: match[1].toUpperCase(), textEn: match[2].trim(), textCn: "" });
    } else {
      stemLines.push(line);
    }
  });

  if (optionLines.length >= 2) {
    return { stem: stemLines.join(" "), options: optionLines };
  }

  return null;
}

function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions
    .map((opt, idx) => {
      if (typeof opt === "string") {
        return { key: String.fromCharCode(65 + idx), textEn: opt, textCn: "" };
      }

      if (!opt || typeof opt !== "object") return null;

      return {
        key: (opt.key || String.fromCharCode(65 + idx)).toUpperCase(),
        textEn: opt.textEn || opt.en || opt.text || "",
        textCn: opt.textCn || opt.cn || ""
      };
    })
    .filter(Boolean)
    .filter((opt) => opt.textEn || opt.textCn);
}

function normalizeQuestion(q, fallbackId) {
  const parsedEn = extractOptionsFromStem(q.stemWithOptionsEn || q.stemEnWithOptions || q.stemEn || "");
  const parsedCn = extractOptionsFromStem(q.stemWithOptionsCn || q.stemCnWithOptions || q.stemCn || "");

  const directOptions = normalizeOptions(q.options);
  const options = directOptions.length ? directOptions : parsedEn?.options || parsedCn?.options || [];

  const stemEn = q.stemEn || q.questionEn || q.enStem || parsedEn?.stem || q.stem || "";
  const stemCn = q.stemCn || q.questionCn || q.cnStem || parsedCn?.stem || "";

  const answerKey = (q.answerKey || q.answer || "").toString().trim().toUpperCase();
  let answerIndex = typeof q.answerIndex === "number" ? q.answerIndex : -1;
  if (answerIndex < 0 && answerKey) {
    answerIndex = options.findIndex((opt) => opt.key.toUpperCase() === answerKey);
  }

  return {
    id: q.id || fallbackId,
    chapterId: q.chapterId || "misc",
    chapterName: q.chapterName || "Misc",
    stemEn,
    stemCn,
    options,
    answerIndex,
    explanationCn: q.explanationCn || q.analysisCn || q.parseCn || "",
    explanationEn: q.explanationEn || q.analysisEn || ""
  };
}

function normalizeTrueFalse(q, fallbackId) {
  const stemEn = q.stemEn || q.questionEn || q.enStem || q.stem || "";
  const stemCn = q.stemCn || q.questionCn || q.cnStem || "";
  const rawAnswer = (q.answer || q.answerKey || q.correct || "").toString().trim().toUpperCase();

  let answerIndex = -1;
  if (typeof q.answerIndex === "number") {
    answerIndex = q.answerIndex;
  } else if (["T", "TRUE", "Y", "YES", "1"].includes(rawAnswer)) {
    answerIndex = 0;
  } else if (["F", "FALSE", "N", "NO", "0"].includes(rawAnswer)) {
    answerIndex = 1;
  }

  return {
    id: q.id || fallbackId,
    chapterId: q.chapterId || "misc",
    chapterName: q.chapterName || "Misc",
    stemEn,
    stemCn,
    options: [
      { key: "T", textEn: "True", textCn: "正确" },
      { key: "F", textEn: "False", textCn: "错误" }
    ],
    answerIndex,
    explanationCn: q.explanationCn || q.analysisCn || q.parseCn || "",
    explanationEn: q.explanationEn || q.analysisEn || ""
  };
}

function normalizeTerm(item, idx) {
  return {
    id: item.id || `term-${idx + 1}`,
    termEn: item.termEn || item.term || "",
    termCn: item.termCn || "",
    definitionCn: item.definitionCn || item.explanationCn || item.definition || "",
    definitionEn: item.definitionEn || item.explanationEn || ""
  };
}

function filterByChapter(items, chapterId) {
  if (chapterId === "all") return items;
  return items.filter((item) => (item.chapterId || "misc") === chapterId);
}

function renderObjectiveSet(subject, config) {
  const normalized = config.source
    .map((q, index) => config.normalize(q, `${config.idPrefix}-${index + 1}`))
    .filter((q) => q.stemEn && q.options.length >= 2 && q.answerIndex >= 0);

  const scoped = filterByChapter(normalized, state.chapterId);
  state.currentSet = pickN(scoped, config.maxQuestions);
  state.submitted = false;

  workspace.innerHTML = "";
  if (!state.currentSet.length) {
    setStatus(config.emptyStatus);
    return;
  }

  const form = document.createElement("form");
  form.id = `${config.idPrefix}Form`;

  state.currentSet.forEach((q, index) => {
    const block = document.createElement("article");
    block.className = "question";
    block.dataset.index = String(index);

    const meta = document.createElement("p");
    meta.className = "question-meta";
    meta.textContent = `${q.chapterId} | ${q.chapterName}`;

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${q.stemEn}`;
    title.className = "question-title";

    block.append(meta, title);

    const options = document.createElement("div");
    options.className = "options";

    q.options.forEach((opt, i) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q-${index}`;
      input.value = String(i);
      input.dataset.optionIndex = String(i);

      label.append(input);
      const optionText = document.createElement("span");
      optionText.className = "option-text";
      optionText.textContent = `${opt.key}. ${opt.textEn}`;
      label.append(optionText);
      options.append(label);
    });

    block.append(options);
    form.append(block);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn primary";
  submitBtn.textContent = "提交并查看解析 Submit";
  form.append(submitBtn);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMcq(form);
  });

  workspace.append(form);

  if (state.currentSet.length < config.maxQuestions) {
    setStatus(`当前范围仅 ${state.currentSet.length} 道有效${config.labelCn}，已全部抽取。`);
    return;
  }

  setStatus(`已生成 ${state.currentSet.length} 道${config.labelCn}。完成后点击提交查看答案与解析。`);
}

function renderMcq(subject) {
  renderObjectiveSet(subject, {
    source: subject.mcq,
    normalize: normalizeQuestion,
    idPrefix: "mcq",
    labelCn: "选择题",
    maxQuestions: 15,
    emptyStatus: "当前学科/章节下没有可用选择题。请检查本地章节 JSON。"
  });
}

function renderTrueFalse(subject) {
  renderObjectiveSet(subject, {
    source: subject.tf,
    normalize: normalizeTrueFalse,
    idPrefix: "tf",
    labelCn: "判断题",
    maxQuestions: 15,
    emptyStatus: "当前学科/章节下没有可用判断题。请检查本地章节 JSON。"
  });
}

function submitMcq(form) {
  if (state.submitted) return;

  const data = new FormData(form);
  let score = 0;

  state.currentSet.forEach((q, index) => {
    const questionBox = form.querySelector(`.question[data-index=\"${index}\"]`);
    const selected = data.get(`q-${index}`);
    const selectedIndex = selected === null ? -1 : Number(selected);
    const isCorrect = selectedIndex === q.answerIndex;

    if (isCorrect) score += 1;

    const result = document.createElement("p");
    result.className = isCorrect ? "result-ok" : "result-bad";
    result.textContent = isCorrect ? "回答正确 Correct" : "回答错误 Incorrect";

    const title = questionBox.querySelector(".question-title");
    if (title && q.stemCn) {
      title.innerHTML = `${index + 1}. ${q.stemEn}<br /><span class="question-cn">${q.stemCn}</span>`;
    }

    questionBox.querySelectorAll(".options label").forEach((label, optionIndex) => {
      const textNode = label.querySelector(".option-text");
      const opt = q.options[optionIndex];
      if (textNode && opt) {
        textNode.innerHTML = `${opt.key}. ${opt.textEn}${opt.textCn ? `<br /><span class="option-cn">${opt.textCn}</span>` : ""}`;
      }

      if (optionIndex === q.answerIndex) {
        label.classList.add("option-correct");
      }

      if (selectedIndex === optionIndex && selectedIndex !== q.answerIndex) {
        label.classList.add("option-incorrect");
      }
    });

    const answerOpt = q.options[q.answerIndex];
    const answerText = answerOpt
      ? `${answerOpt.key}. ${answerOpt.textEn}${answerOpt.textCn ? ` / ${answerOpt.textCn}` : ""}`
      : "N/A";

    const explain = document.createElement("div");
    explain.className = "explain";
    explain.innerHTML = `<strong>Answer:</strong> ${answerText}<br /><strong>解析:</strong> ${
      q.explanationCn || "(未提供)"
    }${q.explanationEn ? `<br /><strong>Explanation:</strong> ${q.explanationEn}` : ""}`;

    questionBox.append(result, explain);
  });

  form.querySelectorAll("input[type=radio]").forEach((input) => {
    input.disabled = true;
  });

  const submitBtn = form.querySelector("button[type=submit]");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "已提交 Submitted";
  }

  state.submitted = true;
  setStatus(`本套得分：${score} / ${state.currentSet.length}`);
}

function renderTerms(subject) {
  const MAX_TERMS = 7;
  const normalizedTerms = subject.terms.map((item, idx) => normalizeTerm(item, idx));
  const scoped = normalizedTerms.filter((item) => item.termEn || item.termCn);

  state.currentSet = pickN(scoped, MAX_TERMS);
  workspace.innerHTML = "";

  if (!state.currentSet.length) {
    setStatus("当前学科/章节下没有可用名词解释。请检查本地章节 JSON。");
    return;
  }

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "btn ghost";
  refreshBtn.textContent = "刷新 7 个词汇 Refresh";
  refreshBtn.addEventListener("click", () => renderTerms(subject));

  const wrap = document.createElement("div");
  wrap.className = "term-grid";

  state.currentSet.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "term";

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${item.termEn}${item.termCn ? ` / ${item.termCn}` : ""}`;

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "查看解析 Show Explanation";

    const definition = document.createElement("p");
    definition.className = "hidden";
    definition.textContent = `${item.definitionCn || ""}${item.definitionEn ? `\n\n${item.definitionEn}` : ""}`;

    btn.addEventListener("click", () => {
      const hidden = definition.classList.toggle("hidden");
      btn.textContent = hidden ? "查看解析 Show Explanation" : "收起解析 Hide";
    });

    card.append(title, btn, definition);
    wrap.append(card);
  });

  workspace.append(refreshBtn, wrap);
  setStatus(`已生成 ${state.currentSet.length} 个名词解释。点击按钮查看概念解析。`);
}

function generateSet() {
  state.subjectId = subjectSelect.value;
  state.chapterId = chapterSelect.value;
  state.type = typeSelect.value;

  const subject = findSubject(state.subjectId);
  if (!subject) {
    workspace.innerHTML = "";
    setStatus("没有找到学科数据，请先构建本地章节题库。");
    return;
  }

  if (state.type === "mcq") {
    renderMcq(subject);
    return;
  }

  if (state.type === "tf") {
    renderTrueFalse(subject);
    return;
  }

  renderTerms(subject);
}

function resetWorkspace() {
  workspace.innerHTML = "";
  setStatus("已重置。请选择学科、章节和题型后重新生成。");
}

async function reloadBank() {
  try {
    const generated = await loadGeneratedBank();
    state.bank = generated;
    fillSubjects();
    workspace.innerHTML = "";
    setStatus("题库已重新加载（来自本地章节汇总文件）。");
  } catch (err) {
    setStatus(`重载失败：${err.message}`);
  }
}

function setupEvents() {
  subjectSelect.addEventListener("change", fillChapters);
  typeSelect.addEventListener("change", fillChapters);
  generateBtn.addEventListener("click", generateSet);
  reloadBtn.addEventListener("click", reloadBank);
  resetBtn.addEventListener("click", resetWorkspace);
}

async function init() {
  try {
    state.bank = await loadGeneratedBank();
    setStatus("已加载本地章节汇总题库。请选择学科、章节和题型。");
  } catch {
    state.bank = FALLBACK_BANK;
    setStatus("未加载到汇总题库，请先执行 npm run build:bank。");
  }

  fillSubjects();
  setupEvents();
}

init();
