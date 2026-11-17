import { useState } from 'react';
import { useToast } from '../ui';
import {
  METHODS, SCORE_LIMITS, clearWinner, decideFromScore, emptyScore, roundName, scoreDigits, setScore, setWinner,
} from '../../lib/tournament';

const SCORE_LABELS = [['ippon', 'İppon'], ['wazari', 'Vaza-ari'], ['yuko', 'Yuko'], ['shido', 'Şido']];

export default function MatchCard({ bracket, match, number, onSave }) {
  const notify = useToast();
  const [method, setMethod] = useState(match.method && match.method !== 'Bye' ? match.method : METHODS[0]);
  const person = (id) => bracket.athletes.find((a) => a.id === id);
  const a = person(match.a);
  const b = person(match.b);
  const ready = Boolean(a && b);
  const score = match.score || emptyScore();
  const locked = Boolean(match.winner);

  const act = async (fn) => {
    try {
      await onSave(bracket, fn());
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const bump = (key, who, delta) => {
    const current = score[who][key];
    const value = Math.max(0, Math.min(SCORE_LIMITS[key], current + delta));
    if (value === current) return;
    const next = structuredClone(score);
    next[who][key] = value;
    act(() => {
      let updated = setScore(bracket, match.id, next);
      const verdict = decideFromScore(next);
      if (verdict.final && verdict.winner) {
        updated = setWinner(updated, match.id, verdict.winner === 'a' ? match.a : match.b, verdict.method);
        notify(`Qalib təyin edildi: ${(verdict.winner === 'a' ? a : b).name} (${verdict.method})`);
      }
      return updated;
    });
  };

  const finishByScore = () => {
    const verdict = decideFromScore(score);
    if (!verdict.winner) return notify('Ballar bərabərdir. Qalibi yuxarıdakı düymələrlə seçin (qızıl bal və ya qərar).', 'error');
    return act(() => setWinner(bracket, match.id, verdict.winner === 'a' ? match.a : match.b, verdict.method));
  };

  const counter = (who, key, label) => (
    <div className="counter" key={key}>
      <span className="counter-label">{label}</span>
      <button type="button" className="cnt-btn" aria-label={`${label} azalt`} disabled={locked || score[who][key] <= 0} onClick={() => bump(key, who, -1)}>−</button>
      <strong className="cnt-val">{score[who][key]}</strong>
      <button type="button" className="cnt-btn plus" aria-label={`${label} artır`} disabled={locked || score[who][key] >= SCORE_LIMITS[key]} onClick={() => bump(key, who, 1)}>+</button>
    </div>
  );

  const side = (p, id) => (
    <button
      type="button"
      className={`winner-btn${match.winner === id ? ' picked' : ''}`}
      disabled={!ready}
      onClick={() => act(() => setWinner(bracket, match.id, id, method))}
    >
      <span className="side-name">{p?.name || 'Gözlənilir'}</span>
      {p && <span className="side-club">{p.club}</span>}
      {p && match.score && <span className="side-digits">{scoreDigits(match.score[id === match.a ? 'a' : 'b'])}</span>}
    </button>
  );

  return (
    <div className={`match-card${match.winner ? ' done' : ''}`}>
      <div className="match-meta">
        {number && <span className="match-no">{number}</span>}
        <span>{bracket.label}</span>
        <span className="badge">{roundName(bracket, match)}</span>
        {bracket.mat && <span className="badge">Tatami {bracket.mat}</span>}
      </div>
      <div className="match-sides">
        {side(a, match.a)}
        <span className="vs">VS</span>
        {side(b, match.b)}
      </div>
      {ready && (
        <div className="score-grid">
          {[['a', a], ['b', b]].map(([who, p]) => (
            <div className="score-col" key={who}>
              <div className="score-name">{p.name}</div>
              {SCORE_LABELS.map(([key, label]) => counter(who, key, label))}
            </div>
          ))}
        </div>
      )}
      <div className="match-foot">
        <select aria-label="Qalibiyyət növü" value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        {ready && !match.winner && (
          <button type="button" className="btn sm primary" onClick={finishByScore}>Bal əsasında qalibi təyin et</button>
        )}
        {match.winner && (
          <button type="button" className="btn sm" onClick={() => act(() => clearWinner(bracket, match.id))}>Nəticəni sil</button>
        )}
        {!ready && <span className="row-sub">Əvvəlki görüşlərin nəticəsi gözlənilir</span>}
      </div>
    </div>
  );
}
