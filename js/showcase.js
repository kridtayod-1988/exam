// js/showcase.js
// ═══════════════════════════════════════════════════════════════
// Shared showcase component — ใช้ร่วมกันใน login.html + signup.html
// ═══════════════════════════════════════════════════════════════

/**
 * Render showcase sidebar ลงใน #showcase-root
 * @param {object} options
 *   @property {string} badge      - ข้อความบน badge (default: '✨ ระบบฝึกทำข้อสอบอัจฉริยะ')
 *   @property {string} title      - HTML ของ h2 (default มี <br>)
 *   @property {string} subtitle   - ข้อความ subtitle
 */
async function renderShowcase(options = {}) {
  const root = document.getElementById("showcase-root");
  if (!root) {
    console.warn("[showcase] ไม่พบ #showcase-root");
    return;
  }

  const {
    badge = "✨ ระบบฝึกทำข้อสอบอัจฉริยะ",
    title = "พร้อมพิชิตข้อสอบ<br>ก.พ. ไปกับเรา",
    subtitle = "รวมข้อสอบคุณภาพ เฉลยละเอียด พร้อมระบบติดตามความก้าวหน้า",
  } = options;

  // ─── Static HTML structure (single source of truth) ───
  root.innerHTML = `
    <div class="login-showcase-bg" aria-hidden="true"></div>

    <div class="login-showcase-content fade-up fade-up-2">
      <div class="login-showcase-header">
        <div class="login-showcase-badge">
          <span>✨</span> ${escapeHtml(badge.replace(/^[^ ]+ /, ""))}
        </div>
        <h2>${title}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>

      <!-- Categories -->
      <div class="login-showcase-section">
        <div class="login-showcase-section-title">
          <span class="login-showcase-icon">📚</span>
          <span>หมวดหมู่วิชา</span>
        </div>
        <div id="showcase-categories" class="login-chip-list">
          <span class="login-chip-skeleton"></span>
          <span class="login-chip-skeleton"></span>
          <span class="login-chip-skeleton"></span>
        </div>
      </div>

      <!-- Exam Years -->
      <div class="login-showcase-section">
        <div class="login-showcase-section-title">
          <span class="login-showcase-icon">📅</span>
          <span>ชุดข้อสอบรายปี</span>
        </div>
        <div id="showcase-years" class="login-chip-list">
          <span class="login-chip-skeleton"></span>
          <span class="login-chip-skeleton"></span>
        </div>
      </div>

      <!-- Stats -->
      <div class="login-showcase-stats">
        <div class="login-stat">
          <div class="login-stat-value" id="stat-questions-count">—</div>
          <div class="login-stat-label">ข้อสอบ</div>
        </div>
        <div class="login-stat-divider" aria-hidden="true"></div>
        <div class="login-stat">
          <div class="login-stat-value">3</div>
          <div class="login-stat-label">หมวดวิชา</div>
        </div>
        <div class="login-stat-divider" aria-hidden="true"></div>
        <div class="login-stat">
          <div class="login-stat-value">∞</div>
          <div class="login-stat-label">ทำได้ไม่จำกัด</div>
        </div>
      </div>
    </div>
  `;

  // ─── Load data ───
  await loadShowcaseData();
}

/**
 * โหลด categories + years + count มาแสดง
 */
async function loadShowcaseData() {
  if (typeof sb === "undefined") {
    console.warn("[showcase] sb ไม่ได้โหลด — ใช้ fallback");
    renderShowcaseFallback();
    return;
  }

  try {
    // ─── Categories + Years (parallel) ───
    const [catRes, yearRes] = await Promise.all([
      sb
        .from("categories")
        .select("id, name, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6),
      sb
        .from("exam_years")
        .select("id, label, year, code")
        .eq("is_active", true)
        .not("code", "is", null)
        .order("year", { ascending: false })
        .order("code", { ascending: true })
        .limit(6),
    ]);

    if (catRes.error) throw catRes.error;
    if (yearRes.error) throw yearRes.error;

    renderCategories(catRes.data || []);
    renderYears(yearRes.data || []);

    // ─── Question count (RPC — works for anon) ───
    let count = 0;
    try {
      const { data: cnt, error: cntErr } = await sb.rpc("get_public_question_count");
      if (!cntErr && typeof cnt === "number") {
        count = cnt;
      }
    } catch (rpcErr) {
      console.warn("[showcase] RPC ไม่พร้อม — ใช้ fallback count:", rpcErr);
    }
    renderQuestionCount(count);

  } catch (err) {
    console.warn("[showcase] โหลดข้อมูลไม่สำเร็จ:", err);
    renderShowcaseFallback();
  }
}

/**
 * Render categories (dedupe by name)
 */
function renderCategories(categories) {
  const container = document.getElementById("showcase-categories");
  if (!container) return;
  container.innerHTML = "";

  // Dedupe by name
  const seen = new Set();
  const unique = categories.filter((c) => {
    if (!c.name || seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  if (unique.length === 0) {
    const msg = document.createElement("span");
    msg.style.cssText = "font-size:0.85rem; color:#92400e; opacity:0.7;";
    msg.textContent = "ยังไม่มีหมวดหมู่";
    container.appendChild(msg);
    return;
  }

  unique.forEach((cat, idx) => {
    const chip = document.createElement("span");
    chip.className = "login-chip";
    chip.style.animationDelay = (idx * 60) + "ms";
    chip.textContent = cat.name;
    container.appendChild(chip);
  });
}

/**
 * Render exam years (dedupe by label)
 */
function renderYears(years) {
  const container = document.getElementById("showcase-years");
  if (!container) return;
  container.innerHTML = "";

  // Dedupe by label — แก้บั๊ก exam_years ซ้ำ
  const seen = new Set();
  const unique = years.filter((y) => {
    const key = y.label || y.code;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    const msg = document.createElement("span");
    msg.style.cssText = "font-size:0.85rem; color:#92400e; opacity:0.7;";
    msg.textContent = "ยังไม่มีชุดข้อสอบรายปี";
    container.appendChild(msg);
    return;
  }

  unique.forEach((yr, idx) => {
    const chip = document.createElement("span");
    chip.className = "login-chip login-chip-year";
    chip.style.animationDelay = (idx * 60) + "ms";
    chip.textContent = yr.label || yr.code;
    container.appendChild(chip);
  });
}

/**
 * Render question count
 */
function renderQuestionCount(count) {
  const el = document.getElementById("stat-questions-count");
  if (!el) return;
  el.textContent = count > 0 ? count + "+" : "100+";
}

/**
 * Fallback ถ้า DB ไม่ตอบ
 */
function renderShowcaseFallback() {
  const catContainer = document.getElementById("showcase-categories");
  if (catContainer) {
    catContainer.innerHTML = "";
    ["ความสามารถทั่วไป", "ภาษาอังกฤษ", "การเป็นข้าราชการที่ดี"].forEach((name, idx) => {
      const chip = document.createElement("span");
      chip.className = "login-chip";
      chip.style.animationDelay = (idx * 60) + "ms";
      chip.textContent = name;
      catContainer.appendChild(chip);
    });
  }

  const yearContainer = document.getElementById("showcase-years");
  if (yearContainer) {
    yearContainer.innerHTML = "";
    ["ทั่วไป (ไม่ระบุปี)"].forEach((label, idx) => {
      const chip = document.createElement("span");
      chip.className = "login-chip login-chip-year";
      chip.style.animationDelay = (idx * 60) + "ms";
      chip.textContent = label;
      yearContainer.appendChild(chip);
    });
  }

  renderQuestionCount(100);
}