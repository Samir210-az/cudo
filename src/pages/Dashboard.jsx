import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Icon, Loader, PageHead, Stat } from '../components/ui';
import PaymentModal from '../components/PaymentModal';
import { computeDebts, onlyDebtors, sum } from '../lib/finance';
import { addMonths, currentPeriod, fmtDate, fmtMoney, fmtPeriod, fullName, todayISO } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { eq, list, range, where } from '../lib/db';

export default function Dashboard() {
  const period = currentPeriod();
  const next = addMonths(period, 1);
  const [paying, setPaying] = useState(null);

  const { data, loading, error, reload } = useQuery(async () => {
    const [kids, duePayments, cashIn, expenses, salaries, upcoming, entries] = await Promise.all([
      list('children', eq('status', 'aktiv')),
      list('payments', eq('period_month', period)),
      list('payments', ...range('paid_on', period, next)),
      list('expenses', ...range('spent_on', period, next)),
      list('salaryPayments', ...range('paid_on', period, next)),
      list('competitions', where('held_on', '>=', todayISO())),
      list('competitionEntries'),
    ]);
    const counts = new Map();
    entries.forEach((e) => counts.set(e.competition_id, (counts.get(e.competition_id) || 0) + 1));
    const competitions = upcoming
      .sort((a, b) => a.held_on.localeCompare(b.held_on))
      .slice(0, 3)
      .map((c) => ({ ...c, count: counts.get(c.id) || 0 }));
    return { kids, duePayments, cashIn, expenses, salaries, competitions };
  }, []);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const income = sum(data.cashIn);
  const spent = sum(data.expenses) + sum(data.salaries);
  const net = income - spent;
  const debtors = onlyDebtors(computeDebts(data.kids, data.duePayments, period));
  const debtTotal = debtors.reduce((s, r) => s + r.due, 0);

  return (
    <>
      <PageHead title="Panel" subtitle={`${fmtPeriod(period)} üzrə vəziyyət`}>
        <Link to="/panel/usaqlar/yeni" className="btn primary">
          <Icon name="plus" /> Yeni uşaq
        </Link>
        <button type="button" className="btn" onClick={() => setPaying({})}>
          Ödəniş qəbul et
        </button>
      </PageHead>

      <div className="grid stats">
        <Stat label="Aktiv uşaq" value={data.kids.length} />
        <Stat label="Bu ay gəlir" value={fmtMoney(income)} tone="ok" />
        <Stat label="Bu ay xərc" value={fmtMoney(spent)} hint="əmək haqqı daxil" />
        <Stat label="Xalis nəticə" value={fmtMoney(net)} tone={net < 0 ? 'bad' : 'ok'} />
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <section className="card">
          <h2>Ödənişi gözlənilənlər</h2>
          {debtors.length ? (
            <>
              <p className="muted" style={{ marginBottom: 6 }}>
                {debtors.length} uşaq · cəmi {fmtMoney(debtTotal)}
              </p>
              <div className="list">
                {debtors.slice(0, 6).map((r) => (
                  <div className="row" key={r.child.id}>
                    <div className="row-main">
                      <Link to={`/panel/usaqlar/${r.child.id}`} className="row-title">
                        {fullName(r.child)}
                      </Link>
                      <div className="row-sub">Qalıq: {fmtMoney(r.due)}</div>
                    </div>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => setPaying({ child_id: r.child.id, period, amount: r.due })}
                    >
                      Ödəniş al
                    </button>
                  </div>
                ))}
              </div>
              {debtors.length > 6 && (
                <Link to="/panel/maliyye" style={{ display: 'inline-block', marginTop: 8 }}>
                  Hamısına bax ({debtors.length})
                </Link>
              )}
            </>
          ) : (
            <Empty>Bu ay üzrə borc yoxdur.</Empty>
          )}
        </section>

        <section className="card">
          <h2>Yaxınlaşan yarışlar</h2>
          {data.competitions.length ? (
            <div className="list">
              {data.competitions.map((c) => (
                <Link className="row" key={c.id} to={`/panel/yarislar/${c.id}`}>
                  <div className="row-main">
                    <div className="row-title">{c.name}</div>
                    <div className="row-sub">
                      {fmtDate(c.held_on)}
                      {c.location ? ` · ${c.location}` : ''}
                    </div>
                  </div>
                  <span className="badge">{c.count} nəfər</span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>
              Planlaşdırılmış yarış yoxdur. <Link to="/panel/yarislar">Yarış əlavə et</Link>
            </Empty>
          )}
        </section>
      </div>

      {paying && (
        <PaymentModal kids={data.kids} preset={paying} onClose={() => setPaying(null)} onSaved={reload} />
      )}
    </>
  );
}
