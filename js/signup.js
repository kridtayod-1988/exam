// js/signup.js
// สมัครสมาชิก 2 ขั้น + init button style

redirectIfAuthenticated("dashboard.html");

let pendingSignupData = null;

const checkbox = document.getElementById("signup-agree-checkbox");
const step1Btn = document.getElementById("signup-step1-btn");

// ตั้งค่า style เริ่มต้นให้ปุ่ม disabled
(function initializeStep1Button() {
  step1Btn.disabled = true;
  step1Btn.classList.remove("btn-gold");
  step1Btn.style.background = "var(--surface-3)";
  step1Btn.style.color = "var(--text-muted)";
  step1Btn.style.cursor = "not-allowed";
})();

checkbox.addEventListener("change", () => {
  if (checkbox.checked) {
    step1Btn.disabled = false;
    step1Btn.classList.add("btn-gold");
    step1Btn.style.background = "";
    step1Btn.style.color = "";
    step1Btn.style.cursor = "";
  } else {
    step1Btn.disabled = true;
    step1Btn.classList.remove("btn-gold");
    step1Btn.style.background = "var(--surface-3)";
    step1Btn.style.color = "var(--text-muted)";
    step1Btn.style.cursor = "not-allowed";
  }
});

function showError(bannerId, message) {
  const banner = document.getElementById(bannerId);
  banner.textContent = message;
  banner.classList.remove("hidden");
}

function hideError(bannerId) {
  document.getElementById(bannerId).classList.add("hidden");
}

document.getElementById("signup-form-step1").addEventListener("submit", (e) => {
  e.preventDefault();
  hideError("error-banner-1");

  const displayName = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const passwordConfirm = document.getElementById("signup-password-confirm").value;

  if (!isValidLength(displayName, 100)) {
    showError("error-banner-1", "กรุณากรอกชื่อที่แสดง");
    return;
  }
  if (password !== passwordConfirm) {
    showError("error-banner-1", "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    return;
  }
  if (password.length < 6) {
    showError("error-banner-1", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    return;
  }
  if (!checkbox.checked) {
    showError("error-banner-1", "กรุณายอมรับคำชี้แจงการใช้งานระบบก่อนดำเนินการต่อ");
    return;
  }

  pendingSignupData = { displayName, email, password };

  document.getElementById("confirm-name").textContent = displayName;
  document.getElementById("confirm-email").textContent = email;

  document.getElementById("signup-step-1").classList.add("hidden");
  document.getElementById("signup-step-2").classList.remove("hidden");
});

document.getElementById("signup-back-btn").addEventListener("click", () => {
  document.getElementById("signup-step-2").classList.add("hidden");
  document.getElementById("signup-step-1").classList.remove("hidden");
});

document.getElementById("signup-confirm-btn").addEventListener("click", async () => {
  if (!pendingSignupData) return;
  hideError("error-banner-2");

  const confirmBtn = document.getElementById("signup-confirm-btn");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "กำลังสมัครสมาชิก...";

  try {
    const { data, error } = await sb.auth.signUp({
      email: pendingSignupData.email,
      password: pendingSignupData.password,
      options: {
        data: { display_name: pendingSignupData.displayName }
      }
    });

    if (error) throw error;

    if (data.session) {
      window.location.href = "dashboard.html";
    } else {
      const successStep = document.getElementById("signup-step-2");
      successStep.innerHTML = `
        <div class="text-center">
          <div style="font-size:2.5rem;margin-bottom:0.75rem;">📧</div>
          <h1 class="mb-2" style="font-size:1.4rem;">ตรวจสอบอีเมลของคุณ</h1>
          <p class="text-secondary text-sm mb-3">
            เราส่งลิงก์ยืนยันไปที่ <strong class="text-gold">${escapeHtml(pendingSignupData.email)}</strong>
            แล้ว กรุณากดลิงก์ในอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ
          </p>
          <a href="login.html" class="btn btn-gold btn-full">ไปหน้าเข้าสู่ระบบ</a>
        </div>
      `;
    }
  } catch (err) {
    showError("error-banner-2", getSupabaseAuthErrorMessage(err));
    confirmBtn.disabled = false;
    confirmBtn.textContent = "✅ ยืนยันสมัครสมาชิก";
  }
});