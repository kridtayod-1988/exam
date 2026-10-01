// js/signup.js
// Signup 2 steps + password toggle + strength meter + showcase

let pendingSignupData = null;

// ═══════════════════════════════════════════
// Bootstrap — รอเช็ค auth + แสดง error ถ้า dependencies หาย
// (แกบั๊ก: bootstrap เงียบ ไม่แจ้ง error)
// ═══════════════════════════════════════════
(async function bootstrap() {
  const wrap = document.getElementById("signup-wrap");
  if (!wrap) return;

  // ─── ตรวจ dependencies ───
  if (typeof sb === "undefined") {
    console.error("[signup] sb ไม่ได้โหลด");
    wrap.style.visibility = "visible";
    showError("error-banner-1", "ระบบยังโหลดไม่ครบ กรุณา refresh หน้าอีกครั้ง");
    const btn = document.getElementById("signup-step1-btn");
    if (btn) btn.disabled = true;
    return;
  }

  // ─── Check auth (redirect ถ้าล็อกอินแล้ว) ───
  try {
    await redirectIfAuthenticated("dashboard.html");
  } catch (err) {
    console.warn("[signup] redirect check failed:", err);
  }

  // ─── แสดงหน้า ───
  wrap.style.visibility = "visible";

  // ─── Bind ทุกอย่าง ───
  setupPasswordToggles();
  setupPasswordStrength();
  setupPasswordMatch();
  setupCheckbox();
  setupStep1Form();
  setupStep2Buttons();

  // ─── Showcase ───
  if (typeof renderShowcase === "function") {
    await renderShowcase({
      badge: "🎯 เริ่มต้นฟรี ไม่มีค่าใช้จ่าย",
      title: "สร้างบัญชีวันนี้<br>เริ่มฝึกได้ทันที",
      subtitle: "ฝึกข้อสอบคุณภาพ เฉลยละเอียด พร้อมระบบติดตามความก้าวหน้า",
    });
  }
})();

// ═══════════════════════════════════════════
// Password toggles (ทั้ง 2 ช่อง)
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
// Password strength meter
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

    bars.forEach((bar, idx) => {
      bar.classList.toggle("active", idx < score);
    });

    const labels = ["", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแรง"];
    const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
    textEl.textContent = labels[score] || "";
    textEl.style.color = colors[score] || "#64748b";
  });
}

function calculatePasswordScore(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

// ═══════════════════════════════════════════
// Password match hint
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
// Checkbox → enable/disable ปุ่ม
// ═══════════════════════════════════════════
function setupCheckbox() {
  const checkbox = document.getElementById("signup-agree-checkbox");
  const btn = document.getElementById("signup-step1-btn");
  if (!checkbox || !btn) return;

  btn.disabled = true;

  checkbox.addEventListener("change", () => {
    btn.disabled = !checkbox.checked;
  });
}

// ═══════════════════════════════════════════
// Step 1 → Step 2
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

    // Validation
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

    pendingSignupData = { displayName, email, password };

    document.getElementById("confirm-name").textContent = displayName;
    document.getElementById("confirm-email").textContent = email;

    document.getElementById("signup-step-1").classList.add("hidden");
    document.getElementById("signup-step-2").classList.remove("hidden");
  });
}

// ═══════════════════════════════════════════
// Step 2 Buttons
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

  btn.disabled = true;
  textEl.textContent = "กำลังสมัครสมาชิก...";
  spinner.classList.remove("hidden");

  try {
    const { email, password, displayName } = pendingSignupData;

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    if (error) throw error;

    // เคลียร์ state
    pendingSignupData = null;

    if (data.session) {
      // Confirm email = OFF
      textEl.textContent = "✓ สำเร็จ! กำลังเข้าสู่ระบบ...";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } else {
      // Confirm email = ON
      showCheckEmailScreen(email);
    }

  } catch (err) {
    console.error("[signup] signup error:", err);
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
    <div style="text-align:center; padding:1rem 0;">
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
// Error helpers
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