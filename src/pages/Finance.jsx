import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BeltIcon from '../components/BeltIcon';
import PaymentModal from '../components/PaymentModal';
import { Empty, ErrorBox, Field, Icon, Loader, Modal, MonthPicker, PageHead, Stat, useToast } from '../components/ui';
import { computeDebts, EXPENSE_CATEGORIES, onlyDebtors, OVERDUE_DAYS, overdueChildren, sum } from '../lib/finance';
import { addMonths, currentPeriod, fmtDate, fmtMoney, fullName, todayISO } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { fetchSettings } from '../lib/settings';
import { add, byName, eq, indexById, list, range, remove } from '../lib/db';

function ExpenseModal({ onClose, onSaved }) {
  const notify = useToast();
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [spentOn, setSpentOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return notify('Məbləğ sıfırdan böyük olmalıdır.', 'error');
    setBusy(true);
    try {
      await add('expenses', {
        category,
        amount: Number(amount),
        spent_on: spentOn,
        note: note.trim() || null,
      });
      notify('Xərc qeyd edildi.');
      onSaved();
      onClose();
    } catch (error) {
      notify('Xərc saxlanılmadı: ' + error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Yeni xərc" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Kateqoriya">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Məbləğ (₼)">
          <input type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Tarix">
          <input type="date" value={spentOn} max={todayISO()} onChange={(e) => setSpentOn(e.target.value)} required />
        </Field>
        <Field label="Qeyd">
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saxlanılır…' : 'Saxla'}</button>
          <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Finance() {
  const notify = useToast();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'debts' ? 'debts' : 'payments');
  const [period, setPeriod] = useState(currentPeriod());
  const [paying, setPaying] = useState(null);
  const [addingExpense, setAddingExpense] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const next = addMonths(period, 1);
    const [allKids, rawPayments, expenses, everyPayment] = await Promise.all([
      list('children'),
      list('payments', eq('period_month', period)),
      list('expenses', ...range('spent_on', period, next)),
      list('payments'),
    ]);
    const byId = indexById(allKids);
    const payments = rawPayments
      .filter((p) => byId.has(p.child_id))
      .map((p) => ({ ...p, children: byId.get(p.child_id) }))
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on));
    expenses.sort((a, b) => b.spent_on.localeCompare(a.spent_on));
    const kids = allKids.filter((k) => k.status === 'aktiv').sort(byName);
    return { kids, payments, expenses, overdue: overdueChildren(kids, everyPayment, todayISO()) };
  }, [period]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const rows = data ? computeDebts(data.kids, data.payments, period) : [];
  const debtors = onlyDebtors(rows);
  const overdue = data ? data.overdue : [];
  const expected = sum(rows, 'fee');
  const collected = data ? sum(data.payments) : 0;

  const removePayment = async (p) => {
    if (!window.confirm('Bu ödəniş qeydi silinsin?')) return;
    try {
      await remove('payments', p.id);
      reload();
    } catch (delError) {
      notify('Silinmədi: ' + delError.message, 'error');
    }
  };

  const removeExpense = async (x) => {
    if (!window.confirm('Bu xərc qeydi silinsin?')) return;
    try {
      await remove('expenses', x.id);
      reload();
    } catch (delError) {
      notify('Silinmədi: ' + delError.message, 'error');
    }
  };

  const debtorsPdf = async () => {
    try {
      const [{ debtorsPdf: build }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await build(debtors, period, settings);
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    }
  };

  return (
    <>
      <PageHead title="Maliyyə">
        <button type="button" className={`btn${overdue.length ? ' danger' : ''}`} onClick={() => setTab('debts')}>
          Borclular{overdue.length ? ` (${overdue.length})` : ''}
        </button>
        <MonthPicker value={period} onChange={setPeriod} />
      </PageHead>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'payments'} onClick={() => setTab('payments')}>Ödənişlər</button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'debts'} onClick={() => setTab('debts')}>Borclular</button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'expenses'} onClick={() => setTab('expenses')}>Xərclər</button>
      </div>

      {overdue.length > 0 && (
        <div className="warn-banner" role="alert">
          <div>
            <strong>{overdue.length} uşağın son ödənişindən {OVERDUE_DAYS} gündən çox keçib</strong>
            <ul>
              {overdue.slice(0, 5).map((r) => (
                <li key={r.child.id}>{fullName(r.child)} · {r.lastPaid ? `son ödəniş ${fmtDate(r.lastPaid)}` : 'ödəniş qeydi yoxdur'}</li>
              ))}
            </ul>
            {overdue.length > 5 && <div>və daha {overdue.length - 5} uşaq</div>}
          </div>
          <button type="button" className="btn sm" onClick={() => setTab('debts')}>Siyahı</button>
        </div>
      )}

      {loading && !data ? (
        <Loader />
      ) : tab === 'debts' ? (
        <section className="card">
          <div className="group-title" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Borclular</h2>
          </div>
          <p className="muted" style={{ marginBottom: 10 }}>Son ödənişdən {OVERDUE_DAYS} gün keçən aktiv uşaqlar.</p>
          {overdue.length ? (
            <div className="list">
              {overdue.map((r) => (
                <div className="row" key={r.child.id}>
                  <div className="row-main">
                    <Link to={`/panel/usaqlar/${r.child.id}`} className="row-title"><BeltIcon name={r.child.belt} size={18} />{fullName(r.child)}</Link>
                    <div className="row-sub">
                      {r.lastPaid ? `Son ödəniş: ${fmtDate(r.lastPaid)}` : 'Ödəniş qeydi yoxdur'} · {r.passed} gün keçib
                    </div>
                  </div>
                  <button type="button" className="btn sm" onClick={() => setPaying({ child_id: r.child.id, period: currentPeriod(), amount: Number(r.child.monthly_fee) || '' })}>
                    Ödəniş al
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Borclu uşaq yoxdur.</Empty>
          )}
        </section>
      ) : tab === 'payments' ? (
        <div className="stack">
          <div className="grid stats">
            <Stat label="Gözlənilən" value={fmtMoney(expected)} hint="aktiv uşaqların aylıq ödənişi" />
            <Stat label="Yığılıb" value={fmtMoney(collected)} tone="ok" />
            <Stat label="Qalıq" value={fmtMoney(debtors.reduce((s, r) => s + r.due, 0))} tone={debtors.length ? 'bad' : undefined} />
            <Stat label="Borclu uşaq" value={debtors.length} />
          </div>

          <section className="card">
            <div className="group-title" style={{ marginTop: 0 }}>
              <h2 style={{ margin: 0 }}>Ödəməyənlər</h2>
              <button type="button" className="btn sm" onClick={debtorsPdf} disabled={!debtors.length}>
                <Icon name="download" size={16} /> PDF
              </button>
            </div>
            {debtors.length ? (
              <div className="list">
                {debtors.map((r) => (
                  <div className="row" key={r.child.id}>
                    <div className="row-main">
                      <Link to={`/panel/usaqlar/${r.child.id}`} className="row-title"><BeltIcon name={r.child.belt} size={18} />{fullName(r.child)}</Link>
                      <div className="row-sub">
                        Aylıq {fmtMoney(r.fee)}{r.paid ? ` · ödənilib ${fmtMoney(r.paid)}` : ''} · qalıq {fmtMoney(r.due)}
                      </div>
                    </div>
                    <button type="button" className="btn sm" onClick={() => setPaying({ child_id: r.child.id, period, amount: r.due })}>
                      Ödəniş al
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>Bu ay üzrə borc yoxdur.</Empty>
            )}
          </section>

          <section className="card">
            <div className="group-title" style={{ marginTop: 0 }}>
              <h2 style={{ margin: 0 }}>Qəbul edilən ödənişlər</h2>
              <button type="button" className="btn sm primary" onClick={() => setPaying({ period })}>
                <Icon name="plus" size={16} /> Ödəniş
              </button>
            </div>
            {data.payments.length ? (
              <div className="list">
                {data.payments.map((p) => (
                  <div className="row" key={p.id}>
                    <div className="row-main">
                      <div className="row-title"><BeltIcon name={p.children.belt} size={18} />{fullName(p.children)}</div>
                      <div className="row-sub">{fmtDate(p.paid_on)} · {p.method}{p.note ? ` · ${p.note}` : ''}</div>
                    </div>
                    <div className="row-end">{fmtMoney(p.amount)}</div>
                    <button type="button" className="icon-btn" onClick={() => removePayment(p)} aria-label="Ödənişi sil">
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>Bu ay üçün ödəniş qeydi yoxdur.</Empty>
            )}
          </section>
        </div>
      ) : (
        <div className="stack">
          <div className="grid stats">
            <Stat label="Bu ayın xərci" value={fmtMoney(sum(data.expenses))} hint="əmək haqqı ayrıca, “Heyət” bölməsindədir" />
          </div>
          <section className="card">
            <div className="group-title" style={{ marginTop: 0 }}>
              <h2 style={{ margin: 0 }}>Xərclər</h2>
              <button type="button" className="btn sm primary" onClick={() => setAddingExpense(true)}>
                <Icon name="plus" size={16} /> Xərc
              </button>
            </div>
            {data.expenses.length ? (
              <div className="list">
                {data.expenses.map((x) => (
                  <div className="row" key={x.id}>
                    <div className="row-main">
                      <div className="row-title">{x.category}</div>
                      <div className="row-sub">{fmtDate(x.spent_on)}{x.note ? ` · ${x.note}` : ''}</div>
                    </div>
                    <div className="row-end">{fmtMoney(x.amount)}</div>
                    <button type="button" className="icon-btn" onClick={() => removeExpense(x)} aria-label="Xərci sil">
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>Bu ay üçün xərc qeydi yoxdur.</Empty>
            )}
          </section>
        </div>
      )}

      {paying && data && <PaymentModal kids={data.kids} preset={paying} onClose={() => setPaying(null)} onSaved={reload} />}
      {addingExpense && <ExpenseModal onClose={() => setAddingExpense(false)} onSaved={reload} />}
    </>
  );
}
