'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '../actions';

const BUBBLES = [[120, 8, 14, 0], [70, 30, 10, -3], [160, 62, 18, -7], [90, 82, 12, -2], [50, 48, 9, -5]];

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? 'Tekshirilmoqda…' : 'Kirish →'}</button>;
}

export default function Login() {
  const [state, action] = useFormState(login, null);
  return (
    <div className="login-wrap">
      {BUBBLES.map(([s, l, d, delay], i) => (
        <span key={i} className="bubble" style={{ width: s, height: s, left: `${l}%`, bottom: -s, animationDuration: `${d}s`, animationDelay: `${delay}s` }} />
      ))}
      <div className="login">
        <div className="logo">📊</div>
        <h1>So'rovnoma</h1>
        <p className="muted">Admin panelga kirish</p>
        {state?.error && <div className="alert err">{state.error}</div>}
        <form action={action} className="grid">
          <div><label>Parol</label><input type="password" name="password" autoFocus required /></div>
          <Submit />
        </form>
      </div>
    </div>
  );
}
