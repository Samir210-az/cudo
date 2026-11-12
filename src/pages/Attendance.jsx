import { useEffect, useMemo, useState } from 'react';
import { Empty, ErrorBox, Icon, Loader, MonthPicker, PageHead, Stat, useToast } from '../components/ui';
import { byName, eq, getAttendance, list, range, saveAttendance } from '../lib/db';
import { addMonths, currentPeriod, fmtPeriod, fullName, groupsOf, pad, todayISO } from '../lib/format';
import GroupPicker from '../components/GroupPicker';
import { isFrozen } from '../lib/finance';
import { useQuery } from '../lib/hooks';
import { fetchSettings } from '../lib/settings';

const shiftDay = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d + n);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
};


function DayView() {
  const notify = useToast();
  const [date, setDate] = useState(todayISO());
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [present, setPresent] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const [kids, saved] = await Promise.all([list('children', eq('status', 'aktiv')), getAttendance(date)]);
    const month = `${date.slice(0, 7)}-01`;
    return { kids: kids.filter((k) => !isFrozen(k, month)).sort(byName), saved: saved || [] };
  }, [date]);

  useEffect(() => {
    if (data) setPresent(new Set(data.saved));
  }, [data]);

  const groups = useMemo(() => groupsOf(data?.kids || []), [data]);
  const groupKids = useMemo(
    () => (data?.kids || []).filter((k) => !group || k.training_time === group),
    [data, group],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    const kids = groupKids;
    return needle ? kids.filter((k) => fullName(k).toLocaleLowerCase('az').includes(needle)) : kids;
  }, [groupKids, q]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const persist = async (next) => {
    const previous = present;
    setPresent(next);
    try {
      await saveAttendance(date, [...next]);
    } catch (err) {
      setPresent(previous);
      notify('Saxlanılmadı: ' + err.message, 'error');
    }
  };

  const toggle = (id) => {
    if (loading) return;
    const next = new Set(present);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  };

  const markAll = (value) => {
    if (loading) return;
    const next = new Set(present);
    shown.forEach((k) => (value ? next.add(k.id) : next.delete(k.id)));
    persist(next);
  };

  const came = groupKids.filter((k) => present.has(k.id)).length;

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ attendanceDayPdf }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await attendanceDayPdf(date, groupKids, present, settings, group);
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="month-picker" style={{ marginBottom: 12 }}>
          <button type="button" className="icon-btn" onClick={() => setDate(shiftDay(date, -1))} aria-label="Əvvəlki gün">
            <Icon name="chevL" />
          </button>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Məşq tarixi"
            style={{ border: 0, minHeight: 40, width: 150, textAlign: 'center', fontWeight: 650 }}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setDate(shiftDay(date, 1))}
            disabled={date >= todayISO()}
            aria-label="Növbəti gün"
          >
            <Icon name="chevR" />
          </button>
        </div>

        <GroupPicker groups={groups} value={group} onChange={setGroup} />
        <div className="grid stats" style={{ marginBottom: 12 }}>
          <Stat label="Məşqə gələn" value={came} tone="ok" />
          <Stat label="Gəlməyən" value={groupKids.length - came} />
        </div>

        <div className="search" style={{ marginBottom: 10 }}>
          <Icon name="search" size={18} />
          <input type="search" placeholder="Ad üzrə axtar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Axtarış" />
        </div>
        <div className="page-actions" style={{ marginBottom: 6 }}>
          <button type="button" className="btn sm" onClick={() => markAll(true)} disabled={!shown.length}>
            <Icon name="check" size={16} /> Hamısı gəldi
          </button>
          <button type="button" className="btn sm" onClick={() => markAll(false)} disabled={!shown.length}>
            Təmizlə
          </button>
          <button type="button" className="btn sm" onClick={exportPdf} disabled={!groupKids.length || exporting}>
            <Icon name="download" size={16} /> PDF
          </button>
        </div>

        {shown.length ? (
          <div className="list">
            {shown.map((k) => (
              <label className="row check" key={k.id} style={{ cursor: 'pointer', minHeight: 56 }}>
                <input type="checkbox" checked={present.has(k.id)} onChange={() => toggle(k.id)} disabled={loading} style={{ width: 24, height: 24, flex: 'none' }} />
                <span className="row-main row-title">{fullName(k)}</span>
                {present.has(k.id) && <span className="badge ok">Gəlib</span>}
              </label>
            ))}
          </div>
        ) : (
          <Empty>{groupKids.length ? 'Axtarışa uyğun uşaq tapılmadı.' : 'Aktiv uşaq yoxdur.'}</Empty>
        )}
      </div>
    </div>
  );
}

function MonthView() {
  const notify = useToast();
  const [period, setPeriod] = useState(currentPeriod());
  const [group, setGroup] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const [kids, days] = await Promise.all([
      list('children', eq('status', 'aktiv')),
      list('attendance', ...range('date', period, addMonths(period, 1))),
    ]);
    return { kids: kids.filter((k) => !isFrozen(k, period)).sort(byName), days };
  }, [period]);

  const summary = useMemo(() => {
    if (!data) return null;
    const kids = data.kids.filter((k) => !group || k.training_time === group);
    const ids = new Set(kids.map((k) => k.id));
    const days = data.days.map((d) => ({ ...d, present: (d.present || []).filter((id) => ids.has(id)) }));
    const trainingDays = days.filter((d) => d.present.length).length;
    const counts = new Map();
    days.forEach((d) => d.present.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    const rows = kids.map((child) => {
      const count = counts.get(child.id) || 0;
      return { child, count, percent: trainingDays ? Math.round((count / trainingDays) * 100) : 0 };
    });
    return { trainingDays, rows };
  }, [data, group]);
  const groups = useMemo(() => groupsOf(data?.kids || []), [data]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ attendanceMonthPdf }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await attendanceMonthPdf(period, summary.rows, summary.trainingDays, settings, group);
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-actions" style={{ justifyContent: 'space-between' }}>
        <MonthPicker value={period} onChange={setPeriod} />
        <button type="button" className="btn" onClick={exportPdf} disabled={!summary?.trainingDays || exporting}>
          <Icon name="download" /> PDF
        </button>
      </div>
      {error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : loading && !summary ? (
        <Loader />
      ) : (
        <>
          <GroupPicker groups={groups} value={group} onChange={setGroup} />
          <div className="grid stats">
            <Stat label="Məşq günü" value={summary.trainingDays} hint="ən azı bir uşağın gəldiyi günlər" />
          </div>
          <section className="card">
            <h2>{fmtPeriod(period)}</h2>
            {summary.trainingDays ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Uşaq</th><th className="num">Gəlib</th><th className="num">Faiz</th></tr>
                  </thead>
                  <tbody>
                    {summary.rows.map((r) => (
                      <tr key={r.child.id}>
                        <td>{fullName(r.child)}</td>
                        <td className="num">{r.count} / {summary.trainingDays}</td>
                        <td className="num">{r.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Bu ay üçün davamiyyət qeydi yoxdur.</Empty>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function Attendance() {
  const [tab, setTab] = useState('day');
  return (
    <>
      <PageHead title="Davamiyyət" subtitle={tab === 'day' ? 'Məşqə gələn uşaqları işarələyin' : 'Aylıq davamiyyət'} />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'day'} onClick={() => setTab('day')}>Gün</button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'month'} onClick={() => setTab('month')}>Ay</button>
      </div>
      {tab === 'day' ? <DayView /> : <MonthView />}
    </>
  );
}
