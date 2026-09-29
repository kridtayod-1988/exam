// js/forgot-password.js
// ตรรกะหน้ารีเซ็ตรหัสผ่าน — แยกออกมาจาก inline script เพื่อให้สอดคล้องกับ CSP

document.getElementById("forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorBanner = document.getElementById("error-banner");
  const successBanner = document.getElementById("success-banner");
  errorBanner.classList.add("idden");
  successBanner.classList.add("hidden");

  const email = document.getElementById("forgot-email").value.trim();
  const btn = document.getElementById("forgot-submit-btn");
  btn.disabled = true;
  btn.textContent = "กำลังส่ง...";

  try {
    const redirectUrl = new URL("login.html", window.location.href).href;

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    if (error) throw error;

    successBanner.textContent = "ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)";
    successBanner.classList.remove("hidden");
    document.getElementById("forgot-form").reset();
  } catch (err) {
    errorBanner.textContent = getSupabaseAuthErrorMessage(err);
    errorBanner.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "ส่งลิงก์รีเซ็ตรหัสผ่าน";
  }
});