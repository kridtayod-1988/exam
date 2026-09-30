// js/dashboard.js
// Dashboard — เลือกโหมดทำข้อสอบ + แสดง EXP/Level

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════
const DEFAULT_CATEGORY_COUNT = 25;
const DEFAULT_YEAR_COUNT = 25;

// ═══════════════════════════════════════════
// Main init — รอ DOM พร้อมก่อน แล้วค่อยทำงาน
// ═══════════════════════════════════════════
function initDashboard() {
  console.log("[dashboard] init start");

  // ─── ตรวจ dependencies ───
  if (typeof sb === "undefined") {
    console.error("[dashboard] ❌ sb (Supabase client) ไม่ได้โหลด — ตรวจ supabase-config.js");
    showToast("ระบบยังโหลดไม่ครบ กรุณา refresh หน้า", "error");
    return;
  }
  if (typeof requireAuth !== "function") {
    console.error("[dashboard] ❌ requireAuth ไม่ได้โหลด — ตรวจ auth-guard.js");
    return;
  }

  // ─── Bind ปุ่ม logout ───
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", signOutUser);
  } else {
    console.warn("[dashboard] #logout-btn not found");
  }

  // ─── Bind ปุ่มเริ่มข้อสอบทั้ง 3 ───
  bindExamButtons();

  // ─── โหลดข้อมูลผู้ใช้ + ข้อมูลประกอบ ───
  loadDashboardData();
}

function bindExamButtons() {
  const startFullBtn = document.getElementById("start-full-exam-btn");
  const startCategoryBtn = document.getElementById("start-category-exam-btn");
  const startYearBtn = document.getElementById("start-year-exam-btn");

  console.log("[dashboard] ปุ่มที่พบ:", {
    full: !!startFullBtn,
    category: !!startCategoryBtn,
    year: !!startYearBtn
  });

  if (startFullBtn) {
    startFullBtn.addEventListener("click", () => {
      console.log("[dashboard] เริ่มข้อสอบ 100 ข้อ");
      sessionStorage.setItem("examConfig", JSON.stringify({ mode: "full100" }));
      window.location.href = "exam.html";
    });
  } else {
    console.error("[dashboard] ❌ ไม่พบ #start-full-exam-btn — ตรวจ dashboard.html");
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
        JSON.stringify({ mode: "category", categoryId, count: DEFAULT_CATEGORY_COUNT })
      );
      window.location.href = "exam.html";
    });
  }

  if (startYearBtn) {
    startYearBtn.addEventListener("click", () => {
      const examYearId = document.getElementById("year-select")?.value;
      if (!examYearId) {
        showToast("กรุณาเลือกปีข้อสอบก่อน", "warning");
        return;
      }
      sessionStorage.setItem(
        "examConfig",
        JSON.stringify({ mode: "year", examYearId, count: DEFAULT_YEAR_COUNT })
      );
      window.location.href = "exam.html";
    });
  }
}

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
      loadExamYears()
    ]);
  } catch (err) {
    console.error("[dashboard] โหลดข้อมูลไม่สำเร็จ:", err);
  }
}

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
    console.log("[dashboard] โหลดหมวดหมู่แล้ว:", data.length, "รายการ");
  } catch (err) {
    console.error("[dashboard] loadCategories error:", err);
    select.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
  }
}

async function loadExamYears() {
  const select = document.getElementById("year-select");
  if (!select) return;
  try {
    const { data, error } = await withRetry(
      () => sb
        .from("exam_years")
        .select("id, label")
        .eq("is_active", true)
        .order("year", { ascending: false }),
      { operationName: "loadExamYears" }
    );
    if (error) throw error;

    select.innerHTML = "";
    if (!data || data.length === 0) {
      select.innerHTML = `<option value="">ยังไม่มีข้อมูลปี</option>`;
      return;
    }
    data.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.label;
      select.appendChild(option);
    });
    console.log("[dashboard] โหลดปีแล้ว:", data.length, "รายการ");
  } catch (err) {
    console.error("[dashboard] loadExamYears error:", err);
    select.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`;
  }
}

// ═══════════════════════════════════════════
// Auto-init — รอ DOM พร้อมก่อน
// ═══════════════════════════════════════════
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}