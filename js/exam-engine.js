// js/exam-engine.js —— ฉบับปรับปรุง
// ═════════════════════════════════════════════════════════════════
// ผสาน buildPaper เข้ากับ exam-engine เดิมของท่าน
// คงชื่อไฟล์เดิมไว้ เพื่อมิให้กระทบไฟล์ที่ import อยู่แล้ว
//
// สิ่งที่เพิ่มขึ้นจากของเดิม
//   • สุ่มตามสัดส่วนหมวดหมู่ที่ blueprint กำหนด แทนการสุ่มอิสระ
//   • ทำซ้ำชุดเดิมได้จาก seed ใช้ตรวจสอบย้อนหลังและแก้ข้อร้องเรียน
//   • กันข้อซ้ำโดยอ่านจาก user_seen_questions ที่ท่านมีอยู่แล้ว
//   • ควบคุมอัตราการเปิดเผยข้อ ไม่ให้ข้อเดิมออกบ่อยผิดปกติ
// ═════════════════════════════════════════════════════════════════
import { supabase } from './supabase-config.js';
import { mulberry32, shuffle, sample, makeSeed } from './lib/rng.js';
import { getBlueprint, TAXONOMY, SUB_INDEX } from './lib/blueprint.js';

const groupBy = (arr, keyFn) =>
  arr.reduce((acc, x) => { (acc[keyFn(x)] ||= []).push(x); return acc; }, {});

