import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Icon, Loader, PageHead, Stat } from '../components/ui';
import PaymentModal from '../components/PaymentModal';
import { computeDebts, onlyDebtors, sum } from '../lib/finance';
import { addMonths, currentPeriod, fmtDate, fmtMoney, fmtPeriod, fullName, todayISO } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { supabase, unwrap } from '../lib/supabase';

export default function Dashboard() {
  const period = currentPeriod();
  const next = addMonths(period, 1);
  const [paying, setPaying] = useState(null);

  const { data, loading, error, reload } = useQuery(async () => {
    const [kids, duePayments, cashIn, expenses, salaries, competitions] = (
      await Promise.all([
        supabase.from('children').select('id, first_name, last_name, monthly_fee, joined_at, status').eq('status', 'aktiv'),
        supabase.from('payments').select('child_id, amount, period_month').eq('period_month', period),
        supabase.from('payments').select('amount').gte('paid_on', period).lt('paid_on', next),
        supabase.from('expenses').select('amount').gte('spent_on', period).lt('spent_on', next),
        supabase.from('salary_payments').select('amount').gte('paid_on', period).lt('paid_on', next),
        supabase
          .from('competitions')
          .select('id, name, held_on, location, competition_entries(count)')
          .gte('held_on', todayISO())
          .order('held_on')
          .limit(3),
      ])
    ).map(unwrap);
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
                  <span className="badge">{c.competition_entries[0]?.count || 0} nəfər</span>
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
