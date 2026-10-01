// js/dashboard.js
// Dashboard — เลือกโหมดทำข้อสอบ + แสดง EXP/Level + ชุดข้อสอบย้อนหลัง

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════
const DEFAULT_CATEGORY_COUNT = 25;

// ═══════════════════════════════════════════
// Main init
// ═══════════════════════════════════════════
function initDashboard() {
  console.log("[dashboard] init start");

  if (typeof sb === "undefined") {
    console.error("[dashboard] ❌ sb ไม่ได้โหลด — ตรวจ supabase-config.js");
    showToast("ระบบยังโหลดไม่ครบ กรุณา refresh หน้า", "error");
    return;
  }
  if (typeof requireAuth !== "function") {
    console.error("[dashboard] ❌ requireAuth ไม่ได้โหลด — ตรวจ auth-guard.js");
    return;
  }

  // ─── Bind ปุ่ม logout ───
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", signOutUser);

  // ─── Bind ปุ่มเริ่มข้อสอบ ───
  bindExamButtons();

  // ─── โหลดข้อมูล ───
  loadDashboardData();
}

// ═══════════════════════════════════════════
// Bind buttons
// ═══════════════════════════════════════════
function bindExamButtons() {
  const startFullBtn = document.getElementById("start-full-exam-btn");
  const startCategoryBtn = document.getElementById("start-category-exam-btn");

  console.log("[dashboard] ปุ่มที่พบ:", {
    full: !!startFullBtn,
    category: !!startCategoryBtn
  });

  if (startFullBtn) {
    startFullBtn.addEventListener("click", () => {
      console.log("[dashboard] เริ่มข้อสอบ 100 ข้อ");
      sessionStorage.setItem("examConfig", JSON.stringify({ mode: "full100" }));
      window.location.href = "exam.html";
    });
  } else {
    console.error("[dashboard] ❌ ไม่พบ #start-full-exam-btn");
  }

  if (startCategoryBtn) {
    startCategoryBtn.addEventListener("click", () => {
      const categoryId = document.getElementById("category-select")?.value;
      if (!categoryId) {
        showToast("กรุณาเลือกหมวดหมู่ก่อน", "warning");
        return;
      }
      sessionStorage.setItem(
        "examConfig",
        JSON.stringify({
          mode: "category",
          categoryId,
          count: DEFAULT_CATEGORY_COUNT
        })
      );
      window.location.href = "exam.html";
    });
  }
}

// ═══════════════════════════════════════════
// Load dashboard data
// ═══════════════════════════════════════════
async function loadDashboardData() {
  try {
    const { user, userData } = await requireAuth();
    console.log("[dashboard] user:", user.email, "role:", userData.role);

    setTextSafe("user-greeting", `สวัสดี, ${userData?.displayName || user.email}`);
    setTextSafe("stat-total-attempts", String(userData?.stats?.totalAttempts ?? 0));
    setTextSafe("stat-best-score", String(userData?.stats?.bestScore ?? 0));

    renderLevelWidget(userData?.stats?.totalExp ?? 0, {
      levelNum: "level-num",
      expFill: "exp-fill",
      expLabel: "exp-label"
    });

    await Promise.all([
      loadSystemConfig(),
      loadCategories(),
      loadPapersAsCards()
    ]);
  } catch (err) {
    console.error("[dashboard] โหลดข้อมูลไม่สำเร็จ:", err);
  }
}

// ═══════════════════════════════════════════
// System config
// ═══════════════════════════════════════════
async function loadSystemConfig() {
  try {
    const { data, error } = await withRetry(
      () => sb
        .from("system_config")
        .select("full_exam_question_count")
        .eq("key", "public")
        .single(),
      { operationName: "loadSystemConfig" }
    );
    if (error) throw error;
    const fullCount = data?.full_exam_question_count || 100;
    setTextSafe(
      "full-exam-description",
      `สุ่มข้อสอบ ${fullCount} ข้อจากคลังทั้งหมด พยายามเลี่ยงข้อที่คุณเคยทำไปแล้ว`
    );
  } catch (err) {
    console.error("[dashboard] loadSystemConfig error:", err);
  }
}

