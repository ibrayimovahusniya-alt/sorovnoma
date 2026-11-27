'use client';
import { useFormState } from 'react-dom';
import { login } from '../actions';
export default function Login() {
  const [state, action] = useFormState(login, null);
  return (
    <div className="login card">
      <h1>📊 Admin panel</h1>
      {state?.error && <div className="alert err">{state.error}</div>}
      <form action={action} className="grid">
        <div><label>Parol</label><input type="password" name="password" autoFocus required /></div>
        <button className="btn">Kirish</button>
      </form>
    </div>
  );
}
