// js/lib/blueprint.js
// ═══════════════════════════════════════════════════════════════
// Blueprint Definitions
// โครงสร้างข้อสอบแต่ละโหมด — จำนวนข้อ, สัดส่วนหมวด, เวลา
// ═══════════════════════════════════════════════════════════════
//
// หมายเหตุ: quota ที่กำหนดเป็น "เป้าหมาย"
// ถ้าข้อสอบในคลังไม่พอ → engine จะใช้เท่าที่มี + รายงาน diagnostics
// (strict = false by default)
// ═══════════════════════════════════════════════════════════════

// ─── Taxonomy — หมวดหลัก ───
export const TAXONOMY = {
  thai: { label: 'ภาษาไทย' },
  math: { label: 'คณิตศาสตร์' },
  eng:  { label: 'ภาษาอังกฤษ' },
  law:  { label: 'กฎหมาย' },
  cit:  { label: 'จริยธรรม' },        // ยังไม่มีข้อมูล — เผื่ออนาคต
};

// ─── Index หมวดย่อย → หมวดหลัก ───
export const SUB_INDEX = {
  // ภาษาไทย
  'thai.grammar': { cat: 'thai' },
  'thai.reading': { cat: 'thai' },
  'thai.vocab':   { cat: 'thai' },

  // คณิตศาสตร์
  'math.arithmetic': { cat: 'math' },
  'math.sequence':   { cat: 'math' },
  'math.stats':      { cat: 'math' },
  'math.logic':      { cat: 'math' },

  // ภาษาอังกฤษ
  'eng.grammar':      { cat: 'eng' },
  'eng.reading':      { cat: 'eng' },
  'eng.vocab':        { cat: 'eng' },
  'eng.conversation': { cat: 'eng' },

  // กฎหมาย
  'law.administrative':  { cat: 'law' },
  'law.civil_service':   { cat: 'law' },
  'law.tort':            { cat: 'law' },
  'law.ethics':          { cat: 'law' },
};

// ═══════════════════════════════════════════════════════════════
// BLUEPRINTS
// ═══════════════════════════════════════════════════════════════
// mix: { 0: easy%, 1: medium%, 2: hard% } — ใช้เติมในขั้นที่ 2
// (สัดส่วนขั้นต่ำใน subMin จะถูกเติมก่อน)
// ═══════════════════════════════════════════════════════════════

export const BLUEPRINTS = {

  // ─── 1) จำลองสอบเต็ม — 100 ข้อ (ปรับตามข้อมูลจริง) ───
  'kp-full': {
    id: 'kp-full',
    version: '1.0',
    label: 'จำลองสอบ ก.พ. (เต็ม)',
    description: 'สัดส่วนตามข้อสอบจริง ครอบคลุมทุกหมวด',
    rounds: {
      paper: {
        total: 100,
        durationMin: 180,
        sectionOrder: ['thai', 'math', 'eng', 'law'],
        quota: {
          thai: 25,
          math: 25,
          eng: 25,
          law: 25,
        },
        subMin: {
          // ไทย
          'thai.grammar': 8,
          'thai.reading': 8,
          'thai.vocab':   5,
          // คณิต
          'math.arithmetic': 8,
          'math.logic':      4,
          'math.sequence':   3,
          'math.stats':      4,
          // อังกฤษ
          'eng.grammar':      8,
          'eng.reading':      4,
          'eng.vocab':        5,
          'eng.conversation': 3,
          // กฎหมาย
          'law.civil_service':  10,
          'law.administrative': 6,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 2) ทดสอบสั้น — 25 ข้อ ───
  'kp-quick': {
    id: 'kp-quick',
    version: '1.0',
    label: 'ทดสอบสั้น (25 ข้อ)',
    description: 'ทดสอบเร็ว ครอบคลุมทุกหมวด',
    rounds: {
      paper: {
        total: 25,
        durationMin: 30,
        sectionOrder: ['thai', 'math', 'eng', 'law'],
        quota: { thai: 7, math: 6, eng: 6, law: 6 },
        subMin: {},
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 3) ไทยเท่านั้น — 25 ข้อ ───
  'kp-thai': {
    id: 'kp-thai',
    version: '1.0',
    label: 'ภาษาไทย',
    description: 'ฝึกภาษาไทยโดยเฉพาะ',
    rounds: {
      paper: {
        total: 25,
        durationMin: 38,
        sectionOrder: ['thai'],
        quota: { thai: 25 },
        subMin: {
          'thai.grammar': 8,
          'thai.reading': 10,
          'thai.vocab':   5,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 4) คณิตเท่านั้น — 25 ข้อ ───
  'kp-math': {
    id: 'kp-math',
    version: '1.0',
    label: 'คณิตศาสตร์',
    description: 'ฝึกคณิตศาสตร์โดยเฉพาะ',
    rounds: {
      paper: {
        total: 23,
        durationMin: 35,
        sectionOrder: ['math'],
        quota: { math: 23 },
        subMin: {
          'math.arithmetic': 8,
          'math.logic':      4,
          'math.sequence':   3,
          'math.stats':      4,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 5) อังกฤษเท่านั้น — 25 ข้อ ───
  'kp-eng': {
    id: 'kp-eng',
    version: '1.0',
    label: 'ภาษาอังกฤษ',
    description: 'ฝึกภาษาอังกฤษโดยเฉพาะ',
    rounds: {
      paper: {
        total: 22,
        durationMin: 33,
        sectionOrder: ['eng'],
        quota: { eng: 22 },
        subMin: {
          'eng.grammar': 8,
          'eng.reading': 4,
          'eng.vocab':   5,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 6) กฎหมายเท่านั้น — 20 ข้อ ───
  'kp-law': {
    id: 'kp-law',
    version: '1.0',
    label: 'การเป็นข้าราชการที่ดี',
    description: 'ฝึกกฎหมายและจริยธรรม',
    rounds: {
      paper: {
        total: 20,
        durationMin: 30,
        sectionOrder: ['law'],
        quota: { law: 20 },
        subMin: {
          'law.civil_service':  10,
          'law.administrative': 6,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

};

// ─── Helper ───
export function getBlueprint(id) {
  const bp = BLUEPRINTS[id];
  if (!bp) throw new Error(`ไม่พบ blueprint "${id}"`);
  return bp;
}

// ─── Getter สำหรับ list ใน dropdown ───
export function listBlueprints() {
  return Object.values(BLUEPRINTS).map((bp) => ({
    id: bp.id,
    label: bp.label,
    description: bp.description,
    total: Object.values(bp.rounds)[0]?.total ?? 0,
  }));
}