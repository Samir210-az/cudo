import { useState } from 'react';
import { Modal, useToast } from '../ui';
import { update } from '../../lib/db';
import { GENDERS, athleteName } from '../../lib/tournament';

export default function FixMissing({ items, onClose, onSaved }) {
  const notify = useToast();
  const [rows, setRows] = useState(() => Object.fromEntries(items.map(({ athlete: a }) => [
    a.id, { birth_date: a.birth_date || '', gender: a.gender || '', declared_kg: a.declared_kg ?? '' },
  ])));
  const [busy, setBusy] = useState(false);

  const set = (id, key, value) => setRows((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const save = async () => {
    setBusy(true);
    try {
      let count = 0;
      for (const { athlete: a } of items) {
        const r = rows[a.id];
        const kg = r.declared_kg === '' ? null : Number(String(r.declared_kg).replace(',', '.'));
        if (kg !== null && (!Number.isFinite(kg) || kg < 5 || kg > 200)) throw new Error(`${athleteName(a)}: çəkini yoxlayın.`);
        const changed = (r.birth_date || null) !== (a.birth_date || null) || (r.gender || null) !== (a.gender || null) || kg !== (a.declared_kg ?? null);
        if (!changed) continue;
        await update('tournamentAthletes', a.id, { birth_date: r.birth_date || null, gender: r.gender || null, declared_kg: kg });
        count += 1;
      }
      notify(count ? `${count} idmançının məlumatı yeniləndi.` : 'Dəyişiklik yoxdur.');
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Çatışmayan məlumatı tamamla" onClose={onClose}>
      <p className="row-sub">Kateqoriya üçün doğum tarixi, cins və çəki lazımdır. Hamısını burada doldurub bir dəfəyə saxlayın.</p>
      <div className="fix-rows">
        {items.map(({ athlete: a, problem }) => {
          const r = rows[a.id];
          return (
            <div className="fix-row" key={a.id}>
              <div className="fix-name">{athleteName(a)}<small>{problem}</small></div>
              <input type="date" aria-label="Doğum tarixi" value={r.birth_date} onChange={(e) => set(a.id, 'birth_date', e.target.value)} />
              <select aria-label="Cins" value={r.gender} onChange={(e) => set(a.id, 'gender', e.target.value)}>
                <option value="">Cins</option>
                {Object.entries(GENDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="number" inputMode="decimal" step="0.1" placeholder="Çəki, kq" aria-label="Çəki" value={r.declared_kg} onChange={(e) => set(a.id, 'declared_kg', e.target.value)} />
            </div>
          );
        })}
      </div>
      <div className="form-actions">
        <button type="button" className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saxlanılır…' : 'Hamısını saxla'}</button>
        <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
      </div>
    </Modal>
  );
}
