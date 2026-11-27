'use server';
import { q, setSetting } from '@/lib/db';
import { tg } from '@/lib/tg';
import { sessionToken } from '@/lib/session';
import { installWebhook } from '@/lib/webhook';
import { loc } from '@/lib/i18n';
import { T } from '@/lib/i18n';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const s = (f, k) => String(f.get(k) ?? '').trim();
const n = (f, k) => Number(f.get(k));
const lines = (f, k) => s(f, k).split('\n').map((x) => x.trim()).filter(Boolean);

// ---------- kirish ----------
export async function login(_prev, f) {
  if (!process.env.ADMIN_PASSWORD || s(f, 'password') !== process.env.ADMIN_PASSWORD) {
    return { error: "Parol noto'g'ri" };
  }
  cookies().set('adm', await sessionToken(), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/');
}

export async function logout() {
  cookies().delete('adm');
  redirect('/login');
}

// ---------- so'rovnomalar ----------
function surveyFields(f) {
  return [s(f, 'title_uz'), s(f, 'title_ru'), s(f, 'title_en'), s(f, 'desc_uz'), s(f, 'desc_ru'), s(f, 'desc_en')];
}

export async function createSurvey(f) {
  if (!s(f, 'title_uz')) return;
  const [row] = await q(
    'INSERT INTO surveys(title_uz,title_ru,title_en,desc_uz,desc_ru,desc_en,active) VALUES($1,$2,$3,$4,$5,$6,false) RETURNING id',
    surveyFields(f)
  );
  redirect(`/surveys/${row.id}`);
}

export async function updateSurvey(f) {
  const id = n(f, 'id');
  if (!s(f, 'title_uz')) return;
  await q(
    'UPDATE surveys SET title_uz=$2,title_ru=$3,title_en=$4,desc_uz=$5,desc_ru=$6,desc_en=$7 WHERE id=$1',
    [id, ...surveyFields(f)]
  );
  revalidatePath(`/surveys/${id}`);
}

export async function toggleSurvey(f) {
  const id = n(f, 'id');
  await q('UPDATE surveys SET active = NOT active WHERE id=$1', [id]);
  revalidatePath('/surveys');
  revalidatePath(`/surveys/${id}`);
}

export async function deleteSurvey(f) {
  await q('DELETE FROM surveys WHERE id=$1', [n(f, 'id')]);
  redirect('/surveys');
}

function questionFields(f) {
  const type = s(f, 'type') === 'text' ? 'text' : 'choice';
  let options = [];
  if (type === 'choice') {
    const uz = lines(f, 'opt_uz'), ru = lines(f, 'opt_ru'), en = lines(f, 'opt_en');
    options = uz.map((u, i) => ({ uz: u, ru: ru[i] || '', en: en[i] || '' }));
  }
  return { type, options, text: [s(f, 'text_uz'), s(f, 'text_ru'), s(f, 'text_en')] };
}

export async function addQuestion(f) {
  const sid = n(f, 'survey_id');
  const { type, options, text } = questionFields(f);
  if (!text[0] || (type === 'choice' && options.length < 2)) {
    redirect(`/surveys/${sid}?err=q`);
  }
  await q(
    `INSERT INTO questions(survey_id,sort,type,text_uz,text_ru,text_en,options)
     VALUES($1,(SELECT COALESCE(MAX(sort),0)+1 FROM questions WHERE survey_id=$1),$2,$3,$4,$5,$6)`,
    [sid, type, ...text, JSON.stringify(options)]
  );
  revalidatePath(`/surveys/${sid}`);
}

export async function updateQuestion(f) {
  const id = n(f, 'id'), sid = n(f, 'survey_id');
  const { type, options, text } = questionFields(f);
  if (!text[0] || (type === 'choice' && options.length < 2)) redirect(`/surveys/${sid}?err=q`);
  await q('UPDATE questions SET type=$2,text_uz=$3,text_ru=$4,text_en=$5,options=$6 WHERE id=$1', [id, type, ...text, JSON.stringify(options)]);
  revalidatePath(`/surveys/${sid}`);
}

export async function deleteQuestion(f) {
  await q('DELETE FROM questions WHERE id=$1', [n(f, 'id')]);
  revalidatePath(`/surveys/${n(f, 'survey_id')}`);
}

export async function moveQuestion(f) {
  const sid = n(f, 'survey_id'), id = n(f, 'id'), dir = s(f, 'dir');
  const qs = await q('SELECT id FROM questions WHERE survey_id=$1 ORDER BY sort,id', [sid]);
  const i = qs.findIndex((x) => x.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= qs.length) return;
  [qs[i], qs[j]] = [qs[j], qs[i]];
  for (let k = 0; k < qs.length; k++) await q('UPDATE questions SET sort=$2 WHERE id=$1', [qs[k].id, k]);
  revalidatePath(`/surveys/${sid}`);
}

export async function deleteResponse(f) {
  await q('DELETE FROM responses WHERE id=$1', [n(f, 'id')]);
  revalidatePath(`/surveys/${n(f, 'survey_id')}/responses`);
}

export async function clearResponses(f) {
  const sid = n(f, 'survey_id');
  await q('DELETE FROM responses WHERE survey_id=$1', [sid]);
  revalidatePath(`/surveys/${sid}/responses`);
}

// Barcha ro'yxatdan o'tgan foydalanuvchilarga so'rovnoma haqida xabar
export async function broadcastSurvey(f) {
  const sid = n(f, 'id');
  const [sv] = await q('SELECT * FROM surveys WHERE id=$1', [sid]);
  if (!sv) return;
  if (!sv.active) await q('UPDATE surveys SET active=true WHERE id=$1', [sid]);
  const users = await q(
    `SELECT u.tg_id, u.lang FROM users u WHERE u.registered
     AND NOT EXISTS (SELECT 1 FROM responses r WHERE r.survey_id=$1 AND r.user_id=u.tg_id AND r.completed)`,
    [sid]
  );
  const started = Date.now();
  let sent = 0;
  for (let i = 0; i < users.length; i += 20) {
    if (Date.now() - started > 50000) break;
    const batch = users.slice(i, i + 20);
    const res = await Promise.all(batch.map((u) => {
      const l = u.lang || 'uz';
      return tg('sendMessage', {
        chat_id: u.tg_id,
        text: `${T[l].newSurvey}\n\n📋 ${loc(sv, 'title', l)}`,
        reply_markup: { inline_keyboard: [[{ text: T[l].start, callback_data: `sv:${sid}` }]] },
      });
    }));
    sent += res.filter((r) => r.ok).length;
    await new Promise((r) => setTimeout(r, 1000));
  }
  redirect(`/surveys/${sid}?sent=${sent}&total=${users.length}`);
}

// ---------- foydalanuvchilar ----------
export async function deleteUser(f) {
  await q('DELETE FROM users WHERE tg_id=$1', [s(f, 'id')]);
  revalidatePath('/users');
}

// ---------- hududlar ----------
export async function addRegion(f) {
  if (!s(f, 'name_uz')) return;
  await q(
    'INSERT INTO regions(name_uz,name_ru,name_en,sort) VALUES($1,$2,$3,(SELECT COALESCE(MAX(sort),0)+1 FROM regions))',
    [s(f, 'name_uz'), s(f, 'name_ru'), s(f, 'name_en')]
  );
  revalidatePath('/regions');
}

export async function updateRegion(f) {
  if (!s(f, 'name_uz')) return;
  await q('UPDATE regions SET name_uz=$2,name_ru=$3,name_en=$4 WHERE id=$1', [n(f, 'id'), s(f, 'name_uz'), s(f, 'name_ru'), s(f, 'name_en')]);
  revalidatePath('/regions');
}

export async function deleteRegion(f) {
  await q('DELETE FROM regions WHERE id=$1', [n(f, 'id')]);
  revalidatePath('/regions');
}

export async function addDistricts(f) {
  const rid = n(f, 'region_id');
  for (const name of lines(f, 'names')) {
    await q(
      'INSERT INTO districts(region_id,name,sort) VALUES($1,$2,(SELECT COALESCE(MAX(sort),0)+1 FROM districts WHERE region_id=$1))',
      [rid, name]
    );
  }
  revalidatePath('/regions');
}

export async function deleteDistrict(f) {
  await q('DELETE FROM districts WHERE id=$1', [n(f, 'id')]);
  revalidatePath('/regions');
}

// ---------- sozlamalar ----------
export async function saveSettings(f) {
  await setSetting('welcome_gif', s(f, 'welcome_gif'));
  await setSetting('admin_ids', s(f, 'admin_ids'));
  revalidatePath('/settings');
  redirect('/settings?saved=1');
}

export async function setupWebhook() {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const r = await installWebhook(host);
  redirect(`/settings?webhook=${r.ok ? 'ok' : 'fail'}`);
}
