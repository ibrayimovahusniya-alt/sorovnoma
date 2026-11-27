import Link from 'next/link';
import { q } from '@/lib/db';
import ResponseCard from '@/components/ResponseCard';
import { markAllSeen } from '../../actions';

function ago(d) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s} soniya oldin`;
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return new Date(d).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

export default async function Inbox({ searchParams }) {
  const onlyNew = searchParams.f === 'new';
  const sid = Number(searchParams.s) || null;
  const surveys = await q('SELECT id, title_uz FROM surveys ORDER BY created_at DESC');
  const [{ unseen, total }] = await q(`SELECT count(*) FILTER (WHERE NOT seen)::int AS unseen, count(*)::int AS total
    FROM responses WHERE completed AND ($1::int IS NULL OR survey_id=$1)`, [sid]);
  const rs = await q(
    `SELECT r.id, r.seen, r.completed_at, r.survey_id, s.title_uz AS survey, u.full_name, u.phone, u.username,
       rg.name_uz AS region, d.name AS district
     FROM responses r JOIN surveys s ON s.id=r.survey_id JOIN users u ON u.tg_id=r.user_id
     LEFT JOIN regions rg ON rg.id=u.region_id LEFT JOIN districts d ON d.id=u.district_id
     WHERE r.completed AND ($1::bool = false OR NOT r.seen) AND ($2::int IS NULL OR r.survey_id=$2)
     ORDER BY r.seen ASC, r.completed_at DESC LIMIT 200`,
    [onlyNew, sid]
  );
  const ids = rs.map((r) => r.id);
  const ans = ids.length ? await q(
    `SELECT a.response_id, a.value, qq.text_uz, qq.sort, qq.id FROM answers a JOIN questions qq ON qq.id=a.question_id
     WHERE a.response_id = ANY($1::int[]) ORDER BY qq.sort, qq.id`, [ids]) : [];
  const byResp = {};
  for (const a of ans) (byResp[a.response_id] ||= []).push(a);
  const link = (o) => {
    const p = new URLSearchParams({ ...(onlyNew ? { f: 'new' } : {}), ...(sid ? { s: sid } : {}), ...o });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return '/responses' + (p.toString() ? '?' + p : '');
  };

  return (
    <>
      <div className="row between">
        <h1>💬 Javoblar {unseen > 0 && <span className="pill-new">{unseen} ta yangi</span>}</h1>
        {unseen > 0 && (
          <form action={markAllSeen}>{sid && <input type="hidden" name="survey_id" value={sid} />}
            <button className="btn sec">✓ Hammasini ko'rildi deb belgilash</button></form>
        )}
      </div>
      <div className="card row">
        <div className="tabs">
          <Link className={!onlyNew ? 'on' : ''} href={link({ f: '' })}>Hammasi ({total})</Link>
          <Link className={onlyNew ? 'on' : ''} href={link({ f: 'new' })}>Ko'rilmagan ({unseen})</Link>
        </div>
        <div className="tabs">
          <Link className={!sid ? 'on' : ''} href={link({ s: '' })}>Barcha so'rovnomalar</Link>
          {surveys.map((s) => <Link key={s.id} className={sid === s.id ? 'on' : ''} href={link({ s: s.id })}>{s.title_uz}</Link>)}
        </div>
      </div>
      {!rs.length && <div className="card empty">{onlyNew ? '🎉 Hamma javoblar ko\'rib chiqilgan!' : "Hali javoblar yo'q. Foydalanuvchi so'rovnomani tugatishi bilan shu yerda paydo bo'ladi."}</div>}
      {rs.map((r) => (
        <ResponseCard key={r.id} id={r.id} seen={r.seen} header={
          <>
            <span className="avatar">{(r.full_name || '?').trim().charAt(0).toUpperCase()}</span>
            <span className="resp-main">
              <b>{r.full_name}</b> <span className="muted">· {r.region}, {r.district}</span>
              <span className="resp-sub">📋 {r.survey} · {ago(r.completed_at)}</span>
            </span>
          </>
        }>
          <div className="row" style={{ gap: 18, marginBottom: 10 }}>
            <span>📱 {r.phone}</span>{r.username && <a href={`https://t.me/${r.username}`} target="_blank">@{r.username}</a>}
            <Link href={`/surveys/${r.survey_id}/responses`}>So'rovnoma natijalari →</Link>
          </div>
          {(byResp[r.id] || []).map((a, i) => (
            <div className="qa" key={a.id}><div className="q">{i + 1}. {a.text_uz}</div><div className="a">{a.value}</div></div>
          ))}
        </ResponseCard>
      ))}
    </>
  );
}
