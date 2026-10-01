// js/lib/supabase-esm.js
// ═══════════════════════════════════════════════════════════════
// ES Module bridge — ใช้ window.sb ที่ supabase-config.js สร้างไว้
// ═══════════════════════════════════════════════════════════════
// ⚠️ ต้องโหลด supabase-config.js (classic script) ก่อนหน้านี้:
//   <script src="js/supabase-config.js"></script>
// ═══════════════════════════════════════════════════════════════

if (typeof window === 'undefined' || !window.sb) {
  console.error(
    '[supabase-esm] ไม่พบ window.sb — ตรวจว่า supabase-config.js โหลดแล้วหรือยัง'
  );
}

export const supabase = window.sb;
export const sb = window.sb;