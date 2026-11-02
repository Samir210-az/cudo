import { useState } from 'react';
import { Empty, ErrorBox, Field, Icon, Loader, Modal, MonthPicker, PageHead, Stat, useToast } from '../components/ui';
import { sum } from '../lib/finance';
import { currentPeriod, fmtDate, fmtMoney, formatPhone, isValidPhone, normalizePhone, todayISO } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { add, eq, exists, indexById, list, remove, update } from '../lib/db';

const ROLES = ['Məşqçi', 'Baş məşqçi', 'Köməkçi məşqçi', 'Təmizlikçi', 'Digər'];

function StaffModal({ person, onClose, onSaved }) {
  const notify = useToast();
  const [form, setForm] = useState({
    full_name: person?.full_name || '',
    role: person?.role || ROLES[0],
    phone: person?.phone || '',
    monthly_salary: person?.monthly_salary ?? '',
    active: person?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return notify('Ad və soyadı yazın.', 'error');
    if (form.phone && !isValidPhone(form.phone)) return notify('Telefonu düzgün yazın.', 'error');
    const payload = {
      full_name: form.full_name.trim(),
      role: form.role,
      phone: form.phone ? normalizePhone(form.phone) : null,
      monthly_salary: Number(form.monthly_salary || 0),
      active: form.active,
    };
    setBusy(true);
    try {
      if (person) await update('staff', person.id, payload);
      else await add('staff', payload);
      notify('İşçi saxlanıldı.');
      onSaved();
      onClose();
    } catch (error) {
      notify('Saxlanılmadı: ' + error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={person ? 'İşçini redaktə et' : 'Yeni işçi'} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Ad və soyad" wide>
          <input value={form.full_name} onChange={set('full_name')} required />
        </Field>
        <Field label="Vəzifə">
          <select value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Telefon">
          <input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Aylıq əmək haqqı (₼)">
          <input type="number" inputMode="decimal" min="0" step="0.01" value={form.monthly_salary} onChange={set('monthly_salary')} />
        </Field>
        <label className="check" style={{ alignSelf: 'end', minHeight: 46 }}>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          Hazırda işləyir
        </label>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saxlanılır…' : 'Saxla'}</button>
          <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
        </div>
      </form>
    </Modal>
  );
}

function SalaryModal({ staff, preset, period, onClose, onSaved }) {
  const notify = useToast();
  const [staffId, setStaffId] = useState(preset.staff_id || '');
  const [month, setMonth] = useState(period.slice(0, 7));
  const [amount, setAmount] = useState(preset.amount ?? '');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (id) => {
    setStaffId(id);
    const person = staff.find((s) => s.id === id);
    if (person && !preset.amount) setAmount(Number(person.monthly_salary) || '');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!staffId) return notify('İşçini seçin.', 'error');
    if (!(Number(amount) > 0)) return notify('Məbləğ sıfırdan böyük olmalıdır.', 'error');
    setBusy(true);
    try {
      await add('salaryPayments', {
        staff_id: staffId,
        amount: Number(amount),
        period_month: `${month}-01`,
        paid_on: paidOn,
        note: note.trim() || null,
      });
      notify('Əmək haqqı qeyd edildi.');
      onSaved();
      onClose();
    } catch (error) {
      notify('Ödəniş saxlanılmadı: ' + error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Əmək haqqı ödənişi" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="İşçi" wide>
          <select value={staffId} onChange={(e) => pick(e.target.value)} required>
            <option value="">Seçin…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
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
        <Field label="Qeyd">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Məsələn: avans" />
        </Field>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saxlanılır…' : 'Saxla'}</button>
          <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Staff() {
  const notify = useToast();
  const [period, setPeriod] = useState(currentPeriod());
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);

  const { data, loading, error, reload } = useQuery(async () => {
    const [staff, rawSalaries] = await Promise.all([list('staff'), list('salaryPayments', eq('period_month', period))]);
    staff.sort((a, b) => Number(b.active) - Number(a.active) || a.full_name.localeCompare(b.full_name, 'az'));
    const byId = indexById(staff);
    const salaries = rawSalaries
      .filter((s) => byId.has(s.staff_id))
      .map((s) => ({ ...s, staff: byId.get(s.staff_id) }))
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on));
    return { staff, salaries };
  }, [period]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const active = data.staff.filter((s) => s.active);
  const paidFor = (id) => sum(data.salaries.filter((s) => s.staff_id === id));
  const planned = sum(active, 'monthly_salary');

  const removeSalary = async (s) => {
    if (!window.confirm('Bu ödəniş qeydi silinsin?')) return;
    try {
      await remove('salaryPayments', s.id);
      reload();
    } catch (delError) {
      notify('Silinmədi: ' + delError.message, 'error');
    }
  };

  const removePerson = async (person) => {
    if (!window.confirm(`${person.full_name} silinsin?`)) return;
    try {
      if (await exists('salaryPayments', 'staff_id', person.id)) {
        return notify('Əmək haqqı tarixçəsi olan işçini silmək olmaz. Redaktədən "Hazırda işləyir" işarəsini çıxarın.', 'error');
      }
      await remove('staff', person.id);
      reload();
    } catch (delError) {
      notify('Silinmədi: ' + delError.message, 'error');
    }
  };

  return (
    <>
      <PageHead title="Heyət və əmək haqqı">
        <MonthPicker value={period} onChange={setPeriod} />
        <button type="button" className="btn primary" onClick={() => setEditing({})}>
          <Icon name="plus" /> Yeni işçi
        </button>
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 14 }}>
        <Stat label="Planlaşdırılan" value={fmtMoney(planned)} />
        <Stat label="Ödənilib" value={fmtMoney(sum(data.salaries))} tone="ok" />
        <Stat label="İşləyən" value={active.length} />
      </div>

      <div className="stack">
        <section className="card">
          <h2>İşçilər</h2>
          {data.staff.length ? (
            <div className="list">
              {data.staff.map((p) => {
                const paid = paidFor(p.id);
                const left = Math.max(Number(p.monthly_salary) - paid, 0);
                return (
                  <div className="row" key={p.id} style={{ flexWrap: 'wrap' }}>
                    <div className="row-main">
                      <div className="row-title">{p.full_name}</div>
                      <div className="row-sub">
                        {p.role}{p.phone ? ` · ${formatPhone(p.phone)}` : ''} · {fmtMoney(p.monthly_salary)}
                      </div>
                    </div>
                    {!p.active ? (
                      <span className="badge warn">Çıxıb</span>
                    ) : left === 0 && Number(p.monthly_salary) > 0 ? (
                      <span className="badge ok">Ödənilib</span>
                    ) : (
                      <button type="button" className="btn sm" onClick={() => setPaying({ staff_id: p.id, amount: left || '' })}>
                        Maaş ver{left ? ` (${fmtMoney(left)})` : ''}
                      </button>
                    )}
                    <button type="button" className="icon-btn" onClick={() => setEditing(p)} aria-label="Redaktə et">
                      <Icon name="edit" />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => removePerson(p)} aria-label="Sil">
                      <Icon name="trash" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>Hələ işçi əlavə edilməyib.</Empty>
          )}
        </section>

        <section className="card">
          <div className="group-title" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Bu ay ödənilənlər</h2>
            <button type="button" className="btn sm" onClick={() => setPaying({})} disabled={!active.length}>
              <Icon name="plus" size={16} /> Ödəniş
            </button>
          </div>
          {data.salaries.length ? (
            <div className="list">
              {data.salaries.map((s) => (
                <div className="row" key={s.id}>
                  <div className="row-main">
                    <div className="row-title">{s.staff.full_name}</div>
                    <div className="row-sub">{fmtDate(s.paid_on)}{s.note ? ` · ${s.note}` : ''}</div>
                  </div>
                  <div className="row-end">{fmtMoney(s.amount)}</div>
                  <button type="button" className="icon-btn" onClick={() => removeSalary(s)} aria-label="Ödənişi sil">
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Bu ay əmək haqqı ödənişi yoxdur.</Empty>
          )}
        </section>
      </div>

      {editing && <StaffModal person={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={reload} />}
      {paying && <SalaryModal staff={active} preset={paying} period={period} onClose={() => setPaying(null)} onSaved={reload} />}
    </>
  );
}
