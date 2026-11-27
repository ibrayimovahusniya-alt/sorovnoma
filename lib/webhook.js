import { tg } from './tg';
import { webhookSecret } from './session';
import { ensureSchema } from './db';

export async function installWebhook(host) {
  await ensureSchema();
  const url = `https://${host}/api/bot`;
  const r = await tg('setWebhook', {
    url,
    secret_token: await webhookSecret(),
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  });
  await tg('setMyCommands', { commands: [{ command: 'start', description: 'Boshlash / Начать / Start' }] });
  return { url, ...r };
}
