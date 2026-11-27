'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Har soniyada /api/live dan kichik "versiya" so'raydi.
// Sahifa faqat yangi ma'lumot kelganda qayta chiziladi — shuning uchun sayt qotmaydi.
export default function LiveRefresh() {
  const router = useRouter();
  const last = useRef(null);
  const busyReq = useRef(false);
  const pending = useRef(false);
  const [state, setState] = useState('live');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const editing = () => {
      const a = document.activeElement;
      const typing = a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) && a.type !== 'submit';
      return typing || document.querySelector('main details.edit[open]');
    };
    const poll = async () => {
      if (document.hidden || busyReq.current) return;
      busyReq.current = true;
      try {
        const r = await fetch('/api/live', { cache: 'no-store' });
        if (r.redirected || !r.ok) return;
        const { v, unseen } = await r.json();
        document.title = (unseen ? `(${unseen}) ` : '') + "So'rovnoma — Admin panel";
        if (last.current !== null && last.current !== v) pending.current = true;
        last.current = v;
        setTick((t) => t + 1);
        if (pending.current) {
          if (editing()) { setState('paused'); return; }
          pending.current = false;
          router.refresh();
        }
        setState('live');
      } catch { setState('off'); } finally { busyReq.current = false; }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [router]);

  const label = state === 'paused' ? 'Yangi maʼlumot bor' : state === 'off' ? 'Aloqa yoʻq' : 'Jonli';
  return (
    <div className={`live ${state}`} title="Har soniyada tekshiriladi">
      <span className="dot" key={tick} />{label}
    </div>
  );
}
