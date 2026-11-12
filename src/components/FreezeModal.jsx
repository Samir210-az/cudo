import { useState } from 'react';
import { Modal, useToast } from './ui';
import { update } from '../lib/db';
import { addMonths, currentPeriod, fmtPeriod } from '../lib/format';

const monthValue = (iso) => iso.slice(0, 7);

export default function FreezeModal({ child, onClose, onSaved }) {
  const notify = useToast();
  const freezes = child.freezes || [];
  const open = freezes.find((f) => !f.to);
  const [from, setFrom] = useState(monthValue(currentPeriod()));
  const [back, setBack] = useState(monthValue(currentPeriod()));
  const [busy, setBusy] = useState(false);

  const save = async (next, message) => {
    setBusy(true);
    try {
      await update('children', child.id, { freezes: next });
      notify(message);
      onSaved();
      onClose();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
      setBusy(false);
    }
  };

  const freeze = () => {
    save([...freezes, { from: `${from}-01`, to: null }], 'Dondurma yazıldı, bu aylar üçün borc hesablanmayacaq.');
  };

  const resume = () => {
    const firstCharged = `${back}-01`;
    const last = addMonths(firstCharged, -1);
    const next =
      last < open.from
        ? freezes.filter((f) => f !== open)
        : freezes.map((f) => (f === open ? { ...f, to: last } : f));
    save(next, `${fmtPeriod(firstCharged)} ayından borc yenidən hesablanacaq.`);
  };

  const remove = (target) => save(freezes.filter((f) => f !== target), 'Dondurma silindi.');

  return (
    <Modal title="Dondurma" onClose={onClose}>
      <p className="muted">
        Dondurulmuş aylar üçün uşağa borc hesablanmır. Uşaq məşqə qayıdanda "Məşqə qayıtdı" düyməsi ilə yenidən aktiv edin.
      </p>

      {freezes.length > 0 && (
        <div className="list" style={{ marginBottom: 12 }}>
          {freezes.map((f) => (
            <div className="row" key={`${f.from}-${f.to}`}>
              <span className="row-main">
                {fmtPeriod(f.from)} — {f.to ? fmtPeriod(f.to) : 'davam edir'}
              </span>
              <button type="button" className="btn sm" onClick={() => remove(f)} disabled={busy}>Sil</button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <>
          <label className="muted" style={{ display: 'block' }}>
            Borc hansı aydan yenidən hesablansın
            <input type="month" value={back} onChange={(e) => setBack(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn primary" onClick={resume} disabled={busy || !back}>Məşqə qayıtdı</button>
            <button type="button" className="btn" onClick={onClose}>Bağla</button>
          </div>
        </>
      ) : (
        <>
          <label className="muted" style={{ display: 'block' }}>
            Bu aydan dondurulub
            <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn primary" onClick={freeze} disabled={busy || !from}>Dondur</button>
            <button type="button" className="btn" onClick={onClose}>Bağla</button>
          </div>
        </>
      )}
    </Modal>
  );
}
