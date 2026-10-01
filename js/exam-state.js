-- ═══════════════════════════════════════════
-- FIX ALL — รวมทุกอย่าง
-- ═══════════════════════════════════════════

-- 1. ตรวจสอบ exam_years ซ้ำ
select 'ก่อนลบ:' as step, id, label, year from public.exam_years order by created_at;

-- 2. ถ้ามี questions อ้าง 213f057b → อัปเดต
update public.questions
set exam_year_id = '44444444-4444-4444-4444-444444444444'
where exam_year_id = '213f057b-f74d-4603-86c8-827a1f8e45a1';

-- 3. ลบ exam_years ซ้ำ
delete from public.exam_years
where id = '213f057b-f74d-4603-86c8-827a1f8e45a1';

-- 4. ล้าง secrets row
update public.system_config
set
  full_exam_question_count = 0,
  full_exam_time_minutes = 0,
  allow_email_signup = true,
  allow_google_signin = true,
  maintenance_mode = false,
  maintenance_message = ''
where key = 'secrets';

-- 5. (Optional) ลบ explanation placeholder
update public.questions
set explanation = ''
where explanation like '%ยังไม่มีคำอธิบาย%';

-- 6. สรุปผลลัพธ์
select 'categories' as tbl, count(*) from public.categories
union all
select 'exam_years', count(*) from public.exam_years
union all
select 'questions', count(*) from public.questions
union all
select 'profiles', count(*) from public.profiles
union all
select 'system_config', count(*) from public.system_config;