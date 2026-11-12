import { useState } from 'react';
import { Modal, useToast } from './ui';
import { update } from '../lib/db';
import { addMonths, fmtDate, fmtPeriod, todayISO } from '../lib/format';

const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
export const firstFrozenMonth = (from) => (from.slice(8, 10) === '01' ? from : addMonths(from, 1));

export default function FreezeModal({ child, lastPaid, onClose, onSaved }) {
  const notify = useToast();
  const freezes = child.freezes || [];
  const open = freezes.find((f) => !f.to);
  const [from, setFrom] = useState(lastPaid || todayISO());
  const [back, setBack] = useState(todayISO());
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

  const freeze = () => save([...freezes, { from, to: null, back: null }], 'Dondurma yazıldı, bu tarixdən sonrakı aylara borc hesablanmayacaq.');

  const activate = () => {
    const lastFrozen = addMonths(monthStart(back), -1);
    const next =
      firstFrozenMonth(open.from) > lastFrozen
        ? freezes.filter((f) => f !== open)
        : freezes.map((f) => (f === open ? { ...f, to: lastFrozen, back } : f));
    save(next, `Uşaq aktiv edildi, ${fmtPeriod(monthStart(back))} ayından borc yenidən hesablanacaq.`);
  };

  const remove = (target) => save(freezes.filter((f) => f !== target), 'Dondurma silindi.');

  return (
    <Modal title="Dondurma" onClose={onClose}>
      <p className="muted">
        Dondurulmuş tarixdən sonrakı aylara borc hesablanmır. Həmin ayın özü artıq ödənilmiş sayılır.
      </p>

      {freezes.length > 0 && (
        <div className="list" style={{ marginBottom: 12 }}>
          {freezes.map((f) => (
            <div className="row" key={`${f.from}-${f.to}`}>
              <span className="row-main">
                {fmtDate(f.from)} — {f.back ? fmtDate(f.back) : f.to ? fmtPeriod(f.to) : 'davam edir'}
              </span>
              <button type="button" className="btn sm" onClick={() => remove(f)} disabled={busy}>Sil</button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <>
          <label className="muted" style={{ display: 'block' }}>
            Uşaq məşqə hansı tarixdə qayıdıb
            <input type="date" value={back} onChange={(e) => e.target.value && setBack(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn primary" onClick={activate} disabled={busy}>Aktiv et</button>
            <button type="button" className="btn" onClick={onClose}>Bağla</button>
          </div>
        </>
      ) : (
        <>
          <label className="muted" style={{ display: 'block' }}>
            Dondurulma tarixi {lastPaid ? `(son ödəniş: ${fmtDate(lastPaid)})` : '(ödəniş yoxdur)'}
            <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn primary" onClick={freeze} disabled={busy}>Dondur</button>
            <button type="button" className="btn" onClick={onClose}>Bağla</button>
          </div>
        </>
      )}
    </Modal>
  );
}
