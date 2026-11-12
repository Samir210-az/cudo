import { useEffect, useMemo, useState } from 'react';
import { Modal, useToast } from './ui';
import { add, list, update } from '../lib/db';
import { fullName, groupsOf, todayISO } from '../lib/format';
import { useClub } from '../lib/clubs';

const LINE = /^(.+?)[\s,;:-]+['’]?(\d{1,2})(?:\s+(\d{1,2})[./](\d{1,2}))?$/;
const pad = (n) => String(n).padStart(2, '0');
const FOLD = { ə: 'e', ü: 'u', ö: 'o', ı: 'i', ç: 'c', ş: 's', ğ: 'g' };
const key = (c) =>
  fullName(c)
    .toLocaleLowerCase('az')
    .replace(/[əüöıçşğ]/g, (ch) => FOLD[ch])
    .replace(/\s+/g, ' ')
    .trim();

export function parseChildren(text, year = new Date().getFullYear()) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(LINE);
      if (!m) return { line, error: true };
      const parts = m[1].trim().split(/\s+/);
      const age = Number(m[2]);
      if (parts.length < 2 || age < 2 || age > 30) return { line, error: true };
      const row = { line, last_name: parts[0], first_name: parts.slice(1).join(' '), age };
      if (m[3]) {
        const day = Number(m[3]);
        const month = Number(m[4]);
        if (day < 1 || day > 31 || month < 1 || month > 12) return { line, error: true };
        row.paid_on = `${year}-${pad(month)}-${pad(day)}`;
      }
      return row;
    });
}

export default function BulkChildren({ existing, onClose, onDone }) {
  const { current } = useClub();
  const notify = useToast();
  const [text, setText] = useState('');
  const [fee, setFee] = useState('50');
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    list('payments').then(setPayments).catch(() => setPayments([]));
  }, []);

  const rows = useMemo(() => parseChildren(text), [text]);
  const byKey = useMemo(() => new Map(existing.map((c) => [key(c), c])), [existing]);
  const valid = rows.filter((r) => !r.error);
  const bad = rows.filter((r) => r.error);
  const newKids = valid.filter((r) => !byKey.has(key(r)));
  const payable = valid.filter((r) => {
    if (!r.paid_on) return false;
    const kid = byKey.get(key(r));
    return !kid || !payments.some((p) => p.child_id === kid.id && p.paid_on === r.paid_on);
  });
  const existingGroups = useMemo(() => groupsOf(existing), [existing]);
  const groupName = group.trim();
  const regroup = groupName ? valid.filter((r) => byKey.has(key(r)) && byKey.get(key(r)).training_time !== groupName) : [];
  const amount = Number(fee);
  const needFee = payable.length > 0 && !(amount > 0);

  const save = async () => {
    setBusy(true);
    try {
      const year = new Date().getFullYear();
      let kids = 0;
      let paid = 0;
      const firstMonth = valid.filter((r) => r.paid_on).map((r) => `${r.paid_on.slice(0, 7)}-01`).sort()[0];
      for (const r of valid) {
        const start = r.paid_on ? `${r.paid_on.slice(0, 7)}-01` : firstMonth || todayISO();
        let kid = byKey.get(key(r));
        let id = kid?.id;
        if (!kid) {
          id = await add('children', {
            first_name: r.first_name,
            last_name: r.last_name,
            birth_date: `${year - r.age}-01-01`,
            joined_at: start,
            status: 'aktiv',
            monthly_fee: amount > 0 ? amount : 0,
            has_scan: false,
            training_time: groupName || null,
            note: 'Doğum tarixi təxminidir, yaşa görə yazılıb.',
          });
          kids += 1;
        } else {
          const patch = {};
          if (groupName && kid.training_time !== groupName) patch.training_time = groupName;
          if (r.paid_on && !(Number(kid.monthly_fee) > 0) && amount > 0) patch.monthly_fee = amount;
          if (r.paid_on && kid.joined_at > start) patch.joined_at = start;
          if (Object.keys(patch).length) await update('children', id, patch);
        }
        if (payable.includes(r)) {
          await add('payments', {
            child_id: id,
            amount,
            period_month: `${r.paid_on.slice(0, 7)}-01`,
            paid_on: r.paid_on,
            method: 'nağd',
            note: null,
          });
          paid += 1;
        }
      }
      notify(`${kids} uşaq, ${paid} ödəniş əlavə edildi.`);
      onDone();
    } catch (err) {
      notify('Tam əlavə edilmədi: ' + err.message, 'error');
      setBusy(false);
    }
  };

  const nothing = !newKids.length && !payable.length && !regroup.length;

  return (
    <Modal title="Siyahıdan əlavə et" onClose={onClose}>
      <p className="muted">
        Qeydlər <strong>{current?.club_name}</strong> filialına əlavə olunacaq. Hər sətirdə bir uşaq: soyad, ad, yaş və ödəniş
        edibsə tarix (gün.ay).
      </p>
      <textarea
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Həsənov Rahim 17 19.10\nƏliyev Kamil 12 13.10\nİsmayıllı Sadiq 15'}
        aria-label="Uşaqların siyahısı"
      />
      <label className="muted" style={{ display: 'block', marginTop: 8 }}>
        Ödənişin məbləği (AZN)
        <input type="number" inputMode="decimal" min="0" value={fee} onChange={(e) => setFee(e.target.value)} />
      </label>
      <label className="muted" style={{ display: 'block', marginTop: 8 }}>
        Hansı qrupa əlavə olunsun (məşq saatı)
        <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="məs. 16:30" autoComplete="off" />
      </label>
      {existingGroups.length > 0 && (
        <div className="tabs" role="group" aria-label="Mövcud qruplar" style={{ marginTop: 8 }}>
          {existingGroups.map((g) => (
            <button key={g} type="button" className="tab" aria-pressed={group.trim() === g} aria-selected={group.trim() === g} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <p className="muted">
          {newKids.length} yeni uşaq, {payable.length} ödəniş yazılacaq
          {valid.length - newKids.length > 0 && `, ${valid.length - newKids.length} uşaq artıq siyahıdadır`}
          {regroup.length > 0 && `, ${regroup.length} uşağın qrupu dəyişəcək`}
          {bad.length > 0 && `, ${bad.length} sətir oxunmadı: ${bad.map((b) => b.line).join('; ')}`}
          {needFee && '. Ödəniş üçün məbləği yazın'}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn primary" onClick={save} disabled={nothing || needFee || busy}>
          {busy ? 'Əlavə edilir…' : 'Əlavə et'}
        </button>
        <button type="button" className="btn" onClick={onClose}>Bağla</button>
      </div>
    </Modal>
  );
}
