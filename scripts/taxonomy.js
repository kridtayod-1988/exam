// ═══════════════════════ scripts/taxonomy.js ═══════════════════════
// นิยาม Ontology ของคลังข้อสอบ — ใช้ร่วมกันทั้งสคริปต์และ Admin UI

export const SUBJECTS = {
  aptitude: 'วิชาความสามารถในการคิดวิเคราะห์',
  thai:     'วิชาภาษาไทย',
  english:  'วิชาภาษาอังกฤษ',
  ethics:   'วิชาความรู้และลักษณะการเป็นข้าราชการที่ดี'
};

// keywords = น้ำหนัก 1.0 | strong = น้ำหนัก 2.5 (ตัวชี้วัดเฉพาะเจาะจง)
export const TOPICS = {
  /* ---------- 1) ความสามารถในการคิดวิเคราะห์ ---------- */
  apt_series: {
    subject: 'aptitude', label: 'อนุกรม / ลำดับตัวเลข',
    strong: ['อนุกรม', 'ลำดับถัดไป', 'จงหาตัวเลขถัดไป'],
    keywords: ['ชุดตัวเลข', 'เติมตัวเลข', '...', 'ตัวเลขที่หายไป']
  },
  apt_arithmetic: {
    subject: 'aptitude', label: 'คณิตศาสตร์พื้นฐาน / ร้อยละ',
    strong: ['ร้อยละ', 'เปอร์เซ็นต์', 'ดอกเบี้ย', 'กำไร', 'ขาดทุน', 'ส่วนลด'],
    keywords: ['อัตราส่วน', 'สัดส่วน', 'เฉลี่ย', 'บาท', 'เท่าของ', 'ค่าเฉลี่ย']
  },
  apt_word_problem: {
    subject: 'aptitude', label: 'โจทย์ปัญหา (งาน/เวลา/ความเร็ว)',
    strong: ['ความเร็ว', 'ทำงานเสร็จใน', 'อัตราเร็ว', 'ท่อน้ำ'],
    keywords: ['ชั่วโมง', 'กิโลเมตร', 'ระยะทาง', 'คนงาน', 'ใช้เวลา']
  },
  apt_data_analysis: {
    subject: 'aptitude', label: 'การวิเคราะห์ข้อมูลจากตาราง/กราф',
    strong: ['จากตาราง', 'จากแผนภูมิ', 'จากกราฟ', 'ข้อมูลต่อไปนี้'],
    keywords: ['ตารางแสดง', 'แผนภูมิแท่ง', 'แผนภูมิวงกลม', 'สถิติ']
  },
  apt_logic_verbal: {
    subject: 'aptitude', label: 'เงื่อนไขภาษา / ตรรกศาสตร์',
    strong: ['เงื่อนไขภาษา', 'สรุปได้ว่า', 'ข้อสรุปที่ 1', 'ข้อสรุปที่ 2'],
    keywords: ['ถ้า...แล้ว', 'ทุกคน', 'บางคน', 'ไม่มี', 'สมเหตุสมผล']
  },
  apt_logic_symbol: {
    subject: 'aptitude', label: 'เงื่อนไขสัญลักษณ์',
    strong: ['เงื่อนไขสัญลักษณ์', 'กำหนดให้', '≠', '≥', '≤'],
    keywords: ['สัญลักษณ์', 'A > B', 'มากกว่า', 'น้อยกว่า', 'เท่ากับ']
  },
  apt_spatial: {
    subject: 'aptitude', label: 'มิติสัมพันธ์ / อุปมาอุปไมย',
    strong: ['อุปมาอุปไมย', 'มิติสัมพันธ์', 'รูปคลี่', 'ภาพที่หายไป'],
    keywords: ['สัมพันธ์กับ', 'เปรียบเทียบ', 'รูปต่อไปนี้']
  },

  /* ---------- 2) ภาษาไทย ---------- */
  th_reading: {
    subject: 'thai', label: 'การอ่านจับใจความ / สรุปความ',
    strong: ['จากบทความ', 'ข้อความต่อไปนี้', 'ใจความสำคัญ', 'สาระสำคัญ'],
    keywords: ['ผู้เขียนต้องการ', 'สรุปความ', 'ตีความ', 'บทความนี้']
  },
  th_ordering: {
    subject: 'thai', label: 'การเรียงลำดับข้อความ',
    strong: ['เรียงลำดับข้อความ', 'เรียงประโยค', 'ลำดับที่เหมาะสม'],
    keywords: ['จงเรียง', 'ข้อความใดควรอยู่']
  },
  th_word_usage: {
    subject: 'thai', label: 'การใช้คำ / การสะกดคำ / ราชาศัพท์',
    strong: ['สะกดถูกต้อง', 'ใช้คำผิด', 'ราชาศัพท์', 'คำราชาศัพท์'],
    keywords: ['ความหมายของคำ', 'คำใดใช้ถูก', 'สำนวน', 'คำซ้อน']
  },
  th_sentence: {
    subject: 'thai', label: 'ประโยคบกพร่อง / โครงสร้างประโยค',
    strong: ['ประโยคใดบกพร่อง', 'ประโยคกำกวม', 'ประโยครัดกุม', 'ฟุ่มเฟือย'],
    keywords: ['ประโยคใดถูกต้อง', 'ภาษาระดับ', 'สื่อสารชัดเจน']
  },

  /* ---------- 3) ภาษาอังกฤษ ---------- */
  en_grammar: {
    subject: 'english', label: 'Grammar & Structure',
    strong: ['choose the correct', 'fill in the blank', 'tense', 'preposition'],
    keywords: ['verb', 'clause', 'article', 'subject-verb', 'passive']
  },
  en_vocabulary: {
    subject: 'english', label: 'Vocabulary',
    strong: ['closest in meaning', 'synonym', 'antonym', 'opposite meaning'],
    keywords: ['word', 'meaning of', 'definition']
  },
  en_conversation: {
    subject: 'english', label: 'Conversation',
    strong: ['conversation', 'dialogue', 'a:', 'b:', 'speaker'],
    keywords: ['respond', 'reply', 'situation', 'what would you say']
  },
  en_reading: {
    subject: 'english', label: 'Reading Comprehension',
    strong: ['passage', 'according to the text', 'the author', 'read the following'],
    keywords: ['main idea', 'infer', 'best title', 'paragraph']
  },

  /* ---------- 4) การเป็นข้าราชการที่ดี ---------- */
  eth_civil_act: {
    subject: 'ethics', label: 'พ.ร.บ. ระเบียบข้าราชการพลเรือน 2551',
    strong: ['ข้าราชการพลเรือน', 'ก.พ.ค.', 'วินัยอย่างร้ายแรง', 'ไล่ออก', 'ปลดออก'],
    keywords: ['วินัย', 'อุทธรณ์', 'ร้องทุกข์', 'ตำแหน่งประเภท', 'บรรจุแต่งตั้ง']
  },
  eth_admin_law: {
    subject: 'ethics', label: 'ระเบียบบริหารราชการแผ่นดิน',
    strong: ['บริหารราชการแผ่นดิน', 'ราชการส่วนภูมิภาค', 'ราชการส่วนกลาง', 'ปลัดกระทรวง'],
    keywords: ['กระทรวง', 'ทบวง', 'กรม', 'จังหวัด', 'อำเภอ', 'มอบอำนาจ']
  },
  eth_good_governance: {
    subject: 'ethics', label: 'พ.ร.ฎ. การบริหารกิจการบ้านเมืองที่ดี',
    strong: ['บริหารกิจการบ้านเมืองที่ดี', 'ธรรมาภิบาล', 'เกิดผลสัมฤทธิ์'],
    keywords: ['คุ้มค่า', 'ลดขั้นตอน', 'ประชาชนเป็นศูนย์กลาง', 'ประเมินผล']
  },
  eth_admin_procedure: {
    subject: 'ethics', label: 'วิธีปฏิบัติราชการทางปกครอง',
    strong: ['วิธีปฏิบัติราชการทางปกครอง', 'คำสั่งทางปกครอง', 'เจ้าหน้าที่มีส่วนได้เสีย'],
    keywords: ['คู่กรณี', 'เพิกถอน', 'แจ้งสิทธิอุทธรณ์', 'ทางปกครอง']
  },
  eth_liability: {
    subject: 'ethics', label: 'ความรับผิดทางละเมิดของเจ้าหน้าที่',
    strong: ['ความรับผิดทางละเมิด', 'ละเมิด', 'ไล่เบี้ย'],
    keywords: ['ชดใช้ค่าสินไหม', 'จงใจ', 'ประมาทเลินเล่ออย่างร้ายแรง']
  },
  eth_code: {
    subject: 'ethics', label: 'ประมวลจริยธรรม / มาตรฐานทางจริยธรรม',
    strong: ['ประมวลจริยธรรม', 'มาตรฐานทางจริยธรรม', 'ผลประโยชน์ทับซ้อน'],
    keywords: ['ซื่อสัตย์สุจริต', 'จิตสาธารณะ', 'ยึดมั่นในสถาบัน', 'คุณธรรม']
  }
};

export const DIFFICULTY = { easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก' };
export const BLOOM = {
  remember:   'จำ (Remember)',
  understand: 'เข้าใจ (Understand)',
  apply:      'ประยุกต์ (Apply)',
  analyze:    'วิเคราะห์ (Analyze)'
};

export const EXP_BY_DIFFICULTY = { easy: 10, medium: 15, hard: 25 };