import { useMemo, useState } from 'react';
import { Modal, useToast } from './ui';
import { addMany } from '../lib/db';
import { fullName, todayISO } from '../lib/format';
import { useClub } from '../lib/clubs';

const LINE = /^(.+?)[\s,;:-]+['’]?(\d{1,2})$/;

export function parseChildren(text) {
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
      return { line, last_name: parts[0], first_name: parts.slice(1).join(' '), age };
    });
}

export default function BulkChildren({ existing, onClose, onDone }) {
  const { current } = useClub();
  const notify = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => parseChildren(text), [text]);
  const known = useMemo(() => new Set(existing.map((c) => fullName(c).toLocaleLowerCase('az'))), [existing]);
  const bad = rows.filter((r) => r.error);
  const fresh = rows.filter((r) => !r.error && !known.has(fullName(r).toLocaleLowerCase('az')));
  const skipped = rows.length - bad.length - fresh.length;

  const save = async () => {
    setBusy(true);
    try {
      const year = new Date().getFullYear();
      await addMany(
        'children',
        fresh.map((r) => ({
          first_name: r.first_name,
          last_name: r.last_name,
          birth_date: `${year - r.age}-01-01`,
          joined_at: todayISO(),
          status: 'aktiv',
          monthly_fee: 0,
          has_scan: false,
          note: 'Doğum tarixi təxminidir, yaşa görə yazılıb.',
        })),
      );
      notify(`${fresh.length} uşaq əlavə edildi.`);
      onDone();
    } catch (err) {
      notify('Əlavə edilmədi: ' + err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title="Siyahıdan əlavə et" onClose={onClose}>
      <p className="muted">
        Uşaqlar <strong>{current?.club_name}</strong> filialına əlavə olunacaq. Hər sətirdə bir uşaq: soyad, ad və yaş.
      </p>
      <textarea
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Həsənov Rahim 17\nƏliyev Kamil 12'}
        aria-label="Uşaqların siyahısı"
      />
      {rows.length > 0 && (
        <p className="muted">
          {fresh.length} uşaq əlavə olunacaq
          {skipped > 0 && `, ${skipped} artıq siyahıdadır`}
          {bad.length > 0 && `, ${bad.length} sətir oxunmadı: ${bad.map((b) => b.line).join('; ')}`}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>Bağla</button>
        <button type="button" className="btn primary" onClick={save} disabled={!fresh.length || busy}>
          {busy ? 'Əlavə edilir…' : `${fresh.length} uşağı əlavə et`}
        </button>
      </div>
    </Modal>
  );
}
