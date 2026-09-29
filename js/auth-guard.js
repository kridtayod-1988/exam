// js/auth-guard.js
// ตรวจสอบสถานะล็อกอิน + ดึงข้อมูล role (Supabase Auth)
// หน้าที่ต้องล็อกอินก่อนถึงเข้าได้ (dashboard, exam, profile, admin/*) ต้องเรียกใช้ไฟล์นี้

let currentUserData = null;

/**
 * ตรวจสอบว่าล็อกอินอยู่หรือไม่ ถ้าไม่ → เด้งไปหน้า login
 * คืนค่า { user, userData } ถ้าล็อกอินอยู่
 */
async function requireAuth(redirectTo = "login.html") {
  const { data: { session }, error: sessionError } = await sb.auth.getSession();

  if (sessionError || !session || !session.user) {
    window.location.href = redirectTo;
    throw new Error("not-authenticated");
  }

  const user = session.user;

  try {
    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fallback: ถ้าไม่มี profile (PGRST116 = no rows) → สร้างให้เอง
    if (profileError && profileError.code === "PGRST116") {
      const fallbackName =
        user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        user.email.split("@")[0];

      const { data: newProfile, error: createError } = await sb
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          display_name: fallbackName,
          role: "user"
        })
        .select()
        .single();

      if (createError) throw createError;
      const mapped = mapProfileRow(newProfile);
      currentUserData = mapped;
      return { user, userData: mapped };
    }

    if (profileError) throw profileError;
    const mapped = mapProfileRow(profile);
    currentUserData = mapped;
    return { user, userData: mapped };
  } catch (err) {
    console.error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ:", err);
    throw err;
  }
}

/**
 * ตรวจสอบว่าเป็น admin หรือไม่ ถ้าไม่ → เด้งกลับหน้า dashboard
 */
async function requireAdmin(redirectTo = "../dashboard.html") {
  const { user, userData } = await requireAuth("../login.html");

  if (!userData || userData.role !== "admin") {
    window.location.href = redirectTo;
    throw new Error("not-admin");
  }

  return { user, userData };
}

/**
 * สำหรับหน้า login/signup: ถ้าล็อกอินอยู่แล้ว ให้เด้งไป dashboard ทันที
 */
async function redirectIfAuthenticated(redirectTo = "dashboard.html") {
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    window.location.href = redirectTo;
  }
}

/**
 * ออกจากระบบ
 */
async function signOutUser() {
  try {
    await sb.auth.signOut();
    const isInAdminFolder = window.location.pathname.includes("/admin/");
    window.location.href = isInAdminFolder ? "../index.html" : "index.html";
  } catch (err) {
    console.error("ออกจากระบบไม่สำเร็จ:", err);
  }
}