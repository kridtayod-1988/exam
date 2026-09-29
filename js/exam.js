// js/exam.js
// หน้าทำข้อสอบ — รองรับ 4 รูปแบบ: คำถามเดี่ยว / เงื่อนไข / บทความ / ตาราง

let examUser = null;
let examQuestions = [];
let examAnswers = [];
let currentIndex = 0;
let attemptId = null;
let examTimer = null;
let startTime = null;
let timeLimitSeconds = 0;
let isSubmitting = false;

const MODE_LABELS = {
  full100: "ข้อสอบจริง 100 ข้อ",
  category: "แบบทดสอบแยกหมวดหมู่",
  year: "แบบทดสอบแยกปี"
};

// ═══════════════════════════════════════════
// Normalize context — backward compatible กับ table_data เก่า
// ═══════════════════════════════════════════
function normalizeContext(tableData) {
  if (!tableData) return {};
  // Legacy format: { headers, rows } = ตารางเก่า
  if (Array.isArray(tableData.headers) && Array.isArray(tableData.rows)) {
    return { table: tableData };
  }
  // New format: { condition?, passage?, table? }
  return tableData;
}

(function init() {
  (async () => {
    try {
      const { user } = await requireAuth();
      examUser = user;

      const configRaw = sessionStorage.getItem("examConfig");
      if (!configRaw) {
        window.location.href = "dashboard.html";
        return;
      }
      const config = JSON.parse(configRaw);

      await setupExam(config);
    } catch (err) {
      console.error("เริ่มข้อสอบไม่สำเร็จ:", err);

      document.getElementById("loading-screen").classList.add("hidden");
      const notEnough = document.getElementById("not-enough-screen");
      if (notEnough) {
        notEnough.classList.remove("hidden");
        const heading = notEnough.querySelector("h2");
        const desc = notEnough.querySelector("p.text-secondary");
        if (heading) heading.textContent = "เกิดข้อผิดพลาด";
        if (desc) desc.textContent = err.message || "ไม่สามารถโหลดข้อสอบได้ กรุณาลองใหม่";
      }
    }
  })();
})();

async function setupExam(config) {
  let count = 100;
  let timeMinutes = 180;
  const filter = {};

  if (config.mode === "full100") {
    const { data: sysConfig, error: sysError } = await withRetry(
      () => sb
        .from("system_config")
        .select("full_exam_question_count, full_exam_time_minutes")
        .eq("key", "public")
        .single(),
      { operationName: "setupExam_full100" }
    );
    if (sysError) throw sysError;
    count = sysConfig?.full_exam_question_count || 100;
    timeMinutes = sysConfig?.full_exam_time_minutes || 180;
  } else if (config.mode === "category") {
    count = config.count || 25;
    filter.categoryId = config.categoryId;
    timeMinutes = Math.ceil(count * 1.5);
  } else if (config.mode === "year") {
    count = config.count || 25;
    filter.examYearId = config.examYearId;
    timeMinutes = Math.ceil(count * 1.5);
  }

  const { questions } = await drawQuestionsNoRepeat(examUser.id, count, filter);

  if (questions.length === 0) {
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("not-enough-screen").classList.remove("hidden");
    return;
  }

  if (config.mode === "full100" && questions.length < count) {
    const proceed = window.confirm(
      `คลังข้อสอบมีไม่เพียงพอ (ต้องการ ${count} ข้อ แต่มีเพียง ${questions.length} ข้อ)\n\nต้องการทำต่อหรือไม่?`
    );
    if (!proceed) {
      sessionStorage.removeItem("examConfig");
      window.location.href = "dashboard.html";
      return;
    }
  }

  examQuestions = questions;
  examAnswers = new Array(questions.length).fill(-1);
  timeLimitSeconds = timeMinutes * 60;

  attemptId = await createExamAttempt({
    userId: examUser.id,
    mode: config.mode,
    categoryId: filter.categoryId || null,
    examYearId: filter.examYearId || null,
    questionIds: questions.map((q) => q.id)
  });

  setTextSafe("exam-mode-title", MODE_LABELS[config.mode] || "แบบทดสอบ");
  setTextSafe("total-questions", String(questions.length));
  document.getElementById("modal-total-questions").textContent = String(questions.length);
  document.getElementById("exit-total-questions").textContent = String(questions.length);

  document.getElementById("loading-screen").classList.add("hidden");
  document.getElementById("exam-screen").classList.remove("hidden");

  startTime = Date.now();
  startExamTimer();
  renderQuestion();
}

