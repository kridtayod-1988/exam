// js/login.js
// เข้าสู่ระบบ: Email/Password + Google + showcase

// ═══════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════
(async function bootstrap() {
  const wrap = document.getElementById("login-wrap");
  if (!wrap) return;

  if (typeof sb === "undefined") {
    console.error("[login] sb ไม่ได้โหลด");
    wrap.style.visibility = "visible";
    showError("ระบบยังโหลดไม่ครบ กรุณา refresh หน้าอีกครั้ง");
    return;
  }

  try {
    await redirectIfAuthenticated("dashboard.html");
  } catch (err) {
    console.warn("[login] redirect check failed:", err);
  }

  wrap.style.visibility = "visible";

  // ─── Showcase ───
  if (typeof renderShowcase === "function") {
    await renderShowcase({
      badge: "✨ ระบบฝึกทำข้อสอบอัจฉริยะ",
      title: "พร้อมพิชิตข้อสอบ<br>ก.พ. ไปกับเรา",
      subtitle: "รวมข้อสอบคุณภาพ เฉลยละเอียด พร้อมระบบติดตามความก้าวหน้า",
    });
  }

  // ─── Password toggle ───
  const toggleBtn = document.getElementById("toggle-password-btn");
  const pwInput = document.getElementById("login-password");
  if (toggleBtn && pwInput) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = pwInput.type === "password";
      pwInput.type = isPassword ? "text" : "password";
      toggleBtn.textContent = isPassword ? "🙈" : "👁️";
      pwInput.focus();
    });
  }

  // ─── Login form ───
  document.getElementById("login-form")?.addEventListener("submit", handleLogin);

  // ─── Google ───
  document.getElementById("google-signin-btn")?.addEventListener("click", handleGoogleSignin);
})();

function showError(message) {
  const banner = document.getElementById("error-banner");
  if (!banner) return;
  banner.textContent = message;
  banner.classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-banner")?.classList.add("hidden");
}

// ═══════════════════════════════════════════
// Login with Email/Password
// ═══════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const submitBtn = document.getElementById("login-submit-btn");
  const submitText = submitBtn.querySelector(".login-submit-text");
  const submitSpinner = submitBtn.querySelector(".login-submit-spinner");

  submitBtn.disabled = true;
  submitText.textContent = "กำลังเข้าสู่ระบบ...";
  submitSpinner.classList.remove("hidden");

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // อัปเดต last_login_at
    await sb
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.user.id);

    window.location.href = "dashboard.html";
  } catch (err) {
    showError(getSupabaseAuthErrorMessage(err));
    submitBtn.disabled = false;
    submitText.textContent = "เข้าสู่ระบบ";
    submitSpinner.classList.add("hidden");
  }
}

// ═══════════════════════════════════════════
// Google Sign-In
// ═══════════════════════════════════════════
async function handleGoogleSignin() {
  hideError();
  try {
    const redirectUrl = new URL("dashboard.html", window.location.href).href;

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl }
    });
    if (error) throw error;
  } catch (err) {
    showError(getSupabaseAuthErrorMessage(err));
  }
}