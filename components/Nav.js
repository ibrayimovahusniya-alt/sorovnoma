'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/', '🏠', 'Bosh sahifa'],
  ['/surveys', '📋', "So'rovnomalar"],
  ['/users', '👥', 'Foydalanuvchilar'],
  ['/regions', '📍', 'Hududlar'],
  ['/settings', '⚙️', 'Sozlamalar'],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {LINKS.map(([href, icon, label]) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? 'active' : ''}>
            <span className="ico">{icon}</span>{label}
          </Link>
        );
      })}
    </nav>
  );
}
