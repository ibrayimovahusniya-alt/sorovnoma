import Link from 'next/link';
import { q } from '@/lib/db';
import CountUp from '@/components/CountUp';

function ago(d) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s} soniya oldin`;
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return new Date(d).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

export default async function Dashboard() {
  const [c] = await q(`SELECT
    (SELECT count(*) FROM users)::int AS users,
    (SELECT count(*) FROM users WHERE registered)::int AS reg,
    (SELECT count(*) FROM surveys WHERE active)::int AS active,
    (SELECT count(*) FROM responses WHERE completed)::int AS responses,
    (SELECT count(*) FROM users WHERE created_at > now() - interval '1 day')::int AS today`);
  const byRegion = await q(`SELECT r.id, r.name_uz, count(u.tg_id)::int AS n FROM regions r
    LEFT JOIN users u ON u.region_id=r.id AND u.registered GROUP BY r.id ORDER BY n DESC, r.sort`);
  const max = Math.max(1, ...byRegion.map((r) => r.n));
  const feed = await q(`
    (SELECT 'resp' AS kind, r.completed_at AS at, u.full_name AS who, s.title_uz AS what, s.id AS sid
       FROM responses r JOIN surveys s ON s.id=r.survey_id JOIN users u ON u.tg_id=r.user_id WHERE r.completed)
    UNION ALL
    (SELECT 'user', u.created_at, COALESCE(u.full_name, u.tg_name), NULL, NULL FROM users u)
    ORDER BY at DESC LIMIT 10`);
  const stats = [
    ['👥', 'Jami foydalanuvchilar', c.users],
    ['✅', "Ro'yxatdan o'tgan", c.reg],
    ['✨', 'Bugun yangi', c.today],
    ['📋', "Faol so'rovnomalar", c.active],
    ['💬', 'Javoblar', c.responses],
  ];
  return (
    <>
      <h1>Xush kelibsiz 👋</h1>
      <div className="grid stats" style={{ marginBottom: 20 }}>
        {stats.map(([icon, l, v]) => (
          <div key={l} className="card stat">
            <div className="icon">{icon}</div>
            <div className="num"><CountUp value={v} /></div>
            <div className="lbl">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
        <div className="card">
          <h2>📍 Hududlar bo'yicha</h2>
          {byRegion.map((r) => (
            <div key={r.id} style={{ marginBottom: 10 }}>
              <div className="row between"><span>{r.name_uz}</span><b><CountUp value={r.n} /></b></div>
              <div className="bar"><div style={{ width: `${(r.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>⚡ So'nggi faollik</h2>
          {!feed.length && <p className="muted">Hali faollik yo'q. Botda /start bosilishi bilan shu yerda ko'rinadi.</p>}
          {feed.map((f, i) => (
            <div className="feed-item" key={`${f.kind}-${f.at}-${i}`} style={{ animation: 'rowIn .4s ease both' }}>
              <div className="avatar">{(f.who || '?').trim().charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{f.who || 'Nomsiz'}</b>{' '}
                {f.kind === 'resp'
                  ? <>so'rovnomaga javob berdi: <Link href={`/surveys/${f.sid}/responses`}>{f.what}</Link></>
                  : <span className="muted">botga qo'shildi</span>}
                <div className="muted" style={{ fontSize: 12 }}>{ago(f.at)}</div>
              </div>
              <span>{f.kind === 'resp' ? '💬' : '🆕'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
