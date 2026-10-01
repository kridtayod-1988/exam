// ═══════════════════════════════════════════
// Render preview — พร้อมปุ่มแก้ไขทุกแถว
// ═══════════════════════════════════════════
function renderPreview() {
  document.getElementById("preview-section").classList.remove("hidden");
  document.getElementById("action-section").classList.remove("hidden");

  // ─── Papers summary ───
  const papersDiv = document.getElementById("papers-summary");
  papersDiv.innerHTML = "";

  const summaryCard = document.createElement("div");
  summaryCard.style.cssText =
    "padding:1rem 1.25rem; background:var(--gold-glow); border:1px solid var(--border-active); border-radius:12px; margin-bottom:1rem;";

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

  // ─── Errors ───
  const errorsDiv = document.getElementById("errors-container");
  errorsDiv.innerHTML = "";

  if (validationErrors.length > 0) {
    const errBox = document.createElement("div");
    errBox.className = "form-error";
    errBox.style.maxHeight = "240px";
    errBox.style.overflowY = "auto";

    const title2 = document.createElement("p");
    title2.className = "font-bold mb-2";
    title2.textContent = `⚠️ พบ ${validationErrors.length} ข้อผิดพลาด — แก้ไขก่อนนำเข้า`;
    errBox.appendChild(title2);

    validationErrors.slice(0, 40).forEach((e) => {
      const p = document.createElement("p");
      p.className = "text-xs";
      p.style.marginBottom = "0.25rem";
      p.style.cursor = "pointer";
      p.textContent = `แถว ${e.row}: [${e.field}] ${e.msg}`;
      p.addEventListener("click", () => openEditRowModal(e.row - 2));
      errBox.appendChild(p);
    });

    if (validationErrors.length > 40) {
      const more = document.createElement("p");
      more.className = "text-xs text-muted";
      more.textContent = `... และอีก ${validationErrors.length - 40} รายการ`;
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
    document.getElementById("import-btn").disabled = true;
  }

  // ─── Preview table (20 แถวแรก + ปุ่มแก้ไข) ───
  const table = document.getElementById("preview-table");
  table.innerHTML = "";

  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["#", "Paper", "คำถาม", "cat/sub", "ยาก", ""].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const tbody = document.createElement("tbody");
  parsedRows.slice(0, 20).forEach((row, idx) => {
    const tr = document.createElement("tr");

    // #
    const tdNum = document.createElement("td");
    tdNum.textContent = String(idx + 2);
    tdNum.style.cssText = "font-size:0.75rem; color:var(--text-muted);";
    tr.appendChild(tdNum);

    // Paper
    const tdPaper = document.createElement("td");
    tdPaper.textContent = row.paper_code || "";
    tdPaper.style.cssText = "font-size:0.8rem;";
    tr.appendChild(tdPaper);

    // คำถาม
    const tdQ = document.createElement("td");
    tdQ.textContent = (row.question_text || "").slice(0, 50) + "…";
    tdQ.style.cssText = "font-size:0.85rem;";
    tr.appendChild(tdQ);

    // cat/sub
    const tdCat = document.createElement("td");
    tdCat.textContent = `${row.cat || "?"}/${row.sub || "?"}`;
    tdCat.style.cssText = "font-size:0.8rem;";
    tr.appendChild(tdCat);

    // ยาก
    const tdDiff = document.createElement("td");
    tdDiff.textContent = row.difficulty || "";
    tdDiff.style.cssText = "font-size:0.8rem;";
    tr.appendChild(tdDiff);

    // ปุ่มแก้ไข
    const tdEdit = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.style.cssText =
      "background:none; border:none; cursor:pointer; font-size:1rem; padding:0.25rem 0.4rem; border-radius:6px; transition:background 0.2s;";
    editBtn.title = "แก้ไขแถวนี้";
    editBtn.addEventListener("mouseenter", () => {
      editBtn.style.background = "rgba(240,180,41,0.15)";
    });
    editBtn.addEventListener("mouseleave", () => {
      editBtn.style.background = "none";
    });
    editBtn.addEventListener("click", () => openEditRowModal(idx));
    tdEdit.appendChild(editBtn);
    tr.appendChild(tdEdit);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

// ═══════════════════════════════════════════
// Edit row modal — แก้ไขข้อมูลก่อนนำเข้า
// ═══════════════════════════════════════════
function openEditRowModal(rowIdx) {
  const row = parsedRows[rowIdx];
  if (!row) return;

  // ลบ modal เก่า
  document.getElementById("import-edit-modal")?.remove();

  // ─── Overlay ───
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "import-edit-modal";
  overlay.style.zIndex = "1000";

  // ─── Box ───
  const box = document.createElement("div");
  box.className = "modal-box";
  box.style.cssText = "max-width:680px; max-height:90vh; overflow-y:auto;";

  // ─── Title ───
  const title = document.createElement("h3");
  title.className = "modal-title";
  title.textContent = `แก้ไขแถวที่ ${rowIdx + 2}`;
  box.appendChild(title);

  // ─── Fields ───
  const fields = [
    { key: "paper_code",            label: "Paper Code",                  type: "text",     hint: "เช่น kp2567a" },
    { key: "paper_label",           label: "Paper Label",                 type: "text",     hint: "เช่น ก.พ. 2567 ครั้งที่ 1" },
    { key: "year",                  label: "ปี (พ.ศ.)",                  type: "number",   hint: "เช่น 2567" },
    { key: "paper_description",     label: "คำอธิบายชุด (optional)",      type: "text",     hint: "" },
    { key: "question_text",         label: "คำถาม",                       type: "textarea", rows: 3 },
    { key: "options",               label: "ตัวเลือก (JSON array 4 ตัว)", type: "textarea", rows: 3, hint: '["ก","ข","ค","ง"]' },
    { key: "correct_answer_index",  label: "ดัชนีข้อถูก (0-3)",           type: "number",   hint: "0, 1, 2, หรือ 3" },
    { key: "explanation",           label: "คำอธิบายเฉลย",                type: "textarea", rows: 2 },
    { key: "difficulty",            label: "ความยาก",                     type: "select",   options: ["easy", "medium", "hard"] },
    { key: "cat",                   label: "หมวดหลัก",                    type: "select",   options: ["math", "reason", "thai", "eng", "law"] },
    { key: "sub",                   label: "หมวดย่อย",                    type: "select",   options: [
      "SC_M1","SC_M2","SC_M3","SC_M4","SC_M5",
      "SC_R1","SC_R2","SC_R3",
      "SC_T1","SC_T2","SC_T3","SC_T4",
      "SC_E1","SC_E2","SC_E3","SC_E4",
      "SC_L1","SC_L2","SC_L3","SC_L4","SC_L5","SC_L6","SC_L7","SC_L8"
    ]},
    { key: "table_data",            label: "Table Data (JSON, optional)", type: "textarea", rows: 2 }
  ];

  const form = document.createElement("form");
  form.id = "import-edit-form";

  fields.forEach((f) => {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = f.label;
    group.appendChild(label);

    let input;
    if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = f.rows || 2;
      input.className = "form-input";
    } else if (f.type === "select") {
      input = document.createElement("select");
      input.className = "form-input";
      f.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      });
    } else {
      input = document.createElement("input");
      input.type = f.type;
      input.className = "form-input";
      if (f.type === "number") {
        input.min = f.key === "correct_answer_index" ? "0" : "2500";
        input.max = f.key === "correct_answer_index" ? "3" : "2650";
      }
    }

    input.value = row[f.key] || "";
    input.dataset.key = f.key;
    input.style.fontFamily = (f.key === "options" || f.key === "table_data")
      ? "var(--font-mono)"
      : "inherit";
    input.style.fontSize = (f.key === "options" || f.key === "table_data")
      ? "0.85rem"
      : "inherit";

    group.appendChild(input);

    if (f.hint) {
      const hint = document.createElement("p");
      hint.className = "text-xs text-muted";
      hint.style.marginTop = "0.25rem";
      hint.textContent = f.hint;
      group.appendChild(hint);
    }

    form.appendChild(group);
  });

  box.appendChild(form);

  // ─── Actions ───
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.style.marginTop = "1rem";
  actions.style.paddingTop = "1rem";
  actions.style.borderTop = "1px solid var(--border-subtle)";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-ghost";
  cancelBtn.textContent = "ยกเลิก";
  cancelBtn.addEventListener("click", () => overlay.remove());

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-gold";
  saveBtn.textContent = "💾 บันทึกการแก้ไข";
  saveBtn.addEventListener("click", () => {
    // เก็บค่าทุกฟิลด์
    form.querySelectorAll("[data-key]").forEach((input) => {
      parsedRows[rowIdx][input.dataset.key] = input.value.trim();
    });

    overlay.remove();

    // re-validate + re-render
    validateAndGroup();
    renderPreview();

    // toast
    if (typeof showToast === "function") {
      showToast(`อัปเดตแถวที่ ${rowIdx + 2} เรียบร้อย`, "success");
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  box.appendChild(actions);

  // ─── Keyboard: ESC to close ───
  const onKeydown = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
    }
  };
  document.addEventListener("keydown", onKeydown);

  // ─── Click outside to close ───
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // ─── Mount ───
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Focus first input
  setTimeout(() => {
    form.querySelector("input, textarea, select")?.focus();
  }, 50);
}

// ═══════════════════════════════════════════
// Preview + Edit — เปิด modal แก้ไขแถว
// ═══════════════════════════════════════════
function openEditRowModal(rowIdx) {
  const row = parsedRows[rowIdx];
  if (!row) return;

  // สร้าง modal
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "import-edit-modal";
  overlay.style.zIndex = "1000";

  const box = document.createElement("div");
  box.className = "modal-box";
  box.style.maxWidth = "640px";
  box.style.maxHeight = "90vh";
  box.style.overflowY = "auto";

  const title = document.createElement("h3");
  title.className = "modal-title";
  title.textContent = `แก้ไขแถวที่ ${rowIdx + 2}`;
  box.appendChild(title);

  // ฟิลด์ที่แก้ได้
  const fields = [
    { key: "paper_code", label: "Paper Code", type: "text" },
    { key: "paper_label", label: "Paper Label", type: "text" },
    { key: "question_text", label: "คำถาม", type: "textarea" },
    { key: "options", label: "ตัวเลือก (JSON)", type: "textarea" },
    { key: "correct_answer_index", label: "ดัชนีข้อถูก (0-3)", type: "number" },
    { key: "explanation", label: "คำอธิบาย", type: "textarea" },
    { key: "difficulty", label: "ความยาก (easy/medium/hard)", type: "text" },
    { key: "cat", label: "Cat (math/reason/thai/eng/law)", type: "text" },
    { key: "sub", label: "Sub (SC_xx)", type: "text" },
    { key: "table_data", label: "Table Data (JSON)", type: "textarea" }
  ];

  const form = document.createElement("form");
  fields.forEach((f) => {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = f.label;

    let input;
    if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 2;
    } else {
      input = document.createElement("input");
      input.type = f.type;
    }
    input.className = "form-input";
    input.value = row[f.key] || "";
    input.dataset.key = f.key;

    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);
  });

  box.appendChild(form);

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.style.marginTop = "1rem";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-ghost";
  cancelBtn.textContent = "ยกเลิก";
  cancelBtn.addEventListener("click", () => overlay.remove());

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-gold";
  saveBtn.textContent = "บันทึกการแก้ไข";
  saveBtn.addEventListener("click", () => {
    // เก็บค่า
    form.querySelectorAll("[data-key]").forEach((input) => {
      parsedRows[rowIdx][input.dataset.key] = input.value.trim();
    });
    overlay.remove();
    validateAndGroup();
    renderPreview();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  box.appendChild(actions);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// ─── ปรับ renderPreview ให้ตารางเพิ่มปุ่ม "แก้ไข" ───
// หาใน renderPreview() → เพิ่มคอลัมน์ "actions