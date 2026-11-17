import { useMemo, useState } from 'react';
import { Empty, Icon, Stat, useToast } from '../ui';
import { update } from '../../lib/db';
import { athleteName, categoryOf, weightOf } from '../../lib/tournament';

function Row({ a, config, drawn, reload }) {
  const notify = useToast();
  const [value, setValue] = useState(a.weighed_kg ?? a.declared_kg ?? '');
  const [busy, setBusy] = useState(false);

  const kg = value === '' ? null : Number(String(value).replace(',', '.'));
  const before = categoryOf(a, config);
  const after = categoryOf({ ...a, weighed_kg: kg ?? undefined }, config);
  const changed = kg !== null && before.key !== after.key;

  const patch = async (data, okText) => {
    setBusy(true);
    try {
      await update('tournamentAthletes', a.id, data);
      notify(okText);
      reload();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmWeight = () => {
    if (!Number.isFinite(kg) || kg < 5 || kg > 200) return notify('Çəkini düzgün yazın.', 'error');
    if (drawn && !window.confirm('Bu idmançı püşkatmaya düşüb. Çəki dəyişsə də tablo avtomatik yenilənmir. Davam edilsin?')) return;
    patch({ weighed_kg: kg, status: 'cekildi' }, 'Çəki qeyd edildi.');
  };

  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <div className="row-main">
        <div className="row-title">{athleteName(a)}</div>
        <div className="row-sub">
          {a.club_name} · məşqçinin yazdığı: {a.declared_kg ?? '—'} kq
          {changed ? ` · yeni kateqoriya: ${after.cls || after.label}` : ''}
        </div>
        {kg !== null && !after.key && <div className="row-sub" style={{ color: 'var(--red)' }}>{after.problem}</div>}
      </div>
      {a.status === 'kenar' ? (
        <>
          <span className="badge bad">Kənar</span>
          <button type="button" className="btn sm" disabled={busy} onClick={() => patch({ status: a.weighed_kg ? 'cekildi' : 'qeydiyyat' }, 'Siyahıya qaytarıldı.')}>Geri qaytar</button>
        </>
      ) : (
        <>
          <input
            className="inline-input weigh-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="5"
            placeholder="Faktiki"
            aria-label={`${athleteName(a)} faktiki çəkisi`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" className="btn sm primary" disabled={busy || value === ''} onClick={confirmWeight}>
            <Icon name="check" size={16} /> {a.status === 'cekildi' ? 'Yenilə' : 'Təsdiq'}
          </button>
          <button type="button" className="btn sm danger" disabled={busy} onClick={() => window.confirm(`${athleteName(a)} yarışdan kənarlaşdırılsın?`) && patch({ status: 'kenar' }, 'Kənarlaşdırıldı.')}>Kənar</button>
        </>
      )}
    </div>
  );
}

export default function WeighIn({ config, athletes, brackets, reload }) {
  const [q, setQ] = useState('');
  const [view, setView] = useState('gozleyen');
  const drawnIds = useMemo(() => new Set(brackets.flatMap((b) => b.athletes.map((a) => a.id))), [brackets]);

  const active = athletes.filter((a) => a.status !== 'kenar');
  const weighed = active.filter((a) => a.status === 'cekildi');
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    return athletes
      .filter((a) => !needle || `${athleteName(a)} ${a.club_name}`.toLocaleLowerCase('az').includes(needle))
      .filter((a) => (view === 'gozleyen' ? a.status === 'qeydiyyat' : view === 'cekilen' ? a.status === 'cekildi' : a.status === 'kenar'))
      .sort((a, b) => athleteName(a).localeCompare(athleteName(b), 'az'));
  }, [athletes, q, view]);

  return (
    <>
      <div className="grid stats" style={{ marginBottom: 14 }}>
        <Stat label="Çəkilib" value={`${weighed.length} / ${active.length}`} tone="ok" />
        <Stat label="Gözləyən" value={active.length - weighed.length} />
      </div>
      <div className="filters">
        <div className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Ad və ya klub" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Axtarış" />
        </div>
        <div className="tabs scroll" role="tablist">
          {[['gozleyen', 'Gözləyən'], ['cekilen', 'Çəkilən'], ['kenar', 'Kənar']].map(([k, label]) => (
            <button key={k} type="button" role="tab" className="tab" aria-selected={view === k} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
      </div>
      <section className="card">
        {shown.length ? (
          <div className="list">
            {shown.map((a) => <Row key={`${a.id}-${a.status}-${weightOf(a)}`} a={a} config={config} drawn={drawnIds.has(a.id)} reload={reload} />)}
          </div>
        ) : <Empty>{view === 'gozleyen' ? 'Çəkilişi gözləyən idmançı yoxdur.' : 'Siyahı boşdur.'}</Empty>}
      </section>
    </>
  );
}
