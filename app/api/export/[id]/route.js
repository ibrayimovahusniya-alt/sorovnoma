import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

function cell(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req, { params }) {
  const id = Number(params.id);
  const [s] = await q('SELECT * FROM surveys WHERE id=$1', [id]);
  if (!s) return new Response('not found', { status: 404 });
  const qs = await q('SELECT * FROM questions WHERE survey_id=$1 ORDER BY sort,id', [id]);
  const rs = await q(
    `SELECT r.*, u.full_name, u.phone, u.username, u.lang, rg.name_uz AS region, d.name AS district
     FROM responses r JOIN users u ON u.tg_id=r.user_id
     LEFT JOIN regions rg ON rg.id=u.region_id LEFT JOIN districts d ON d.id=u.district_id
     WHERE r.survey_id=$1 ORDER BY r.created_at`,
    [id]
  );
  const ans = await q('SELECT a.* FROM answers a JOIN responses r ON r.id=a.response_id WHERE r.survey_id=$1', [id]);
  const map = {};
  for (const a of ans) (map[a.response_id] ||= {})[a.question_id] = a.value;

  const head = ['#', 'Sana', 'Holat', 'Ism familiya', 'Telefon', 'Username', 'Til', 'Viloyat', 'Tuman/shahar', ...qs.map((x) => x.text_uz)];
  const lines = [head.map(cell).join(';')];
  rs.forEach((r, i) => {
    lines.push([
      i + 1,
      new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 16),
      r.completed ? 'Tugallangan' : 'Tugallanmagan',
      r.full_name, r.phone, r.username ? '@' + r.username : '', r.lang, r.region, r.district,
      ...qs.map((x) => map[r.id]?.[x.id] ?? ''),
    ].map(cell).join(';'));
  });
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sorovnoma-${id}.csv"`,
    },
  });
}
