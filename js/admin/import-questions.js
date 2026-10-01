// js/admin/import-questions.js
// นำเข้าข้อสอบจาก CSV — สร้าง paper อัตโนมัติ + insert questions

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════
let parsedRows = [];
let papersMap = new Map();
let validationErrors = [];
let categoryMap = new Map();   // name → uuid

const VALID_CATS = ["math", "reason", "thai", "eng", "law"];
const VALID_SUBS = [
  "SC_M1","SC_M2","SC_M3","SC_M4","SC_M5",
  "SC_R1","SC_R2","SC_R3",
  "SC_T1","SC_T2","SC_T3","SC_T4",
  "SC_E1","SC_E2","SC_E3","SC_E4",
  "SC_L1","SC_L2","SC_L3","SC_L4","SC_L5","SC_L6","SC_L7","SC_L8"
];

const CAT_TO_CATEGORY_NAME = {
  math:   "ความสามารถทั่วไป",
  reason: "ความสามารถทั่วไป",
  thai:   "ความสามารถทั่วไป",
  eng:    "ภาษาอังกฤษ",
  law:    "การเป็นข้าราชการที่ดี"
};

// ═══════════════════════════════════════════
// Init
// ═══════════════════════════════════════════
(async function init() {
  try {
    const { userData } = await requireAdmin();
    renderAdminLayout("import-questions", userData);
    await preloadCategories();
    bindEvents();
  } catch (err) {
    console.error("[import] init error:", err);
  }
})();

/**
 * โหลด categories ทั้งหมดล่วงหน้า — ลด N+1 query
 */
async function preloadCategories() {
  const { data, error } = await sb
    .from("categories")
    .select("id, name")
    .eq("is_active", true);

  if (error) {
    console.error("[import] โหลด categories ไม่สำเร็จ:", error);
    return;
  }

  categoryMap.clear();
  (data || []).forEach((c) => categoryMap.set(c.name, c.id));
  console.log("[import] โหลด categories:", categoryMap.size, "รายการ");
}

// ═══════════════════════════════════════════
// Bind events
// ═══════════════════════════════════════════
function bindEvents() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const importBtn = document.getElementById("import-btn");
  const confirmBox = document.getElementById("confirm-overwrite");
  const resetBtn = document.getElementById("reset-btn");

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--gold-400)";
    dropZone.style.background = "rgba(240,180,41,0.10)";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "var(--border-active)";
    dropZone.style.background = "rgba(240,180,41,0.04)";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border-active)";
    dropZone.style.background = "rgba(240,180,41,0.04)";
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  confirmBox.addEventListener("change", () => {
    importBtn.disabled = !confirmBox.checked;
  });

  importBtn.addEventListener("click", handleImport);
  resetBtn.addEventListener("click", resetAll);

  document.getElementById("download-template-btn")
    .addEventListener("click", downloadTemplate);
}

// ═══════════════════════════════════════════
// Handle file
// ═══════════════════════════════════════════
async function handleFile(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".csv")) {
    alert("กรุณาเลือกไฟล์ .csv");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("ไฟล์ใหญ่เกินไป (สูงสุด 5 MB)");
    return;
  }

  document.getElementById("file-name").textContent = file.name;
  document.getElementById("file-size").textContent = formatBytes(file.size);
  document.getElementById("file-info").classList.remove("hidden");

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    alert("ไฟล์ว่างเปล่า หรือไม่มีข้อมูล");
    return;
  }

  document.getElementById("file-rows").textContent = rows.length;
  parsedRows = rows;
  validateAndGroup();
  renderPreview();
}

// ═══════════════════════════════════════════
// CSV Parser — รองรับ multi-line quoted fields
// ═══════════════════════════════════════════
function parseCSV(text) {
  // ลบ BOM
  text = text.replace(/^\uFEFF/, "");

  const rows = [];
  let currentRow = [];
  let buffer = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        buffer += '"';
        i++; // skip escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      currentRow.push(buffer);
      buffer = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      // จบแถว (ข้าม \r\n)
      if (ch === "\r" && next === "\n") i++;
      currentRow.push(buffer);
      rows.push(currentRow);
      currentRow = [];
      buffer = "";
    } else {
      buffer += ch;
    }
  }

  // เก็บ buffer สุดท้าย
  if (buffer.length > 0 || currentRow.length > 0) {
    currentRow.push(buffer);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  // Header
  const headers = rows[0].map((h) => h.trim());

  // Data
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // ข้ามแถวว่าง
    if (row.length === 1 && row[0].trim() === "") continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] || "").trim();
    });
    data.push(obj);
  }

  return data;
}