// ═══════════════════════════════════════════
// Categories
// ═══════════════════════════════════════════
async function loadCategories() {
  const select = document.getElementById("category-select");
  if (!select) return;

  try {
    const { data, error } = await withRetry(
      () => sb
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      { operationName: "loadCategories" }
    );
    if (error) throw error;

    select.innerHTML = "";
    if (!data || data.length === 0) {
      select.innerHTML = `<option value="">ยังไม่มีหมวดหมู่</option>`;
      return;
    }
    data.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.name;
      select.appendChild(option);
    });
    console.log("[dashboard] โหลดหมวดหมู่:", data.length, "รายการ");
  } catch (err) {
    console.error("[dashboard] loadCategories error:", err);
    select.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
  }
}

// ═══════════════════════════════════════════
// Papers as Cards (ชุดข้อสอบย้อนหลัง)
// ═══════════════════════════════════════════
async function loadPapersAsCards() {
  const grid = document.getElementById("papers-grid");
  const empty = document.getElementById("papers-empty");
  if (!grid) return;

  try {
    const { data, error } = await sb
      .from("v_papers_summary")
      .select("id, code, label, year, description, active_question_count, is_active")
      .eq("is_active", true)
      .gt("active_question_count", 0)
      .order("year", { ascending: false })
      .order("code", { ascending: true })
      .limit(12);

    if (error) throw error;

    grid.innerHTML = "";

    if (!data || data.length === 0) {
      grid.classList.add("hidden");
      empty?.classList.remove("hidden");
      console.log("[dashboard] ไม่มี papers");
      return;
    }

    data.forEach((paper) => {
      grid.appendChild(buildPaperCard(paper));
    });

    console.log("[dashboard] โหลด papers:", data.length, "ชุด");
  } catch (err) {
    console.error("[dashboard] loadPapers error:", err);
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  }
}

// ═══════════════════════════════════════════
// Build paper card
// ═══════════════════════════════════════════
function buildPaperCard(paper) {
  const card = document.createElement("div");
  card.className = "paper-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `เริ่มทำชุด ${paper.label || paper.code}`);

  // ─── Top row (icon + year) ───
  const top = document.createElement("div");
  top.className = "paper-card-top";

  const icon = document.createElement("div");
  icon.className = "paper-card-icon";
  icon.textContent = "📝";

  const year = document.createElement("span");
  year.className = "paper-card-year";
  year.textContent = paper.year;

  top.appendChild(icon);
  top.appendChild(year);
  card.appendChild(top);

  // ─── Label ───
  const label = document.createElement("p");
  label.className = "paper-card-label";
  label.textContent = paper.label || paper.code;
  card.appendChild(label);

  // ─── Description ───
  if (paper.description) {
    const desc = document.createElement("p");
    desc.className = "paper-card-desc";
    desc.textContent = paper.description;
    card.appendChild(desc);
  }

  // ─── Meta (count + arrow) ───
  const meta = document.createElement("div");
  meta.className = "paper-card-meta";

  const count = document.createElement("span");
  count.className = "paper-card-count";

  const countBold = document.createElement("b");
  countBold.textContent = String(paper.active_question_count);

  count.appendChild(countBold);
  count.appendChild(document.createTextNode(" ข้อ"));

  const arrow = document.createElement("span");
  arrow.className = "paper-card-arrow";
  arrow.textContent = "→";

  meta.appendChild(count);
  meta.appendChild(arrow);
  card.appendChild(meta);

  // ─── Click handler ───
  const startExam = () => {
    sessionStorage.setItem(
      "examConfig",
      JSON.stringify({
        mode: "year",
        examYearId: paper.id,
        count: paper.active_question_count
      })
    );
    window.location.href = "exam.html";
  };

  card.addEventListener("click", startExam);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startExam();
    }
  });

  return card;
}

// ═══════════════════════════════════════════
// Auto-init
// ═══════════════════════════════════════════
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}