function allocateByRatio(ratioMap, total) {
  const entries = Object.entries(ratioMap);
  const floored = entries.map(([k, r]) => {
    const exact = r * total;
    return { k, n: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let remain = total - floored.reduce((s, e) => s + e.n, 0);
  floored.sort((a, b) => b.rem - a.rem);
  for (let i = 0; remain > 0; i = (i + 1) % floored.length, remain--) floored[i].n += 1;
  return Object.fromEntries(floored.map((e) => [e.k, e.n]));
}

/** ดึงคลังข้อสอบจาก view ที่ไม่มีเฉลย */
export async function fetchBank({ categoryId = null, examYearId = null } = {}) {
  let q = supabase.from('v_questions_public')
    .select('id, category_id, exam_year_id, cat, sub, difficulty, question_text, choices, table_data');
  if (categoryId) q = q.eq('category_id', categoryId);
  if (examYearId) q = q.eq('exam_year_id', examYearId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/** ดึงรายการข้อที่ผู้ใช้เคยเจอแล้ว — ใช้ตารางเดิมของท่าน */
export async function fetchSeenIds(userId, withinDays = 30) {
  const since = new Date(Date.now() - withinDays * 86400000).toISOString();
  const { data, error } = await supabase
    .from('user_seen_questions')
    .select('question_id')
    .eq('user_id', userId)
    .gte('seen_at', since);
  if (error) throw error;
  return new Set(data.map((r) => r.question_id));
}

/** สถิติการใช้ข้อทั้งระบบ สำหรับควบคุมอัตราการเปิดเผย */
export async function fetchExposure() {
  const { data, error } = await supabase
    .from('v_item_exposure')
    .select('id, times_served');
  if (error) return new Map();            // ถ้ายังไม่มี view ให้ทำงานต่อได้
  return new Map(data.map((r) => [r.id, r.times_served]));
}

function weightedSample(pool, n, rng, exposure, seenIds) {
  const items = pool.map((q) => {
    const used = exposure.get(q.id) ?? 0;
    let w = 1 / (1 + used);
    if (seenIds.has(q.id)) w *= 0.05;     // ข้อที่เพิ่งเจอ ถูกกดโอกาสลงอย่างแรง
    return { q, w };
  });
  const out = [];
  while (out.length < n && items.length) {
    const total = items.reduce((s, x) => s + x.w, 0);
    if (total <= 0) { out.push(...items.slice(0, n - out.length).map((x) => x.q)); break; }
    let r = rng() * total, idx = 0;
    for (; idx < items.length; idx++) { r -= items[idx].w; if (r <= 0) break; }
    const pick = Math.min(idx, items.length - 1);
    out.push(items[pick].q);
    items.splice(pick, 1);
  }
  return out;
}

/**
 * ประกอบชุดข้อสอบตาม Blueprint
 * @returns {{paper: Array, meta: Object}}
 */
export function buildPaper(bank, opts) {
  const {
    blueprintId, round, seed, userId, attempt = 1,
    seenIds = new Set(), exposure = new Map(),
    shuffleChoices = true, strict = true,
  } = opts;

  const bp = getBlueprint(blueprintId);
  const r = bp.rounds[round];
  if (!r) throw new Error(`ไม่พบรอบสอบ "${round}"`);

  const finalSeed = seed ?? makeSeed({ userId, blueprintId, round, attempt });
  const rng = mulberry32(finalSeed);

  const active = bank.filter((q) => q.cat && q.sub);
  const byCat = groupBy(active, (q) => q.cat);
  const sections = [];
  const diagnostics = { shortfall: {}, unmetSub: [] };

  for (const cat of r.sectionOrder) {
    const need = r.quota[cat] ?? 0;
    if (!need) continue;

    const pool = byCat[cat] || [];
    const usedIds = new Set();
    const chosen = [];

    // ขั้นที่ 1 — เติมตามจำนวนขั้นต่ำของแต่ละหมวดย่อย
    const subMinForCat = Object.entries(r.subMin || {})
      .filter(([sub]) => SUB_INDEX[sub]?.cat === cat);
    const bySub = groupBy(pool, (q) => q.sub);

    for (const [sub, want] of shuffle(subMinForCat, rng)) {
      if (chosen.length >= need) break;
      const room = Math.min(want, need - chosen.length);
      const fresh = (bySub[sub] || []).filter((q) => !usedIds.has(q.id));
      const picked = weightedSample(fresh, room, rng, exposure, seenIds);
      picked.forEach((q) => { usedIds.add(q.id); chosen.push(q); });
      if (picked.length < room) diagnostics.unmetSub.push({ cat, sub, got: picked.length, want: room });
    }

    // ขั้นที่ 2 — เติมส่วนที่เหลือโดยถ่วงน้ำหนักตามสัดส่วนความยาก
    let remain = need - chosen.length;
    if (remain > 0) {
      const quotaByDiff = allocateByRatio(r.mix || { 2: 1 }, remain);
      const rest = pool.filter((q) => !usedIds.has(q.id));
      const byDiff = groupBy(rest, (q) => String(q.difficulty ?? 2));
      for (const [d, k] of Object.entries(quotaByDiff)) {
        if (chosen.length >= need) break;
        const picked = weightedSample(byDiff[d] || [],
          Math.min(k, need - chosen.length), rng, exposure, seenIds);
        picked.forEach((q) => { usedIds.add(q.id); chosen.push(q); });
      }
    }

    // ขั้นที่ 3 — เติมจากที่เหลือทั้งหมด
    remain = need - chosen.length;
    if (remain > 0) {
      const rest = pool.filter((q) => !usedIds.has(q.id));
      weightedSample(rest, remain, rng, exposure, seenIds)
        .forEach((q) => { usedIds.add(q.id); chosen.push(q); });
    }

    if (chosen.length < need) {
      diagnostics.shortfall[cat] = need - chosen.length;
      if (strict) {
        throw new Error(
          `ข้อสอบหมวด ${TAXONOMY[cat]?.label ?? cat} ไม่เพียงพอ ` +
          `ต้องการ ${need} ข้อ มีให้เลือกเพียง ${chosen.length} ข้อ`
        );
      }
    }
    sections.push({ cat, items: shuffle(chosen, rng) });
  }

  let no = 0;
  const paper = sections.flatMap((sec) =>
    sec.items.map((q) => {
      no += 1;
      const choices = shuffleChoices && Array.isArray(q.choices)
        ? shuffle(q.choices, rng) : q.choices;
      return { ...q, no, section: sec.cat, choices };
    })
  );

  return {
    paper,
    meta: {
      paperId: `${bp.id}-${round}-${attempt}-${hashSeed(finalSeed)}`,
      blueprintId: bp.id, blueprintVersion: bp.version,
      round, total: paper.length, expectedTotal: r.total,
      durationSec: r.durationMin * 60,
      seed: finalSeed,
      generatedAt: new Date().toISOString(),
      complete: paper.length === r.total,
      diagnostics,
    },
  };
}

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).slice(0, 6);
}

// ═════════════════════════════════════════════════════════════════
// API ระดับสูงที่หน้า exam.html เรียกใช้ — ใช้แทนของเดิมได้ทันที
// ═════════════════════════════════════════════════════════════════

export async function startExam({ blueprintId, round, categoryId, examYearId }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนทำข้อสอบ');

  const [bank, seenIds, exposure] = await Promise.all([
    fetchBank({ categoryId, examYearId }),
    fetchSeenIds(user.id),
    fetchExposure(),
  ]);

  const { paper, meta } = buildPaper(bank, {
    blueprintId, round, userId: user.id, seenIds, exposure,
  });

  const { data: attempt, error } = await supabase.from('exam_attempts').insert({
    user_id: user.id,
    paper_id: meta.paperId,
    blueprint_id: meta.blueprintId,
    round: meta.round,
    seed: meta.seed,
    question_ids: paper.map((q) => q.id),
    started_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;

  return { attemptId: attempt.id, paper, meta };
}

/** ส่งคำตอบ — การให้คะแนนและการคำนวณ EXP เกิดขึ้นฝั่งเซิร์ฟเวอร์ทั้งหมด */
export async function submitExam(attemptId, answers) {
  const { data, error } = await supabase.rpc('submit_exam', {
    p_attempt_id: attemptId, p_answers: answers,
  });
  if (error) throw error;
  return data;
}

export async function fetchReview(attemptId) {
  const { data, error } = await supabase.rpc('get_exam_review', {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  return data;
}