import { getSetting } from '@/lib/db';
import { tg } from '@/lib/tg';
import { saveSettings, setupWebhook } from '../../actions';

export default async function Settings({ searchParams }) {
  const gif = await getSetting('welcome_gif');
  const adminIds = await getSetting('admin_ids');
  const [info, me] = await Promise.all([tg('getWebhookInfo', {}), tg('getMe', {})]);
  const w = info.result || {};
  return (
    <>
      <h1>Sozlamalar</h1>
      {searchParams.saved && <div className="alert">✅ Saqlandi</div>}
      {searchParams.webhook && <div className={`alert ${searchParams.webhook === 'ok' ? '' : 'err'}`}>{searchParams.webhook === 'ok' ? '✅ Webhook o\'rnatildi' : '❌ Webhook o\'rnatilmadi'}</div>}

      <div className="card">
        <h2>🤖 Bot holati</h2>
        <p>Bot: {me.ok ? <a href={`https://t.me/${me.result.username}`} target="_blank">@{me.result.username}</a> : <span className="muted">token xato</span>}</p>
        <p>Webhook: {w.url ? <code>{w.url}</code> : <b style={{ color: 'var(--danger)' }}>o'rnatilmagan</b>}</p>
        {w.last_error_message && <p className="muted">Oxirgi xato: {w.last_error_message}</p>}
        {w.pending_update_count > 0 && <p className="muted">Navbatda: {w.pending_update_count}</p>}
        <form action={setupWebhook}><button className="btn">🔗 Webhookni o'rnatish / yangilash</button></form>
      </div>

      <form action={saveSettings} className="card grid">
        <h2>⚙️ Bot sozlamalari</h2>
        <div>
          <label>Xush kelibsiz GIF (file_id yoki havola)</label>
          <input name="welcome_gif" defaultValue={gif} placeholder="Bo'sh bo'lsa, standart animatsiya ishlatiladi" />
          <p className="muted" style={{ marginBottom: 0 }}>Eng oson yo'li: admin Telegram ID'ingizni pastga yozing, so'ng botga GIF yuboring — avtomatik saqlanadi.</p>
        </div>
        <div>
          <label>Admin Telegram ID'lari (vergul bilan)</label>
          <input name="admin_ids" defaultValue={adminIds} placeholder="123456789, 987654321" />
          <p className="muted" style={{ marginBottom: 0 }}>O'z ID'ingizni bilish uchun botga <code>/id</code> deb yozing.</p>
        </div>
        <div><button className="btn">Saqlash</button></div>
      </form>
    </>
  );
}
