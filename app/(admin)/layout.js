import Link from 'next/link';
import { logout } from '../actions';
export const dynamic = 'force-dynamic';
export default function AdminLayout({ children }) {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">📊 So'rovnoma</div>
        <Link href="/">🏠 Bosh sahifa</Link>
        <Link href="/surveys">📋 So'rovnomalar</Link>
        <Link href="/users">👥 Foydalanuvchilar</Link>
        <Link href="/regions">📍 Hududlar</Link>
        <Link href="/settings">⚙️ Sozlamalar</Link>
        <form action={logout}><button className="link">🚪 Chiqish</button></form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
