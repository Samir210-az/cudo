import { useMemo, useState } from 'react';
import { ErrorBox, Icon, Loader, PageHead, Stat, useToast } from '../components/ui';
import { sum } from '../lib/finance';
import { MONTHS, fmtMoney, pad } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { fetchSettings } from '../lib/settings';
import { indexById, list, range } from '../lib/db';

const SALARY_LABEL = 'Əmək haqqı';

export default function Reports() {
  const notify = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState('all');
  const [exporting, setExporting] = useState(false);

  const bounds = useMemo(() => {
    if (month === 'all') return [`${year}-01-01`, `${year + 1}-01-01`];
    const m = Number(month);
    const start = `${year}-${pad(m + 1)}-01`;
    const end = m === 11 ? `${year + 1}-01-01` : `${year}-${pad(m + 2)}-01`;
    return [start, end];
  }, [year, month]);

  const { data, loading, error, reload } = useQuery(async () => {
    const [from, to] = bounds;
    const [rawPayments, expenses, rawSalaries, kids, staff] = await Promise.all([
      list('payments', ...range('paid_on', from, to)),
      list('expenses', ...range('spent_on', from, to)),
      list('salaryPayments', ...range('paid_on', from, to)),
      list('children'),
      list('staff'),
    ]);
    const kidById = indexById(kids);
    const staffById = indexById(staff);
    const payments = rawPayments
      .filter((p) => kidById.has(p.child_id))
      .map((p) => ({ ...p, children: kidById.get(p.child_id) }))
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on));
    const salaries = rawSalaries
      .filter((s) => staffById.has(s.staff_id))
      .map((s) => ({ ...s, staff: staffById.get(s.staff_id) }))
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on));
    expenses.sort((a, b) => a.spent_on.localeCompare(b.spent_on));
    return { payments, expenses, salaries };
  }, [bounds[0], bounds[1]]);

  const report = useMemo(() => {
    if (!data) return null;
    const income = sum(data.payments);
    const salaryTotal = sum(data.salaries);
    const byCategory = new Map();
    for (const x of data.expenses) byCategory.set(x.category, (byCategory.get(x.category) || 0) + Number(x.amount));
    if (salaryTotal) byCategory.set(SALARY_LABEL, salaryTotal);
    const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const expenseTotal = sum(data.expenses) + salaryTotal;

    let monthly = null;
    if (month === 'all') {
      monthly = MONTHS.map((label, i) => {
        const key = `${year}-${pad(i + 1)}`;
        const inMonth = (iso) => iso.startsWith(key);
        return {
          label,
          income: sum(data.payments.filter((p) => inMonth(p.paid_on))),
          expense:
            sum(data.expenses.filter((x) => inMonth(x.spent_on))) + sum(data.salaries.filter((s) => inMonth(s.paid_on))),
        };
      });
    }
    return { income, expenseTotal, net: income - expenseTotal, categories, monthly };
  }, [data, month, year]);

  const title = month === 'all' ? `${year} il` : `${MONTHS[Number(month)]} ${year}`;

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ financeReportPdf }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await financeReportPdf({ title, ...report, ...data }, settings);
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <>
      <PageHead title="Hesabat" subtitle="Gəlir və xərc faktiki ödəniş tarixinə görə hesablanır">
        <button type="button" className="btn primary" onClick={exportPdf} disabled={!report || exporting}>
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
      ) : loading && !report ? (
        <Loader />
      ) : (
        <div className="stack">
          <div className="grid stats">
            <Stat label="Gəlir" value={fmtMoney(report.income)} tone="ok" />
            <Stat label="Xərc" value={fmtMoney(report.expenseTotal)} hint="əmək haqqı daxil" />
            <Stat label="Xalis nəticə" value={fmtMoney(report.net)} tone={report.net < 0 ? 'bad' : 'ok'} />
          </div>

          <section className="card">
            <h2>Xərclər kateqoriyalar üzrə</h2>
            {report.categories.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <tbody>
                    {report.categories.map(([name, value]) => (
                      <tr key={name}><td>{name}</td><td className="num">{fmtMoney(value)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Bu dövrdə xərc yoxdur.</p>
            )}
          </section>

          {report.monthly && (
            <section className="card">
              <h2>Aylar üzrə</h2>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Ay</th><th className="num">Gəlir</th><th className="num">Xərc</th><th className="num">Nəticə</th></tr>
                  </thead>
                  <tbody>
                    {report.monthly.map((m) => (
                      <tr key={m.label}>
                        <td>{m.label}</td>
                        <td className="num">{fmtMoney(m.income)}</td>
                        <td className="num">{fmtMoney(m.expense)}</td>
                        <td className="num">{fmtMoney(m.income - m.expense)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Cəmi</td>
                      <td className="num">{fmtMoney(report.income)}</td>
                      <td className="num">{fmtMoney(report.expenseTotal)}</td>
                      <td className="num">{fmtMoney(report.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
