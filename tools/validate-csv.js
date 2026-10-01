#!/usr/bin/env node
// tools/validate-csv.js
// ═══════════════════════════════════════════════════════════════
// ตรวจสอบ CSV ก่อน upload — detect escape ผิด, format เพี้ยน
// วิธีใช้: node tools/validate-csv.js file1.csv file2.csv ...
//         node tools/validate-csv.js *.csv
// ═══════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

// ─── Constants ───
const VALID_CATS = ["math", "reason", "thai", "eng", "law"];
const VALID_SUBS = [
  "SC_M1", "SC_M2", "SC_M3", "SC_M4", "SC_M5",
  "SC_R1", "SC_R2", "SC_R3",
  "SC_T1", "SC_T2", "SC_T3", "SC_T4",
  "SC_E1", "SC_E2", "SC_E3", "SC_E4",
  "SC_L1", "SC_L2", "SC_L3", "SC_L4", "SC_L5", "SC_L6", "SC_L7", "SC_L8"
];
const VALID_DIFFS = ["easy", "medium", "hard"];
const REQUIRED_FIELDS = [
  "paper_code", "paper_label", "year", "question_text",
  "options", "correct_answer_index", "difficulty", "cat", "sub"
];

// ─── Colors ───
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const NC = "\x1b[0m";

// ─── Stats ───
let totalErrors = 0;
let totalWarnings = 0;

/**
 * CSV Parser แบบ streaming-safe (รองรับ quote + comma + newline ในเซลล์)
 */
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");  // ตัด BOM

  const rows = [];
  let currentRow = [];
  let buffer = "";
  let inQuotes = false;
  let lineNum = 1;
  let rowStartLine = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        buffer += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      currentRow.push(buffer);
      buffer = "";
    } else if (ch === "\n" && !inQuotes) {
      currentRow.push(buffer);
      rows.push({ row: currentRow, line: rowStartLine });
      currentRow = [];
      buffer = "";
      lineNum++;
      rowStartLine = lineNum;
    } else if (ch === "\r" && !inQuotes) {
      // skip CR (จะถูกจับที่ \n)
    } else if (ch === "\r" && next === "\n" && !inQuotes) {
      // skip
    } else {
      buffer += ch;
      if (ch === "\n") lineNum++;
    }
  }

  // บรรทัดสุดท้าย
  if (buffer.length > 0 || currentRow.length > 0) {
    currentRow.push(buffer);
    rows.push({ row: currentRow, line: rowStartLine });
  }

  // ถ้า inQuotes ค้าง → quote ไม่ปิด
  if (inQuotes) {
    console.error(`${RED}❌ ตรวจพบ quote ที่ไม่ปิด (unclosed quote) ในไฟล์${NC}`);
    process.exit(1);
  }

  return rows;
}

/**
 * ตรวจไฟล์ CSV
 */
