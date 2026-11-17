import { useMemo, useState } from 'react';
import { Empty, Stat, useToast } from '../ui';
import { put } from '../../lib/db';
import { bracketId, buildSchedule, matchNumbers } from '../../lib/tournament';
import MatchCard from './MatchCard';

export default function Matches({ competition, config, brackets, reload }) {
  const notify = useToast();
  const [mat, setMat] = useState('');
  const [state, setState] = useState('gozleyen');

  const onSave = async (bracket, next) => {
    try {
      await put('tournamentBrackets', bracketId(competition.id, bracket.category_key), next);
      reload();
    } catch (err) {
      notify('Saxlanılmadı: ' + err.message, 'error');
    }
  };

  const schedule = useMemo(() => buildSchedule(brackets, config), [brackets, config]);
  const slotOf = ({ bracket, match }) => schedule.slots.get(`${bracket.category_key}:${match.id}`);

  const all = useMemo(
    () => brackets
      .flatMap((b) => {
        const nums = matchNumbers(b);
        return b.matches.filter((m) => !m.bye).map((m) => ({ bracket: b, match: m, number: nums.get(m.id) }));
      })
      .sort((x, y) => {
        const sx = schedule.slots.get(`${x.bracket.category_key}:${x.match.id}`);
        const sy = schedule.slots.get(`${y.bracket.category_key}:${y.match.id}`);
        return (sx?.mat || 99) - (sy?.mat || 99) || (sx?.order || 0) - (sy?.order || 0);
      }),
    [brackets, schedule],
  );

  const shown = all
    .filter(({ bracket }) => !mat || String(bracket.mat || '') === mat)
    .filter(({ match }) => {
      if (state === 'gozleyen') return !match.winner && match.a && match.b;
      if (state === 'bitib') return Boolean(match.winner);
      return true;
    });

  const done = all.filter(({ match }) => match.winner).length;

  return (
    <>
      <div className="grid stats" style={{ marginBottom: 14 }}>
        <Stat label="Keçirilib" value={`${done} / ${all.length}`} tone="ok" />
        <Stat label="Qalıb" value={all.length - done} />
      </div>
      {schedule.ends.size > 0 && (
        <p className="notice" style={{ marginBottom: 14 }}>
          Başlama {config.start_time}. {[...schedule.ends].sort((a, b) => a[0] - b[0]).map(([m, t]) => `Tatami ${m}: ${t}`).join(' · ')} (təxmini bitmə).
        </p>
      )}
      <div className="filters">
        {config.mats > 1 && (
          <select value={mat} onChange={(e) => setMat(e.target.value)} aria-label="Tatami">
            <option value="">Bütün tatamilər</option>
            {Array.from({ length: config.mats }, (_, i) => <option key={i} value={i + 1}>Tatami {i + 1}</option>)}
          </select>
        )}
        <div className="tabs scroll" role="tablist">
          {[['gozleyen', 'Növbədəki'], ['bitib', 'Bitən'], ['hamisi', 'Hamısı']].map(([k, label]) => (
            <button key={k} type="button" role="tab" className="tab" aria-selected={state === k} onClick={() => setState(k)}>{label}</button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <div className="stack">
          {shown.map((item) => {
            const { bracket, match, number } = item;
            const slot = slotOf(item);
            return (
              <div key={`${bracket.category_key}-${match.id}-${match.winner}-${match.a}-${match.b}`}>
                {slot && (
                  <div className="slot-line">
                    <span className="badge">Tatami {slot.mat}</span>
                    <strong>{slot.time}</strong>
                    <span className="muted">{bracket.label}</span>
                  </div>
                )}
                <MatchCard bracket={bracket} match={match} number={number} onSave={onSave} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty>{all.length ? 'Bu filtrdə görüş yoxdur.' : 'Görüşlər püşkatmadan sonra burada görünəcək.'}</Empty></div>
      )}
    </>
  );
}
