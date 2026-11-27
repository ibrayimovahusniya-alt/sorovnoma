import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';

// Juda yengil "versiya" — panel faqat shu o'zgarganda qayta chiziladi
export async function GET() {
  const [r] = await q(`SELECT
    (SELECT count(*) FROM users)::int AS u,
    (SELECT count(*) FROM users WHERE registered)::int AS ru,
    (SELECT count(*) FROM responses WHERE completed)::int AS rc,
    (SELECT count(*) FROM responses WHERE completed AND NOT seen)::int AS unseen,
    (SELECT COALESCE(extract(epoch FROM max(completed_at)), 0)::bigint FROM responses) AS lr,
    (SELECT COALESCE(extract(epoch FROM max(created_at)), 0)::bigint FROM users) AS lu`);
  return Response.json({ v: Object.values(r).join('|'), unseen: r.unseen }, { headers: { 'cache-control': 'no-store' } });
}
