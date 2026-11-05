import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBox, Icon, Loader, PageHead, Stat, useToast } from '../components/ui';
import { useClub } from '../lib/clubs';
import { eq, indexById, listFor, range } from '../lib/db';
import { BRAND } from '../lib/settings';
import { computeDebts, onlyDebtors, sum } from '../lib/finance';
import { MONTHS, currentPeriod, fmtMoney, periodBounds } from '../lib/format';
import { useQuery } from '../lib/hooks';

async function clubFigures(club, [from, to], period) {
  const [rawPayments, expenses, rawSalaries, kids, staff, dues] = await Promise.all([
    listFor(club.id, 'payments', ...range('paid_on', from, to)),
    listFor(club.id, 'expenses', ...range('spent_on', from, to)),
    listFor(club.id, 'salaryPayments', ...range('paid_on', from, to)),
    listFor(club.id, 'children'),
    listFor(club.id, 'staff'),
    listFor(club.id, 'payments', eq('period_month', period)),
  ]);
  const kidIds = indexById(kids);
  const staffIds = indexById(staff);
  const income = sum(rawPayments.filter((p) => kidIds.has(p.child_id)));
  const expense = sum(expenses) + sum(rawSalaries.filter((s) => staffIds.has(s.staff_id)));
  const debtors = onlyDebtors(computeDebts(kids, dues, period));
  return {
    club,
    income,
    expense,
    net: income - expense,
    active: kids.filter((c) => c.status === 'aktiv').length,
    debtors: debtors.length,
    debt: sum(debtors, 'due'),
  };
}

export default function Overall() {
  const notify = useToast();
  const navigate = useNavigate();
  const { clubs, switchClub } = useClub();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState('all');
  const [exporting, setExporting] = useState(false);

  const bounds = useMemo(() => periodBounds(year, month), [year, month]);
  const clubKey = clubs.map((c) => c.id).join('|');

  const { data: rows, loading, error, reload } = useQuery(
    () => Promise.all(clubs.map((club) => clubFigures(club, bounds, currentPeriod()))),
    [bounds[0], bounds[1], clubKey],
  );

  const totals = useMemo(() => {
    if (!rows) return null;
    const income = sum(rows, 'income');
    const expense = sum(rows, 'expense');
    return { income, expense, net: income - expense, debt: sum(rows, 'debt'), active: sum(rows, 'active') };
  }, [rows]);

  const title = month === 'all' ? `${year} il` : `${MONTHS[Number(month)]} ${year}`;

  const goTo = (id) => {
    switchClub(id);
    navigate('/panel/hesabat');
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { overallReportPdf } = await import('../lib/pdf');
      await overallReportPdf({ title, rows, totals, brand: BRAND });
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <>
      <PageHead title="Ümumi hesabat" subtitle="Bütün filialların gəlir və xərci faktiki ödəniş tarixinə görə">
        <button type="button" className="btn primary" onClick={exportPdf} disabled={!rows || exporting}>
          <Icon name="download" /> {exporting ? 'Hazırlanır…' : 'PDF'}
        </button>
      </PageHead>

      <div className="form-grid" style={{ marginBottom: 14 }}>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="İl">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Ay">
          <option value="all">Bütün il</option>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : loading && !rows ? (
        <Loader />
      ) : (
        <div className="stack">
          <div className="grid stats">
            <Stat label="Gəlir" value={fmtMoney(totals.income)} tone="ok" />
            <Stat label="Xərc" value={fmtMoney(totals.expense)} hint="əmək haqqı daxil" />
            <Stat label="Xalis nəticə" value={fmtMoney(totals.net)} tone={totals.net < 0 ? 'bad' : 'ok'} />
          </div>

          <section className="card">
            <h2>Filiallar üzrə — {title}</h2>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Filial</th><th className="num">Gəlir</th><th className="num">Xərc</th><th className="num">Xalis</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.club.id}>
                      <td><button type="button" className="linklike" onClick={() => goTo(r.club.id)}>{r.club.club_name}</button></td>
                      <td className="num">{fmtMoney(r.income)}</td>
                      <td className="num">{fmtMoney(r.expense)}</td>
                      <td className="num">{fmtMoney(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Cəmi</td>
                    <td className="num">{fmtMoney(totals.income)}</td>
                    <td className="num">{fmtMoney(totals.expense)}</td>
                    <td className="num">{fmtMoney(totals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>Cari ay üzrə ödəniş borcu</h2>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Filial</th><th className="num">Uşaq</th><th className="num">Borclu</th><th className="num">Borc</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.club.id}>
                      <td>{r.club.club_name}</td>
                      <td className="num">{r.active}</td>
                      <td className="num">{r.debtors}</td>
                      <td className="num">{fmtMoney(r.debt)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Cəmi</td>
                    <td className="num">{totals.active}</td>
                    <td className="num">{sum(rows, 'debtors')}</td>
                    <td className="num">{fmtMoney(totals.debt)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
