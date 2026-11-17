import { useState } from 'react';
import { Field, Modal, useToast } from '../ui';
import { add, update } from '../../lib/db';
import { todayISO } from '../../lib/format';

const EMPTY = {
  last_name: '', first_name: '', father_name: '', birth_date: '', gender: '',
  declared_kg: '', group_type: 'esas', club_name: '', coach: '',
};

export function validateAthlete(form) {
  if (!form.last_name.trim() || !form.first_name.trim()) return 'Soyad və adı yazın.';
  if (!form.birth_date) return 'Doğum tarixini seçin.';
  if (form.birth_date > todayISO()) return 'Doğum tarixi gələcəkdə ola bilməz.';
  if (!form.gender) return 'Cinsi seçin.';
  const kg = Number(form.declared_kg);
  if (form.declared_kg !== '' && (!Number.isFinite(kg) || kg < 5 || kg > 200)) return 'Çəkini yoxlayın.';
  if (!form.club_name.trim()) return 'Klubu yazın.';
  return null;
}

export const toPayload = (form) => ({
  last_name: form.last_name.trim(),
  first_name: form.first_name.trim(),
  father_name: form.father_name.trim() || null,
  birth_date: form.birth_date,
  gender: form.gender,
  declared_kg: form.declared_kg === '' ? null : Number(String(form.declared_kg).replace(',', '.')),
  group_type: form.group_type,
  club_name: form.club_name.trim(),
  coach: form.coach.trim() || null,
});

export default function AthleteForm({ competitionId, athlete, clubs, onClose, onSaved, existing }) {
  const notify = useToast();
  const [form, setForm] = useState(
    athlete
      ? { ...EMPTY, ...Object.fromEntries(Object.entries(athlete).map(([k, v]) => [k, v ?? ''])) }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateAthlete(form);
    if (problem) return notify(problem, 'error');
    const payload = toPayload(form);
    const twin = existing.find(
      (a) => a.id !== athlete?.id
        && a.last_name.toLocaleLowerCase('az') === payload.last_name.toLocaleLowerCase('az')
        && a.first_name.toLocaleLowerCase('az') === payload.first_name.toLocaleLowerCase('az')
        && a.birth_date === payload.birth_date,
    );
    if (twin && !window.confirm('Eyni ad və doğum tarixi ilə idmançı artıq var. Yenə də saxlanılsın?')) return;
    setBusy(true);
    try {
      if (athlete) await update('tournamentAthletes', athlete.id, payload);
      else {
        await add('tournamentAthletes', {
          ...payload, competition_id: competitionId, status: 'qeydiyyat', created_at: new Date().toISOString(),
        });
      }
      notify('İdmançı saxlanıldı.');
      onSaved();
      onClose();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={athlete ? 'İdmançını redaktə et' : 'Yeni idmançı'} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Soyad"><input value={form.last_name} onChange={set('last_name')} required /></Field>
        <Field label="Ad"><input value={form.first_name} onChange={set('first_name')} required /></Field>
        <Field label="Ata adı"><input value={form.father_name} onChange={set('father_name')} /></Field>
        <Field label="Doğum tarixi">
          <input type="date" value={form.birth_date} max={todayISO()} onChange={set('birth_date')} required />
        </Field>
        <Field label="Cins">
          <select value={form.gender} onChange={set('gender')} required>
            <option value="">Seçin</option>
            <option value="oğlan">Oğlan</option>
            <option value="qız">Qız</option>
          </select>
        </Field>
        <Field label="Elan edilən çəki (kq)">
          <input type="number" inputMode="decimal" step="0.1" min="5" value={form.declared_kg} onChange={set('declared_kg')} />
        </Field>
        <Field label="Qrup" hint="Əsas və ya TƏZƏ">
          <select value={form.group_type} onChange={set('group_type')}>
            <option value="esas">Əsas</option>
            <option value="teze">TƏZƏ</option>
          </select>
        </Field>
        <Field label="Klub">
          <input list="club-names" value={form.club_name} onChange={set('club_name')} required />
          <datalist id="club-names">{clubs.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Məşqçi"><input value={form.coach} onChange={set('coach')} /></Field>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saxlanılır…' : 'Saxla'}</button>
          <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
        </div>
      </form>
    </Modal>
  );
}
