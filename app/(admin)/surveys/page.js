import Link from 'next/link';
import { q } from '@/lib/db';
import { toggleSurvey } from '../../actions';
export default async function Surveys() {
  const list = await q(`SELECT s.*,
    (SELECT count(*) FROM questions WHERE survey_id=s.id)::int AS qn,
    (SELECT count(*) FROM responses WHERE survey_id=s.id AND completed)::int AS rn,
    (SELECT count(*) FROM responses WHERE survey_id=s.id AND completed AND NOT seen)::int AS un
    FROM surveys s ORDER BY s.created_at DESC`);
  return (
    <>
      <div className="row between"><h1>So'rovnomalar</h1><Link className="btn" href="/surveys/new">➕ Yangi so'rovnoma</Link></div>
      <div className="card tablewrap">
        {!list.length && <p className="muted">Hali so'rovnoma yo'q. "Yangi so'rovnoma" tugmasini bosing.</p>}
        {!!list.length && (
          <table>
            <thead><tr><th>Nomi</th><th>Savollar</th><th>Javoblar</th><th>Holat</th><th></th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/surveys/${s.id}`}><b>{s.title_uz}</b></Link></td>
                  <td>{s.qn}</td>
                  <td><Link href={`/surveys/${s.id}/responses`}>{s.rn}</Link>{s.un > 0 && <span className="pill-new sm">+{s.un} yangi</span>}</td>
                  <td><span className={`badge ${s.active ? 'on' : 'off'}`}>{s.active ? 'Faol' : 'Nofaol'}</span></td>
                  <td className="row">
                    <Link className="btn sec sm" href={`/surveys/${s.id}`}>Tahrirlash</Link>
                    <Link className="btn sec sm" href={`/surveys/${s.id}/responses`}>Javoblar</Link>
                    <form action={toggleSurvey}><input type="hidden" name="id" value={s.id} />
                      <button className={`btn sm ${s.active ? 'sec' : 'ok'}`}>{s.active ? "To'xtatish" : 'Faollashtirish'}</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
