import { installWebhook } from '@/lib/webhook';

export const dynamic = 'force-dynamic';

// Bir martalik sozlash: /api/setup?secret=SESSION_SECRET
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.SESSION_SECRET || u.searchParams.get('secret') !== process.env.SESSION_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return Response.json(await installWebhook(host));
}