// ═══════════════════════════════════════════
// Validate + group by paper_code
// ═══════════════════════════════════════════
function validateAndGroup() {
  validationErrors = [];
  papersMap.clear();

  const required = [
    "paper_code", "paper_label", "year", "question_text",
    "options", "correct_answer_index", "difficulty", "cat", "sub"
  ];

  parsedRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    let hasError = false;

    // Required
    for (const key of required) {
      if (!row[key]) {
        validationErrors.push({ row: rowNum, field: key, msg: `ขาดคอลัมน์ ${key}` });
        hasError = true;
      }
    }
    if (hasError) return;

    // cat
    if (!VALID_CATS.includes(row.cat)) {
      validationErrors.push({ row: rowNum, field: "cat", msg: `cat ต้องเป็น: ${VALID_CATS.join(", ")}` });
    }

    // sub
    if (!VALID_SUBS.includes(row.sub)) {
      validationErrors.push({ row: rowNum, field: "sub", msg: `sub "${row.sub}" ไม่ถูกต้อง` });
    }

    // year
    const year = parseInt(row.year, 10);
    if (isNaN(year) || year < 2500 || year > 2650) {
      validationErrors.push({ row: rowNum, field: "year", msg: "ปีต้องอยู่ระหว่าง 2500-2650" });
    }

    // options (JSON)
    try {
      const options = JSON.parse(row.options);
      if (!Array.isArray(options) || options.length !== 4) {
        validationErrors.push({ row: rowNum, field: "options", msg: "ต้องมี 4 ตัวเลือก" });
      }
    } catch {
      validationErrors.push({ row: rowNum, field: "options", msg: "JSON ไม่ถูกต้อง" });
      return;
    }

    // correct_answer_index
    const idx2 = parseInt(row.correct_answer_index, 10);
    if (isNaN(idx2) || idx2 < 0 || idx2 > 3) {
      validationErrors.push({ row: rowNum, field: "correct_answer_index", msg: "ต้องเป็น 0-3" });
    }

    // difficulty
    if (!["easy", "medium", "hard"].includes(row.difficulty)) {
      validationErrors.push({ row: rowNum, field: "difficulty", msg: "ต้องเป็น easy/medium/hard" });
    }

    // Group by paper
    if (!papersMap.has(row.paper_code)) {
      papersMap.set(row.paper_code, {
        code: row.paper_code,
        label: row.paper_label,
        year: parseInt(row.year, 10),
        description: row.paper_description || "",
        count: 0
      });
    }
    papersMap.get(row.paper_code).count++;
  });
}

