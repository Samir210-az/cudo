import { useState } from 'react';
import { migrateLegacy } from '../lib/migrate';
import { ErrorBox } from './ui';

export default function ClubSetup({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('');

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await migrateLegacy(setStep);
      await onDone();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <main className="content">
      <section className="card">
        <h2>Bir neçə filial dəstəyi</h2>
        <p className="muted" style={{ margin: '8px 0 14px' }}>
          Panel indi bir neçə filialı idarə edə bilir. Mövcud uşaqlar, ödənişlər, xərclər, davamiyyət və yarışlar
          ilk filial kimi yeni quruluşa köçürüləcək. Köhnə qeydlər silinmir.
        </p>
        {error && <ErrorBox error={error} onRetry={start} />}
        <button type="button" className="btn primary" onClick={start} disabled={busy}>
          {busy ? `Köçürülür… ${step}` : 'Köçür və başla'}
        </button>
      </section>
    </main>
  );
}
