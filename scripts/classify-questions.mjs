// ═════════════ scripts/classify-questions.mjs ═════════════
// สคริปต์จำแนกข้อสอบ 100 ข้อเดิมเข้า Taxonomy
//
// การใช้งาน:
//   npm i @supabase/supabase-js
//   export SUPABASE_URL="https://wefgreavazpfctayjnmp.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmdyZWF2YXpwZmN0YXlqbm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTk1MjMsImV4cCI6MjEwNTY3NTUyM30.XcBAvQ2z66STZj31NlwZyjB7vk4ozax3yg58t6_c1eI"        # ห้าม commit ลง git
//
//   ตรวจสอบก่อน (dry-run, ไม่เขียนฐานข้อมูล):
//     node scripts/classify-questions.mjs --source=db --report
//   จำแนกจากไฟล์ JSON แล้วบันทึกผลลง DB:
//     node scripts/classify-questions.mjs --source=data/questions.json --apply
//
// ผลลัพธ์: data/questions.classified.json + data/classification-report.md

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { TOPICS, SUBJECTS, DIFFICULTY, BLOOM } from './taxonomy.js';

/* ───────── 1. Argument parsing ───────── */
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const SOURCE     = args.source ?? 'db';
const APPLY      = Boolean(args.apply);
const THRESHOLD  = Number(args.threshold ?? 0.45);
const OUT_DIR    = args.out ?? 'data';

/* ───────── 2. Text normalisation ─────────
   ตัดวรรณยุกต์ซ้ำ/ช่องว่างเกิน และแปลงเป็น lowercase
   เพื่อให้การจับคู่คำสำคัญ (lexical matching) เสถียร            */
