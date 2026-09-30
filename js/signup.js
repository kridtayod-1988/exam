// js/signup.js
// Signup 2 steps + password toggle + strength meter + init guards

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════
let pendingSignupData = null;

// ═══════════════════════════════════════════
// Bootstrap — รอเช็ค auth ก่อน แล้วค่อยโชว์หน้า
// ═══════════════════════════════════════════
(async function bootstrap() {
  if (typeof sb === "undefined") {
    console.error("[signup] ❌ sb ไม่ได้โหลด");
    document.getElementById("signup-wrap").style.visibility = "visible";
    return;
  }

  try {
    await redirectIfAuthenticated("dashboard.html");
  } catch (err) {
    console.warn("[signup] redirect check failed:", err);
  }

  // โชว์หน้า
  document.getElementById("signup-wrap").style.visibility = "visible";

  // Bind ทุกอย่าง
  setupPasswordToggles();
  setupPasswordStrength();
  setupPasswordMatch();
  setupCheckbox();
  setupStep1Form();
  setupStep2Buttons();

  // โหลด showcase
  loadShowcase();
})();

// ═══════════════════════════════════════════
// 1) Show/Hide Password Toggles (ทั้ง 2 ช่อง)
// ═══════════════════════════════════════════
function setupPasswordToggles() {
  document.querySelectorAll(".toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.textContent = isPassword ? "🙈" : "👁️";
      input.focus();
    });
  });
}

