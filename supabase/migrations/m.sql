-- ═══════════════════════════════════════════════════════════════
-- Migration: Extend exam_years → "ชุดข้อสอบ" (papers)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1) เพิ่มคอลัมน์ ───
alter table public.exam_years
  add column if not exists code text,
  add column if not exists description text,
  add column if not exists exam_date date;

-- ─── 2) Unique index ───
create unique index if not exists idx_exam_years_code
  on public.exam_years (code)
  where code is not null;

-- ─── 3) Backfill ข้อมูลเดิม ───
update public.exam_years
set code = 'kp' || year || 'x'
where code is null;

-- ─── 4) ลบ exam_years ซ้ำ (ถ้ามี) ───
do $$
declare
  v_keep_id uuid;
  v_dup_ids uuid[];
begin
  -- เก็บแถวที่เก่ากว่า (หรือ code ไม่ null)
  select array_agg(id order by created_at asc)
  into v_dup_ids
  from public.exam_years
  where label = 'ทั่วไป (ไม่ระบุปี)';

  if array_length(v_dup_ids, 1) > 1 then
    v_keep_id := v_dup_ids[1];

    -- ย้าย questions
    update public.questions
    set exam_year_id = v_keep_id
    where exam_year_id = any(v_dup_ids[2:]);

    -- ลบที่เหลือ
    delete from public.exam_years
    where id = any(v_dup_ids[2:]);

    raise notice 'ลบ exam_years ซ้ำ % แถว', array_length(v_dup_ids, 1) - 1;
  end if;
end $$;

-- ─── 5) Clean secrets row ───
update public.system_config
set
  full_exam_question_count = 0,
  full_exam_time_minutes = 0,
  allow_email_signup = true,
  allow_google_signin = true,
  maintenance_mode = false,
  maintenance_message = ''
where key = 'secrets';

-- ─── 6) เพิ่มคอลัมน์ `order_index` (สำหรับเรียง) ───
alter table public.exam_years
  add column if not exists order_index int default 0;

create index if not exists idx_exam_years_order
  on public.exam_years (year desc, order_index asc);

-- ─── 7) View สำหรับ papers list (ใช้ในหน้าจัดการ) ───
create or replace view public.v_papers_summary
with (security_invoker = true)
as
select
  ey.id,
  ey.code,
  ey.label,
  ey.year,
  ey.description,
  ey.exam_date,
  ey.is_active,
  ey.created_at,
  count(q.id) as question_count,
  count(q.id) filter (where q.is_active = true) as active_question_count
from public.exam_years ey
left join public.questions q on q.exam_year_id = ey.id
group by ey.id;

comment on view public.v_papers_summary is
  'ชุดข้อสอบ + จำนวนข้อ — สำหรับหน้า admin/papers.html';

grant select on public.v_papers_summary to authenticated;

-- ─── 8) ตรวจสอบ ───
select 'exam_years' as tbl, count(*) from public.exam_years
union all
select 'with_code', count(*) from public.exam_years where code is not null
union all
select 'papers_view', count(*) from public.v_papers_summary;