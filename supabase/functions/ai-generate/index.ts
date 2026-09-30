// supabase/functions/ai-generate/index.ts
// ═════════════════════════════════════════════════════════════════
// Edge Function แก้ปัญหา AI API Key รั่วผ่านเบราว์เซอร์
// key อยู่ใน environment variable ของ Supabase ไม่ผ่านไคลเอนต์เลย
//
// ตั้งค่า:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// deploy :  supabase functions deploy ai-generate
// ═════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── ตรวจสิทธิ์: เฉพาะผู้ดูแลระบบเท่านั้นที่เรียกได้
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'ไม่พบข้อมูลการยืนยันตัวตน' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'กรุณาเข้าสู่ระบบ' }, 401);

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, 403);
    }

    // ── จำกัดอัตราการเรียก ป้องกันค่าใช้จ่ายพุ่งจากบัญชีที่ถูกยึด
    const { count } = await supabase
      .from('ai_generation_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if ((count ?? 0) >= 20) {
      return json({ error: 'เกินโควตา 20 ครั้งต่อชั่วโมง กรุณารอสักครู่' }, 429);
    }

    const { prompt, cat, sub, count: n = 5 } = await req.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,   // ไม่เคยถึงเบราว์เซอร์
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `สร้างข้อสอบปรนัย 4 ตัวเลือก จำนวน ${n} ข้อ ` +
                   `หมวด ${cat} หมวดย่อย ${sub}\n${prompt}\n\n` +
                   `ตอบเป็น JSON array เท่านั้น แต่ละรายการมีฟิลด์ ` +
                   `stem, choices (array ของ {k,t}), answer, explain, difficulty`,
        }],
      }),
    });

    const data = await res.json();

    await supabase.from('ai_generation_log').insert({
      user_id: user.id, cat, sub, count: n,
      tokens_used: data.usage?.output_tokens ?? 0,
    });

    return json({ content: data.content?.[0]?.text ?? '' });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}