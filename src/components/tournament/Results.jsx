import { useState } from 'react';
import { Empty, Icon, useToast } from '../ui';
import { put } from '../../lib/db';
import { bracketId, medalTable, placements } from '../../lib/tournament';

const MEDAL = { 1: 'Qızıl', 2: 'Gümüş', 3: 'Bürünc' };
const TONE = { 1: 'warn', 2: '', 3: 'bad' };

function TiePicker({ bracket, onSave }) {
  const [picks, setPicks] = useState({});
  const full = bracket.athletes.every((a) => picks[a.id]) && new Set(Object.values(picks)).size === bracket.athletes.length;
  return (
    <div className="notice error" style={{ marginTop: 8 }}>
      <strong>Bərabərlik</strong>
      <p>İştirakçıların qalibiyyət sayı eynidir. Yerləri əl ilə təyin edin.</p>
      {bracket.athletes.map((a) => (
        <div className="row" key={a.id}>
          <span className="row-main row-title">{a.name}</span>
          <select aria-label={`${a.name} yeri`} value={picks[a.id] || ''} onChange={(e) => setPicks({ ...picks, [a.id]: Number(e.target.value) })}>
            <option value="">Yer</option>
            {bracket.athletes.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
      ))}
      <button type="button" className="btn primary" style={{ marginTop: 10 }} disabled={!full} onClick={() => onSave({ ...bracket, manual_places: picks })}>Yerləri təsdiq et</button>
    </div>
  );
}

export default function Results({ competition, brackets, reload }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const medals = medalTable(brackets);

  const save = async (bracket) => {
    try {
      await put('tournamentBrackets', bracketId(competition.id, bracket.category_key), bracket);
      reload();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const [{ tournamentResultsPdf }, { fetchSettings }] = await Promise.all([import('../../lib/pdf'), import('../../lib/settings')]);
      await tournamentResultsPdf(competition, brackets, medals, await fetchSettings());
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...brackets].sort((a, b) => a.label.localeCompare(b.label, 'az', { numeric: true }));

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn" onClick={exportPdf} disabled={busy || !brackets.length}><Icon name="download" /> Nəticələr PDF</button>
      </div>

      {medals.length > 0 && (
        <section className="card" style={{ marginBottom: 14 }}>
          <h2>Klub üzrə medallar</h2>
          <div className="list">
            {medals.map((m, i) => (
              <div className="row" key={m.club}>
                <span className="row-main row-title">{i + 1}. {m.club}</span>
                <span className="badge warn">{m.gold} qızıl</span>
                <span className="badge">{m.silver} gümüş</span>
                <span className="badge bad">{m.bronze} bürünc</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sorted.length ? (
        <div className="stack">
          {sorted.map((b) => {
            const r = placements(b);
            return (
              <section className="card" key={b.category_key}>
                <div className="group-title" style={{ marginTop: 0 }}>
                  <h2 style={{ margin: 0 }}>{b.label}</h2>
                  <span className={`badge ${r.complete ? 'ok' : ''}`}>{r.complete ? 'Bitib' : 'Davam edir'}</span>
                </div>
                {r.tie && <TiePicker bracket={b} onSave={save} />}
                {r.places.length > 0 && (
                  <div className="list">
                    {r.places.map((p) => (
                      <div className="row" key={`${p.place}-${p.id}`}>
                        <span className={`badge ${TONE[p.place] || ''}`}>{p.place <= 3 ? MEDAL[p.place] : `${p.place}-cü yer`}</span>
                        <span className="row-main">
                          <span className="row-title">{p.name}</span>
                          <span className="row-sub" style={{ display: 'block' }}>{p.club}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {!r.complete && !r.tie && <p className="row-sub">Görüşlər bitəndən sonra yerlər burada görünəcək.</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty>Nəticələr püşkatma və görüşlərdən sonra burada görünəcək.</Empty></div>
      )}
    </>
  );
}
