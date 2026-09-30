// js/exam.js —— ตัวอย่างการต่อเข้ากับหน้า exam.html เดิม
// แสดงให้เห็นว่าโค้ดเดิมของท่านเปลี่ยนน้อยมาก

import { startExam, submitExam } from './exam-engine.js';
import { createExamState } from './exam-state.js';
import { requireAuth } from './auth-guard.js';
import { escapeHtml } from './utils.js';

const user = await requireAuth();
const params = new URLSearchParams(location.search);

const { attemptId, paper, meta } = await startExam({
  blueprintId: params.get('bp') ?? 'PRACTICE-20',
  round: params.get('round') ?? 'QUICK',
  categoryId: params.get('cat') || null,
});

const exam = createExamState(paper, meta, {
  onTimeout: () => handleSubmit('timeout'),
});

// วาด UI ใหม่ทุกครั้งที่สถานะเปลี่ยน — โค้ดวาดยังเป็นของเดิมทั้งหมด
exam.subscribe((view) => {
  document.getElementById('timer').textContent = view.timer.remainingText;
  document.getElementById('timer').classList.toggle('critical', view.timer.critical);
  document.getElementById('progress').textContent =
    `ตอบแล้ว ${view.progress.answered} จาก ${paper.length} ข้อ`;
  renderQuestion(view.current, view.answers[view.current?.id]);
  renderNavigator(view.progress.map);
});

if (!exam.hydrate()) exam.start();

async function handleSubmit(reason = 'manual') {
  const answers = exam.finish();
  const result = await submitExam(attemptId, answers);
  sessionStorage.setItem('lastResult', JSON.stringify({ ...result, attemptId }));
  location.href = `result.html?attempt=${attemptId}`;
}

document.getElementById('btn-submit').addEventListener('click', () => handleSubmit());