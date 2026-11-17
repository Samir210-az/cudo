import { useMemo, useState } from 'react';
import { Empty, Icon, Stat, useToast } from '../ui';
import BracketView from './BracketView';
import { put, remove } from '../../lib/db';
import {
  bracketId, groupCategories, hasResults, makeDraw, progress,
} from '../../lib/tournament';

export default function Draw({ competition, config, athletes, brackets, reload, goTo }) {
  const notify = useToast();
  const [onlyWeighed, setOnlyWeighed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  const pool = useMemo(() => (onlyWeighed ? athletes.filter((a) => a.status === 'cekildi') : athletes), [athletes, onlyWeighed]);
  const { categories } = useMemo(() => groupCategories(pool, config), [pool, config]);
  const byKey = useMemo(() => new Map(brackets.map((b) => [b.category_key, b])), [brackets]);
  const live = new Set(categories.map((c) => c.key));
  const orphans = brackets.filter((b) => !live.has(b.category_key));

  const draw = async (cat, { silent = false } = {}) => {
    const old = byKey.get(cat.key);
    const doc = {
      ...makeDraw(cat.athletes, { bronze: config.bronze }),
      competition_id: competition.id,
      category_key: cat.key,
      label: cat.label,
      code: cat.code,
      mat: old?.mat ?? null,
      drawn_at: new Date().toISOString(),
    };
    await put('tournamentBrackets', bracketId(competition.id, cat.key), doc);
    if (!silent) notify(`${cat.label}: püşkatma keçirildi.`);
  };

  const redraw = async (cat) => {
    const old = byKey.get(cat.key);
    if (old && hasResults(old)) return notify('Bu kateqoriyada nəticələr var. Yenidən püşkatma üçün əvvəlcə nəticələri silin.', 'error');
    if (old && !window.confirm('Bu kateqoriya yenidən püşkatılsın? Köhnə tablo silinəcək.')) return;
    setBusy(true);
    try {
      await draw(cat);
      reload();
    } catch (err) {
      notify('Püşkatma alınmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const drawAll = async () => {
    const todo = categories.filter((c) => !byKey.has(c.key));
    if (!todo.length) return notify('Püşkatma gözləyən kateqoriya yoxdur.');
    setBusy(true);
    try {
      for (const cat of todo) await draw(cat, { silent: true });
      notify(`${todo.length} kateqoriya püşkatıldı.`);
      reload();
    } catch (err) {
      notify('Püşkatma yarımçıq qaldı: ' + err.message, 'error');
      reload();
    } finally {
      setBusy(false);
    }
  };

  const saveBracket = async (bracket, next) => {
    try {
      await put('tournamentBrackets', bracketId(competition.id, bracket.category_key), next);
      reload();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    }
  };

  const setMat = async (bracket, mat) => {
    try {
      await put('tournamentBrackets', bracketId(competition.id, bracket.category_key), { ...bracket, mat: mat ? Number(mat) : null });
      reload();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    }
  };

  const spreadMats = async () => {
    const loads = Array.from({ length: config.mats }, () => 0);
    const sorted = [...brackets].filter((b) => live.has(b.category_key)).sort((a, b) => progress(b).total - progress(a).total);
    setBusy(true);
    try {
      for (const b of sorted) {
        const target = loads.indexOf(Math.min(...loads));
        loads[target] += Math.max(progress(b).total, 1);
        await put('tournamentBrackets', bracketId(competition.id, b.category_key), { ...b, mat: target + 1 });
      }
      notify('Kateqoriyalar tatamilərə bölündü.');
      reload();
    } catch (err) {
      notify('Bölünmədi: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeBracket = async (b) => {
    if (!window.confirm('Bu köhnə tablo silinsin?')) return;
    try {
      await remove('tournamentBrackets', bracketId(competition.id, b.category_key));
      reload();
    } catch (err) {
      notify('Silinmədi: ' + err.message, 'error');
    }
  };

  const exportPdf = async (only) => {
    setBusy(true);
    try {
      const { tournamentDrawPdf } = await import('../../lib/pdf');
      await tournamentDrawPdf(competition, only || brackets.filter((b) => live.has(b.category_key)));
    } catch (err) {
      notify('PDF hazırlanmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const pending = categories.filter((c) => !byKey.has(c.key)).length;

  return (
    <>
      <div className="grid stats" style={{ marginBottom: 14 }}>
        <Stat label="Kateqoriya" value={categories.length} />
        <Stat label="Püşkatma gözləyir" value={pending} tone={pending ? 'bad' : 'ok'} />
      </div>

      <div className="toolbar">
        <button type="button" className="btn primary" onClick={drawAll} disabled={busy || !pending}>Hamısını püşkat ({pending})</button>
        {config.mats > 1 && <button type="button" className="btn" onClick={spreadMats} disabled={busy || !brackets.length}>Tatamilərə böl</button>}
        <button type="button" className="btn" onClick={() => exportPdf()} disabled={busy || !brackets.length}><Icon name="download" /> Tablo PDF</button>
      </div>
      <label className="check-line">
        <input type="checkbox" checked={onlyWeighed} onChange={(e) => setOnlyWeighed(e.target.checked)} />
        Yalnız çəkilişdən keçənlər püşkatmaya düşsün
      </label>

      {categories.length ? (
        <div className="stack">
          {categories.map((cat) => {
            const bracket = byKey.get(cat.key);
            const ids = new Set(cat.athletes.map((a) => a.id));
            const stale = bracket && (bracket.athletes.length !== ids.size || bracket.athletes.some((a) => !ids.has(a.id)));
            const prog = bracket ? progress(bracket) : null;
            return (
              <section className="card" key={cat.key}>
                <div className="group-title" style={{ marginTop: 0, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={{ margin: 0 }}>{cat.label}</h2>
                  <span className="badge">{cat.athletes.length} nəfər</span>
                </div>
                {bracket ? (
                  <>
                    <p className="row-sub">
                      {bracket.system === 'round_robin' ? 'Dövrə sistemi' : bracket.system === 'single' ? 'Tək iştirakçı' : 'Olimpiya sistemi'}
                      {prog.total ? ` · ${prog.done}/${prog.total} görüş` : ''}
                      {bracket.conflicts > 0 ? ' · eyni klubdan ilk turlarda qarşılaşma qaldı' : ''}
                    </p>
                    {stale && <p className="notice error" style={{ margin: '8px 0' }}>İştirakçı siyahısı püşkatmadan sonra dəyişib. Tabloya yenidən baxın.</p>}
                    <div className="toolbar" style={{ marginTop: 8 }}>
                      {config.mats > 1 && (
                        <select aria-label="Tatami" value={bracket.mat || ''} onChange={(e) => setMat(bracket, e.target.value)}>
                          <option value="">Tatami seçilməyib</option>
                          {Array.from({ length: config.mats }, (_, i) => <option key={i} value={i + 1}>Tatami {i + 1}</option>)}
                        </select>
                      )}
                      <button type="button" className="btn sm" onClick={() => setOpen(open === cat.key ? null : cat.key)}>{open === cat.key ? 'Tabloını gizlət' : 'Tabloya bax'}</button>
                      <button type="button" className="btn sm" onClick={() => exportPdf([bracket])} disabled={busy}><Icon name="download" /> PDF</button>
                      <button type="button" className="btn sm" onClick={() => redraw(cat)} disabled={busy}>Yenidən püşkat</button>
                    </div>
                    {open === cat.key && <div style={{ marginTop: 12 }}><BracketView bracket={bracket} onSave={saveBracket} /></div>}
                  </>
                ) : (
                  <button type="button" className="btn primary" onClick={() => redraw(cat)} disabled={busy}>Püşkat</button>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <Empty>
            {athletes.length
              ? 'Püşkatma üçün kateqoriya yoxdur. İdmançılarda doğum tarixi, cins və ya çəki çatışmır, yaxud onlar hələ çəkilişdən keçməyib.'
              : 'Hələ idmançı əlavə edilməyib.'}
          </Empty>
          <div className="toolbar" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn primary" onClick={() => goTo('qeydiyyat')}>Qeydiyyata keç</button>
            <button type="button" className="btn" onClick={() => goTo('cekilis')}>Çəkilişə keç</button>
          </div>
        </div>
      )}

      {orphans.length > 0 && (
        <section className="card" style={{ marginTop: 14 }}>
          <h2>Köhnəlmiş tablolar</h2>
          <p className="row-sub">Bu kateqoriyalarda artıq idmançı qalmayıb (çəki və ya ayar dəyişib).</p>
          <div className="list">
            {orphans.map((b) => (
              <div className="row" key={b.category_key}>
                <span className="row-main row-title">{b.label}</span>
                <button type="button" className="icon-btn" onClick={() => removeBracket(b)} aria-label="Sil"><Icon name="trash" /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
