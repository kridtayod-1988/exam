// js/lib/rng.js
// ═════════════════════════════════════════════════════════════════
// ย้ายจากรอบที่ 1 โดยไม่แก้ตรรกะใด ๆ — เปลี่ยนเฉพาะเส้นทางไฟล์
// ใช้ได้ทันทีในเบราว์เซอร์ผ่าน <script type="module">
// ═════════════════════════════════════════════════════════════════

export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(seed) {
  let a = typeof seed === 'string' ? xmur3(seed)() : seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n, rng) {
  return shuffle(arr, rng).slice(0, Math.min(n, arr.length));
}

export function makeSeed({ userId, blueprintId, round, attempt = 1, salt = '' }) {
  return [blueprintId, round, userId ?? 'anon', `a${attempt}`, salt]
    .filter(Boolean).join('|');
}