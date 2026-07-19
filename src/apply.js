const TO = 'founders@aurigair.com';
const FROM = 'Auriga 申请表单 <noreply@mail.aurigair.com>';

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export async function handleApply(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const city = String(body.city ?? '').trim();
  const referral = String(body.referral ?? '').trim();
  const note = String(body.note ?? '').trim();

  // 蜜罐：真人看不到这个字段，填了的一律当机器人，静默丢弃
  if (String(body.company ?? '').trim()) return json({ ok: true });

  if (!name || !email) return json({ error: 'missing_fields' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
  if (name.length > 100 || email.length > 200 || referral.length > 200 || note.length > 2000) {
    return json({ error: 'too_long' }, 400);
  }

  const rows = [
    ['姓名', name],
    ['Email', email],
    ['城市', city || '—'],
    ['推荐人', referral || '—'],
    ['理想的飞行', note || '—'],
  ];

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: TO,
        from: FROM,
        subject: `Auriga 申请 · ${name}${city ? ` · ${city}` : ''}`,
        text: rows.map(([k, v]) => `${k}：${v}`).join('\n'),
        html: rows.map(([k, v]) => `<p><strong>${k}</strong><br>${esc(v)}</p>`).join(''),
        headers: { 'Reply-To': email },
      }),
    }
  );

  if (!res.ok) {
    console.error('email send failed', res.status, await res.text());
    return json({ error: 'send_failed' }, 502);
  }

  const result = await res.json();
  if (!result.success) {
    console.error('email send rejected', JSON.stringify(result.errors));
    return json({ error: 'send_failed' }, 502);
  }

  return json({ ok: true });
}
