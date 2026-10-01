// js/lib/blueprint.js
// ═══════════════════════════════════════════════════════════════
// Blueprint Definitions — Taxonomy ใหม่
// ใช้ SC codes เป็น sub หลัก (SC_M1, SC_M2, ..., SC_L8)
// ═══════════════════════════════════════════════════════════════

// ─── 5 หมวดหลัก ───
export const TAXONOMY = {
  math:   { label: 'คณิตศาสตร์' },
  reason: { label: 'เหตุผล' },
  thai:   { label: 'ภาษาไทย' },
  eng:    { label: 'ภาษาอังกฤษ' },
  law:    { label: 'กฎหมาย' },
};

// ─── 24 หมวดย่อย ───
export const SUB_INDEX = {
  // คณิตศาสตร์
  'SC_M1': { cat: 'math',   label: 'คณิตศาสตร์พื้นฐาน' },
  'SC_M2': { cat: 'math',   label: 'อนุกรม' },
  'SC_M3': { cat: 'math',   label: 'โจทย์ปัญหา' },
  'SC_M4': { cat: 'math',   label: 'สมการและอสมการ' },
  'SC_M5': { cat: 'math',   label: 'ตารางและกราฟ' },

  // เหตุผล
  'SC_R1': { cat: 'reason', label: 'เงื่อนไขสัญลักษณ์' },
  'SC_R2': { cat: 'reason', label: 'เงื่อนไขภาษา' },
  'SC_R3': { cat: 'reason', label: 'ตรรกศาสตร์' },

  // ภาษาไทย
  'SC_T1': { cat: 'thai',   label: 'การเรียงลำดับข้อความ' },
  'SC_T2': { cat: 'thai',   label: 'การจับใจความสำคัญ' },
  'SC_T3': { cat: 'thai',   label: 'อุปมาอุปไมย' },
  'SC_T4': { cat: 'thai',   label: 'การใช้คำและกลุ่มคำ' },

  // ภาษาอังกฤษ
  'SC_E1': { cat: 'eng',    label: 'Conversation' },
  'SC_E2': { cat: 'eng',    label: 'Vocabulary' },
  'SC_E3': { cat: 'eng',    label: 'Grammar' },
  'SC_E4': { cat: 'eng',    label: 'Reading Comprehension' },

  // กฎหมาย
  'SC_L1': { cat: 'law',    label: 'ความรู้การเป็นข้าราชการที่ดี' },
  'SC_L2': { cat: 'law',    label: 'พ.ร.บ. ระเบียบข้าราชการพลเรือน 2551' },
  'SC_L3': { cat: 'law',    label: 'พ.ร.บ. ระเบียบบริหารราชการแผ่นดิน' },
  'SC_L4': { cat: 'law',    label: 'การบริหารกิจการบ้านเมืองที่ดี' },
  'SC_L5': { cat: 'law',    label: 'มาตรฐานทางจริยธรรม' },
  'SC_L6': { cat: 'law',    label: 'ความรับผิดทางละเมิดของเจ้าหน้าที่' },
  'SC_L7': { cat: 'law',    label: 'กฎหมายอาญา' },
  'SC_L8': { cat: 'law',    label: 'กฎหมายปกครอง' },
};

// ═══════════════════════════════════════════════════════════════
// BLUEPRINTS
// ═══════════════════════════════════════════════════════════════
// quota: จำนวนข้อต่อหมวดหลัก
// subMin: จำนวนขั้นต่ำต่อหมวดย่อย (optional — ใช้บังคับสัดส่วน)
// mix: {0: easy%, 1: medium%, 2: hard%}
// ═══════════════════════════════════════════════════════════════

