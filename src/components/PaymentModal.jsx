import { useState } from 'react';
import { Field, Modal, useToast } from './ui';
import { supabase } from '../lib/supabase';
import { fullName, todayISO } from '../lib/format';

export default function PaymentModal({ kids, preset = {}, onClose, onSaved }) {
  const notify = useToast();
  const [childId, setChildId] = useState(preset.child_id || '');
  const [month, setMonth] = useState((preset.period || todayISO()).slice(0, 7));
  const [amount, setAmount] = useState(preset.amount ?? '');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState('nağd');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pickChild = (id) => {
    setChildId(id);
    const kid = kids.find((k) => k.id === id);
    if (kid && !preset.amount) setAmount(Number(kid.monthly_fee) || '');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!childId) return notify('Uşağı seçin.', 'error');
    if (!(Number(amount) > 0)) return notify('Məbləğ sıfırdan böyük olmalıdır.', 'error');
    setBusy(true);
    const { error } = await supabase.from('payments').insert({
      child_id: childId,
      amount: Number(amount),
      period_month: `${month}-01`,
      paid_on: paidOn,
      method,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) return notify('Ödəniş saxlanılmadı: ' + error.message, 'error');
    notify('Ödəniş qeyd edildi.');
    onSaved();
    onClose();
  };

  return (
    <Modal title="Ödəniş qəbulu" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Uşaq" wide>
          <select value={childId} onChange={(e) => pickChild(e.target.value)} required>
            <option value="">Seçin…</option>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {fullName(k)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hansı ay üçün">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
        </Field>
        <Field label="Məbləğ (₼)">
          <input type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Ödəniş tarixi">
          <input type="date" value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} required />
        </Field>
        <Field label="Üsul">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="nağd">Nağd</option>
            <option value="kart">Kart</option>
            <option value="köçürmə">Köçürmə</option>
          </select>
        </Field>
        <Field label="Qeyd" wide>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saxlanılır…' : 'Saxla'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Ləğv et
          </button>
        </div>
      </form>
    </Modal>
  );
}
