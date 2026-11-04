import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Icon, Loader, Modal, PageHead, useToast } from '../components/ui';
import BeltIcon from '../components/BeltIcon';
import PaymentModal from '../components/PaymentModal';
import { sum } from '../lib/finance';
import {
  addMonths, calcAge, currentPeriod, fmtDate, fmtMoney, fmtPeriod, formatPhone, fullName, gradeLabel, todayISO, trainingDuration,
} from '../lib/format';
import { useQuery } from '../lib/hooks';
import { BELTS, beltStyle } from '../lib/belts';
import { avatarTone, fetchSettings, initials } from '../lib/settings';
import { eq, exists, get, getScan, indexById, list, remove, removeScan, removeWhere, update } from '../lib/db';

function Info({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  );
}

export default function ChildCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [paying, setPaying] = useState(false);
  const [beltOpen, setBeltOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scan, setScan] = useState(null);

  const { data, loading, error, reload } = useQuery(async () => {
    const [child, rawEntries, payments, competitions, attendanceDays] = await Promise.all([
      get('children', id),
      list('competitionEntries', eq('child_id', id)),
      list('payments', eq('child_id', id)),
      list('competitions'),
      list('attendance'),
    ]);
    const period = currentPeriod();
    const nextPeriod = addMonths(period, 1);
    const visits = attendanceDays.filter((d) => (d.present || []).includes(id)).map((d) => d.id).sort();
    const attendance = {
      total: visits.length,
      month: visits.filter((d) => d >= period && d < nextPeriod).length,
      last: visits[visits.length - 1] || null,
    };
    const byId = indexById(competitions);
    const entries = rawEntries
      .filter((e) => byId.has(e.competition_id))
      .map((e) => ({ ...e, competitions: byId.get(e.competition_id) }))
      .sort((a, b) => b.competitions.held_on.localeCompare(a.competitions.held_on));
    payments.sort((a, b) => b.period_month.localeCompare(a.period_month) || b.paid_on.localeCompare(a.paid_on));
    return { child, entries, payments, attendance };
  }, [id]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { child, entries, payments, attendance } = data;
  const belt = beltStyle(child.belt);

  const openScan = async () => {
    try {
      const dataUrl = await getScan(child.id);
      if (!dataUrl) return notify('Skan tapılmadı.', 'error');
      setScan(dataUrl);
    } catch (err) {
      notify('Skan açılmadı: ' + err.message, 'error');
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ childCardPdf }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await childCardPdf(child, { entries, payments }, settings);
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const removeBelt = async () => {
    try {
      const history = (child.belt_history || []).slice(0, -1);
      const prev = history[history.length - 1];
      await update('children', id, {
        belt: prev ? prev.belt : null,
        belt_at: prev ? prev.at : null,
        belt_history: history,
      });
      notify(prev ? `Kəmər geri qaytarıldı: ${prev.belt}.` : 'Kəmər götürüldü.');
      setBeltOpen(false);
      reload();
    } catch (err) {
      notify('Kəmər saxlanılmadı: ' + err.message, 'error');
    }
  };

  const giveBelt = async (name) => {
    try {
      await update('children', id, {
        belt: name,
        belt_at: todayISO(),
        belt_history: [...(child.belt_history || []), { belt: name, at: todayISO() }],
      });
      notify(`${name} kəmər verildi.`);
      setBeltOpen(false);
      reload();
    } catch (err) {
      notify('Kəmər saxlanılmadı: ' + err.message, 'error');
    }
  };

  const remove = async () => {
    if (!window.confirm(`${fullName(child)} silinsin? Bu əməliyyat geri qaytarılmır.`)) return;
    try {
      if (await exists('payments', 'child_id', id)) {
        return notify('Ödəniş tarixçəsi olan uşağı silmək olmaz. Əvəzinə statusunu "Passiv" edin.', 'error');
      }
      await removeWhere('competitionEntries', 'child_id', id);
      if (child.has_scan) await removeScan(id);
      await remove('children', id);
      notify('Uşaq silindi.');
      navigate('/panel/usaqlar', { replace: true });
    } catch (err) {
      notify('Silinmədi: ' + err.message, 'error');
    }
  };

  return (
    <>
      <PageHead
        title={<span className="title-belt"><BeltIcon name={child.belt} size={26} />{fullName(child)}</span>}
        subtitle={`${calcAge(child.birth_date)} yaş · ${child.status === 'aktiv' ? 'Aktiv' : 'Passiv'}`}
        back={<Link className="back-link" to="/panel/usaqlar">← Uşaqlar</Link>}
      >
        <button type="button" className="btn" onClick={() => setBeltOpen(true)}>Kəmər ver</button>
        <button type="button" className="btn" onClick={() => setPaying(true)}>Ödəniş qəbul et</button>
        <button type="button" className="btn" onClick={exportPdf} disabled={exporting}>
          <Icon name="download" /> PDF
        </button>
        <Link className="btn primary" to={`/panel/usaqlar/${id}/redakte`}>
          <Icon name="edit" /> Redaktə
        </Link>
      </PageHead>

      <section className="profile" style={{ '--belt': belt?.stripe }}>
        <span className={`avatar lg ${avatarTone(child)}`} aria-hidden="true">{initials(child)}</span>
        {belt && <span className="profile-belt" role="img" aria-label={`${belt.name} kəmər`} title={`${belt.name} kəmər`}><BeltIcon name={child.belt} size={48} /></span>}
        <div className="chips">
          <span className="chip">{calcAge(child.birth_date)} yaş</span>
          <span className="chip">{trainingDuration(child.joined_at)} məşğul olur</span>
          {child.grade !== null && child.grade !== undefined && <span className="chip">{gradeLabel(child.grade)}</span>}
        </div>
      </section>

      <div className="stack">
        <section className="card">
          <h2>Şəxsi məlumatlar</h2>
          <dl className="kv">
            <Info label="Ata adı">{child.father_name}</Info>
            <Info label="Doğum tarixi">{fmtDate(child.birth_date)}</Info>
            <Info label="Cins">{child.gender}</Info>
            <Info label="Vəsiqə seriya və nömrəsi">{child.id_series}</Info>
            <Info label="FİN">{child.id_fin}</Info>
            <Info label="Vəsiqənin skanı">
              {child.has_scan ? (
                <button type="button" className="btn sm" onClick={openScan}>Göstər</button>
              ) : null}
            </Info>
          </dl>
        </section>

        <section className="card">
          <h2>Təhsil və klub</h2>
          <dl className="kv">
            <Info label="Məktəb">{child.school}</Info>
            <Info label="Sinif">{child.grade === null ? null : gradeLabel(child.grade)}</Info>
            <Info label="Klubda qeydiyyat">{fmtDate(child.joined_at)}</Info>
            <Info label="Məşğul olur">{trainingDuration(child.joined_at)}</Info>
            <Info label="Kəmər">
              {child.belt ? <><BeltIcon name={child.belt} size={18} />{child.belt}{child.belt_at ? ` · ${fmtDate(child.belt_at)}` : ''}</> : null}
            </Info>
            <Info label="Çəki">{child.weight_kg ? `${child.weight_kg} kq` : null}</Info>
            <Info label="Aylıq ödəniş">{fmtMoney(child.monthly_fee)}</Info>
          </dl>
        </section>

        <section className="card">
          <h2>Valideyn</h2>
          <dl className="kv">
            <Info label="Ad">{child.parent_name}</Info>
            <Info label="Telefon">
              {child.parent_phone ? <a href={`tel:+994${child.parent_phone.slice(1)}`}>{formatPhone(child.parent_phone)}</a> : null}
            </Info>
            <Info label="Qeyd">{child.note}</Info>
          </dl>
        </section>

        <section className="card">
          <h2>Davamiyyət</h2>
          <dl className="kv">
            <Info label="Bu ay">{`${attendance.month} məşq`}</Info>
            <Info label="Cəmi">{`${attendance.total} məşq`}</Info>
            <Info label="Sonuncu dəfə">{attendance.last ? fmtDate(attendance.last) : null}</Info>
          </dl>
        </section>

        <section className="card">
          <h2>Yarışlar</h2>
          {entries.length ? (
            <div className="list">
              {entries.map((e) => (
                <Link className="row" key={e.id} to={`/panel/yarislar/${e.competitions.id}`}>
                  <div className="row-main">
                    <div className="row-title">{e.competitions.name}</div>
                    <div className="row-sub">{fmtDate(e.competitions.held_on)}{e.category ? ` · ${e.category}` : ''}</div>
                  </div>
                  {e.result && <span className="badge ok">{e.result}</span>}
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Hələ yarışda iştirak etməyib.</Empty>
          )}
        </section>

        <section className="card">
          <h2>Ödənişlər</h2>
          {payments.length ? (
            <>
              <p className="muted">Cəmi ödənilib: {fmtMoney(sum(payments))}</p>
              <div className="list">
                {payments.map((p) => (
                  <div className="row" key={p.id}>
                    <div className="row-main">
                      <div className="row-title">{fmtPeriod(p.period_month)}</div>
                      <div className="row-sub">{fmtDate(p.paid_on)} · {p.method}</div>
                    </div>
                    <div className="row-end">{fmtMoney(p.amount)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty>Ödəniş qeydi yoxdur.</Empty>
          )}
        </section>

        <section className="card">
          <h2>Silmək</h2>
          <p className="muted" style={{ marginBottom: 10 }}>
            Ödəniş qeydi olan uşağı silmək olmur. Uşaq klubdan ayrılıbsa, statusunu "Passiv" edin.
          </p>
          <button type="button" className="btn danger" onClick={remove}>
            <Icon name="trash" /> Uşağı sil
          </button>
        </section>
      </div>

      {scan && (
        <Modal title="Vəsiqənin skanı" onClose={() => setScan(null)}>
          <img src={scan} alt="Vəsiqənin skanı" style={{ width: '100%', borderRadius: 10 }} />
        </Modal>
      )}

      {beltOpen && (
        <Modal title="Kəmər ver" onClose={() => setBeltOpen(false)}>
          <div className="belt-pick">
            {BELTS.map((b) => (
              <button type="button" key={b.name} aria-pressed={child.belt === b.name} onClick={() => giveBelt(b.name)}>
                <BeltIcon name={b.name} size={20} />{b.name}
              </button>
            ))}
          </div>
          {child.belt && (
            <button type="button" className="btn danger" style={{ marginTop: 14, width: '100%' }} onClick={removeBelt}>
              Son kəmər verilməsini ləğv et
            </button>
          )}
        </Modal>
      )}

      {paying && (
        <PaymentModal
          kids={[child]}
          preset={{ child_id: child.id, amount: Number(child.monthly_fee) || '' }}
          onClose={() => setPaying(false)}
          onSaved={reload}
        />
      )}
    </>
  );
}