// ═══════════════════════════════════════════
// Render preview
// ═══════════════════════════════════════════
function renderPreview() {
  document.getElementById("preview-section").classList.remove("hidden");
  document.getElementById("action-section").classList.remove("hidden");

  // Papers summary
  const papersDiv = document.getElementById("papers-summary");
  papersDiv.innerHTML = "";

  const summaryCard = document.createElement("div");
  summaryCard.style.cssText = "padding:1rem 1.25rem; background:var(--gold-glow); border:1px solid var(--border-active); border-radius:12px; margin-bottom:1rem;";

  const title = document.createElement("p");
  title.className = "font-bold mb-2";
  title.textContent = `พบ ${papersMap.size} ชุดข้อสอบ (${parsedRows.length} ข้อ)`;
  summaryCard.appendChild(title);

  papersMap.forEach((p) => {
    const pEl = document.createElement("p");
    pEl.className = "text-sm";
    pEl.style.cssText = "color:var(--text-secondary); margin-bottom:0.25rem;";
    pEl.textContent = `• [${p.code}] ${p.label} (${p.year}) — ${p.count} ข้อ`;
    summaryCard.appendChild(pEl);
  });

  papersDiv.appendChild(summaryCard);

  // Errors
  const errorsDiv = document.getElementById("errors-container");
  errorsDiv.innerHTML = "";

  if (validationErrors.length > 0) {
    const errBox = document.createElement("div");
    errBox.className = "form-error";
    errBox.style.maxHeight = "200px";
    errBox.style.overflowY = "auto";

    const title2 = document.createElement("p");
    title2.className = "font-bold mb-2";
    title2.textContent = `⚠️ พบ ${validationErrors.length} ข้อผิดพลาด — แก้ไขก่อนนำเข้า`;
    errBox.appendChild(title2);

    validationErrors.slice(0, 30).forEach((e) => {
      const p = document.createElement("p");
      p.className = "text-xs";
      p.style.marginBottom = "0.25rem";
      p.textContent = `แถว ${e.row}: [${e.field}] ${e.msg}`;
      errBox.appendChild(p);
    });

    if (validationErrors.length > 30) {
      const more = document.createElement("p");
      more.className = "text-xs text-muted";
      more.textContent = `... และอีก ${validationErrors.length - 30} รายการ`;
      errBox.appendChild(more);
    }

    errorsDiv.appendChild(errBox);
    document.getElementById("import-btn").disabled = true;
    document.getElementById("confirm-overwrite").disabled = true;
  } else {
    const okBox = document.createElement("div");
    okBox.className = "form-success";
    okBox.textContent = "✅ ข้อมูลถูกต้องทั้งหมด พร้อมนำเข้า";
    errorsDiv.appendChild(okBox);
    document.getElementById("confirm-overwrite").disabled = false;
    document.getElementById("import-btn").disabled = true; // ยังต้องติ๊ก confirm
  }

  // Preview table (10 rows)
  const table = document.getElementById("preview-table");
  table.innerHTML = "";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Paper", "คำถาม", "cat/sub", "ยาก"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const tbody = document.createElement("tbody");
  parsedRows.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    const values = [
      row.paper_code,
      (row.question_text || "").slice(0, 60) + "...",
      `${row.cat}/${row.sub}`,
      row.difficulty
    ];
    values.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v || "";
      td.style.fontSize = "0.85rem";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

// ═══════════════════════════════════════════
// Import
// ═══════════════════════════════════════════
async function handleImport() {
  const btn = document.getElementById("import-btn");
  const progress = document.getElementById("progress-container");
  const resultDiv = document.getElementById("result-container");

  btn.disabled = true;
  btn.textContent = "กำลังนำเข้า...";
  progress.classList.remove("hidden");
  resultDiv.classList.add("hidden");

  try {
    // ─── 1. Upsert papers ───
    setProgress(5, "กำลังตรวจสอบชุดข้อสอบ...");

    const paperCodes = Array.from(papersMap.keys());
    const { data: existing, error: fetchErr } = await sb
      .from("exam_years")
      .select("id, code")
      .in("code", paperCodes);

    if (fetchErr) throw fetchErr;

    const existingMap = new Map((existing || []).map((p) => [p.code, p.id]));
    let papersCreated = 0;

    for (const [code, paper] of papersMap) {
      if (existingMap.has(code)) continue;

      const { data, error } = await sb
        .from("exam_years")
        .insert({
          code: paper.code,
          label: paper.label,
          year: paper.year,
          description: paper.description || null,
          is_active: true
        })
        .select("id")
        .single();

      if (error) throw error;
      existingMap.set(code, data.id);
      papersCreated++;
    }

    setProgress(15, `สร้างชุดข้อสอบใหม่ ${papersCreated} ชุด`);

    // ─── 2. Prepare questions payload ───
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

    const questionPayload = [];

    for (const row of parsedRows) {
      const paperId = existingMap.get(row.paper_code);
      if (!paperId) continue;

      // แปลง cat → category_id
      const catName = CAT_TO_CATEGORY_NAME[row.cat];
      const categoryId = categoryMap.get(catName);
      if (!categoryId) {
        console.warn(`[import] ไม่พบ category "${catName}" — ข้ามข้อ "${row.question_text?.slice(0, 30)}"`);
        continue;
      }

      // table_data
      let tableData = null;
      if (row.table_data) {
        try { tableData = JSON.parse(row.table_data); } catch {}
      }

      // options
      let options;
      try { options = JSON.parse(row.options); } catch { continue; }

      questionPayload.push({
        category_id: categoryId,
        exam_year_id: paperId,
        question_text: row.question_text,
        options,
        correct_answer_index: parseInt(row.correct_answer_index, 10),
        explanation: row.explanation || "",
        difficulty: row.difficulty,
        table_data: tableData,
        is_active: true,
        source: "manual",
        created_by: user.id,
        cat: row.cat,
        sub: row.sub
      });
    }

    setProgress(25, `เตรียมข้อมูล ${questionPayload.length} ข้อ`);

    // ─── 3. Batch insert ───
    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < questionPayload.length; i += BATCH) {
      const batch = questionPayload.slice(i, i + BATCH);

      const { error } = await sb.from("questions").insert(batch);
      if (error) throw error;

      inserted += batch.length;
      setProgress(
        25 + (inserted / questionPayload.length) * 70,
        `เพิ่มแล้ว ${inserted}/${questionPayload.length}`
      );
    }

    setProgress(100, "เสร็จสิ้น!");

    // ─── Result ───
    resultDiv.className = "form-success";
    resultDiv.innerHTML = `
      <p class="font-bold mb-2">✅ นำเข้าสำเร็จ!</p>
      <p class="text-sm">• ชุดข้อสอบที่สร้างใหม่: <b>${papersCreated}</b></p>
      <p class="text-sm">• ชุดข้อสอบที่มีอยู่แล้ว: <b>${papersMap.size - papersCreated}</b></p>
      <p class="text-sm">• ข้อสอบที่เพิ่ม: <b>${inserted}</b></p>
      <p class="text-sm mt-2">
        <a href="questions.html" class="font-bold" style="color:var(--gold-400);">→ ไปหน้าจัดการคำถาม</a>
      </p>
    `;
    resultDiv.classList.remove("hidden");
    btn.textContent = "✅ นำเข้าเสร็จแล้ว";

  } catch (err) {
    console.error("[import] error:", err);
    resultDiv.className = "form-error";
    resultDiv.textContent = "❌ เกิดข้อผิดพลาด: " + err.message;
    resultDiv.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "🚀 เริ่มนำเข้า";
  }
}

