-- supabase/migrations/20260120000000_blueprint_layer.sql
-- ═════════════════════════════════════════════════════════════════
-- ผสาน Blueprint Layer เข้ากับ schema เดิมของ kp-exam-v4
-- หลักการ: Additive Migration เท่านั้น — ไม่ลบ ไม่เปลี่ยนชนิดคอลัมน์เดิม
--          ระบบเดิมยังทำงานได้ 100% หลังรัน migration นี้
-- ═════════════════════════════════════════════════════════════════

-- ── ขั้นที่ 1: เพิ่มคอลัมน์ taxonomy ลงตาราง questions เดิม
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS cat               TEXT,
  ADD COLUMN IF NOT EXISTS sub               TEXT,
  ADD COLUMN IF NOT EXISTS sub_confidence    NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS sub_classified_by TEXT DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS difficulty        SMALLINT,
  ADD COLUMN IF NOT EXISTS difficulty_source TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS p_value           NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS rpbis             NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS sample_size       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calibrated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS statute_ref       TEXT,
  ADD COLUMN IF NOT EXISTS author            TEXT,
  ADD COLUMN IF NOT EXISTS origin            TEXT DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS license           TEXT DEFAULT 'CC-BY-SA-4.0',
  ADD COLUMN IF NOT EXISTS legal_cleared     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS content_hash      TEXT;

ALTER TABLE public.questions
  ADD CONSTRAINT chk_cat CHECK (cat IS NULL OR cat IN ('MATH','THAI','LAW','ENGLISH')),
  ADD CONSTRAINT chk_difficulty CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 3);

CREATE INDEX IF NOT EXISTS idx_q_taxonomy ON public.questions(cat, sub)
  WHERE deleted_at IS NULL;

-- ── ขั้นที่ 2: แยกเฉลยออกจากตารางที่ผู้ใช้อ่านได้
--    สมมติว่าคอลัมน์เฉลยเดิมชื่อ correct_answer
--    หากใช้ชื่ออื่น ให้แก้ชื่อในบรรทัด INSERT ด้านล่างเท่านั้น
CREATE TABLE IF NOT EXISTS public.question_keys (
  question_id UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  answer      TEXT NOT NULL,
  explanation TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ย้ายข้อมูลเฉลยเดิมเข้าตารางใหม่ (รันซ้ำได้ปลอดภัย)
INSERT INTO public.question_keys (question_id, answer, explanation)
SELECT id, correct_answer::TEXT, explanation
FROM public.questions
WHERE correct_answer IS NOT NULL
ON CONFLICT (question_id) DO UPDATE
  SET answer = EXCLUDED.answer,
      explanation = EXCLUDED.explanation;

ALTER TABLE public.question_keys ENABLE ROW LEVEL SECURITY;

-- โดยเจตนา: ไม่มี policy SELECT ให้ role authenticated
-- เฉลยเข้าถึงได้ผ่าน SECURITY DEFINER function เท่านั้น
CREATE POLICY "admin_manage_keys" ON public.question_keys
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── ขั้นที่ 3: มุมมองสำหรับผู้ใช้ทำข้อสอบ — ไม่มีเฉลยติดไปด้วย
CREATE OR REPLACE VIEW public.v_questions_public
WITH (security_invoker = true) AS
SELECT
  q.id, q.category_id, q.exam_year_id,
  q.cat, q.sub, q.difficulty,
  q.question_text, q.choices, q.table_data,
  q.created_at
FROM public.questions q
WHERE q.deleted_at IS NULL;

GRANT SELECT ON public.v_questions_public TO authenticated;

-- ── ขั้นที่ 4: บันทึกการตอบรายข้อ — ข้อมูลตั้งต้นของ Item Analysis
--    ตาราง exam_attempts เดิมเก็บผลรวม แต่ item analysis ต้องการรายข้อ
CREATE TABLE IF NOT EXISTS public.item_responses (
  id            BIGSERIAL PRIMARY KEY,
  attempt_id    UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  picked        TEXT,
  is_correct    BOOLEAN NOT NULL,
  time_spent_ms INT,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_ir_question ON public.item_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_ir_user     ON public.item_responses(user_id);

ALTER TABLE public.item_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_responses" ON public.item_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "insert_own_responses" ON public.item_responses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
-- โดยเจตนา: ไม่มี policy UPDATE/DELETE → คำตอบที่บันทึกแล้วแก้ไม่ได้