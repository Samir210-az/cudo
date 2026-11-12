import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Icon, Loader, PageHead, useToast } from '../components/ui';
import { calcAge, fullName, groupsOf, gradeLabel, trainingDuration } from '../lib/format';
import { useQuery } from '../lib/hooks';
import BeltIcon from '../components/BeltIcon';
import BulkChildren from '../components/BulkChildren';
import GroupPicker from '../components/GroupPicker';
import { openFreeze } from '../lib/finance';
import { beltRank } from '../lib/belts';
import { beltStyle } from '../lib/belts';
import { avatarTone, fetchSettings, initials } from '../lib/settings';
import { byName, list } from '../lib/db';

export default function Children() {
  const notify = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('aktiv');
  const [group, setGroup] = useState('');
  const [view, setView] = useState('aktiv');
  const [withId, setWithId] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulk, setBulk] = useState(false);

  const { data, loading, error, reload } = useQuery(
    async () => (await list('children')).sort(byName),
    [],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    return [...(data || [])].sort((a, b) => beltRank(b.belt) - beltRank(a.belt)).filter((c) => {
      const frozen = Boolean(openFreeze(c));
      if (view === 'donmus') {
        if (c.status !== 'aktiv' || !frozen) return false;
      } else {
        if (status !== 'hamısı' && c.status !== status) return false;
        if (status === 'aktiv' && frozen) return false;
      }
      if (group && c.training_time !== group) return false;
      if (!needle) return true;
      return `${fullName(c)} ${c.father_name || ''} ${c.school || ''}`.toLocaleLowerCase('az').includes(needle);
    });
  }, [data, q, status, group, view]);
  const frozenCount = useMemo(() => (data || []).filter((c) => c.status === 'aktiv' && openFreeze(c)).length, [data]);
  const groups = useMemo(() => groupsOf(data || []), [data]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ childrenListPdf }, settings] = await Promise.all([import('../lib/pdf'), fetchSettings()]);
      await childrenListPdf(filtered, settings, { withId });
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <>
      <PageHead title="Uşaqlar" subtitle={`${filtered.length} nəfər`}>
        <button type="button" className="btn" onClick={exportPdf} disabled={!filtered.length || exporting}>
          <Icon name="download" /> {exporting ? 'Hazırlanır…' : 'PDF'}
        </button>
        <button type="button" className="btn" onClick={() => setBulk(true)}>
          <Icon name="plus" /> Siyahıdan
        </button>
        <Link to="/panel/usaqlar/yeni" className="btn primary">
          <Icon name="plus" /> Yeni uşaq
        </Link>
      </PageHead>

      <div className="tabs" role="tablist" style={{ marginBottom: 12 }}>
        <button type="button" role="tab" className="tab" aria-selected={view === 'aktiv'} onClick={() => setView('aktiv')}>Aktiv</button>
        <button type="button" role="tab" className="tab" aria-selected={view === 'donmus'} onClick={() => setView('donmus')}>
          Dondurulmuşlar{frozenCount ? ` (${frozenCount})` : ''}
        </button>
      </div>

      <div className="card">
        <GroupPicker groups={groups} value={group} onChange={setGroup} allLabel="Bütün qruplar" />
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div className="search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Ad, soyad və ya məktəb üzrə axtar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Axtarış" />
          </div>
          {view === 'aktiv' && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="aktiv">Aktiv uşaqlar</option>
            <option value="passiv">Passiv uşaqlar</option>
            <option value="hamısı">Hamısı</option>
          </select>
          )}
        </div>
        <label className="check" style={{ marginBottom: 6 }}>
          <input type="checkbox" checked={withId} onChange={(e) => setWithId(e.target.checked)} />
          PDF-ə vəsiqə nömrələri də daxil edilsin
        </label>

        {filtered.length ? (
          <div className="list">
            {filtered.map((c) => {
              const belt = beltStyle(c.belt);
              return (
              <Link className="row belted" key={c.id} to={`/panel/usaqlar/${c.id}`} style={{ '--belt': belt?.stripe }}>
                <span className={`avatar ${avatarTone(c)}`} aria-hidden="true">{initials(c)}</span>
                <div className="row-main">
                  <div className="row-title"><BeltIcon name={c.belt} size={18} />{fullName(c)}</div>
                  <div className="row-sub">
                    {calcAge(c.birth_date)} yaş · {gradeLabel(c.grade)}
                    {c.school ? `, ${c.school}` : ''} · {trainingDuration(c.joined_at)}{c.training_time ? ` · ${c.training_time}` : ''}
                  </div>
                </div>
                {c.status === 'passiv' ? (
                  <span className="badge warn">Passiv</span>
                ) : (
                  belt && <span className="badge" style={{ background: belt.bg, color: belt.fg, border: '1px solid rgba(0,0,0,0.12)' }}>{belt.name}</span>
                )}
              </Link>
              );
            })}
          </div>
        ) : (
          <Empty>
            {view === 'donmus' ? 'Dondurulmuş uşaq yoxdur.' : data.length ? 'Axtarışa uyğun uşaq tapılmadı.' : 'Hələ uşaq əlavə edilməyib.'}
          </Empty>
        )}
      </div>
      {bulk && <BulkChildren existing={data || []} onClose={() => setBulk(false)} onDone={() => { setBulk(false); reload(); }} />}
    </>
  );
}