function setProgress(pct, text) {
  document.getElementById("progress-fill").style.width = Math.min(100, pct) + "%";
  document.getElementById("progress-text").textContent = text;
}

// ═══════════════════════════════════════════
// Reset
// ═══════════════════════════════════════════
function resetAll() {
  parsedRows = [];
  papersMap.clear();
  validationErrors = [];

  document.getElementById("file-info").classList.add("hidden");
  document.getElementById("preview-section").classList.add("hidden");
  document.getElementById("action-section").classList.add("hidden");
  document.getElementById("progress-container").classList.add("hidden");
  document.getElementById("result-container").classList.add("hidden");
  document.getElementById("confirm-overwrite").checked = false;
  document.getElementById("confirm-overwrite").disabled = false;
  document.getElementById("import-btn").disabled = true;
  document.getElementById("file-input").value = "";
}

// ═══════════════════════════════════════════
// Template
// ═══════════════════════════════════════════
function downloadTemplate() {
  const header = "paper_code,paper_label,year,paper_description,question_text,options,correct_answer_index,explanation,difficulty,cat,sub,table_data";

  const samples = [
    'kp2567a,"ก.พ. 2567 ครั้งที่ 1",2567,"รอบเช้า ภาค ก","จงหาค่าของ 25×(36÷4)−80","[""185"",""235"",""205"",""215""]",1,"225-80=145, 145+90=235",easy,math,SC_M1,',
    'kp2567a,"ก.พ. 2567 ครั้งที่ 1",2567,"รอบเช้า ภาค ก","ข้อใดใช้คำว่า การ ได้ถูกต้อง?","[""การไปตลาด"",""การกินข้าว"",""การนอนหลับ"",""ถูกทุกข้อ""]",3,"การใช้ การ นำหน้าคำกริยาได้ทุกคำ",medium,thai,SC_T4,',
    'kp2567b,"ก.พ. 2567 ครั้งที่ 2",2567,"รอบบ่าย ภาค ก","He _____ to school every day.","[""go"",""goes"",""going"",""went""]",1,"Present simple: he/she/it + goes",easy,eng,SC_E3,'
  ];

  const csv = [header, ...samples].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-questions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}