import './globals.css';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });
export const metadata = { title: "So'rovnoma — Admin panel" };
export default function RootLayout({ children }) {
  return (<html lang="uz"><body className={inter.className}><div className="bg-blobs"><i /><i /><i /></div>{children}</body></html>);
}
