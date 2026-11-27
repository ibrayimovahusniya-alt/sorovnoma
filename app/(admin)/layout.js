import { logout } from '../actions';
import Nav from '@/components/Nav';
import LiveRefresh from '@/components/LiveRefresh';
export const dynamic = 'force-dynamic';
export default function AdminLayout({ children }) {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="logo">📊</span><div>So'rovnoma<small>Raqamli avlod qizlari</small></div></div>
        <Nav />
        <div className="side-bottom">
          <LiveRefresh />
          <form action={logout}><button className="link">🚪 Chiqish</button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
