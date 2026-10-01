-- ═══════════════════════════════════════════════════════════════
-- Migration: get_public_question_count RPC
-- ═══════════════════════════════════════════════════════════════
-- ให้ anon (ยังไม่ล็อกอิน) เรียกได้ เพื่อแสดงจำนวนข้อสอบใน showcase
-- ใช้ SECURITY DEFINER → bypass RLS
-- ═══════════════════════════════════════════════════════════════

create or replace function public.get_public_question_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.questions
  where is_active = true
    and deleted_at is null;
$$;

comment on function public.get_public_question_count() is
  'นับจำนวนข้อสอบที่ใช้งานได้ — เปิดให้ anon เรียกเพื่อแสดง stats ใน showcase';

-- ปิดสิทธิ์ PUBLIC แล้ว grant เฉพาะที่จำเป็น
revoke execute on function public.get_public_question_count() from public;
grant execute on function public.get_public_question_count() to anon, authenticated;

-- ─── ตรวจสอบ ───
select proname, proacl
from pg_proc
where proname = 'get_public_question_count';