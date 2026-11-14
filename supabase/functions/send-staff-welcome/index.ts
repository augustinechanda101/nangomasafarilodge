// @ts-nocheck
// Supabase Edge Function: sends the staff welcome email via Resend.
// Deploy: Supabase dashboard → Edge Functions → Create → paste this file → deploy.
// Secrets needed (dashboard → Edge Functions → Secrets, or `supabase secrets set`):
//   RESEND_API_KEY — from resend.com → API Keys
//   RESEND_FROM    — optional, e.g. "Nangoma Safari Lodge <bookings@yourdomain.com>"
//                    (requires a verified domain in Resend; without one the
//                    test sender only delivers to your own email)
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { name, email } = await req.json();
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'name and email required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const from = Deno.env.get('RESEND_FROM') ?? 'Nangoma Safari Lodge <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Your Nangoma Safari Lodge account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color:#7a5c2e;">Welcome to Nangoma Safari Lodge, ${name}</h2>
            <p>Your staff account has been created. Here is how you sign in:</p>
            <p style="background:#f7f1e5; padding:12px 16px; border-radius:8px;">
              <b>Portal:</b> https://nangomasafarilodge.vercel.app<br/>
              <b>Email:</b> ${email}<br/>
              <b>Password:</b> nangoma2026
            </p>
            <p>Please change your password after your first sign-in.</p>
            <p style="color:#8a7a63; font-size:13px;">Nangoma Safari Lodge — Dam Lodge & Farm House</p>
          </div>
        `,
      }),
    });

    const body = await res.json();
    return new Response(JSON.stringify(body), {
      status: res.status, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