const normalize = (s = '') =>
  String(s)
    .toLowerCase()
    .replace(/\u200b/g, '')
    .replace(/[“”"’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildHaystack = q => normalize(
  [q.question_text, ...(Array.isArray(q.choices)
      ? q.choices.map(c => (typeof c === 'string' ? c : c?.text ?? ''))
      : Object.values(q.choices ?? {})),
   q.explanation].join(' | ')
);

/* ───────── 3. Scoring engine ───────── */
const W_STRONG = 2.5;
const W_NORMAL = 1.0;

function countHits(hay, term) {
  const t = normalize(term);
  if (!t) return 0;
  // ภาษาไทยไม่มีเว้นวรรคระหว่างคำ จึงใช้ substring matching
  let n = 0, i = 0;
  while ((i = hay.indexOf(t, i)) !== -1) { n++; i += t.length; }
  return n;
}

function scoreTopics(hay) {
  const scores = {};
  for (const [key, def] of Object.entries(TOPICS)) {
    let s = 0;
    for (const t of def.strong   ?? []) s += countHits(hay, t) * W_STRONG;
    for (const t of def.keywords ?? []) s += countHits(hay, t) * W_NORMAL;
    if (s > 0) scores[key] = s;
  }
  return scores;
}

/* ───────── 4. Heuristic: ภาษาอังกฤษ ─────────
   ถ้าสัดส่วนอักขระละติน > 60% ให้ bias ไปยัง subject = english */
function latinRatio(text = '') {
  const clean = text.replace(/[\s\d\p{P}]/gu, '');
  if (!clean.length) return 0;
  const latin = (clean.match(/[a-z]/gi) ?? []).length;
  return latin / clean.length;
}

/* ───────── 5. Heuristic: ความยาก (difficulty) ─────────
   พิจารณาจาก (ก) ความยาวโจทย์ (cognitive load)
              (ข) จำนวนตัวเลข/ตัวดำเนินการ
              (ค) การมีหลายเงื่อนไขซ้อน                        */
function inferDifficulty(q, hay) {
  const len   = (q.question_text ?? '').length;
  const nums  = (hay.match(/\d+/g) ?? []).length;
  const multi = /(ข้อสรุปที่ 2|และ|แต่|เว้นแต่|ยกเว้น|มากที่สุด|น้อยที่สุด)/.test(hay);
  let score = 0;
  if (len > 260) score += 2; else if (len > 120) score += 1;
  if (nums > 6) score += 2;  else if (nums > 2)  score += 1;
  if (multi) score += 1;
  return score >= 4 ? 'hard' : score >= 2 ? 'medium' : 'easy';
}

/* ───────── 6. Heuristic: Bloom level ───────── */
const BLOOM_RULES = [
  { level: 'analyze',    re: /(วิเคราะห์|สรุปได้ว่า|เหตุผล|สมเหตุสมผล|เปรียบเทียบ|infer|analy[sz])/ },
  { level: 'apply',      re: /(คำนวณ|จงหา|เท่าใด|กี่|ร้อยละ|calculate|solve)/ },
  { level: 'understand', re: /(ใจความสำคัญ|หมายความว่า|ตีความ|อธิบาย|main idea|meaning)/ },
  { level: 'remember',   re: /(ข้อใดคือ|ตามพระราชบัญญัติ|กำหนดไว้|มีกี่|ผู้ใดเป็น)/ }
];
function inferBloom(hay) {
  for (const r of BLOOM_RULES) if (r.re.test(hay)) return r.level;
  return 'understand';
}

/* ───────── 7. Classifier หลัก ───────── */
export function classify(q) {
  const hay    = buildHaystack(q);
  const scores = scoreTopics(hay);

  // bias ภาษาอังกฤษ
  if (latinRatio(q.question_text) > 0.6) {
    for (const [k, def] of Object.entries(TOPICS)) {
      if (def.subject === 'english') scores[k] = (scores[k] ?? 0) + 2.0;
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const total  = ranked.reduce((s, [, v]) => s + v, 0);

  if (!ranked.length) {
    return {
      subject: 'aptitude', topic: 'unclassified', topic_label: 'ยังไม่จำแนก',
      difficulty: inferDifficulty(q, hay), bloom: inferBloom(hay),
      confidence: 0, needs_review: true, alternatives: []
    };
  }

  const [topKey, topScore] = ranked[0];
  const confidence = Number((topScore / total).toFixed(3));

  return {
    subject:      TOPICS[topKey].subject,
    subject_label: SUBJECTS[TOPICS[topKey].subject],
    topic:        topKey,
    topic_label:  TOPICS[topKey].label,
    difficulty:   inferDifficulty(q, hay),
    bloom:        inferBloom(hay),
    confidence,
    needs_review: confidence < THRESHOLD,
    alternatives: ranked.slice(1, 4).map(([k, v]) => ({
      topic: k, label: TOPICS[k].label, score: Number(v.toFixed(2))
    }))
  };
}

/* ───────── 8. Data loaders ───────── */
const sb = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function loadQuestions() {
  if (SOURCE === 'db') {
    const { data, error } = await sb()
      .from('questions')
      .select('id, question_text, choices, answer_key, explanation, exam_year')
      .order('id');
    if (error) throw error;
    return data;
  }
  const raw = await fs.readFile(SOURCE, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
}

/* ───────── 9. Writer ───────── */
async function applyToDb(rows) {
  const client = sb();
  let ok = 0, fail = 0;
  for (const r of rows) {
    const { error } = await client.from('questions').update({
      subject: r.taxonomy.subject,
      topic: r.taxonomy.topic,
      difficulty: r.taxonomy.difficulty,
      bloom: r.taxonomy.bloom,
      taxonomy_confidence: r.taxonomy.confidence,
      needs_review: r.taxonomy.needs_review,
      classified_at: new Date().toISOString()
    }).eq('id', r.id);
    if (error) { fail++; console.error(`  ✗ id=${r.id}`, error.message); }
    else ok++;
  }
  console.log(`\n  เขียนฐานข้อมูลสำเร็จ ${ok} รายการ / ล้มเหลว ${fail} รายการ`);
}

/* ───────── 10. Report generator ───────── */
function buildReport(rows) {
  const bySubject = {}, byTopic = {}, byDiff = {};
  for (const r of rows) {
    const t = r.taxonomy;
    bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1;
    byTopic[t.topic]     = (byTopic[t.topic] ?? 0) + 1;
    byDiff[t.difficulty] = (byDiff[t.difficulty] ?? 0) + 1;
  }
  const review = rows.filter(r => r.taxonomy.needs_review);
  const L = [];
  L.push('# รายงานผลการจำแนกข้อสอบเข้า Taxonomy', '');
  L.push(`- จำนวนข้อทั้งหมด: **${rows.length}**`);
  L.push(`- ต้องทบทวนโดยมนุษย์ (confidence < ${THRESHOLD}): **${review.length}**`);
  L.push(`- ค่าความเชื่อมั่นเฉลี่ย: **${(rows.reduce((s,r)=>s+r.taxonomy.confidence,0)/rows.length).toFixed(3)}**`, '');
  L.push('## การกระจายตามวิชา', '', '| วิชา | จำนวน | สัดส่วน |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(bySubject))
    L.push(`| ${SUBJECTS[k] ?? k} | ${v} | ${(v*100/rows.length).toFixed(1)}% |`);
  L.push('', '## การกระจายตามหัวเรื่อง', '', '| หัวเรื่อง | จำนวน |', '|---|---:|');
  for (const [k, v] of Object.entries(byTopic).sort((a,b)=>b[1]-a[1]))
    L.push(`| ${TOPICS[k]?.label ?? k} | ${v} |`);
  L.push('', '## การกระจายตามระดับความยาก', '', '| ระดับ | จำนวน |', '|---|---:|');
  for (const [k, v] of Object.entries(byDiff))
    L.push(`| ${DIFFICULTY[k] ?? k} | ${v} |`);
  if (review.length) {
    L.push('', '## รายการที่ต้องทบทวน', '', '| id | ความเชื่อมั่น | หัวเรื่องที่คาด | ตัวเลือกรอง |', '|---|---:|---|---|');
    for (const r of review)
      L.push(`| ${r.id} | ${r.taxonomy.confidence} | ${r.taxonomy.topic_label ?? '-'} | ${r.taxonomy.alternatives.map(a=>a.label).join(', ') || '-'} |`);
  }
  return L.join('\n');
}

/* ───────── 11. Main ───────── */
(async () => {
  console.log('▶ กำลังโหลดข้อสอบจาก:', SOURCE);
  const questions = await loadQuestions();
  console.log(`  พบ ${questions.length} ข้อ\n`);

  const rows = questions.map(q => ({ ...q, taxonomy: classify(q) }));

  for (const r of rows) {
    const t = r.taxonomy;
    const flag = t.needs_review ? '⚠' : '✓';
    console.log(`${flag} #${String(r.id).padStart(3)} → ${t.topic_label ?? t.topic} ` +
                `[${t.difficulty}/${t.bloom}] conf=${t.confidence}`);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'questions.classified.json'),
                     JSON.stringify(rows, null, 2), 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'classification-report.md'),
                     buildReport(rows), 'utf8');
  console.log(`\n  บันทึกผลลัพธ์ไว้ที่ ${OUT_DIR}/`);

  if (APPLY) { console.log('\n▶ กำลังบันทึกผลลงฐานข้อมูล...'); await applyToDb(rows); }
  else console.log('\n  (โหมด dry-run — เพิ่ม --apply เพื่อเขียนฐานข้อมูล)');
})().catch(e => { console.error('เกิดข้อผิดพลาด:', e); process.exit(1); });