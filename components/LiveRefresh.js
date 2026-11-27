'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Har soniyada server ma'lumotlarini yangilaydi (bot bilan jonli bog'lanish).
// Forma to'ldirilayotganda yoki tahrirlash oynasi ochiq bo'lsa, to'xtab turadi.
export default function LiveRefresh() {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const a = document.activeElement;
      const typing = a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) && a.type !== 'submit';
      const editing = document.querySelector('main details[open]');
      const busy = typing || editing || document.hidden;
      setPaused(!!busy);
      if (!busy) { router.refresh(); setTick((t) => t + 1); }
    }, 1000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <div className={`live ${paused ? 'paused' : ''}`} title="Ma'lumotlar har soniyada yangilanadi">
      <span className="dot" key={tick} />
      {paused ? 'Pauza (tahrirlash)' : 'Jonli'}
    </div>
  );
}
