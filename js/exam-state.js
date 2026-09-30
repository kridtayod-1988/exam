// js/exam-state.js
// ═════════════════════════════════════════════════════════════════
// แปลง useExamEngine (React Hook) เป็น vanilla JavaScript
// รูปแบบ: Observable Store — subscribe แล้วให้ callback วาด UI เอง
// ใช้ได้กับ exam.html เดิมโดยไม่ต้องติดตั้ง React
// ═════════════════════════════════════════════════════════════════

export const STATUS = Object.freeze({
  IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', DONE: 'done',
});

export function createExamState(paper, meta, opts = {}) {
  const {
    storageKey = `exam:${meta.paperId ?? 'default'}`,
    autosave = true,
    onTimeout = null,
  } = opts;

  let state = {
    status: STATUS.IDLE, idx: 0, answers: {}, flags: {}, visited: {},
    startedAt: null, pausedAccumMs: 0, pausedAt: null,
  };
  const listeners = new Set();
  let timerId = null;

  const maxIdx = Math.max(0, paper.length - 1);
  const clamp = (n) => Math.max(0, Math.min(maxIdx, n));

  function emit() {
    const snapshot = getView();
    listeners.forEach((fn) => fn(snapshot));
    if (autosave) {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }
  }

  function getView() {
    const answered = Object.keys(state.answers).length;
    const elapsedMs = state.startedAt
      ? Date.now() - state.startedAt - state.pausedAccumMs : 0;
    const totalMs = (meta.durationSec ?? 0) * 1000;
    const remainingMs = Math.max(0, totalMs - elapsedMs);

    return {
      status: state.status,
      idx: state.idx,
      current: paper[state.idx] ?? null,
      answers: { ...state.answers },
      flags: { ...state.flags },
      progress: {
        answered, unanswered: paper.length - answered,
        flagged: Object.values(state.flags).filter(Boolean).length,
        percent: paper.length ? +((answered / paper.length) * 100).toFixed(1) : 0,
        map: paper.map((q, i) => ({
          i, no: q.no, id: q.id,
          answered: state.answers[q.id] != null,
          flagged: !!state.flags[q.id],
          visited: !!state.visited[q.id],
          current: i === state.idx,
        })),
      },
      timer: {
        elapsedMs, remainingMs, totalMs,
        remainingText: formatDuration(remainingMs),
        critical: totalMs > 0 && remainingMs < 5 * 60 * 1000,
      },
    };
  }

  function tick() {
    if (state.status !== STATUS.RUNNING) return;
    const v = getView();
    if (v.timer.totalMs > 0 && v.timer.remainingMs <= 0) {
      stopTimer();
      state.status = STATUS.DONE;
      emit();
      onTimeout?.();
      return;
    }
    emit();
  }

  function startTimer() { stopTimer(); timerId = setInterval(tick, 1000); }
  function stopTimer()  { if (timerId) { clearInterval(timerId); timerId = null; } }

  return {
    subscribe(fn) { listeners.add(fn); fn(getView()); return () => listeners.delete(fn); },

    hydrate() {
      if (!autosave) return false;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved && (saved.status === STATUS.RUNNING || saved.status === STATUS.PAUSED)) {
          state = saved;
          if (state.status === STATUS.RUNNING) startTimer();
          emit();
          return true;
        }
      } catch {}
      return false;
    },

    start() {
      state = { ...state, status: STATUS.RUNNING, startedAt: Date.now(),
                pausedAccumMs: 0, pausedAt: null };
      startTimer(); emit();
    },

    answer(qid, choice) {
      if (state.status !== STATUS.RUNNING) return;
      if (state.answers[qid] === choice) delete state.answers[qid];
      else state.answers[qid] = choice;
      emit();
    },

    flag(qid) { state.flags[qid] = !state.flags[qid]; emit(); },
    goto(i)   { state.idx = clamp(i); markVisited(); emit(); },
    next()    { state.idx = clamp(state.idx + 1); markVisited(); emit(); },
    prev()    { state.idx = clamp(state.idx - 1); markVisited(); emit(); },

    pause() {
      if (state.status !== STATUS.RUNNING) return;
      state.status = STATUS.PAUSED; state.pausedAt = Date.now();
      stopTimer(); emit();
    },

    resume() {
      if (state.status !== STATUS.PAUSED) return;
      state.pausedAccumMs += Date.now() - (state.pausedAt ?? Date.now());
      state.status = STATUS.RUNNING; state.pausedAt = null;
      startTimer(); emit();
    },

    finish() {
      stopTimer();
      state.status = STATUS.DONE;
      try { localStorage.removeItem(storageKey); } catch {}
      emit();
      return { ...state.answers };
    },

    getAnswers() { return { ...state.answers }; },
    destroy() { stopTimer(); listeners.clear(); },
  };

  function markVisited() {
    const q = paper[state.idx];
    if (q) state.visited[q.id] = true;
  }
}

export function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh > 0 ? `${p(hh)}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}