// Uch tilda maydonlar: uz majburiy, ru/en bo'sh bo'lsa o'zbekchasi ishlatiladi
const L = [['uz', "O'zbekcha"], ['ru', 'Ruscha'], ['en', 'Inglizcha']];
export default function LangFields({ name, label, values = {}, textarea, required = true, hint }) {
  return (
    <div className="grid cols3">
      {L.map(([code, lname]) => (
        <div key={code}>
          <label>{label} ({lname}){code === 'uz' && required ? ' *' : ''}</label>
          {textarea ? (
            <textarea name={`${name}_${code}`} defaultValue={values[code] || ''} required={code === 'uz' && required} placeholder={hint} />
          ) : (
            <input name={`${name}_${code}`} defaultValue={values[code] || ''} required={code === 'uz' && required} />
          )}
        </div>
      ))}
    </div>
  );
}
