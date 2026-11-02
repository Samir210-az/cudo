import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CompetitionModal from '../components/CompetitionModal';
import { Empty, ErrorBox, Field, Icon, Loader, Modal, PageHead, useToast } from '../components/ui';
import { calcAge, fmtDate, fullName } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { fetchSettings } from '../lib/settings';
import { addMany, byName, eq, get, indexById, list, remove, removeWhere, update } from '../lib/db';

const NO_CATEGORY = 'Kateqoriya təyin edilməyib';

function AddParticipants({ competitionId, kids, taken, onClose, onSaved }) {
  const notify = useToast();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const available = kids.filter((k) => !taken.has(k.id));
  const needle = q.trim().toLocaleLowerCase('az');
  const shown = needle ? available.filter((k) => fullName(k).toLocaleLowerCase('az').includes(needle)) : available;

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    if (!picked.size) return notify('Ən azı bir uşaq seçin.', 'error');
    setBusy(true);
    const rows = [...picked].map((child_id) => ({
      competition_id: competitionId,
      child_id,
      category: category.trim() || null,
    }));
    try {
      await addMany('competitionEntries', rows);
      notify(`${rows.length} uşaq əlavə edildi.`);
      onSaved();
      onClose();
    } catch (error) {
      notify('Əlavə edilmədi: ' + error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Yarışa uşaq əlavə et" onClose={onClose}>
      <div className="search" style={{ marginBottom: 10 }}>
        <Icon name="search" size={18} />
        <input type="search" placeholder="Ad üzrə axtar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Axtarış" />
      </div>
      <div className="list" style={{ maxHeight: '42dvh', overflowY: 'auto' }}>
        {shown.length ? (
          shown.map((k) => (
            <label className="row check" key={k.id}>
              <input type="checkbox" checked={picked.has(k.id)} onChange={() => toggle(k.id)} />
              <span className="row-main">
                <span className="row-title">{fullName(k)}</span>
                <span className="row-sub" style={{ display: 'block' }}>
                  {calcAge(k.birth_date)} yaş{k.weight_kg ? ` · ${k.weight_kg} kq` : ''}{k.belt ? ` · ${k.belt} kəmər` : ''}
                </span>
              </span>
            </label>
          ))
        ) : (
          <Empty>{available.length ? 'Tapılmadı.' : 'Bütün aktiv uşaqlar artıq əlavə edilib.'}</Empty>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Kateqoriya (seçilənlərin hamısına)" hint="Məsələn: -34 kq. Sonra hər uşaq üçün ayrıca dəyişə bilərsiniz.">
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" className="btn primary" onClick={save} disabled={busy || !picked.size}>
          {busy ? 'Əlavə edilir…' : `Əlavə et (${picked.size})`}
        </button>
        <button type="button" className="btn" onClick={onClose}>Ləğv et</button>
      </div>
    </Modal>
  );
}

export default function CompetitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const [competition, rawEntries, allKids] = await Promise.all([
      get('competitions', id),
      list('competitionEntries', eq('competition_id', id)),
      list('children'),
    ]);
    const byId = indexById(allKids);
    const entries = rawEntries.filter((e) => byId.has(e.child_id)).map((e) => ({ ...e, children: byId.get(e.child_id) }));
    const kids = allKids.filter((k) => k.status === 'aktiv').sort(byName);
    return { competition, entries, kids };
  }, [id]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of data?.entries || []) {
      const key = e.category?.trim() || NO_CATEGORY;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    for (const rows of map.values()) rows.sort((a, b) => fullName(a.children).localeCompare(fullName(b.children), 'az'));
    return [...map.entries()].sort(([a], [b]) => {
      if (a === NO_CATEGORY) return 1;
      if (b === NO_CATEGORY) return -1;
      return a.localeCompare(b, 'az', { numeric: true });
    });
  }, [data]);

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { competition, entries, kids } = data;

  const patch = async (entry, field, value) => {
    const next = value.trim() || null;
    if (next === (entry[field] || null)) return;
    try {
      await update('competitionEntries', entry.id, { [field]: next });
      reload();
    } catch (updateError) {
      notify('Yenilənmədi: ' + updateError.message, 'error');
    }
  };

  const removeEntry = async (entry) => {
    if (!window.confirm(`${fullName(entry.children)} yarışdan çıxarılsın?`)) return;
    try {
      await remove('competitionEntries', entry.id);
      reload();
    } catch (delError) {
      notify('Silinmədi: ' + delError.message, 'error');
    }
  };

  const removeCompetition = async () => {
    if (!window.confirm(`"${competition.name}" yarışı və iştirakçı siyahısı silinsin?`)) return;
    try {
      await removeWhere('competitionEntries', 'competition_id', id);
      await remove('competitions', id);
      navigate('/panel/yarislar', { replace: true });
    } catch (delError) {
      notify('Silinmədi: ' + delError.message, 'error');
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ competitionPdf }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await competitionPdf(competition, entries, settings);
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHead
        title={competition.name}
        subtitle={[fmtDate(competition.held_on), competition.location, `${entries.length} iştirakçı`].filter(Boolean).join(' · ')}
        back={<Link className="back-link" to="/panel/yarislar">← Yarışlar</Link>}
      >
        <button type="button" className="btn" onClick={exportPdf} disabled={exporting || !entries.length}>
          <Icon name="download" /> PDF
        </button>
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          <Icon name="edit" /> Redaktə
        </button>
        <button type="button" className="btn primary" onClick={() => setAdding(true)}>
          <Icon name="plus" /> Uşaq əlavə et
        </button>
      </PageHead>

      {competition.note && <p className="notice" style={{ marginBottom: 14 }}>{competition.note}</p>}

      {groups.length ? (
        <div className="stack">
          {groups.map(([name, rows]) => (
            <section className="card" key={name}>
              <div className="group-title" style={{ marginTop: 0 }}>
                <h2 style={{ margin: 0 }}>{name}</h2>
                <span className="badge">{rows.length}</span>
              </div>
              <div className="list">
                {rows.map((e) => (
                  <div className="row" key={`${e.id}-${e.category}-${e.result}`} style={{ flexWrap: 'wrap' }}>
                    <div className="row-main">
                      <Link to={`/panel/usaqlar/${e.children.id}`} className="row-title">{fullName(e.children)}</Link>
                      <div className="row-sub">
                        {calcAge(e.children.birth_date)} yaş{e.children.weight_kg ? ` · ${e.children.weight_kg} kq` : ''}
                      </div>
                    </div>
                    <input
                      className="inline-input"
                      aria-label={`${fullName(e.children)} kateqoriyası`}
                      placeholder="Kateqoriya"
                      defaultValue={e.category || ''}
                      onBlur={(ev) => patch(e, 'category', ev.target.value)}
                    />
                    <input
                      className="inline-input"
                      aria-label={`${fullName(e.children)} nəticəsi`}
                      placeholder="Nəticə"
                      defaultValue={e.result || ''}
                      onBlur={(ev) => patch(e, 'result', ev.target.value)}
                    />
                    <button type="button" className="icon-btn" onClick={() => removeEntry(e)} aria-label="Yarışdan çıxar">
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card">
          <Empty>Hələ iştirakçı yoxdur. "Uşaq əlavə et" düyməsi ilə uşaq kartlarından seçin.</Empty>
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <button type="button" className="btn danger" onClick={removeCompetition}>
          <Icon name="trash" /> Yarışı sil
        </button>
      </div>

      {editing && <CompetitionModal competition={competition} onClose={() => setEditing(false)} onSaved={reload} />}
      {adding && (
        <AddParticipants
          competitionId={id}
          kids={kids}
          taken={new Set(entries.map((e) => e.children.id))}
          onClose={() => setAdding(false)}
          onSaved={reload}
        />
      )}
    </>
  );
}
