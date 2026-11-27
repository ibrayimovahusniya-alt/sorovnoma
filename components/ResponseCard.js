'use client';
import { useState } from 'react';
import { markSeen } from '@/app/actions';

// Javob kartasi: ochilganda avtomatik "ko'rildi" bo'ladi
export default function ResponseCard({ id, seen: initial, header, children }) {
  const [seen, setSeen] = useState(initial);
  return (
    <details className={`resp ${seen ? '' : 'unseen'}`}
      onToggle={(e) => { if (e.currentTarget.open && !seen) { setSeen(true); markSeen([id]); } }}>
      <summary>{header}{!seen && <span className="new-tag">YANGI</span>}<span className="chev">›</span></summary>
      <div className="resp-body">{children}</div>
    </details>
  );
}