export const BLUEPRINTS = {

  // ─── 1) จำลองสอบเต็ม 100 ข้อ ───
  'kp-full': {
    id: 'kp-full',
    version: '2.0',
    label: 'จำลองสอบ ก.พ. (เต็ม)',
    description: 'สัดส่วนตามข้อสอบจริง ครอบคลุม 5 หมวด',
    rounds: {
      paper: {
        total: 100,
        durationMin: 180,
        sectionOrder: ['math', 'reason', 'thai', 'eng', 'law'],
        quota: {
          math: 25,
          reason: 10,
          thai: 20,
          eng: 20,
          law: 25,
        },
        subMin: {
          // คณิต
          'SC_M1': 5, 'SC_M2': 3, 'SC_M3': 8, 'SC_M4': 4, 'SC_M5': 3,
          // เหตุผล
          'SC_R1': 4, 'SC_R2': 3, 'SC_R3': 3,
          // ไทย
          'SC_T1': 4, 'SC_T2': 8, 'SC_T3': 2, 'SC_T4': 6,
          // อังกฤษ
          'SC_E1': 4, 'SC_E2': 4, 'SC_E3': 8, 'SC_E4': 4,
          // กฎหมาย
          'SC_L1': 3, 'SC_L2': 6, 'SC_L3': 4, 'SC_L4': 4, 'SC_L5': 3, 'SC_L6': 3, 'SC_L7': 2,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 2) ทดสอบสั้น 25 ข้อ ───
  'kp-quick': {
    id: 'kp-quick',
    version: '2.0',
    label: 'ทดสอบสั้น (25 ข้อ)',
    description: 'ครอบคลุมทุกหมวด ใช้เวลาน้อย',
    rounds: {
      paper: {
        total: 25,
        durationMin: 30,
        sectionOrder: ['math', 'reason', 'thai', 'eng', 'law'],
        quota: { math: 6, reason: 3, thai: 5, eng: 5, law: 6 },
        subMin: {},
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 3) ภาษาไทย 20 ข้อ ───
  'kp-thai': {
    id: 'kp-thai',
    version: '2.0',
    label: 'ภาษาไทย',
    description: 'ฝึกภาษาไทยโดยเฉพาะ',
    rounds: {
      paper: {
        total: 20,
        durationMin: 30,
        sectionOrder: ['thai'],
        quota: { thai: 20 },
        subMin: { 'SC_T1': 4, 'SC_T2': 8, 'SC_T3': 2, 'SC_T4': 6 },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 4) คณิตศาสตร์ 25 ข้อ ───
  'kp-math': {
    id: 'kp-math',
    version: '2.0',
    label: 'คณิตศาสตร์',
    description: 'ฝึกคณิตศาสตร์โดยเฉพาะ',
    rounds: {
      paper: {
        total: 25,
        durationMin: 38,
        sectionOrder: ['math'],
        quota: { math: 25 },
        subMin: { 'SC_M1': 5, 'SC_M2': 3, 'SC_M3': 8, 'SC_M4': 4, 'SC_M5': 3 },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 5) เหตุผล 10 ข้อ ───
  'kp-reason': {
    id: 'kp-reason',
    version: '2.0',
    label: 'เหตุผล',
    description: 'ฝึกทักษะการคิดวิเคราะห์',
    rounds: {
      paper: {
        total: 10,
        durationMin: 15,
        sectionOrder: ['reason'],
        quota: { reason: 10 },
        subMin: { 'SC_R1': 4, 'SC_R2': 3, 'SC_R3': 3 },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 6) ภาษาอังกฤษ 20 ข้อ ───
  'kp-eng': {
    id: 'kp-eng',
    version: '2.0',
    label: 'ภาษาอังกฤษ',
    description: 'ฝึกภาษาอังกฤษโดยเฉพาะ',
    rounds: {
      paper: {
        total: 20,
        durationMin: 30,
        sectionOrder: ['eng'],
        quota: { eng: 20 },
        subMin: { 'SC_E1': 4, 'SC_E2': 4, 'SC_E3': 8, 'SC_E4': 4 },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

  // ─── 7) กฎหมาย 25 ข้อ ───
  'kp-law': {
    id: 'kp-law',
    version: '2.0',
    label: 'การเป็นข้าราชการที่ดี',
    description: 'ฝึกกฎหมายและจริยธรรม',
    rounds: {
      paper: {
        total: 25,
        durationMin: 38,
        sectionOrder: ['law'],
        quota: { law: 25 },
        subMin: {
          'SC_L1': 3, 'SC_L2': 6, 'SC_L3': 4, 'SC_L4': 4,
          'SC_L5': 3, 'SC_L6': 3, 'SC_L7': 2,
        },
        mix: { 0: 0.3, 1: 0.5, 2: 0.2 },
      },
    },
  },

};

// ─── Helpers ───
export function getBlueprint(id) {
  const bp = BLUEPRINTS[id];
  if (!bp) throw new Error(`ไม่พบ blueprint "${id}"`);
  return bp;
}

export function listBlueprints() {
  return Object.values(BLUEPRINTS).map((bp) => {
    const round = Object.values(bp.rounds)[0];
    return {
      id: bp.id,
      label: bp.label,
      description: bp.description,
      total: round?.total ?? 0,
      durationMin: round?.durationMin ?? 0,
    };
  });
}

export function getSubLabel(code) {
  return SUB_INDEX[code]?.label ?? code;
}