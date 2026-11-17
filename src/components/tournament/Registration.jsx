import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Field, Icon, Modal, useToast } from '../ui';
import AthleteForm, { toPayload, validateAthlete } from './AthleteForm';
import FixMissing from './FixMissing';
import BranchLinks, { syncLinks } from './BranchLinks';
import { addMany, listClubs, listFor, remove } from '../../lib/db';
import { useQuery } from '../../lib/hooks';
import { calcAge, fmtDate, fullName, todayISO } from '../../lib/format';
import { BRAND } from '../../lib/settings';
import { GENDERS, STATUSES, TYPES, athleteName, categoryOf, groupCategories } from '../../lib/tournament';

const blankRow = () => ({ last_name: '', first_name: '', birth_date: '', gender: '', declared_kg: '' });

function BulkAdd({ competitionId, clubs, onClose, onSaved }) {
  const notify = useToast();
  const [shared, setShared] = useState({ club_name: '', coach: '', group_type: 'esas', gender: '' });
  const [rows, setRows] = useState([blankRow(), blankRow(), blankRow(), blankRow(), blankRow()]);
  const [busy, setBusy] = useState(false);

  const setRow = (i, key, value) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const filled = rows.filter((r) => r.last_name.trim() || r.first_name.trim() || r.birth_date);

  const save = async () => {
    if (!shared.club_name.trim()) return notify('Klubu yazın.', 'error');
    if (!filled.length) return notify('Ən azı bir idmançı yazın.', 'error');
    const payloads = [];
    for (let i = 0; i < filled.length; i += 1) {
      const form = { ...filled[i], father_name: '', club_name: shared.club_name, coach: shared.coach, group_type: shared.group_type, gender: filled[i].gender || shared.gender };
      const problem = validateAthlete(form);
      if (problem) return notify(`${i + 1}-ci sətir: ${problem}`, 'error');
      payloads.push({ ...toPayload(form), competition_id: competitionId, status: 'qeydiyyat', created_at: new Date().toISOString() });
    }
    setBusy(true);
    try {
      await addMany('tournamentAthletes', payloads);
      notify(`${payloads.length} idmançı əlavə edildi.`);
      onSaved();
      onClose();
    } catch (err) {
      notify('Əlavə edilmədi: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Kütləvi idmançı əlavə et" onClose={onClose}>
      <div className="form-grid">
        <Field label="Klub">
          <input list="club-names-bulk" value={shared.club_name} onChange={(e) => setShared({ ...shared, club_name: e.target.value })} />
          <datalist id="club-names-bulk">{clubs.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Məşqçi">
          <input value={shared.coach} onChange={(e) => setShared({ ...shared, coach: e.target.value })} />
        </Field>
        <Field label="Qrup">
          <select value={shared.group_type} onChange={(e) => setShared({ ...shared, group_type: e.target.value })}>
            <option value="esas">Əsas</option>
            <option value="teze">TƏZƏ</option>
          </select>
        </Field>
        <Field label="Cins (hamısı üçün)" hint="Sətirdə ayrıca seçilməyibsə bu götürülür">
          <select value={shared.gender} onChange={(e) => setShared({ ...shared, gender: e.target.value })}>
            <option value="">Seçin</option>
            <option value="oğlan">Oğlan</option>
            <option value="qız">Qız</option>
          </select>
        </Field>
      </div>
      <div className="bulk-rows">
        {rows.map((r, i) => (
          <div className="bulk-row" key={i}>
            <input placeholder="Soyad" aria-label={`${i + 1}. soyad`} value={r.last_name} onChange={(e) => setRow(i, 'last_name', e.target.value)} />
            <input placeholder="Ad" aria-label={`${i + 1}. ad`} value={r.first_name} onChange={(e) => setRow(i, 'first_name', e.target.value)} />
            <input type="date" aria-label={`${i + 1}. doğum tarixi`} value={r.birth_date} max={todayISO()} onChange={(e) => setRow(i, 'birth_date', e.target.value)} />
            <select aria-label={`${i + 1}. cins`} value={r.gender} onChange={(e) => setRow(i, 'gender', e.target.value)}>
              <option value="">Cins</option>
              <option value="oğlan">Oğlan</option>
              <option value="qız">Qız</option>
            </select>
            <input type="number" inputMode="decimal" step="0.1" placeholder="Çəki" aria-label={`${i + 1}. çəki`} value={r.declared_kg} onChange={(e) => setRow(i, 'declared_kg', e.target.value)} />
          </div>
        ))}
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={() => setRows((p) => [...p, blankRow(), blankRow(), blankRow()])}>
          <Icon name="plus" /> Sətir əlavə et
        </button>
        <button type="button" className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Əlavə edilir…' : `Əlavə et${filled.length ? ` (${filled.length})` : ''}`}
        </button>
      </div>
    </Modal>
  );
}

function ImportOwn({ competitionId, taken, onClose, onSaved }) {
  const notify = useToast();
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [meta, setMeta] = useState({ club_name: BRAND, coach: '', group_type: 'esas' });
  const [busy, setBusy] = useState(false);

  const { data, loading, error } = useQuery(async () => {
    const clubs = await listClubs();
    const groups = await Promise.all(
      clubs.map(async (c) => (await listFor(c.id, 'children')).map((k) => ({ ...k, branch_id: c.id, branch_name: c.club_name }))),
    );
    return { clubs, kids: groups.flat().filter((k) => k.status === 'aktiv') };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    return (data?.kids || [])
      .filter((k) => !taken.has(k.id))
      .filter((k) => !branch || k.branch_id === branch)
      .filter((k) => !needle || fullName(k).toLocaleLowerCase('az').includes(needle))
      .sort((x, y) => fullName(x).localeCompare(fullName(y), 'az'));
  }, [data, q, branch, taken]);

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickAll = () => setPicked((prev) => new Set([...prev, ...shown.map((k) => k.id)]));

  const save = async () => {
    if (!picked.size) return notify('Ən azı bir uşaq seçin.', 'error');
    if (!meta.club_name.trim()) return notify('Klubu yazın.', 'error');
    const rows = data.kids.filter((k) => picked.has(k.id)).map((k) => ({
      competition_id: competitionId,
      child_id: k.id,
      branch_id: k.branch_id,
      last_name: k.last_name,
      first_name: k.first_name,
      father_name: k.father_name || null,
      birth_date: k.birth_date,
      gender: k.gender || null,
      declared_kg: k.weight_kg ?? null,
      group_type: meta.group_type,
      club_name: meta.club_name.trim(),
      coach: meta.coach.trim() || null,
      status: 'qeydiyyat',
      created_at: new Date().toISOString(),
    }));
    setBusy(true);
    try {
      await addMany('tournamentAthletes', rows);
      const noGender = rows.filter((r) => !r.gender).length;
      notify(noGender ? `${rows.length} uşaq əlavə edildi. ${noGender} nəfərin cinsi yoxdur, redaktə edin.` : `${rows.length} uşaq əlavə edildi.`);
      onSaved();
      onClose();
    } catch (err) {
      notify('Əlavə edilmədi: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Filialların uşaqlarından əlavə et" onClose={onClose}>
      {loading && <p className="row-sub">Filialların siyahısı yüklənir…</p>}
      {error && <p className="notice error">Yüklənmədi: {error.message}</p>}
      {data && (
        <>
          <div className="filters">
            <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Filial">
              <option value="">Bütün filiallar</option>
              {data.clubs.map((c) => <option key={c.id} value={c.id}>{c.club_name}</option>)}
            </select>
            <div className="search">
              <Icon name="search" size={18} />
              <input type="search" placeholder="Ad üzrə axtar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Axtarış" />
            </div>
          </div>
          <div className="toolbar">
            <button type="button" className="btn sm" onClick={pickAll} disabled={!shown.length}>Göstərilənlərin hamısını seç ({shown.length})</button>
            {picked.size > 0 && <button type="button" className="btn sm" onClick={() => setPicked(new Set())}>Seçimi təmizlə</button>}
          </div>
          <div className="list" style={{ maxHeight: '34dvh', overflowY: 'auto' }}>
            {shown.length ? shown.map((k) => (
              <label className="row check" key={k.id}>
                <input type="checkbox" checked={picked.has(k.id)} onChange={() => toggle(k.id)} />
                <span className="row-main">
                  <span className="row-title">{fullName(k)}</span>
                  <span className="row-sub" style={{ display: 'block' }}>
                    {k.branch_name} · {calcAge(k.birth_date)} yaş{k.weight_kg ? ` · ${k.weight_kg} kq` : ''}{k.gender ? ` · ${k.gender}` : ''}
                  </span>
                </span>
              </label>
            )) : <Empty>Əlavə ediləcək uşaq tapılmadı.</Empty>}
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <Field label="Klubun adı"><input value={meta.club_name} onChange={(e) => setMeta({ ...meta, club_name: e.target.value })} /></Field>
            <Field label="Məşqçi"><input value={meta.coach} onChange={(e) => setMeta({ ...meta, coach: e.target.value })} /></Field>
            <Field label="Qrup">
              <select value={meta.group_type} onChange={(e) => setMeta({ ...meta, group_type: e.target.value })}>
                <option value="esas">Əsas</option>
                <option value="teze">TƏZƏ</option>
              </select>
            </Field>
          </div>
        </>
      )}
      <div className="form-actions">
        <button type="button" className="btn primary" onClick={save} disabled={busy || !picked.size}>
          {busy ? 'Əlavə edilir…' : `Əlavə et (${picked.size})`}
        </button>
        <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
      </div>
    </Modal>
  );
}

export default function Registration({ competition, config, athletes, brackets, reload }) {
  const notify = useToast();
  const [mode, setMode] = useState(null);
  const [q, setQ] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState('');
  const latest = useRef(athletes);
  latest.current = athletes;

  useEffect(() => {
    const sync = () => syncLinks(competition, latest.current)
      .then((r) => { if (r.created || r.updated) reload(); })
      .catch((err) => notify('Filial linklərindən yükləmə alınmadı: ' + (err.code || err.message), 'error'));
    sync();
    const onVisible = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(sync, 30000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [competition, reload, notify]);

  const clubs = useMemo(() => [...new Set(athletes.map((a) => a.club_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'az')), [athletes]);
  const drawnIds = useMemo(() => new Set(brackets.flatMap((b) => b.athletes.map((a) => a.id))), [brackets]);

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    return athletes
      .filter((a) => !needle || `${athleteName(a)} ${a.club_name} ${a.coach || ''}`.toLocaleLowerCase('az').includes(needle))
      .filter((a) => !status || a.status === status)
      .filter((a) => !age || categoryOf(a, config).code === age || (age === '?' && !categoryOf(a, config).code))
      .sort((a, b) => athleteName(a).localeCompare(athleteName(b), 'az'));
  }, [athletes, q, age, status, config]);

  const missing = useMemo(() => groupCategories(athletes, config).unassigned, [athletes, config]);

  const removeAthlete = async (a) => {
    const warn = drawnIds.has(a.id) ? ' Püşkatma artıq keçirilib, tablo ayrıca yenilənməlidir.' : '';
    if (!window.confirm(`${athleteName(a)} siyahıdan silinsin?${warn}`)) return;
    try {
      await remove('tournamentAthletes', a.id);
      reload();
    } catch (err) {
      notify('Silinmədi: ' + err.message, 'error');
    }
  };

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn primary" onClick={() => setMode({ type: 'one' })}><Icon name="plus" /> Tək idmançı</button>
        <button type="button" className="btn" onClick={() => setMode({ type: 'bulk' })}><Icon name="users" /> Kütləvi əlavə et</button>
        <button type="button" className="btn" onClick={() => setMode({ type: 'own' })}><Icon name="trophy" /> Filialların uşaqlarından</button>
        {missing.length > 0 && (
          <button type="button" className="btn warn" onClick={() => setMode({ type: 'fix' })}>Çatışmayanı tamamla ({missing.length})</button>
        )}
        <button type="button" className="btn" onClick={() => setMode({ type: 'links' })}><Icon name="globe" /> Filial linkləri</button>
      </div>

      <div className="filters">
        <div className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Ad, klub, məşqçi" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Axtarış" />
        </div>
        <select value={age} onChange={(e) => setAge(e.target.value)} aria-label="Yaş qrupu">
          <option value="">Bütün yaş qrupları</option>
          {config.age_groups.map((g) => <option key={g.code} value={g.code}>{g.code}</option>)}
          <option value="?">Qrupu yoxdur</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <section className="card">
        <div className="group-title" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>İdmançılar</h2>
          <span className="badge">{shown.length} / {athletes.length}</span>
        </div>
        {shown.length ? (
          <div className="list">
            {shown.map((a) => {
              const cat = categoryOf(a, config);
              return (
                <div className="t-ath" key={a.id}>
                  <div className="t-ath-main">
                    <div className="t-ath-name">{athleteName(a)}</div>
                    <div className="t-ath-meta">
                      {[
                        a.birth_date ? fmtDate(a.birth_date) : null,
                        GENDERS[a.gender] || null,
                        (a.weighed_kg ?? a.declared_kg) != null ? `${a.weighed_kg ?? a.declared_kg} kq` : null,
                        a.group_type === 'teze' ? TYPES.teze : null,
                        a.club_name,
                        a.coach,
                      ].filter(Boolean).join(' · ')}
                    </div>
                    <div className="t-ath-tags">
                      <span className={`badge ${a.status === 'cekildi' ? 'ok' : a.status === 'kenar' ? 'bad' : ''}`}>{STATUSES[a.status]}</span>
                      {cat.key ? <span className="badge">{cat.label}</span> : <span className="badge warn">{cat.problem}</span>}
                    </div>
                  </div>
                  <div className="t-ath-actions">
                    <button type="button" className="icon-btn" onClick={() => setMode({ type: 'one', athlete: a })} aria-label="Redaktə"><Icon name="edit" /></button>
                    <button type="button" className="icon-btn" onClick={() => removeAthlete(a)} aria-label="Sil"><Icon name="trash" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <Empty>{athletes.length ? 'Filtrə uyğun idmançı yoxdur.' : 'Hələ idmançı əlavə edilməyib.'}</Empty>}
      </section>

      {mode?.type === 'one' && (
        <AthleteForm competitionId={competition.id} athlete={mode.athlete} clubs={clubs} existing={athletes} onClose={() => setMode(null)} onSaved={reload} />
      )}
      {mode?.type === 'fix' && <FixMissing items={missing} onClose={() => setMode(null)} onSaved={reload} />}
      {mode?.type === 'links' && <BranchLinks competition={competition} config={config} athletes={athletes} brackets={brackets} onClose={() => setMode(null)} onSaved={reload} />}
      {mode?.type === 'bulk' && <BulkAdd competitionId={competition.id} clubs={clubs} onClose={() => setMode(null)} onSaved={reload} />}
      {mode?.type === 'own' && (
        <ImportOwn competitionId={competition.id} taken={new Set(athletes.map((a) => a.child_id).filter(Boolean))} onClose={() => setMode(null)} onSaved={reload} />
      )}
    </>
  );
}
