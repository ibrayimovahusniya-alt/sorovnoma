'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/', '🏠', 'Bosh sahifa'],
  ['/responses', '💬', 'Javoblar', 'unseen'],
  ['/surveys', '📋', "So'rovnomalar"],
  ['/users', '👥', 'Foydalanuvchilar'],
  ['/regions', '📍', 'Hududlar'],
  ['/settings', '⚙️', 'Sozlamalar'],
];

export default function Nav({ unseen = 0 }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {LINKS.map(([href, icon, label, badge]) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? 'active' : ''}>
            <span className="ico">{icon}</span>{label}
            {badge && unseen > 0 && <span className="count" key={unseen}>{unseen > 99 ? '99+' : unseen}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
