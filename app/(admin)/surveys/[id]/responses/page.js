import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q } from '@/lib/db';
import Confirm from '@/components/Confirm';
import { deleteResponse, clearResponses } from '../../../../actions';

export default async function Responses({ params, searchParams }) {
  const id = Number(params.id);
  const [s] = await q('SELECT * FROM surveys WHERE id=$1', [id]);
  if (!s) notFound();
  const regionF = Number(searchParams.region) || null;
  const onlyDone = searchParams.all !== '1';
  const qs = await q('SELECT * FROM questions WHERE survey_id=$1 ORDER BY sort,id', [id]);
  const regions = await q('SELECT id,name_uz FROM regions ORDER BY sort,id');
  const rs = await q(
    `SELECT r.*, u.full_name, u.phone, u.username, rg.name_uz AS region, d.name AS district
     FROM responses r JOIN users u ON u.tg_id=r.user_id
     LEFT JOIN regions rg ON rg.id=u.region_id LEFT JOIN districts d ON d.id=u.district_id
     WHERE r.survey_id=$1 AND ($2::int IS NULL OR u.region_id=$2) AND ($3::bool = false OR r.completed)
     ORDER BY r.created_at DESC`,
    [id, regionF, onlyDone]
  );
  const ids = rs.map((r) => r.id);
  const ans = ids.length ? await q('SELECT * FROM answers WHERE response_id = ANY($1::int[])', [ids]) : [];
  const map = {};
  for (const a of ans) (map[a.response_id] ||= {})[a.question_id] = a;

  return (
    <>
      <div className="row between">
        <h1>📊 {s.title_uz}</h1>
        <div className="row">
          <Link className="btn sec" href={`/surveys/${id}`}>← So'rovnoma</Link>
          <a className="btn ok" href={`/api/export/${id}`}>⬇️ Excel (CSV) yuklab olish</a>
        </div>
      </div>

      <form className="card row" method="get">
        <div style={{ minWidth: 240 }}>
          <label>Viloyat bo'yicha filtr</label>
          <select name="region" defaultValue={regionF || ''}>
            <option value="">Barcha viloyatlar</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name_uz}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <label>Holat</label>
          <select name="all" defaultValue={onlyDone ? '' : '1'}>
            <option value="">Faqat tugallanganlar</option>
            <option value="1">Hammasi</option>
          </select>
        </div>
        <button className="btn" style={{ alignSelf: 'flex-end' }}>Ko'rsatish</button>
        <span className="muted" style={{ alignSelf: 'flex-end' }}>Jami: <b>{rs.length}</b></span>
      </form>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', marginBottom: 18 }}>
        {qs.filter((x) => x.type === 'choice').map((x) => {
          const counts = x.options.map((_, k) => rs.filter((r) => map[r.id]?.[x.id]?.option_index === k).length);
          const total = counts.reduce((a, b) => a + b, 0) || 1;
          return (
            <div className="card" key={x.id} style={{ margin: 0 }}>
              <h2 style={{ fontSize: 16 }}>{x.text_uz}</h2>
              {x.options.map((o, k) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div className="row between"><span>{o.uz}</span><span><b>{counts[k]}</b> <span className="muted">({Math.round((counts[k] / total) * 100)}%)</span></span></div>
                  <div className="bar"><div style={{ width: `${(counts[k] / total) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="card tablewrap">
        <h2>Javoblar ro'yxati</h2>
        {!rs.length ? <p className="muted">Javoblar yo'q</p> : (
          <table>
            <thead><tr><th>#</th><th>Ism familiya</th><th>Telefon</th><th>Hudud</th>{qs.map((x) => <th key={x.id}>{x.text_uz}</th>)}<th>Sana</th><th></th></tr></thead>
            <tbody>
              {rs.map((r, i) => (
                <tr key={r.id}>
                  <td>{rs.length - i}</td>
                  <td>{r.full_name}{r.username && <div className="muted">@{r.username}</div>}{!r.completed && <div><span className="badge off">tugallanmagan</span></div>}</td>
                  <td>{r.phone}</td>
                  <td>{r.region}<div className="muted">{r.district}</div></td>
                  {qs.map((x) => <td key={x.id}>{map[r.id]?.[x.id]?.value ?? <span className="muted">—</span>}</td>)}
                  <td className="muted">{new Date(r.created_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</td>
                  <td><form action={deleteResponse}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="survey_id" value={id} /><Confirm>×</Confirm></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form action={clearResponses}><input type="hidden" name="survey_id" value={id} />
        <Confirm className="btn danger sm" msg="Bu so'rovnomaning BARCHA javoblari o'chiriladi! Davom etilsinmi?">Barcha javoblarni tozalash</Confirm></form>
    </>
  );
}
