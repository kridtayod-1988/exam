// src/supabaseClient.js
// ตัวอย่างการตั้งค่า Supabase client สำหรับโปรเจค (frontend)
// โปรดตั้งค่า environment variables ในระบบ build ของคุณ (Vite / Create React App / Next.js ฯลฯ)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_ANON_KEY is not set. Set env vars before using Supabase.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
