import Link from 'next/link';
import { q } from '@/lib/db';
export default async function Dashboard() {
  const [c] = await q(`SELECT
    (SELECT count(*) FROM users)::int AS users,
    (SELECT count(*) FROM users WHERE registered)::int AS reg,
    (SELECT count(*) FROM surveys)::int AS surveys,
    (SELECT count(*) FROM surveys WHERE active)::int AS active,
    (SELECT count(*) FROM responses WHERE completed)::int AS responses,
    (SELECT count(*) FROM users WHERE created_at > now() - interval '1 day')::int AS today`);
  const byRegion = await q(`SELECT r.name_uz, count(u.tg_id)::int AS n FROM regions r
    LEFT JOIN users u ON u.region_id=r.id AND u.registered GROUP BY r.id ORDER BY n DESC, r.sort`);
  const max = Math.max(1, ...byRegion.map((r) => r.n));
  const recent = await q(`SELECT r.*, s.title_uz, u.full_name FROM responses r JOIN surveys s ON s.id=r.survey_id
    JOIN users u ON u.tg_id=r.user_id WHERE r.completed ORDER BY r.completed_at DESC LIMIT 8`);
  const stats = [
    ['Foydalanuvchilar', c.users], ["Ro'yxatdan o'tgan", c.reg], ['Bugun yangi', c.today],
    ["So'rovnomalar", `${c.active} / ${c.surveys}`], ['Javoblar', c.responses],
  ];
  return (
    <>
      <h1>Bosh sahifa</h1>
      <div className="grid stats" style={{ marginBottom: 18 }}>
        {stats.map(([l, v]) => (<div key={l} className="card stat" style={{ margin: 0 }}><div className="num">{v}</div><div className="lbl">{l}</div></div>))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <div className="card">
          <h2>Hududlar bo'yicha foydalanuvchilar</h2>
          {byRegion.map((r) => (
            <div key={r.name_uz} style={{ marginBottom: 8 }}>
              <div className="row between"><span>{r.name_uz}</span><b>{r.n}</b></div>
              <div className="bar"><div style={{ width: `${(r.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>So'nggi javoblar</h2>
          {!recent.length && <p className="muted">Hali javoblar yo'q</p>}
          <table><tbody>
            {recent.map((r) => (
              <tr key={r.id}><td>{r.full_name}</td><td><Link href={`/surveys/${r.survey_id}/responses`}>{r.title_uz}</Link></td>
                <td className="muted">{new Date(r.completed_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </>
  );
}
