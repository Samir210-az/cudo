import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Icon, Loader, PageHead, useToast } from '../components/ui';
import PaymentModal from '../components/PaymentModal';
import { sum } from '../lib/finance';
import {
  calcAge, fmtDate, fmtMoney, fmtPeriod, formatPhone, fullName, gradeLabel, trainingDuration,
} from '../lib/format';
import { useQuery } from '../lib/hooks';
import { fetchSettings } from '../lib/settings';
import { supabase, unwrap } from '../lib/supabase';

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
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const [child, entries, payments] = await Promise.all([
      supabase.from('children').select('*').eq('id', id).single(),
      supabase
        .from('competition_entries')
        .select('id, category, result, competitions(id, name, held_on)')
        .eq('child_id', id),
      supabase.from('payments').select('*').eq('child_id', id).order('period_month', { ascending: false }).order('paid_on', { ascending: false }),
    ]);
    const entryRows = unwrap(entries).sort((a, b) => b.competitions.held_on.localeCompare(a.competitions.held_on));
    return { child: unwrap(child), entries: entryRows, payments: unwrap(payments) };
  }, [id]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { child, entries, payments } = data;

  const openScan = async () => {
    const tab = window.open('', '_blank');
    const { data: signed, error: signError } = await supabase.storage.from('id-scans').createSignedUrl(child.id_scan_path, 90);
    if (signError) {
      tab?.close();
      return notify('Skan açılmadı: ' + signError.message, 'error');
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = signed.signedUrl;
    } else {
      window.location.href = signed.signedUrl;
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

  const remove = async () => {
    if (!window.confirm(`${fullName(child)} silinsin? Bu əməliyyat geri qaytarılmır.`)) return;
    const { error: delError } = await supabase.from('children').delete().eq('id', id);
    if (delError) {
      return notify(
        delError.code === '23503'
          ? 'Ödəniş tarixçəsi olan uşağı silmək olmaz. Əvəzinə statusunu "Passiv" edin.'
          : 'Silinmədi: ' + delError.message,
        'error',
      );
    }
    if (child.id_scan_path) await supabase.storage.from('id-scans').remove([child.id_scan_path]);
    notify('Uşaq silindi.');
    navigate('/panel/usaqlar', { replace: true });
  };

  return (
    <>
      <PageHead
        title={fullName(child)}
        subtitle={`${calcAge(child.birth_date)} yaş · ${child.status === 'aktiv' ? 'Aktiv' : 'Passiv'}`}
        back={<Link className="back-link" to="/panel/usaqlar">← Uşaqlar</Link>}
      >
        <button type="button" className="btn" onClick={() => setPaying(true)}>Ödəniş qəbul et</button>
        <button type="button" className="btn" onClick={exportPdf} disabled={exporting}>
          <Icon name="download" /> PDF
        </button>
        <Link className="btn primary" to={`/panel/usaqlar/${id}/redakte`}>
          <Icon name="edit" /> Redaktə
        </Link>
      </PageHead>

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
              {child.id_scan_path ? (
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
            <Info label="Kəmər">{child.belt}</Info>
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
