import { q, getSetting, setSetting } from './db';
import { tg } from './tg';
import { LANGS, LANG_NAMES, T, t, loc, locOpt } from './i18n';

export async function handleUpdate(u) {
  if (u.message) return onMessage(u.message);
  if (u.callback_query) return onCallback(u.callback_query);
}

// ---------- yordamchi funksiyalar ----------

async function getUser(from) {
  const rows = await q(
    `INSERT INTO users(tg_id, username, tg_name) VALUES($1,$2,$3)
     ON CONFLICT (tg_id) DO UPDATE SET username=EXCLUDED.username, tg_name=EXCLUDED.tg_name, last_seen=now()
     RETURNING *`,
    [from.id, from.username || null, [from.first_name, from.last_name].filter(Boolean).join(' ')]
  );
  return rows[0];
}

async function setState(id, state, data = null) {
  await q('UPDATE users SET state=$2, state_data=$3 WHERE tg_id=$1', [id, state, data ? JSON.stringify(data) : null]);
}

function send(chat_id, text, reply_markup) {
  return tg('sendMessage', { chat_id, text, reply_markup, parse_mode: 'HTML', disable_web_page_preview: true });
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rows2(buttons) {
  const out = [];
  for (let i = 0; i < buttons.length; i += 2) out.push(buttons.slice(i, i + 2));
  return out;
}

function menuKb(lang) {
  return {
    keyboard: [[{ text: t(lang, 'btnSurveys') }], [{ text: t(lang, 'btnProfile') }, { text: t(lang, 'btnLang') }]],
    resize_keyboard: true,
  };
}

function isBtn(text, key) {
  return LANGS.some((l) => T[l][key] === text);
}

async function isAdmin(id) {
  const ids = (await getSetting('admin_ids')).split(/[\s,]+/).filter(Boolean);
  return ids.includes(String(id));
}

// ---------- ro'yxatdan o'tish bosqichlari ----------

async function askLang(chatId, userId) {
  const kb = { inline_keyboard: LANGS.map((l) => [{ text: LANG_NAMES[l], callback_data: `lang:${l}` }]) };
  const caption = T.uz.chooseLang;
  // 1) admin o'rnatgan GIF, 2) keshlangan standart video, 3) /welcome.mp4 havolasi
  const custom = await getSetting('welcome_gif');
  const cached = custom ? '' : await getSetting('default_anim_id');
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const anim = custom || cached || (host ? `https://${host}/welcome.mp4` : '');
  let ok = false;
  if (anim) {
    const r = await tg('sendAnimation', { chat_id: chatId, animation: anim, caption, reply_markup: kb });
    ok = r.ok;
    if (ok && !custom && !cached) {
      const fid = r.result?.animation?.file_id || r.result?.document?.file_id || r.result?.video?.file_id;
      if (fid) await setSetting('default_anim_id', fid);
    }
  }
  // video file_id sendAnimation bilan o'tmasa, sendVideo bilan urinib ko'ramiz
  if (!ok && custom) ok = (await tg('sendVideo', { chat_id: chatId, video: custom, caption, reply_markup: kb })).ok;
  if (!ok) await send(chatId, caption, kb);
  await setState(userId, 'lang');
}

async function askPhone(chatId, user) {
  await send(chatId, t(user.lang, 'askPhone'), {
    keyboard: [[{ text: t(user.lang, 'sharePhone'), request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  });
  await setState(user.tg_id, 'phone');
}

async function regionKb(lang) {
  const regs = await q('SELECT * FROM regions ORDER BY sort, id');
  return { inline_keyboard: regs.map((r) => [{ text: loc(r, 'name', lang), callback_data: `reg:${r.id}` }]) };
}

async function askRegion(chatId, user) {
  await send(chatId, t(user.lang, 'askRegion'), await regionKb(user.lang));
  await setState(user.tg_id, 'region');
}

async function showMenu(chatId, user, text) {
  await send(chatId, text || t(user.lang, 'useMenu'), menuKb(user.lang));
}

// ---------- xabarlar ----------

async function onMessage(m) {
  if (m.chat.type !== 'private') return;
  const chatId = m.chat.id;
  const user = await getUser(m.from);
  const lang = user.lang || 'uz';
  const text = (m.text || '').trim();

  // Admin GIF yuborsa — xush kelibsiz animatsiyasi sifatida saqlanadi
  const media = m.animation || m.video;
  if (media && (await isAdmin(m.from.id))) {
    await setSetting('welcome_gif', media.file_id);
    return send(chatId, '✅ GIF saqlandi. Endi /start bosilganda shu animatsiya chiqadi.');
  }

  if (text === '/id') return send(chatId, `Sizning Telegram ID: <code>${m.from.id}</code>`);

  if (text.startsWith('/start')) {
    if (user.registered) {
      await setState(user.tg_id, null);
      const arg = text.split(' ')[1];
      if (arg?.startsWith('s')) return startSurvey(chatId, user, Number(arg.slice(1)));
      return showMenu(chatId, user);
    }
    return askLang(chatId, user.tg_id);
  }

  if (!user.lang || user.state === 'lang') return askLang(chatId, user.tg_id);

  // Ro'yxatdan o'tish
  if (user.state === 'phone') {
    if (!m.contact || (m.contact.user_id && m.contact.user_id !== m.from.id)) {
      return send(chatId, t(lang, 'phoneOwn'), {
        keyboard: [[{ text: t(lang, 'sharePhone'), request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      });
    }
    let phone = m.contact.phone_number.replace(/[^\d]/g, '');
    phone = '+' + phone;
    await q('UPDATE users SET phone=$2 WHERE tg_id=$1', [user.tg_id, phone]);
    await send(chatId, t(lang, 'askName'), { remove_keyboard: true });
    return setState(user.tg_id, 'name');
  }

  if (user.state === 'name') {
    const name = text.replace(/\s+/g, ' ');
    if (!name || name.startsWith('/') || name.length < 3 || name.length > 100 || !name.includes(' ')) {
      return send(chatId, t(lang, 'badName'));
    }
    await q('UPDATE users SET full_name=$2 WHERE tg_id=$1', [user.tg_id, name]);
    return askRegion(chatId, { ...user, lang });
  }

  if (user.state === 'region') return askRegion(chatId, { ...user, lang });

  // So'rovnomada matnli javob
  if (user.state === 'survey' && user.state_data?.qtype === 'text') {
    if (!text || text.startsWith('/')) return send(chatId, t(lang, 'writeAnswer'));
    if (isBtn(text, 'btnSurveys') || isBtn(text, 'btnProfile') || isBtn(text, 'btnLang')) {
      // foydalanuvchi so'rovnomadan chiqib ketdi
      await setState(user.tg_id, null);
    } else {
      const d = user.state_data;
      await saveAnswer(d.rid, d.qid, null, text.slice(0, 2000));
      return askQuestion(chatId, user, { ...d, i: d.i + 1 });
    }
  }

  if (!user.registered) {
    if (!user.phone) return askPhone(chatId, { ...user, lang });
    if (!user.full_name) { await send(chatId, t(lang, 'askName')); return setState(user.tg_id, 'name'); }
    return askRegion(chatId, { ...user, lang });
  }

  // Asosiy menyu
  if (isBtn(text, 'btnSurveys')) return listSurveys(chatId, user);
  if (isBtn(text, 'btnLang')) return askLang(chatId, user.tg_id);
  if (isBtn(text, 'btnProfile')) return showProfile(chatId, user);
  return showMenu(chatId, user);
}

async function showProfile(chatId, user) {
  const [p] = await q(
    `SELECT u.*, r.name_uz, r.name_ru, r.name_en, d.name AS district
     FROM users u LEFT JOIN regions r ON r.id=u.region_id LEFT JOIN districts d ON d.id=u.district_id
     WHERE u.tg_id=$1`,
    [user.tg_id]
  );
  const l = user.lang;
  const txt =
    `<b>${t(l, 'btnProfile')}</b>\n\n` +
    `${t(l, 'name')}: <b>${esc(p.full_name)}</b>\n` +
    `${t(l, 'phone')}: <b>${esc(p.phone)}</b>\n` +
    `${t(l, 'region')}: <b>${esc(loc(p, 'name', l))}</b>\n` +
    `${t(l, 'district')}: <b>${esc(p.district)}</b>`;
  await send(chatId, txt, { inline_keyboard: [[{ text: t(l, 'edit'), callback_data: 'reedit' }]] });
}

// ---------- so'rovnomalar ----------

async function listSurveys(chatId, user) {
  const list = await q(
    `SELECT s.*, r.completed FROM surveys s
     LEFT JOIN responses r ON r.survey_id=s.id AND r.user_id=$1
     WHERE s.active AND EXISTS (SELECT 1 FROM questions qq WHERE qq.survey_id=s.id)
     ORDER BY s.created_at DESC`,
    [user.tg_id]
  );
  if (!list.length) return send(chatId, t(user.lang, 'noSurveys'), menuKb(user.lang));
  await send(chatId, t(user.lang, 'chooseSurvey'), {
    inline_keyboard: list.map((s) => [{ text: (s.completed ? '✅ ' : '📝 ') + loc(s, 'title', user.lang), callback_data: `sv:${s.id}` }]),
  });
}

async function startSurvey(chatId, user, sid) {
  const l = user.lang;
  const [s] = await q('SELECT * FROM surveys WHERE id=$1 AND active', [sid]);
  if (!s) return send(chatId, t(l, 'notAvailable'));
  const [{ n }] = await q('SELECT count(*)::int AS n FROM questions WHERE survey_id=$1', [sid]);
  if (!n) return send(chatId, t(l, 'noQuestions'));
  const [ex] = await q('SELECT * FROM responses WHERE survey_id=$1 AND user_id=$2', [sid, user.tg_id]);
  if (ex?.completed) return send(chatId, t(l, 'alreadyDone'));
  let rid = ex?.id;
  if (rid) await q('DELETE FROM answers WHERE response_id=$1', [rid]);
  else rid = (await q('INSERT INTO responses(survey_id,user_id) VALUES($1,$2) RETURNING id', [sid, user.tg_id]))[0].id;

  const desc = loc(s, 'desc', l);
  await send(chatId, `📋 <b>${esc(loc(s, 'title', l))}</b>${desc ? '\n\n' + esc(desc) : ''}`, { remove_keyboard: true });
  return askQuestion(chatId, user, { rid, sid, i: 0 });
}

async function askQuestion(chatId, user, d) {
  const l = user.lang;
  const qs = await q('SELECT * FROM questions WHERE survey_id=$1 ORDER BY sort, id', [d.sid]);
  if (d.i >= qs.length) {
    await q('UPDATE responses SET completed=true, completed_at=now() WHERE id=$1', [d.rid]);
    await setState(user.tg_id, null);
    return showMenu(chatId, user, t(l, 'thanks'));
  }
  const qn = qs[d.i];
  const head = `❓ <b>${t(l, 'question')} ${d.i + 1}/${qs.length}</b>\n\n${esc(loc(qn, 'text', l))}`;
  await setState(user.tg_id, 'survey', { ...d, qid: qn.id, qtype: qn.type });
  if (qn.type === 'text') return send(chatId, `${head}\n\n${t(l, 'writeAnswer')}`, { remove_keyboard: true });
  const opts = qn.options || [];
  return send(chatId, head, {
    inline_keyboard: opts.map((o, idx) => [{ text: locOpt(o, l), callback_data: `ans:${qn.id}:${idx}` }]),
  });
}

async function saveAnswer(rid, qid, optionIndex, value) {
  await q(
    `INSERT INTO answers(response_id,question_id,option_index,value) VALUES($1,$2,$3,$4)
     ON CONFLICT(response_id,question_id) DO UPDATE SET option_index=EXCLUDED.option_index, value=EXCLUDED.value`,
    [rid, qid, optionIndex, value]
  );
}

// ---------- tugmalar (callback) ----------

async function onCallback(cb) {
  const data = cb.data || '';
  const chatId = cb.message?.chat.id;
  const msgId = cb.message?.message_id;
  const user = await getUser(cb.from);
  const answer = (text) => tg('answerCallbackQuery', { callback_query_id: cb.id, text });
  if (!chatId) return answer();

  if (data.startsWith('lang:')) {
    const lang = data.slice(5);
    if (!LANGS.includes(lang)) return answer();
    await q('UPDATE users SET lang=$2 WHERE tg_id=$1', [user.tg_id, lang]);
    await answer(LANG_NAMES[lang]);
    await tg('deleteMessage', { chat_id: chatId, message_id: msgId });
    const u = { ...user, lang };
    if (user.registered) {
      await setState(user.tg_id, null);
      return showMenu(chatId, u, t(lang, 'langSet'));
    }
    return askPhone(chatId, u);
  }

  const l = user.lang || 'uz';

  if (data === 'reedit') {
    await answer();
    await q('UPDATE users SET registered=false WHERE tg_id=$1', [user.tg_id]);
    return askPhone(chatId, { ...user, lang: l });
  }

  if (data.startsWith('reg:')) {
    if (user.state !== 'region') return answer(t(l, 'expired'));
    const rid = Number(data.slice(4));
    const [r] = await q('SELECT * FROM regions WHERE id=$1', [rid]);
    if (!r) return answer();
    await q('UPDATE users SET region_id=$2 WHERE tg_id=$1', [user.tg_id, rid]);
    const ds = await q('SELECT * FROM districts WHERE region_id=$1 ORDER BY sort, name', [rid]);
    await answer();
    const kb = rows2(ds.map((d) => ({ text: d.name, callback_data: `dist:${d.id}` })));
    kb.push([{ text: t(l, 'back'), callback_data: 'back:reg' }]);
    return tg('editMessageText', {
      chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
      text: `📍 <b>${esc(loc(r, 'name', l))}</b>\n\n${t(l, 'askDistrict')}`,
      reply_markup: { inline_keyboard: kb },
    });
  }

  if (data === 'back:reg') {
    if (user.state !== 'region') return answer(t(l, 'expired'));
    await answer();
    return tg('editMessageText', { chat_id: chatId, message_id: msgId, text: t(l, 'askRegion'), reply_markup: await regionKb(l) });
  }

  if (data.startsWith('dist:')) {
    if (user.state !== 'region') return answer(t(l, 'expired'));
    const did = Number(data.slice(5));
    const [d] = await q(
      'SELECT d.*, r.name_uz, r.name_ru, r.name_en FROM districts d JOIN regions r ON r.id=d.region_id WHERE d.id=$1',
      [did]
    );
    if (!d) return answer();
    await q('UPDATE users SET region_id=$2, district_id=$3, registered=true, state=NULL, state_data=NULL WHERE tg_id=$1', [user.tg_id, d.region_id, did]);
    await answer('✅');
    await tg('editMessageText', {
      chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
      text: `📍 <b>${esc(loc(d, 'name', l))}</b>, <b>${esc(d.name)}</b> ✅`,
    });
    return showMenu(chatId, { ...user, lang: l }, t(l, 'registered'));
  }

  if (!user.registered) {
    await answer();
    return askLang(chatId, user.tg_id);
  }

  if (data.startsWith('sv:')) {
    await answer();
    return startSurvey(chatId, { ...user, lang: l }, Number(data.slice(3)));
  }

  if (data.startsWith('ans:')) {
    const [, qidS, idxS] = data.split(':');
    const qid = Number(qidS), idx = Number(idxS);
    const st = user.state_data;
    if (user.state !== 'survey' || !st || st.qid !== qid) return answer(t(l, 'expired'));
    const [qn] = await q('SELECT * FROM questions WHERE id=$1', [qid]);
    const opt = qn?.options?.[idx];
    if (!opt) return answer(t(l, 'expired'));
    await saveAnswer(st.rid, qid, idx, locOpt(opt, 'uz'));
    await answer('✅');
    await tg('editMessageText', {
      chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
      text: `${esc(loc(qn, 'text', l))}\n\n✅ <b>${esc(locOpt(opt, l))}</b>`,
    });
    return askQuestion(chatId, { ...user, lang: l }, { ...st, i: st.i + 1 });
  }

  return answer();
}
