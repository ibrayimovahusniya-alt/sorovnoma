'use client';
import { useState } from 'react';
import LangFields from './LangFields';

export default function QuestionForm({ action, surveyId, question, submitLabel = "Qo'shish" }) {
  const [type, setType] = useState(question?.type || 'choice');
  const opts = question?.options || [];
  const optVals = {
    uz: opts.map((o) => o.uz).join('\n'),
    ru: opts.map((o) => o.ru).join('\n'),
    en: opts.map((o) => o.en).join('\n'),
  };
  return (
    <form action={action} className="grid">
      <input type="hidden" name="survey_id" value={surveyId} />
      {question && <input type="hidden" name="id" value={question.id} />}
      <div style={{ maxWidth: 300 }}>
        <label>Savol turi</label>
        <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="choice">Variantli (tugmalar)</option>
          <option value="text">Erkin javob (matn)</option>
        </select>
      </div>
      <LangFields name="text" label="Savol matni" textarea values={{ uz: question?.text_uz, ru: question?.text_ru, en: question?.text_en }} />
      {type === 'choice' && (
        <>
          <p className="muted" style={{ margin: 0 }}>Variantlar: har bir qatorga bittadan (kamida 2 ta). Tillardagi qatorlar tartibi bir xil bo'lsin.</p>
          <LangFields name="opt" label="Variantlar" textarea values={optVals} hint={"Ha\nYo'q"} />
        </>
      )}
      <div><button className="btn">{submitLabel}</button></div>
    </form>
  );
}
