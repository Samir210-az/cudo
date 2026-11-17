import { useState } from 'react';
import { Field, Icon, useToast } from '../ui';
import { update } from '../../lib/db';
import { defaultClasses, parseClasses } from '../../lib/tournament';

export default function TournamentSettings({ competition, config, hasBrackets, reload }) {
  const notify = useToast();
  const [groups, setGroups] = useState(config.age_groups);
  const [classes, setClasses] = useState(config.classes);
  const [mats, setMats] = useState(config.mats);
  const [bronze, setBronze] = useState(config.bronze);
  const [startTime, setStartTime] = useState(config.start_time);
  const [minutes, setMinutes] = useState(config.match_minutes);
  const [busy, setBusy] = useState(false);

  const setGroup = (i, key, value) => setGroups((prev) => prev.map((g, idx) => (idx === i ? { ...g, [key]: value } : g)));

  const save = async () => {
    const clean = groups.map((g) => ({ code: g.code.trim(), from: Number(g.from), to: Number(g.to) }));
    if (clean.some((g) => !g.code || !g.from || !g.to || g.from > g.to)) return notify('Yaş qruplarını yoxlayın: kod və doğum illəri düzgün olmalıdır.', 'error');
    if (new Set(clean.map((g) => g.code)).size !== clean.length) return notify('Yaş qrupu kodları təkrarlanmamalıdır.', 'error');
    const bad = Object.entries(classes).find(([, text]) => parseClasses(text).error);
    if (bad) return notify(`${bad[0].replace('|', ' · ')}: ${parseClasses(bad[1]).error}`, 'error');
    if (hasBrackets && !window.confirm('Püşkatma artıq keçirilib. Ayarları dəyişmək kateqoriyaları dəyişə bilər. Davam edilsin?')) return;
    setBusy(true);
    try {
      await update('competitions', competition.id, {
        tournament: {
          age_groups: clean,
          classes: Object.fromEntries(Object.entries(classes).filter(([, v]) => v.trim())),
          mats: Math.max(1, Math.min(12, Number(mats) || 1)),
          bronze,
          start_time: startTime,
          match_minutes: Math.max(1, Math.min(30, Number(minutes) || 4)),
        },
      });
      notify('Ayarlar saxlanıldı.');
      reload();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Yaş qrupları</h2>
        <p className="row-sub" style={{ marginBottom: 10 }}>Qrup doğum ilinə görə təyin olunur. İlkin qiymətlər yarışın ilinə görə hesablanıb.</p>
        {groups.map((g, i) => (
          <div className="setting-row" key={i}>
            <input aria-label="Qrup kodu" value={g.code} onChange={(e) => setGroup(i, 'code', e.target.value)} />
            <input aria-label="Doğum ili (başlanğıc)" type="number" value={g.from} onChange={(e) => setGroup(i, 'from', e.target.value)} />
            <input aria-label="Doğum ili (son)" type="number" value={g.to} onChange={(e) => setGroup(i, 'to', e.target.value)} />
            <button type="button" className="icon-btn" aria-label="Qrupu sil" onClick={() => setGroups((p) => p.filter((_, idx) => idx !== i))}><Icon name="trash" /></button>
          </div>
        ))}
        <button type="button" className="btn sm" onClick={() => setGroups((p) => [...p, { code: '', from: config.year - 10, to: config.year - 9 }])}><Icon name="plus" size={16} /> Qrup əlavə et</button>
      </section>

      <section className="card">
        <h2>Çəki kateqoriyaları</h2>
        <p className="row-sub" style={{ marginBottom: 10 }}>
          Hər yaş qrupu və cins üçün vergüllə yazın. Məsələn: -34, -37, -40, +40. Boş buraxılsa həmin qrupda çəki bölgüsü olmur, hamı bir kateqoriyada olur. Qızlar üçün cədvəl qeydiyyat səhifəsində verilməyib, özünüz yazın.
        </p>
        <button type="button" className="btn sm" style={{ marginBottom: 12 }} onClick={() => setClasses(defaultClasses(groups))}>
          Hünər qeydiyyat səhifəsindəki oğlan cədvəlini yüklə
        </button>
        {groups.filter((g) => g.code.trim()).map((g) => (
          ['oğlan', 'qız'].map((gender) => {
            const key = `${g.code.trim()}|${gender}`;
            const err = parseClasses(classes[key]).error;
            return (
              <Field key={key} label={`${g.code} · ${gender === 'qız' ? 'Qız' : 'Oğlan'}`} hint={err || undefined}>
                <input value={classes[key] || ''} placeholder="-34, -37, -40, +40" onChange={(e) => setClasses({ ...classes, [key]: e.target.value })} />
              </Field>
            );
          })
        ))}
      </section>

      <section className="card">
        <h2>Tatami, vaxt və bürünc</h2>
        <div className="form-grid">
          <Field label="Tatami sayı">
            <input type="number" min="1" max="12" value={mats} onChange={(e) => setMats(e.target.value)} />
          </Field>
          <Field label="Başlama saatı">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
          <Field label="Bir görüşün müddəti (dəq)" hint="Qaydalara əsasən ara vaxtı daxil olmaqla orta müddət. Saatlar bu rəqəmə görə hesablanır.">
            <input type="number" min="1" max="30" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
          <Field label="Bürünc medal" hint="Təsəlliverici görüşlərdə finalçıya uduzanlar bürünc görüşlərinə düşür və 3, 3, 5, 5, 7, 7 yerlər müəyyən olunur. Dəyişiklik yalnız yeni püşkatmalara aid olur.">
            <select value={bronze} onChange={(e) => setBronze(e.target.value)}>
              <option value="repechage">Təsəlliverici görüşlər (iki bürünc görüşü)</option>
              <option value="two">İki bürünc (yarımfinal uduzanlar)</option>
              <option value="match">Bir bürünc (ayrıca görüş)</option>
            </select>
          </Field>
        </div>
      </section>

      <button type="button" className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saxlanılır…' : 'Ayarları saxla'}</button>
    </div>
  );
}
