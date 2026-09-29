// js/login.js
// เข้าสู่ระบบ: Email/Password + Google (Supabase Auth)

(async function init() {
  await redirectIfAuthenticated("dashboard.html");
})();

function showError(message) {
  const banner = document.getElementById("error-banner");
  banner.textContent = message;
  banner.classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-banner").classList.add("hidden");
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const submitBtn = document.getElementById("login-submit-btn");

  submitBtn.disabled = true;
  submitBtn.textContent = "กำลังเข้าสู่ระบบ...";

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await sb.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);

    window.location.href = "dashboard.html";
  } catch (err) {
    showError(getSupabaseAuthErrorMessage(err));
    submitBtn.disabled = false;
    submitBtn.textContent = "เข้าสู่ระบบ";
  }
});

document.getElementById("google-signin-btn").addEventListener("click", async () => {
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
});