export async function tg(method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.ok) console.error('TG error', method, j.description);
    return j;
  } catch (e) {
    console.error('TG fetch failed', method, e);
    return { ok: false, description: String(e) };
  }
}
