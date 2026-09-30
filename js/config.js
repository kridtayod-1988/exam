// ═══════════════════════ js/config.js ═══════════════════════
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://wefgreavazpfctayjnmp.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZmdyZWF2YXpwZmN0YXlqbm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTk1MjMsImV4cCI6MjEwNTY3NTUyM30.XcBAvQ2z66STZj31NlwZyjB7vk4ozax3yg58t6_c1eI';   // anon key เท่านั้น

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SUBJECT_LABELS = {
  aptitude:'ความสามารถในการคิดวิเคราะห์', thai:'ภาษาไทย',
  english:'ภาษาอังกฤษ', ethics:'การเป็นข้าราชการที่ดี'
};
export const DIFF_LABELS = { easy:'ง่าย', medium:'ปานกลาง', hard:'ยาก' };
export const expForLevel = lvl => Math.pow(lvl - 1, 2) * 100;
export const fmtTime = s =>
  `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;