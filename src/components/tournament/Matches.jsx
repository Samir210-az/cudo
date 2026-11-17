import { useMemo, useState } from 'react';
import { Empty, Stat, useToast } from '../ui';
import { put } from '../../lib/db';
import { METHODS, bracketId, clearWinner, roundName, setWinner } from '../../lib/tournament';

function MatchCard({ bracket, match, onSave }) {
  const notify = useToast();
  const [method, setMethod] = useState(match.method && match.method !== 'Bye' ? match.method : METHODS[0]);
  const person = (id) => bracket.athletes.find((a) => a.id === id);
  const a = person(match.a);
  const b = person(match.b);
  const ready = Boolean(a && b);

  const act = async (fn) => {
    try {
      await onSave(bracket, fn());
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const side = (p, id) => (
    <button
      type="button"
      className={`winner-btn${match.winner === id ? ' picked' : ''}`}
      disabled={!ready}
      onClick={() => act(() => setWinner(bracket, match.id, id, method))}
    >
      <span className="side-name">{p?.name || 'Gözlənilir'}</span>
      {p && <span className="side-club">{p.club}</span>}
    </button>
  );

  return (
    <div className={`match-card${match.winner ? ' done' : ''}`}>
      <div className="match-meta">
        <span>{bracket.label}</span>
        <span className="badge">{roundName(bracket, match)}</span>
        {bracket.mat && <span className="badge">Tatami {bracket.mat}</span>}
      </div>
      <div className="match-sides">
        {side(a, match.a)}
        <span className="vs">VS</span>
        {side(b, match.b)}
      </div>
      <div className="match-foot">
        <select aria-label="Qalibiyyət növü" value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        {match.winner && (
          <button type="button" className="btn sm" onClick={() => act(() => clearWinner(bracket, match.id))}>Nəticəni sil</button>
        )}
        {!ready && <span className="row-sub">Əvvəlki görüşlərin nəticəsi gözlənilir</span>}
      </div>
    </div>
  );
}

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

  const all = useMemo(
    () => brackets
      .flatMap((b) => b.matches.filter((m) => !m.bye).map((m) => ({ bracket: b, match: m })))
      .sort((x, y) => (x.bracket.mat || 99) - (y.bracket.mat || 99)
        || x.bracket.label.localeCompare(y.bracket.label, 'az')
        || x.match.round - y.match.round || x.match.idx - y.match.idx),
    [brackets],
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
          {shown.map(({ bracket, match }) => (
            <MatchCard key={`${bracket.category_key}-${match.id}-${match.winner}-${match.a}-${match.b}`} bracket={bracket} match={match} onSave={onSave} />
          ))}
        </div>
      ) : (
        <div className="card"><Empty>{all.length ? 'Bu filtrdə görüş yoxdur.' : 'Görüşlər püşkatmadan sonra burada görünəcək.'}</Empty></div>
      )}
    </>
  );
}
