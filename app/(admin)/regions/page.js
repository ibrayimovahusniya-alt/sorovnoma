import { q } from '@/lib/db';
import Confirm from '@/components/Confirm';
import { addRegion, updateRegion, deleteRegion, addDistricts, deleteDistrict } from '../../actions';

export default async function Regions() {
  const regions = await q('SELECT * FROM regions ORDER BY sort,id');
  const districts = await q('SELECT * FROM districts ORDER BY sort,name');
  return (
    <>
      <h1>Hududlar</h1>
      <p className="muted">Ro'yxatda yo'q tuman yoki shahar bo'lsa, tegishli viloyatga qo'shing. Bir nechtasini bir vaqtda qo'shish uchun har birini yangi qatorga yozing.</p>
      {regions.map((r) => {
        const ds = districts.filter((d) => d.region_id === r.id);
        return (
          <div className="card" key={r.id}>
            <div className="row between"><h2>{r.name_uz} <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>({ds.length})</span></h2></div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {ds.map((d) => (
                <form key={d.id} action={deleteDistrict} className="chip">
                  {d.name}<input type="hidden" name="id" value={d.id} />
                  <Confirm className="" msg={`"${d.name}" o'chirilsinmi?`}>×</Confirm>
                </form>
              ))}
            </div>
            <form action={addDistricts} className="row" style={{ alignItems: 'flex-end' }}>
              <input type="hidden" name="region_id" value={r.id} />
              <div style={{ flex: 1, minWidth: 220 }}><label>Yangi tuman/shahar</label><textarea name="names" rows={1} style={{ minHeight: 40 }} placeholder="Masalan: Yangi tuman" required /></div>
              <button className="btn">➕ Qo'shish</button>
            </form>
            <details><summary>Viloyat nomini tahrirlash / o'chirish</summary>
              <form action={updateRegion} className="grid cols3" style={{ alignItems: 'end' }}>
                <input type="hidden" name="id" value={r.id} />
                <div><label>O'zbekcha</label><input name="name_uz" defaultValue={r.name_uz} required /></div>
                <div><label>Ruscha</label><input name="name_ru" defaultValue={r.name_ru || ''} /></div>
                <div><label>Inglizcha</label><input name="name_en" defaultValue={r.name_en || ''} /></div>
                <div><button className="btn sm">Saqlash</button></div>
              </form>
              <form action={deleteRegion} style={{ marginTop: 10 }}><input type="hidden" name="id" value={r.id} />
                <Confirm msg="Viloyat va uning barcha tumanlari o'chiriladi!">Viloyatni o'chirish</Confirm></form>
            </details>
          </div>
        );
      })}
      <div className="card">
        <h2>➕ Yangi viloyat qo'shish</h2>
        <form action={addRegion} className="grid cols3" style={{ alignItems: 'end' }}>
          <div><label>O'zbekcha *</label><input name="name_uz" required /></div>
          <div><label>Ruscha</label><input name="name_ru" /></div>
          <div><label>Inglizcha</label><input name="name_en" /></div>
          <div><button className="btn">Qo'shish</button></div>
        </form>
      </div>
    </>
  );
}
