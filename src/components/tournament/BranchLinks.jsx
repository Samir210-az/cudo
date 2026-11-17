import { useState } from 'react';
import { Empty, ErrorBox, Icon, Loader, Modal, useToast } from '../ui';
import { add, update } from '../../lib/db';
import { useQuery } from '../../lib/hooks';
import {
  createLink, linkUrl, listEntries, listLinks, removeLink, setLinkActive,
} from '../../lib/links';

const PERSONAL = ['last_name', 'first_name', 'father_name', 'birth_date', 'gender', 'declared_kg'];

export default function BranchLinks({ competition, athletes, onClose, onSaved }) {
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

  const load = async (l) => {
    setBusy(true);
    try {
      let created = 0;
      let updated = 0;
      for (const e of l.entries) {
        const ref = `${l.id}_${e.id}`;
        const fields = Object.fromEntries(PERSONAL.map((k) => [k, e[k] ?? null]));
        const existing = known.get(ref);
        if (existing) {
          await update('tournamentAthletes', existing.id, fields);
          updated += 1;
        } else {
          await add('tournamentAthletes', {
            ...fields,
            group_type: 'esas',
            club_name: l.club_name,
            coach: null,
            link_ref: ref,
            competition_id: competition.id,
            status: 'qeydiyyat',
            created_at: new Date().toISOString(),
          });
          created += 1;
        }
      }
      notify(`${l.club_name}: ${created} yeni, ${updated} yenilənən.`);
      onSaved();
      reload();
    } catch (err) {
      notify('Yüklənmədi: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Filial linkləri" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Hər filial və ya klub üçün ayrıca link yaradın, məşqçiyə göndərin. O, qeydiyyat və parol olmadan öz idmançılarını əlavə edir.
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
              <button type="button" className="btn primary" disabled={busy || !l.entries.length} onClick={() => load(l)}>Siyahıya yüklə</button>
              <button type="button" className="btn" onClick={() => toggle(l)}>{l.active ? 'Bağla' : 'Aç'}</button>
              <button type="button" className="icon-btn" onClick={() => del(l)} aria-label="Sil"><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      ) : <Empty>Hələ link yaradılmayıb.</Empty>}
    </Modal>
  );
}