function startExamTimer() {
  let remaining = timeLimitSeconds;
  const display = document.getElementById("time-left");

  examTimer = setInterval(() => {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    display.textContent =
      (hours > 0 ? String(hours).padStart(2, "0") + ":" : "") +
      String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");

    if (remaining <= 60) display.classList.add("warning");

    if (--remaining < 0) {
      clearInterval(examTimer);
      submitExam();
    }
  }, 1000);
}

// ═══════════════════════════════════════════
// Render Question + Context
// ═══════════════════════════════════════════
function renderQuestion() {
  const q = examQuestions[currentIndex];
  const ctx = normalizeContext(q.tableData);

  setTextSafe("current-question-number", String(currentIndex + 1));

  const progressPercent = ((currentIndex + 1) / examQuestions.length) * 100;
  const progressFillEl = document.getElementById("exam-progress-fill");
  if (progressFillEl) progressFillEl.style.width = progressPercent + "%";

  // ✅ Render context blocks (condition / passage / table)
  renderContext(ctx);

  // ✅ Question text
  setTextSafe("question-text", q.questionText);

  // ✅ Options
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";
  const optionLabels = ["ก", "ข", "ค", "ง"];

  q.options.forEach((option, idx) => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "option-item";
    if (examAnswers[currentIndex] === idx) optionDiv.classList.add("selected");

    const bullet = document.createElement("span");
    bullet.className = "option-bullet";
    bullet.textContent = optionLabels[idx] || String(idx + 1);

    const label = document.createElement("label");
    label.style.cssText = "flex:1;cursor:pointer;font-size:1rem;";
    label.textContent = option;

    optionDiv.appendChild(bullet);
    optionDiv.appendChild(label);
    optionsContainer.appendChild(optionDiv);

    optionDiv.addEventListener("click", () => {
      examAnswers[currentIndex] = idx;
      optionsContainer.querySelectorAll(".option-item").forEach((item) => item.classList.remove("selected"));
      optionDiv.classList.add("selected");
    });
  });

  document.getElementById("prev-button").style.visibility = currentIndex === 0 ? "hidden" : "visible";
  document.getElementById("next-button").textContent =
    currentIndex === examQuestions.length - 1 ? "ส่งคำตอบ ✅" : "ข้อต่อไป →";
}

/**
 * Render context blocks — เงื่อนไข / บทความ / ตาราง
 * แต่ละ block render แยกกัน ใช้ DOM API + textContent ทั้งหมด (ปลอด XSS)
 */
function renderContext(ctx) {
  const container = document.getElementById("context-container");
  container.innerHTML = "";

  // ─── 1. เงื่อนไขสัญลักษณ์ ───
  if (ctx.condition && ctx.condition.trim()) {
    const block = document.createElement("div");
    block.className = "context-condition";

    const label = document.createElement("span");
    label.className = "context-label";
    label.textContent = "🔷 เงื่อนไข";

    const content = document.createElement("div");
    content.className = "context-condition-content";
    content.textContent = ctx.condition; // textContent = ปลอด XSS

    block.appendChild(label);
    block.appendChild(content);
    container.appendChild(block);
  }

  // ─── 2. บทความยาว ───
  if (ctx.passage && ctx.passage.trim()) {
    const block = document.createElement("div");
    block.className = "context-passage";

    const header = document.createElement("div");
    header.className = "context-passage-header";

    const label = document.createElement("span");
    label.className = "context-label";
    label.textContent = "📖 บทความ";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "context-passage-toggle";
    toggleBtn.type = "button";
    toggleBtn.textContent = "▲ ย่อ";
    toggleBtn.addEventListener("click", () => {
      block.classList.toggle("collapsed");
      toggleBtn.textContent = block.classList.contains("collapsed") ? "▼ ขยาย" : "▲ ย่อ";
    });

    header.appendChild(label);
    header.appendChild(toggleBtn);

    const content = document.createElement("div");
    content.className = "context-passage-content";
    content.textContent = ctx.passage;

    block.appendChild(header);
    block.appendChild(content);
    container.appendChild(block);
  }

  // ─── 3. ตารางข้อมูล ───
  if (ctx.table && ctx.table.headers && ctx.table.headers.length > 0) {
    const wrapper = document.createElement("div");
    wrapper.className = "context-table-wrap";

    const label = document.createElement("span");
    label.className = "context-label";
    label.textContent = "📊 ตารางข้อมูล";

    const table = document.createElement("table");
    table.className = "question-table";
    renderTableSafe(table, ctx.table);

    wrapper.appendChild(label);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }
}

