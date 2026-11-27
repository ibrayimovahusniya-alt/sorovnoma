import { q } from '@/lib/db';
import Confirm from '@/components/Confirm';
import { deleteUser } from '../../actions';

export default async function Users({ searchParams }) {
  const search = (searchParams.q || '').trim();
  const regionF = Number(searchParams.region) || null;
  const regions = await q('SELECT id,name_uz FROM regions ORDER BY sort,id');
  const users = await q(
    `SELECT u.*, r.name_uz AS region, d.name AS district,
       (SELECT count(*) FROM responses x WHERE x.user_id=u.tg_id AND x.completed)::int AS rn
     FROM users u LEFT JOIN regions r ON r.id=u.region_id LEFT JOIN districts d ON d.id=u.district_id
     WHERE ($1 = '' OR u.full_name ILIKE '%'||$1||'%' OR u.phone ILIKE '%'||$1||'%' OR u.username ILIKE '%'||$1||'%')
       AND ($2::int IS NULL OR u.region_id=$2)
     ORDER BY u.created_at DESC LIMIT 500`,
    [search, regionF]
  );
  return (
    <>
      <h1>Foydalanuvchilar</h1>
      <form className="card row" method="get">
        <div style={{ flex: 1, minWidth: 200 }}><label>Qidirish (ism, telefon, username)</label><input name="q" defaultValue={search} /></div>
        <div style={{ minWidth: 220 }}><label>Viloyat</label>
          <select name="region" defaultValue={regionF || ''}><option value="">Barchasi</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name_uz}</option>)}</select></div>
        <button className="btn" style={{ alignSelf: 'flex-end' }}>Qidirish</button>
      </form>
      <div className="card tablewrap">
        <p className="muted" style={{ marginTop: 0 }}>Ko'rsatilmoqda: {users.length}</p>
        <table>
          <thead><tr><th>Ism familiya</th><th>Telefon</th><th>Hudud</th><th>Til</th><th>Javoblar</th><th>Holat</th><th>Sana</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.tg_id}>
                <td>{u.full_name || <span className="muted">{u.tg_name}</span>}{u.username && <div className="muted">@{u.username}</div>}</td>
                <td>{u.phone}</td>
                <td>{u.region}<div className="muted">{u.district}</div></td>
                <td>{u.lang}</td>
                <td>{u.rn}</td>
                <td><span className={`badge ${u.registered ? 'on' : 'off'}`}>{u.registered ? "Ro'yxatdan o'tgan" : 'Jarayonda'}</span></td>
                <td className="muted">{new Date(u.created_at).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</td>
                <td><form action={deleteUser}><input type="hidden" name="id" value={u.tg_id} /><Confirm msg="Foydalanuvchi va uning javoblari o'chiriladi. Davom etilsinmi?">×</Confirm></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
