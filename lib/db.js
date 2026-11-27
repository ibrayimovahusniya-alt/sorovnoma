import pg from 'pg';
import { REGIONS } from './regions';

const g = globalThis;

function pool() {
  if (!g._pgPool) {
    const ssl = process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false };
    g._pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 3, idleTimeoutMillis: 10000 });
  }
  return g._pgPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS regions(
  id SERIAL PRIMARY KEY, name_uz TEXT NOT NULL, name_ru TEXT, name_en TEXT, sort INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS districts(
  id SERIAL PRIMARY KEY, region_id INT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS users(
  tg_id BIGINT PRIMARY KEY, username TEXT, tg_name TEXT, lang TEXT, phone TEXT, full_name TEXT,
  region_id INT REFERENCES regions(id) ON DELETE SET NULL,
  district_id INT REFERENCES districts(id) ON DELETE SET NULL,
  registered BOOLEAN DEFAULT false, state TEXT, state_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(), last_seen TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS surveys(
  id SERIAL PRIMARY KEY, title_uz TEXT NOT NULL, title_ru TEXT, title_en TEXT,
  desc_uz TEXT, desc_ru TEXT, desc_en TEXT, active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS questions(
  id SERIAL PRIMARY KEY, survey_id INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  sort INT DEFAULT 0, type TEXT NOT NULL DEFAULT 'choice',
  text_uz TEXT NOT NULL, text_ru TEXT, text_en TEXT, options JSONB DEFAULT '[]');
CREATE TABLE IF NOT EXISTS responses(
  id SERIAL PRIMARY KEY, survey_id INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(tg_id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ,
  UNIQUE(survey_id, user_id));
CREATE TABLE IF NOT EXISTS answers(
  id SERIAL PRIMARY KEY, response_id INT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_index INT, value TEXT, UNIQUE(response_id, question_id));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS seen BOOLEAN DEFAULT false;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS responses_unseen ON responses(seen) WHERE NOT seen;
`;

async function init() {
  const client = await pool().connect();
  try {
    await client.query('SELECT pg_advisory_lock(7310042)');
    await client.query(SCHEMA);
    const { rows } = await client.query('SELECT count(*)::int AS n FROM regions');
    if (rows[0].n === 0) {
      for (let i = 0; i < REGIONS.length; i++) {
        const r = REGIONS[i];
        const res = await client.query(
          'INSERT INTO regions(name_uz,name_ru,name_en,sort) VALUES($1,$2,$3,$4) RETURNING id',
          [r.uz, r.ru, r.en, i]
        );
        const rid = res.rows[0].id;
        for (let j = 0; j < r.d.length; j++) {
          await client.query('INSERT INTO districts(region_id,name,sort) VALUES($1,$2,$3)', [rid, r.d[j], j]);
        }
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(7310042)').catch(() => {});
    client.release();
  }
}

export function ensureSchema() {
  if (!g._dbReady) g._dbReady = init().catch((e) => { g._dbReady = null; throw e; });
  return g._dbReady;
}

export async function q(text, params = []) {
  await ensureSchema();
  const r = await pool().query(text, params);
  return r.rows;
}

export async function getSetting(key) {
  const rows = await q('SELECT value FROM settings WHERE key=$1', [key]);
  return rows[0]?.value || '';
}

export async function setSetting(key, value) {
  await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', [key, value]);
}
