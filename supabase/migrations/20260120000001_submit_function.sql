-- supabase/migrations/20260120000001_submit_function.sql
-- ═════════════════════════════════════════════════════════════════
-- ฟังก์ชันตรวจให้คะแนนฝั่งเซิร์ฟเวอร์ + คำนวณ EXP ในธุรกรรมเดียว
-- ผสานระบบ EXP/Level เดิมของท่านเข้ากับการให้คะแนนที่ปลอดภัย
-- ═════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.submit_exam(
  p_attempt_id UUID,
  p_answers    JSONB      -- { "<question_id>": "a", ... }
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_att      public.exam_attempts%ROWTYPE;
  v_total    INT := 0;
  v_correct  INT := 0;
  v_by_cat   JSONB := '{}'::JSONB;
  v_exp      INT := 0;
  v_bonus    INT := 0;
  v_new_exp  INT;
  v_new_lvl  INT;
  r          RECORD;
BEGIN
  SELECT * INTO v_att FROM public.exam_attempts
   WHERE id = p_attempt_id AND user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบการสอบนี้ หรือไม่ใช่การสอบของท่าน';
  END IF;
  IF v_att.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'การสอบนี้ถูกส่งไปแล้ว ไม่สามารถส่งซ้ำได้';
  END IF;

  FOR r IN
    SELECT q.id, q.cat, q.difficulty, k.answer,
           p_answers->>(q.id::TEXT) AS picked
    FROM public.questions q
    JOIN public.question_keys k ON k.question_id = q.id
    WHERE q.id = ANY(v_att.question_ids)
  LOOP
    v_total := v_total + 1;

    INSERT INTO public.item_responses
      (attempt_id, user_id, question_id, picked, is_correct)
    VALUES
      (p_attempt_id, auth.uid(), r.id, r.picked,
       r.picked IS NOT DISTINCT FROM r.answer)
    ON CONFLICT (attempt_id, question_id) DO NOTHING;

    IF r.picked IS NOT DISTINCT FROM r.answer THEN
      v_correct := v_correct + 1;
      -- EXP ถ่วงน้ำหนักตามความยาก: ง่าย 5, ปานกลาง 8, ยาก 12
      v_exp := v_exp + CASE COALESCE(r.difficulty, 2)
                         WHEN 1 THEN 5 WHEN 3 THEN 12 ELSE 8 END;
      v_by_cat := jsonb_set(v_by_cat, ARRAY[COALESCE(r.cat,'UNKNOWN')],
                    to_jsonb(COALESCE((v_by_cat->>COALESCE(r.cat,'UNKNOWN'))::INT, 0) + 1),
                    TRUE);
    END IF;
  END LOOP;

  -- โบนัสตามเกณฑ์ผ่าน (ปรับตัวเลขให้ตรงกับระบบเกมเดิมของท่านได้)
  IF v_total > 0 AND (v_correct::NUMERIC / v_total) >= 0.60 THEN
    v_bonus := 50;
  END IF;
  IF v_correct = v_total AND v_total > 0 THEN
    v_bonus := v_bonus + 100;   -- โบนัสทำถูกทั้งหมด
  END IF;

  UPDATE public.exam_attempts SET
    score        = v_correct,
    total        = v_total,
    percent      = ROUND(v_correct::NUMERIC / NULLIF(v_total,0) * 100, 2),
    passed       = (v_correct::NUMERIC / NULLIF(v_total,0)) >= 0.60,
    by_cat       = v_by_cat,
    exp_gained   = v_exp + v_bonus,
    submitted_at = now()
  WHERE id = p_attempt_id;

  -- อัปเดต EXP และ Level ในโปรไฟล์
  UPDATE public.profiles SET
    exp = COALESCE(exp, 0) + v_exp + v_bonus,
    total_attempts = COALESCE(total_attempts, 0) + 1
  WHERE id = auth.uid()
  RETURNING exp INTO v_new_exp;

  -- สูตร Level: ใช้รากที่สองเพื่อให้ระดับสูงต้องใช้ EXP มากขึ้นเรื่อย ๆ
  v_new_lvl := GREATEST(1, FLOOR(SQRT(v_new_exp::NUMERIC / 100))::INT + 1);
  UPDATE public.profiles SET level = v_new_lvl WHERE id = auth.uid();

  -- บันทึกข้อที่เคยเจอ เพื่อกันสุ่มซ้ำในรอบถัดไป
  INSERT INTO public.user_seen_questions (user_id, question_id, seen_at)
  SELECT auth.uid(), unnest(v_att.question_ids), now()
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'correct', v_correct, 'total', v_total,
    'percent', ROUND(v_correct::NUMERIC / NULLIF(v_total,0) * 100, 2),
    'passed',  (v_correct::NUMERIC / NULLIF(v_total,0)) >= 0.60,
    'byCat',   v_by_cat,
    'expGained', v_exp + v_bonus,
    'bonus',   v_bonus,
    'newExp',  v_new_exp,
    'newLevel', v_new_lvl
  );
END; $$;

REVOKE ALL ON FUNCTION public.submit_exam(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_exam(UUID, JSONB) TO authenticated;

-- ── ดูเฉลยได้เฉพาะหลังส่งข้อสอบแล้วเท่านั้น
CREATE OR REPLACE FUNCTION public.get_exam_review(p_attempt_id UUID)
RETURNS TABLE (
  question_id UUID, question_text TEXT, choices JSONB, table_data JSONB,
  picked TEXT, answer TEXT, is_correct BOOLEAN, explanation TEXT,
  cat TEXT, sub TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE id = p_attempt_id AND user_id = auth.uid()
      AND submitted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ดูเฉลยได้เฉพาะการสอบของตนเองที่ส่งแล้วเท่านั้น';
  END IF;

  RETURN QUERY
  SELECT q.id, q.question_text, q.choices, q.table_data,
         ir.picked, k.answer, ir.is_correct, k.explanation,
         q.cat, q.sub
  FROM public.item_responses ir
  JOIN public.questions q     ON q.id = ir.question_id
  JOIN public.question_keys k ON k.question_id = q.id
  WHERE ir.attempt_id = p_attempt_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_exam_review(UUID) TO authenticated;