/**
 * Render ตารางแบบปลอดภัย — ใช้ textContent ทุกเซลล์
 */
function renderTableSafe(tableEl, tableData) {
  tableEl.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  tableData.headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText; // textContent = ปลอด XSS
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement("tbody");
  tableData.rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cellText) => {
      const td = document.createElement("td");
      td.textContent = cellText;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tableEl.appendChild(tbody);
}

// ═══════════════════════════════════════════
// Event handlers
// ═══════════════════════════════════════════
document.getElementById("prev-button").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
});

document.getElementById("skip-button").addEventListener("click", () => {
  if (currentIndex < examQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    openSubmitConfirmModal();
  }
});

document.getElementById("exit-button").addEventListener("click", () => {
  openExitConfirmModal();
});

document.getElementById("next-button").addEventListener("click", () => {
  if (currentIndex < examQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    openSubmitConfirmModal();
  }
});

function openSubmitConfirmModal() {
  const answeredCount = examAnswers.filter((a) => a !== -1).length;
  document.getElementById("answered-count").textContent = String(answeredCount);
  document.getElementById("confirm-submit-modal").classList.remove("hidden");
}

function openExitConfirmModal() {
  const answeredCount = examAnswers.filter((a) => a !== -1).length;
  document.getElementById("exit-answered-count").textContent = String(answeredCount);
  document.getElementById("confirm-exit-modal").classList.remove("hidden");
}

document.getElementById("cancel-submit-btn").addEventListener("click", () => {
  document.getElementById("confirm-submit-modal").classList.add("hidden");
});

document.getElementById("confirm-submit-btn").addEventListener("click", () => {
  document.getElementById("confirm-submit-modal").classList.add("hidden");
  submitExam();
});

document.getElementById("cancel-exit-btn").addEventListener("click", () => {
  document.getElementById("confirm-exit-modal").classList.add("hidden");
});

document.getElementById("confirm-exit-btn").addEventListener("click", () => {
  document.getElementById("confirm-exit-modal").classList.add("hidden");
  clearInterval(examTimer);
  isSubmitting = true;
  sessionStorage.removeItem("examConfig");
  window.location.href = "dashboard.html";
});

async function submitExam() {
  isSubmitting = true;
  clearInterval(examTimer);
  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

  try {
    const result = await finishExamAttempt({
      attemptId,
      userId: examUser.id,
      userAnswers: examAnswers,
      questions: examQuestions,
      durationSeconds
    });

    sessionStorage.setItem("lastAttemptId", attemptId);
    sessionStorage.setItem("lastExpGained", String(result.expGained));
    sessionStorage.setItem("lastLeveledUp", String(result.leveledUp));
    sessionStorage.setItem("lastNewLevel", String(result.newLevel));
    sessionStorage.removeItem("examConfig");
    window.location.href = `result.html?attemptId=${encodeURIComponent(attemptId)}`;
  } catch (err) {
    console.error("ส่งคำตอบไม่สำเร็จ:", err);
    showToast("เกิดข้อผิดพลาดในการส่งคำตอบ กรุณาลองใหม่", "error");
    isSubmitting = false;
  }
}

window.addEventListener("beforeunload", (e) => {
  if (!isSubmitting && examQuestions.length > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
});