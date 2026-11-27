import { logout } from '../actions';
import { q } from '@/lib/db';
import Nav from '@/components/Nav';
import LiveRefresh from '@/components/LiveRefresh';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }) {
  const [{ n }] = await q('SELECT count(*)::int AS n FROM responses WHERE completed AND NOT seen');
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="logo">📊</span><div>So'rovnoma<small>Raqamli avlod qizlari</small></div></div>
        <Nav unseen={n} />
        <div className="side-bottom">
          <LiveRefresh />
          <form action={logout}><button className="link">🚪 Chiqish</button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
