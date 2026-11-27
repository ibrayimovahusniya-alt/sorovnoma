// Web Crypto: middleware (edge) va server (node) da ishlaydi
async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function sessionToken() {
  return sha256hex(`admin:${process.env.ADMIN_PASSWORD}:${process.env.SESSION_SECRET}`);
}
export async function webhookSecret() {
  return (await sha256hex(`webhook:${process.env.SESSION_SECRET}:${process.env.BOT_TOKEN}`)).slice(0, 48);
}
