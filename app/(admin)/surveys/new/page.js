import LangFields from '@/components/LangFields';
import { createSurvey } from '../../../actions';
export default function NewSurvey() {
  return (
    <>
      <h1>Yangi so'rovnoma</h1>
      <form action={createSurvey} className="card grid">
        <LangFields name="title" label="Nomi" />
        <LangFields name="desc" label="Tavsif" textarea required={false} />
        <p className="muted" style={{ margin: 0 }}>Ruscha/inglizcha bo'sh qolsa, o'zbekcha matn ko'rsatiladi. Keyingi qadamda savollar qo'shasiz.</p>
        <div><button className="btn">Yaratish va savollar qo'shish →</button></div>
      </form>
    </>
  );
}