function validateFile(filePath) {
  console.log(`\n${CYAN}══════════════════════════════════════════${NC}`);
  console.log(`${CYAN}ตรวจสอบ: ${path.basename(filePath)}${NC}`);
  console.log(`${CYAN}══════════════════════════════════════════${NC}`);

  if (!fs.existsSync(filePath)) {
    console.log(`${RED}❌ ไม่พบไฟล์${NC}`);
    totalErrors++;
    return;
  }

  const text = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(text);

  if (rows.length < 2) {
    console.log(`${RED}❌ ไฟล์ว่างเปล่า (ไม่มี data row)${NC}`);
    totalErrors++;
    return;
  }

  // ─── Header ───
  const headers = rows[0].row.map((h) => h.trim());
  console.log(`  Header: ${headers.join(", ")}`);
  console.log(`  Data rows: ${rows.length - 1}`);

  // ─── ตรวจ header ครบ ───
  const missingHeaders = REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  if (missingHeaders.length > 0) {
    console.log(`${RED}❌ ขาดคอลัมน์: ${missingHeaders.join(", ")}${NC}`);
    totalErrors += missingHeaders.length;
  }

  // ─── ตรวจแต่ละแถว ───
  let fileErrors = 0;
  let fileWarnings = 0;

  for (let i = 1; i < rows.length; i++) {
    const { row, line } = rows[i];
    const rowNum = i + 1;

    // ─── จำนวนคอลัมน์ ───
    if (row.length !== headers.length) {
      console.log(
        `${RED}  แถว ${rowNum} (line ${line}): จำนวนคอลัมน์ไม่ตรง — ` +
        `คาดหวัง ${headers.length}, ได้ ${row.length}${NC}`
      );
      fileErrors++;
      continue;
    }

    // ─── Map row → object ───
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] || "").trim();
    });

    // ─── ตรวจ required ───
    for (const field of REQUIRED_FIELDS) {
      if (!obj[field]) {
        console.log(`${RED}  แถว ${rowNum}: ขาด "${field}"${NC}`);
        fileErrors++;
      }
    }

    // ─── cat ───
    if (obj.cat && !VALID_CATS.includes(obj.cat)) {
      console.log(`${RED}  แถว ${rowNum}: cat "${obj.cat}" ไม่ถูกต้อง${NC}`);
      fileErrors++;
    }

    // ─── sub ───
    if (obj.sub && !VALID_SUBS.includes(obj.sub)) {
      console.log(`${RED}  แถว ${rowNum}: sub "${obj.sub}" ไม่ถูกต้อง${NC}`);
      fileErrors++;
    }

    // ─── year ───
    const year = parseInt(obj.year, 10);
    if (isNaN(year) || year < 2500 || year > 2650) {
      console.log(`${RED}  แถว ${rowNum}: year "${obj.year}" ต้องอยู่ระหว่าง 2500-2650${NC}`);
      fileErrors++;
    }

    // ─── options (JSON array 4 ตัว) ───
    try {
      const options = JSON.parse(obj.options);
      if (!Array.isArray(options)) {
        console.log(`${RED}  แถว ${rowNum}: options ต้องเป็น JSON array${NC}`);
        fileErrors++;
      } else if (options.length !== 4) {
        console.log(`${RED}  แถว ${rowNum}: options ต้องมี 4 ตัว (พบ ${options.length})${NC}`);
        fileErrors++;
      }
    } catch (e) {
      console.log(`${RED}  แถว ${rowNum}: options JSON ไม่ถูกต้อง — ${e.message}${NC}`);
      console.log(`${YELLOW}       ค่าที่ได้: ${obj.options.slice(0, 80)}${NC}`);
      fileErrors++;
    }

    // ─── correct_answer_index ───
    const cai = parseInt(obj.correct_answer_index, 10);
    if (isNaN(cai) || cai < 0 || cai > 3) {
      console.log(`${RED}  แถว ${rowNum}: correct_answer_index ต้องเป็น 0-3 (ได้ ${obj.correct_answer_index})${NC}`);
      fileErrors++;
    }

    // ─── difficulty ───
    if (obj.difficulty && !VALID_DIFFS.includes(obj.difficulty)) {
      console.log(`${RED}  แถว ${rowNum}: difficulty "${obj.difficulty}" ไม่ถูกต้อง${NC}`);
      fileErrors++;
    }

    // ─── table_data (ถ้ามี) ───
    if (obj.table_data && obj.table_data.trim()) {
      try {
        const td = JSON.parse(obj.table_data);

        // ตรวจ known fields
        const hasAny = td.condition || td.passage || td.table ||
                       td.headers || td.rows;
        if (!hasAny) {
          console.log(`${YELLOW}  แถว ${rowNum}: table_data ไม่มี field ที่รู้จัก (condition/passage/table)${NC}`);
          fileWarnings++;
        }

        // ถ้ามี table → ตรวจ headers + rows
        if (td.table) {
          if (!Array.isArray(td.table.headers) || td.table.headers.length === 0) {
            console.log(`${RED}  แถว ${rowNum}: table.headers ต้องเป็น array${NC}`);
            fileErrors++;
          }
          if (!Array.isArray(td.table.rows)) {
            console.log(`${RED}  แถว ${rowNum}: table.rows ต้องเป็น array${NC}`);
            fileErrors++;
          }
        }
      } catch (e) {
        console.log(`${RED}  แถว ${rowNum}: table_data JSON ไม่ถูกต้อง — ${e.message}${NC}`);
        console.log(`${YELLOW}       ค่าที่ได้: ${obj.table_data.slice(0, 80)}...${NC}`);
        fileErrors++;
      }
    }

    // ─── question_text ยาวเกิน 2000 ───
    if (obj.question_text && obj.question_text.length > 2000) {
      console.log(`${YELLOW}  แถว ${rowNum}: question_text ยาว ${obj.question_text.length} chars (เกิน 2000)${NC}`);
      fileWarnings++;
    }

    // ─── explanation ยาวเกิน 2000 ───
    if (obj.explanation && obj.explanation.length > 2000) {
      console.log(`${YELLOW}  แถว ${rowNum}: explanation ยาว ${obj.explanation.length} chars${NC}`);
      fileWarnings++;
    }
  }

  // ─── Summary ───
  console.log(`\n  ${fileErrors > 0 ? RED : GREEN}Errors: ${fileErrors}${NC}`);
  console.log(`  ${fileWarnings > 0 ? YELLOW : GREEN}Warnings: ${fileWarnings}${NC}`);

  totalErrors += fileErrors;
  totalWarnings += fileWarnings;

  if (fileErrors === 0 && fileWarnings === 0) {
    console.log(`${GREEN}  ✅ ไฟล์นี้พร้อมใช้งาน${NC}`);
  }
}

// ─── Main ───
function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log(`${YELLOW}วิธีใช้: node tools/validate-csv.js <file1.csv> [file2.csv] ...${NC}`);
    console.log(`${YELLOW}      node tools/validate-csv.js *.csv${NC}`);
    process.exit(1);
  }

  for (const file of files) {
    validateFile(file);
  }

  // ─── Final summary ───
  console.log(`\n${CYAN}══════════════════════════════════════════${NC}`);
  console.log(`${CYAN}สรุปทั้งหมด${NC}`);
  console.log(`${CYAN}══════════════════════════════════════════${NC}`);
  console.log(`  ไฟล์ที่ตรวจ: ${files.length}`);
  console.log(`  ${totalErrors > 0 ? RED : GREEN}Errors: ${totalErrors}${NC}`);
  console.log(`  ${totalWarnings > 0 ? YELLOW : GREEN}Warnings: ${totalWarnings}${NC}`);
  console.log("");

  if (totalErrors > 0) {
    console.log(`${RED}❌ พบข้อผิดพลาด — กรุณาแก้ไขก่อน upload${NC}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}✅ CSV ทั้งหมดพร้อมใช้งาน${NC}`);
    process.exit(0);
  }
}

main();