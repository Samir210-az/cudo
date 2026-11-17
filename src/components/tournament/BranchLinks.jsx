import { useState } from 'react';
import { publishSchedules } from '../../lib/publish';
import { Empty, ErrorBox, Icon, Loader, Modal, useToast } from '../ui';
import { add, update } from '../../lib/db';
import { useQuery } from '../../lib/hooks';
import {
  createLink, linkUrl, listEntries, listLinks, removeLink, setLinkActive,
} from '../../lib/links';

const PERSONAL = ['last_name', 'first_name', 'father_name', 'birth_date', 'gender', 'declared_kg'];

let running = null;
const createdRefs = new Set();

export function syncLinks(competition, athletes) {
  if (running) return running;
  const known = new Map(athletes.filter((a) => a.link_ref).map((a) => [a.link_ref, a]));
  running = (async () => {
    const stats = { created: 0, updated: 0 };
    const links = await listLinks(competition.id);
    for (const l of links) {
      const entries = await listEntries(l.id);
      for (const e of entries) {
        const ref = `${l.id}_${e.id}`;
        const fields = Object.fromEntries(PERSONAL.map((k) => [k, e[k] ?? null]));
        const existing = known.get(ref);
        if (!existing) {
          if (createdRefs.has(ref)) continue;
          createdRefs.add(ref);
          await add('tournamentAthletes', {
            ...fields, group_type: 'esas', club_name: l.club_name, coach: null, link_ref: ref,
            competition_id: competition.id, status: 'qeydiyyat', created_at: new Date().toISOString(),
          });
          stats.created += 1;
        } else if (PERSONAL.some((k) => (existing[k] ?? null) !== fields[k])) {
          await update('tournamentAthletes', existing.id, fields);
          stats.updated += 1;
        }
      }
    }
    return stats;
  })().finally(() => { running = null; });
  return running;
}

export default function BranchLinks({ competition, config, athletes, brackets, onClose, onSaved }) {
  const notify = useToast();
  const [club, setClub] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const links = await listLinks(competition.id);
    return Promise.all(links.map(async (l) => ({ ...l, entries: await listEntries(l.id) })));
  }, [competition.id]);

  const known = new Map(athletes.filter((a) => a.link_ref).map((a) => [a.link_ref, a]));
  const pending = (l) => l.entries.filter((e) => !known.has(`${l.id}_${e.id}`)).length;

  const create = async () => {
    if (!club.trim()) return notify('Filialın və ya klubun adını yazın.', 'error');
    setBusy(true);
    try {
      await createLink(competition, club);
      setClub('');
      reload();
    } catch (err) {
      notify('Link yaradılmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (l) => {
    try {
      await navigator.clipboard.writeText(linkUrl(l.id));
      notify('Link kopyalandı.');
    } catch {
      window.prompt('Linki kopyalayın:', linkUrl(l.id));
    }
  };

  const publish = async () => {
    if (!brackets.length && !window.confirm('Püşkatma hələ keçirilməyib. Məşqçilər yalnız "cədvəl hazırlanır" görəcək. Davam edilsin?')) return;
    setBusy(true);
    try {
      const n = await publishSchedules(competition, data || [], athletes, brackets, config);
      notify(`Cədvəl ${n} linkdə dərc edildi.`);
    } catch (err) {
      notify('Dərc edilmədi: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (l) => {
    await setLinkActive(l.id, !l.active);
    reload();
  };

  const del = async (l) => {
    if (!window.confirm(`"${l.club_name}" linki və onun əlavə etdiyi ${l.entries.length} qeyd silinsin? Siyahıya artıq yüklənmişlər qalır.`)) return;
    try {
      await removeLink(l.id);
      reload();
    } catch (err) {
      notify('Silinmədi: ' + err.message, 'error');
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const r = await syncLinks(competition, athletes);
      notify(`${r.created} yeni idmançı əlavə edildi, ${r.updated} yeniləndi.`);
      onSaved();
      reload();
    } catch (err) {
      notify('Yenilənmədi: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Filial linkləri" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Hər filial və ya klub üçün ayrıca link yaradın, məşqçiyə göndərin. Məşqçinin əlavə etdiyi idmançılar qeydiyyat siyahısına avtomatik düşür.
      </p>
      <div className="toolbar">
        <input
          style={{ flex: 1, minWidth: 160 }}
          placeholder="Filialın və ya klubun adı"
          value={club}
          onChange={(e) => setClub(e.target.value)}
          aria-label="Filialın adı"
        />
        <button type="button" className="btn primary" disabled={busy} onClick={create}><Icon name="plus" /> Link yarat</button>
        <button type="button" className="btn" disabled={busy} onClick={refresh}>İndi yenilə</button>
        <button type="button" className="btn primary" disabled={busy || !data?.length} onClick={publish}>Cədvəli dərc et</button>
      </div>

      {loading && !data ? <Loader /> : error ? <ErrorBox error={error} onRetry={reload} /> : data.length ? (
        <div className="list" style={{ marginTop: 12 }}>
          {data.map((l) => (
            <div className="row" key={l.id} style={{ flexWrap: 'wrap' }}>
              <div className="row-main">
                <div className="row-title">{l.club_name}</div>
                <div className="row-sub">
                  {l.entries.length} idmançı{pending(l) ? ` · ${pending(l)} yeni` : ''} · {l.active ? 'Açıqdır' : 'Bağlıdır'}
                </div>
              </div>
              <button type="button" className="btn" onClick={() => copy(l)}>Linki kopyala</button>
                            <button type="button" className="btn" onClick={() => toggle(l)}>{l.active ? 'Bağla' : 'Aç'}</button>
              <button type="button" className="icon-btn" onClick={() => del(l)} aria-label="Sil"><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      ) : <Empty>Hələ link yaradılmayıb.</Empty>}
    </Modal>
  );
}