// ═══════════════════════════════════════════
// 2) Password Strength Meter
// ═══════════════════════════════════════════
function setupPasswordStrength() {
  const pwInput = document.getElementById("signup-password");
  const container = document.getElementById("pw-strength");
  const textEl = document.getElementById("pw-strength-text");
  const bars = document.querySelectorAll(".pw-strength-bar");
  if (!pwInput || !container) return;

  pwInput.addEventListener("input", () => {
    const val = pwInput.value;

    if (!val) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");

    const score = calculatePasswordScore(val);

    // เปิด/ปิด bar ตาม score
    bars.forEach((bar, idx) => {
      bar.classList.toggle("active", idx < score);
    });

    // ข้อความ
    const labels = ["", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแรง"];
    const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
    textEl.textContent = labels[score] || "";
    textEl.style.color = colors[score] || "#64748b";
  });
}

/**
 * คำนวณ password score 0-4
 *  1 = มี ≥6 chars (min)
 *  2 = มี ≥10 chars
 *  3 = มีทั้งตัวพิมพ์ใหญ่+เล็ก
 *  4 = มีตัวเลข + อักขระพิเศษ
 */
function calculatePasswordScore(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

// ═══════════════════════════════════════════
// 3) Password Match Hint
// ═══════════════════════════════════════════
function setupPasswordMatch() {
  const pwInput = document.getElementById("signup-password");
  const confirmInput = document.getElementById("signup-password-confirm");
  const hint = document.getElementById("pw-match-hint");
  if (!pwInput || !confirmInput || !hint) return;

  function updateHint() {
    const pw = pwInput.value;
    const cf = confirmInput.value;

    if (!cf) {
      hint.classList.add("hidden");
      hint.classList.remove("match", "mismatch");
      return;
    }

    hint.classList.remove("hidden");
    if (pw === cf) {
      hint.textContent = "✓ รหัสผ่านตรงกัน";
      hint.classList.add("match");
      hint.classList.remove("mismatch");
    } else {
      hint.textContent = "✕ รหัสผ่านยังไม่ตรงกัน";
      hint.classList.add("mismatch");
      hint.classList.remove("match");
    }
  }

  pwInput.addEventListener("input", updateHint);
  confirmInput.addEventListener("input", updateHint);
}

// ═══════════════════════════════════════════
// 4) Checkbox → enable/disable ปุ่มถัดไป
// ═══════════════════════════════════════════
function setupCheckbox() {
  const checkbox = document.getElementById("signup-agree-checkbox");
  const btn = document.getElementById("signup-step1-btn");
  if (!checkbox || !btn) return;

  // ตั้งค่าเริ่มต้น
  btn.disabled = true;

  checkbox.addEventListener("change", () => {
    btn.disabled = !checkbox.checked;
  });
}

// ═══════════════════════════════════════════
// 5) Step 1 Form → Step 2
// ═══════════════════════════════════════════
function setupStep1Form() {
  const form = document.getElementById("signup-form-step1");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError("error-banner-1");

    const displayName = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const passwordConfirm = document.getElementById("signup-password-confirm").value;
    const checkbox = document.getElementById("signup-agree-checkbox");

    // ─── Validation ───
    if (!isValidLength(displayName, 100)) {
      return showError("error-banner-1", "กรุณากรอกชื่อที่แสดง (ไม่เกิน 100 ตัวอักษร)");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError("error-banner-1", "กรุณากรอกอีเมลให้ถูกต้อง");
    }
    if (password.length < 6) {
      return showError("error-banner-1", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    }
    if (password !== passwordConfirm) {
      return showError("error-banner-1", "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    }
    if (!checkbox.checked) {
      return showError("error-banner-1", "กรุณายอมรับคำชี้แจงการใช้งานระบบก่อนดำเนินการต่อ");
    }

    // ─── เก็บข้อมูลไว้รอยืนยันใน step 2 ───
    pendingSignupData = { displayName, email, password };

    // ─── อัปเดต preview (textContent ป้องกัน XSS) ───
    document.getElementById("confirm-name").textContent = displayName;
    document.getElementById("confirm-email").textContent = email;

    // ─── สลับหน้า ───
    document.getElementById("signup-step-1").classList.add("hidden");
    document.getElementById("signup-step-2").classList.remove("hidden");
  });
}

// ═══════════════════════════════════════════
// 6) Step 2 Buttons — Back + Confirm
// ═══════════════════════════════════════════
function setupStep2Buttons() {
  const backBtn = document.getElementById("signup-back-btn");
  const confirmBtn = document.getElementById("signup-confirm-btn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      hideError("error-banner-2");
      document.getElementById("signup-step-2").classList.add("hidden");
      document.getElementById("signup-step-1").classList.remove("hidden");
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleConfirmSignup);
  }
}

async function handleConfirmSignup() {
  if (!pendingSignupData) {
    showError("error-banner-2", "ไม่พบข้อมูลการสมัคร กรุณากลับไปขั้นตอนที่ 1");
    return;
  }
  hideError("error-banner-2");

  const btn = document.getElementById("signup-confirm-btn");
  const textEl = btn.querySelector(".login-submit-text");
  const spinner = btn.querySelector(".login-submit-spinner");

  // Loading state
  btn.disabled = true;
  textEl.textContent = "กำลังสมัครสมาชิก...";
  spinner.classList.remove("hidden");

  try {
    // เก็บ local copy ก่อนเผื่อ pendingSignupData ถูกเคลียร์กลางทาง
    const email = pendingSignupData.email;
    const password = pendingSignupData.password;
    const displayName = pendingSignupData.displayName;

    // ─── เรียก Supabase Auth signUp ───
    // ส่ง display_name ผ่าน metadata → trigger handle_new_user จะอ่านไปสร้าง profile
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    if (error) throw error;

    // ✅ เคลียร์ state ทันที (ข้อ 4 ในรีวิว)
    pendingSignupData = null;

    if (data.session) {
      // Confirm email = OFF → ล็อกอินอัตโนมัติ
      btn.textContent = "✓ สำเร็จ! กำลังเข้าสู่ระบบ...";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } else {
      // Confirm email = ON → แสดงหน้า "ตรวจสอบอีเมล"
      showCheckEmailScreen(email);
    }

  } catch (err) {
    console.error("[signup] signup error:", err);

    // ใส่ข้อมูลกลับเพื่อให้ user แก้ได้
    // (แต่ pendingSignupData ถูกเคลียร์แล้ว → ต้องเซ็ตใหม่จาก form ที่แสดง)
    showError("error-banner-2", getSupabaseAuthErrorMessage(err));

    btn.disabled = false;
    textEl.textContent = "✅ ยืนยันสมัครสมาชิก";
    spinner.classList.add("hidden");
  }
}

// ═══════════════════════════════════════════
// หน้าจอ "ตรวจสอบอีเมล"
// ═══════════════════════════════════════════
function showCheckEmailScreen(email) {
  const step2 = document.getElementById("signup-step-2");
  if (!step2) return;

  step2.innerHTML = `
    <div style="text-align:center; padding: 1rem 0;">
      <div style="font-size:3rem; margin-bottom:0.75rem;">📧</div>
      <h1 style="font-family:var(--font-display); font-size:1.4rem; font-weight:800; color:#0f172a; margin-bottom:0.5rem;">
        ตรวจสอบอีเมลของคุณ
      </h1>
      <p style="color:#64748b; font-size:0.9rem; line-height:1.6; margin-bottom:1.25rem;">
        เราส่งลิงก์ยืนยันไปที่<br>
        <strong style="color:#b45309; word-break:break-all;">${escapeHtml(email)}</strong><br>
        กรุณากดลิงก์ในอีเมลเพื่อยืนยันตัวตน
      </p>
      <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:12px; padding:0.85rem 1rem; font-size:0.82rem; color:#92400e; text-align:left; margin-bottom:1.25rem; line-height:1.55;">
        💡 <b>ไม่พบอีเมล?</b> ตรวจสอบโฟลเดอร์ Spam / Junk หรือรออีก 1-2 นาที
      </div>
      <a href="login.html" class="login-submit-btn" style="display:inline-flex; text-decoration:none; width:100%;">
        <span class="login-submit-text">ไปหน้าเข้าสู่ระบบ</span>
      </a>
    </div>
  `;
}

// ═══════════════════════════════════════════
// Error banner helpers
// ═══════════════════════════════════════════
function showError(bannerId, message) {
  const banner = document.getElementById(bannerId);
  if (!banner) return;
  banner.textContent = message;
  banner.classList.remove("hidden");
  banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideError(bannerId) {
  document.getElementById(bannerId)?.classList.add("hidden");
}

// ═══════════════════════════════════════════
// Showcase — categories + years + count
// ═══════════════════════════════════════════
async function loadShowcase() {
  if (typeof sb === "undefined") {
    renderShowcaseFallback();
    return;
  }

  try {
    const [catRes, yearRes, countRes] = await Promise.all([
      sb.from("categories")
        .select("id, name, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6),
      sb.from("exam_years")
        .select("id, label, year")
        .eq("is_active", true)
        .order("year", { ascending: false })
        .limit(5),
      sb.from("questions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
    ]);

    if (catRes.error) throw catRes.error;
    if (yearRes.error) throw yearRes.error;

    renderCategories(catRes.data || []);
    renderYears(yearRes.data || []);
    renderQuestionCount(countRes.count || 0);

  } catch (err) {
    console.warn("[signup] โหลด showcase ไม่สำเร็จ:", err);
    renderShowcaseFallback();
  }
}

function renderCategories(categories) {
  const container = document.getElementById("showcase-categories");
  if (!container) return;
  container.innerHTML = "";

  if (categories.length === 0) {
    container.innerHTML = `<span style="font-size:0.85rem;color:#92400e;opacity:0.7;">ยังไม่มีหมวดหมู่</span>`;
    return;
  }

  categories.forEach((cat, idx) => {
    const chip = document.createElement("span");
    chip.className = "login-chip";
    chip.style.animationDelay = (idx * 60) + "ms";
    chip.textContent = cat.name;
    container.appendChild(chip);
  });
}

function renderYears(years) {
  const container = document.getElementById("showcase-years");
  if (!container) return;
  container.innerHTML = "";

  if (years.length === 0) {
    container.innerHTML = `<span style="font-size:0.85rem;color:#92400e;opacity:0.7;">ยังไม่มีชุดข้อสอบรายปี</span>`;
    return;
  }

  years.forEach((yr, idx) => {
    const chip = document.createElement("span");
    chip.className = "login-chip login-chip-year";
    chip.style.animationDelay = (idx * 60) + "ms";
    chip.textContent = yr.label;
    container.appendChild(chip);
  });
}

function renderQuestionCount(count) {
  const el = document.getElementById("stat-questions-count");
  if (!el) return;
  el.textContent = count > 0 ? count + "+" : "100+";
}

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
    ["ก.พ. 2568", "ทั่วไป (ไม่ระบุปี)"].forEach((label, idx) => {
      const chip = document.createElement("span");
      chip.className = "login-chip login-chip-year";
      chip.style.animationDelay = (idx * 60) + "ms";
      chip.textContent = label;
      yearContainer.appendChild(chip);
    });
  }

  renderQuestionCount(100);
}