'use client';
import { useEffect, useRef, useState } from 'react';

// Raqamni oldingi qiymatdan yangisigacha silliq sanab chiqaradi
export default function CountUp({ value, duration = 900 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0;
    if (a !== b && a !== 0) { setBump(true); setTimeout(() => setBump(false), 700); }
    let raf;
    const step = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (b - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={bump ? 'bump' : ''}>{shown.toLocaleString('ru-RU')}</span>;
}
