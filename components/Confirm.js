'use client';
export default function Confirm({ msg = "Rostdan ham o'chirilsinmi?", className = 'btn danger sm', children }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(msg)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
