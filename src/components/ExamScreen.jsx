import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RAW_QUESTION_BANK } from '../data/examData';

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
}

export default function ExamScreen({ exam, onExit }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [view, setView] = useState('running'); // running | result

  const timerRef = useRef(null);

  useEffect(() => {
    // prepare questions
    let qPool = [...RAW_QUESTION_BANK];
    if (exam.category === 'math_thai') qPool = qPool.filter(q => q.cat === 'math' || q.cat === 'thai');
    else if (exam.category === 'english') qPool = qPool.filter(q => q.cat === 'english');
    else if (exam.category === 'law') qPool = qPool.filter(q => q.cat === 'law');

    // duplicate to meet count, but limit to 30 for demo
    let prepared = [];
    while (prepared.length < Math.min(exam.question_count, 30)) prepared = prepared.concat(qPool);
    prepared = prepared.slice(0, Math.min(exam.question_count, 30));

    setQuestions(prepared);
    setAnswers(Array(prepared.length).fill(null));
    setFlagged(Array(prepared.length).fill(false));
    setRemainingSeconds(exam.time_limit_minutes * 60);
    setCurrentQIndex(0);
  }, [exam]);

  useEffect(() => {
    if (view === 'running' && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [view, remainingSeconds]);

  const finishExam = (isTimeout = false) => {
    clearInterval(timerRef.current);
    setView('result');
    if (isTimeout) alert('หมดเวลาทำข้อสอบ ระบบส่งคำตอบให้โดยอัตโนมัติ');
  };

  const score = useMemo(() => {
    if (!questions.length) return { score: 0, total: 0, pct: 0 };
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    return { score: correct, total: questions.length, pct: Math.round((correct / questions.length) * 100) };
  }, [questions, answers]);

  if (!questions.length) return <div>กำลังเตรียมข้อสอบ...</div>;

  if (view === 'result') {
    return (
      <div className="min-h-screen">
        <div className="bg-[#141414] border border-[#222] rounded-3xl p-6 mb-6">
          <h2 className="text-xl font-bold">สรุปผลการสอบ: {exam.name}</h2>
          <div className="mt-4 inline-flex items-baseline gap-2 bg-[#1A1A1A] border border-[#2A2A2A] px-6 py-3 rounded-2xl mb-6">
            <span className="text-4xl font-black text-emerald-400">{score.score}</span>
            <span className="text-gray-500 text-lg font-bold">/ {score.total} คะแนน ({score.pct}%)</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {questions.map((q, idx) => {
              const userAns = answers[idx];
              const isCorrect = userAns === q.correct;
              return (
                <div key={idx} className="bg-[#1A1A1A] border border-[#262626] p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${isCorrect ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'}`}>ข้อ {idx+1} {isCorrect ? '✓' : '✕'}</div>
                    <div className="text-xs text-gray-500">หมวด {q.cat.toUpperCase()}</div>
                  </div>
                  <div className="font-semibold mb-2">{q.text}</div>
                  <div className="text-sm text-gray-300">คำตอบของคุณ: {userAns !== null ? q.options[userAns] : 'ไม่ได้ตอบ'}</div>
                  <div className="text-sm text-blue-300">เฉลย: {q.options[q.correct]}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={() => onExit()} className="px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#333]">กลับสู่คลังข้อสอบ</button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const { h, m, s } = formatTime(remainingSeconds);

  return (
    <div className="min-h-screen">
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-400">{exam.name}</div>
            <div className="text-xs text-gray-500">ข้อที่ {currentQIndex+1} / {questions.length}</div>
          </div>

          <div className="font-mono font-bold text-lg bg-[#181818] px-3 py-1 rounded-lg">{h}:{m}:{s}</div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg mb-4">
          <div className="text-lg font-semibold">{currentQ.text}</div>
        </div>

        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = answers[currentQIndex] === idx;
            return (
              <button key={idx} onClick={() => { const u = [...answers]; u[currentQIndex] = idx; setAnswers(u); }} className={`w-full p-3 rounded-lg text-left border ${isSelected ? 'bg-[#F2C744]/10 border-[#F2C744]' : 'bg-[#141414] border-[#222]'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-md font-bold ${isSelected ? 'bg-[#F2C744] text-black' : 'bg-[#1F1F1F] text-gray-300'}`}>{idx+1}</div>
                  <div>{opt}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <div className="flex gap-2">
            <button onClick={() => setCurrentQIndex(p => Math.max(0, p-1))} className="px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg">ก่อนหน้า</button>
            <button onClick={() => setCurrentQIndex(p => Math.min(questions.length-1, p+1))} className="px-4 py-2 bg-gradient-to-r from-[#C8922A] to-[#F2C744] rounded-lg">ถัดไป</button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => finishExam(false)} className="px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-lg">ส่งข้อสอบ</button>
            <button onClick={() => onExit()} className="px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg">ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  );
}
