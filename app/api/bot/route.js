import { handleUpdate } from '@/lib/bot';
import { webhookSecret } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== (await webhookSecret())) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const update = await req.json();
    await handleUpdate(update);
  } catch (e) {
    console.error('update failed', e);
  }
  return Response.json({ ok: true });
}

export function GET() {
  return Response.json({ ok: true, bot: 'sorovnoma' });
}
