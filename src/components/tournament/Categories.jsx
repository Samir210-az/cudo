import { Empty, Icon, Stat, useToast } from '../ui';
import { useState } from 'react';
import { fmtDate } from '../../lib/format';
import { athleteName, groupCategories, weightOf } from '../../lib/tournament';

export default function Categories({ competition, config, athletes, brackets }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const { categories, unassigned } = groupCategories(athletes, config);
  const drawn = new Set(brackets.map((b) => b.category_key));
  const clubs = new Set(athletes.filter((a) => a.status !== 'kenar').map((a) => a.club_name));

  const exportPdf = async () => {
    setBusy(true);
    try {
      const [{ tournamentRosterPdf }, { fetchSettings }] = await Promise.all([import('../../lib/pdf'), import('../../lib/settings')]);
      await tournamentRosterPdf(competition, categories, await fetchSettings());
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const byAge = new Map();
  categories.forEach((c) => {
    if (!byAge.has(c.code)) byAge.set(c.code, []);
    byAge.get(c.code).push(c);
  });

  return (
    <>
      <div className="grid stats" style={{ marginBottom: 14 }}>
        <Stat label="İdmançı" value={athletes.filter((a) => a.status !== 'kenar').length} />
        <Stat label="Klub" value={clubs.size} />
        <Stat label="Kateqoriya" value={categories.length} />
        <Stat label="Püşkatma olan" value={`${categories.filter((c) => drawn.has(c.key)).length} / ${categories.length}`} tone="ok" />
      </div>

      <div className="toolbar">
        <button type="button" className="btn" onClick={exportPdf} disabled={busy || !categories.length}>
          <Icon name="download" /> Siyahı PDF
        </button>
      </div>

      {unassigned.length > 0 && (
        <div className="notice error" style={{ marginBottom: 14 }}>
          <strong>{unassigned.length} idmançı kateqoriyaya düşmür</strong>
          <p>Qeydiyyatdan və ya Ayarlar bölməsindən düzəldin.</p>
          <div className="list">
            {unassigned.map(({ athlete, problem }) => (
              <div className="row" key={athlete.id}>
                <span className="row-main">
                  <span className="row-title">{athleteName(athlete)}</span>
                  <span className="row-sub" style={{ display: 'block' }}>{athlete.club_name} · {fmtDate(athlete.birth_date)} · {problem}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {categories.length ? (
        <div className="stack">
          {[...byAge.entries()].map(([code, cats]) => (
            <section className="card" key={code}>
              <div className="group-title" style={{ marginTop: 0 }}>
                <h2 style={{ margin: 0 }}>{code}</h2>
                <span className="badge">{cats.reduce((s, c) => s + c.athletes.length, 0)} nəfər</span>
              </div>
              <div className="list">
                {cats.map((c) => {
                  const perClub = new Map();
                  c.athletes.forEach((a) => perClub.set(a.club_name, (perClub.get(a.club_name) || 0) + 1));
                  return (
                    <details className="cat" key={c.key}>
                      <summary>
                        <span className="row-title">{c.label.replace(`${c.code} · `, '')}</span>
                        <span className="badge">{c.athletes.length}</span>
                        {drawn.has(c.key) && <span className="badge ok">Püşkatma var</span>}
                        {c.athletes.length < 2 && <span className="badge warn">Rəqib yoxdur</span>}
                      </summary>
                      <div className="cat-body">
                        <p className="row-sub">
                          {[...perClub.entries()].map(([club, n]) => `${club}: ${n}`).join(' · ')}
                        </p>
                        {c.athletes.map((a) => (
                          <div className="row-sub cat-athlete" key={a.id}>
                            <span>{athleteName(a)}</span>
                            <span>{weightOf(a) ?? '—'} kq · {a.club_name}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card"><Empty>Kateqoriya yaratmaq üçün idmançı əlavə edin və çəkilişdən keçirin.</Empty></div>
      )}
    </>
  );
}
