import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q } from '@/lib/db';
import LangFields from '@/components/LangFields';
import QuestionForm from '@/components/QuestionForm';
import Confirm from '@/components/Confirm';
import { updateSurvey, toggleSurvey, deleteSurvey, addQuestion, updateQuestion, deleteQuestion, moveQuestion, broadcastSurvey } from '../../../actions';

export const maxDuration = 60;

export default async function SurveyPage({ params, searchParams }) {
  const id = Number(params.id);
  const [s] = await q('SELECT * FROM surveys WHERE id=$1', [id]);
  if (!s) notFound();
  const qs = await q('SELECT * FROM questions WHERE survey_id=$1 ORDER BY sort,id', [id]);
  const [{ rn }] = await q('SELECT count(*)::int AS rn FROM responses WHERE survey_id=$1 AND completed', [id]);
  return (
    <>
      <div className="row between">
        <h1>{s.title_uz} <span className={`badge ${s.active ? 'on' : 'off'}`}>{s.active ? 'Faol' : 'Nofaol'}</span></h1>
        <div className="row">
          <Link className="btn sec" href={`/surveys/${id}/responses`}>📊 Javoblar ({rn})</Link>
          <form action={toggleSurvey}><input type="hidden" name="id" value={id} />
            <button className={`btn ${s.active ? 'sec' : 'ok'}`}>{s.active ? "⏸ To'xtatish" : '▶️ Faollashtirish'}</button></form>
        </div>
      </div>
      {searchParams.sent && <div className="alert">📨 So'rovnoma botda {searchParams.sent} / {searchParams.total} foydalanuvchiga darhol yuborildi.</div>}
      {searchParams.err === 'q' && <div className="alert err">Savol matni (o'zbekcha) va kamida 2 ta variant kiritilishi kerak.</div>}
      {!s.active && <div className="alert">So'rovnoma nofaol — botda ko'rinmaydi. Savollarni qo'shib bo'lgach, "Faollashtirish" tugmasini bosing — so'rovnoma darhol barcha foydalanuvchilarga botda yuboriladi.</div>}

      <div className="card">
        <h2>Savollar ({qs.length})</h2>
        {!qs.length && <p className="muted">Hali savol yo'q. Pastdan qo'shing.</p>}
        {qs.map((qn, i) => (
          <div className="qitem" key={qn.id}>
            <div className="row between">
              <div><b>{i + 1}. {qn.text_uz}</b> <span className="muted">— {qn.type === 'text' ? 'erkin javob' : 'variantli'}</span></div>
              <div className="row">
                <form action={moveQuestion}><input type="hidden" name="survey_id" value={id} /><input type="hidden" name="id" value={qn.id} /><input type="hidden" name="dir" value="up" /><button className="btn sec sm" disabled={i === 0}>↑</button></form>
                <form action={moveQuestion}><input type="hidden" name="survey_id" value={id} /><input type="hidden" name="id" value={qn.id} /><input type="hidden" name="dir" value="down" /><button className="btn sec sm" disabled={i === qs.length - 1}>↓</button></form>
                <form action={deleteQuestion}><input type="hidden" name="survey_id" value={id} /><input type="hidden" name="id" value={qn.id} /><Confirm msg="Savol va unga berilgan javoblar o'chiriladi. Davom etilsinmi?">O'chirish</Confirm></form>
              </div>
            </div>
            {qn.type === 'choice' && <ul style={{ margin: '6px 0' }}>{qn.options.map((o, k) => <li key={k}>{o.uz}{o.ru || o.en ? <span className="muted"> / {o.ru} / {o.en}</span> : null}</li>)}</ul>}
            <details className="edit"><summary>Tahrirlash</summary><QuestionForm action={updateQuestion} surveyId={id} question={qn} submitLabel="Saqlash" /></details>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>➕ Savol qo'shish</h2>
        <QuestionForm action={addQuestion} surveyId={id} />
      </div>

      <div className="card">
        <h2>So'rovnoma ma'lumotlari</h2>
        <form action={updateSurvey} className="grid">
          <input type="hidden" name="id" value={id} />
          <LangFields name="title" label="Nomi" values={{ uz: s.title_uz, ru: s.title_ru, en: s.title_en }} />
          <LangFields name="desc" label="Tavsif" textarea required={false} values={{ uz: s.desc_uz, ru: s.desc_ru, en: s.desc_en }} />
          <div><button className="btn">Saqlash</button></div>
        </form>
      </div>

      <div className="card row between">
        <form action={broadcastSurvey}><input type="hidden" name="id" value={id} />
          <Confirm className="btn ok" msg="Barcha ro'yxatdan o'tgan foydalanuvchilarga (hali qatnashmaganlarga) bu so'rovnoma haqida xabar yuborilsinmi?">📨 Qayta yuborish (qatnashmaganlarga)</Confirm></form>
        <form action={deleteSurvey}><input type="hidden" name="id" value={id} />
          <Confirm msg="So'rovnoma va barcha javoblar butunlay o'chiriladi!" className="btn danger">🗑 So'rovnomani o'chirish</Confirm></form>
      </div>
    </>
  );
}
