import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import InstallButton from '../components/InstallButton';
import { useAuth } from '../lib/auth';
import { configured } from '../lib/firebase';
import { isValidPhone } from '../lib/format';

export default function Login() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (session) return <Navigate to="/panel" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (Date.now() < lockedUntil) {
      setError('Bir neçə saniyə gözləyin və yenidən cəhd edin.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Telefon nömrəsini düzgün yazın (məsələn, 055 123 45 67).');
      return;
    }
    if (!/^\d{6,}$/.test(pin)) {
      setError('PİN ən azı 6 rəqəmdən ibarət olmalıdır.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(phone, pin);
      navigate('/panel', { replace: true });
    } catch (err) {
      const next = failures + 1;
      setFailures(next);
      if (next >= 5) {
        setLockedUntil(Date.now() + 30000);
        setFailures(0);
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <img className="auth-logo" src="/logo-128.webp" alt="HÜNƏR İDMAN KLUBU" width="68" height="84" />
        <h1>Admin girişi</h1>
        <p className="muted">Telefon nömrəniz və PİN kodla daxil olun.</p>
        {!configured && (
          <div className="notice error" role="alert" style={{ marginTop: 14 }}>
            <strong>Verilənlər bazası qoşulmayıb.</strong>
            <p>VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID və VITE_FIREBASE_APP_ID təyin edilməlidir.</p>
          </div>
        )}
        <form onSubmit={submit}>
          <label className="field">
            <span>Telefon nömrəsi</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder="055 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>PİN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>
          {error && (
            <p role="alert" style={{ color: 'var(--red-dark)', fontWeight: 600 }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={busy || !configured}>
            {busy ? 'Yoxlanılır…' : 'Daxil ol'}
          </button>
        </form>
        <div className="install-row">
          <InstallButton className="btn" />
        </div>
        <Link to="/" className="back">
          Sayta qayıt
        </Link>
      </div>
    </div>
  );
}
