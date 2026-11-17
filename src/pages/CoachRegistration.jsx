import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Empty, Field, Icon, Loader, useToast } from '../components/ui';
import { toPayload, validateAthlete } from '../components/tournament/AthleteForm';
import { calcAge, fmtDate, todayISO } from '../lib/format';
import { deleteEntry, fetchLink, listEntries, saveEntry } from '../lib/links';

const BRAND_LABEL = 'Hünər idman klubu';
const blank = { last_name: '', first_name: '', father_name: '', birth_date: '', gender: '', declared_kg: '' };

export default function CoachRegistration() {
  const { token } = useParams();
  const notify = useToast();
  const [link, setLink] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const l = await fetchLink(token);
      setLink(l);
      setRows(await listEntries(token));
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const reset = () => {
    setForm(blank);
    setEditing(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const full = { ...form, club_name: link.club_name, coach: '', group_type: 'esas' };
    const problem = validateAthlete(full);
    if (problem) return notify(problem, 'error');
    const dup = rows.find((r) => r.id !== editing?.id
      && r.last_name.toLocaleLowerCase('az') === form.last_name.trim().toLocaleLowerCase('az')
      && r.first_name.toLocaleLowerCase('az') === form.first_name.trim().toLocaleLowerCase('az')
      && r.birth_date === form.birth_date);
    if (dup) return notify('Bu idmançı artıq siyahıdadır.', 'error');
    setBusy(true);
    try {
      const payload = toPayload(full);
      await saveEntry(token, editing?.id, {
        ...payload,
        created_at: editing?.created_at || new Date().toISOString(),
        ...(editing ? { updated_at: new Date().toISOString() } : {}),
      });
      notify(editing ? 'Dəyişiklik saxlanıldı.' : 'İdmançı əlavə edildi.');
      reset();
      setRows(await listEntries(token));
    } catch {
      notify('Saxlanılmadı. Qeydiyyat bağlanıb ola bilər.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const edit = (row) => {
    setEditing(row);
    setForm({
      last_name: row.last_name, first_name: row.first_name, father_name: row.father_name || '',
      birth_date: row.birth_date, gender: row.gender, declared_kg: row.declared_kg ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (row) => {
    if (!window.confirm(`${row.last_name} ${row.first_name} siyahıdan silinsin?`)) return;
    try {
      await deleteEntry(token, row.id);
      setRows(await listEntries(token));
    } catch {
      notify('Silinmədi.', 'error');
    }
  };

  if (error) {
    return (
      <div className="coach-page">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/logo-128.webp" alt="" width="65" height="34" />
          <span>{BRAND_LABEL}</span>
        </div>
      </header>
        <main className="content coach-wrap"><section className="card"><h1>Qeydiyyat açılmayıb</h1><p>{error}</p></section></main>
      </div>
    );
  }
  if (!link) return <Loader />;

  return (
    <div className="coach-page">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/logo-128.webp" alt="" width="65" height="34" />
          <span>{BRAND_LABEL}</span>
        </div>
      </header>
      <main className="content coach-wrap">
        <header className="coach-head">
          <h1>{link.competition_name}</h1>
          <p>{link.club_name} · iştirakçı qeydiyyatı</p>
        </header>

        <form className="card" onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>{editing ? 'Məlumatı düzəlt' : 'İdmançı əlavə et'}</h2>
          <div className="form-grid">
            <Field label="Soyad"><input value={form.last_name} onChange={set('last_name')} maxLength={60} required /></Field>
            <Field label="Ad"><input value={form.first_name} onChange={set('first_name')} maxLength={60} required /></Field>
            <Field label="Ata adı"><input value={form.father_name} onChange={set('father_name')} maxLength={60} /></Field>
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
            <Field label="Çəki (kq)" hint="Təxmini çəki, yarış günü dəqiqləşir">
              <input type="number" inputMode="decimal" step="0.1" min="5" max="200" value={form.declared_kg} onChange={set('declared_kg')} />
            </Field>
          </div>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button type="submit" className="btn primary" disabled={busy}>
              <Icon name={editing ? 'check' : 'plus'} /> {editing ? 'Saxla' : 'Əlavə et'}
            </button>
            {editing && <button type="button" className="btn" onClick={reset}>Ləğv et</button>}
          </div>
        </form>

        <section className="card">
          <div className="group-title" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Əlavə etdiyiniz idmançılar</h2>
            <span className="badge">{rows.length}</span>
          </div>
          {rows.length ? (
            <div className="list">
              {rows.map((r) => (
                <div className="row" key={r.id} style={{ flexWrap: 'wrap' }}>
                  <div className="row-main">
                    <div className="row-title">{r.last_name} {r.first_name}</div>
                    <div className="row-sub">
                      {fmtDate(r.birth_date)} ({calcAge(r.birth_date)} yaş) · {r.gender === 'qız' ? 'Qız' : 'Oğlan'}
                      {r.declared_kg ? ` · ${r.declared_kg} kq` : ''}
                    </div>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => edit(r)} aria-label="Redaktə"><Icon name="edit" /></button>
                  <button type="button" className="icon-btn" onClick={() => del(r)} aria-label="Sil"><Icon name="trash" /></button>
                </div>
              ))}
            </div>
          ) : <Empty>Hələ heç kim əlavə edilməyib.</Empty>}
        </section>
      </main>
    </div>
  );
}
