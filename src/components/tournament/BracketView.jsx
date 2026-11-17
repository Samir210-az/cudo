import { useState } from 'react';
import { isMain, roundName, placements, matchNumbers, orderedMatches, scoreDigits } from '../../lib/tournament';
import MatchCard from './MatchCard';

const splitName = (full) => {
  const [last = '', ...rest] = (full || '').split(' ');
  return { last: last.toLocaleUpperCase('az'), rest: rest.join(' ') };
};

function Side({ bracket, id, color, score, win, lose, bye, method }) {
  const person = bracket.athletes.find((a) => a.id === id);
  const name = person ? splitName(person.name) : null;
  return (
    <div className={`bk-side${win ? ' win' : ''}${lose ? ' lose' : ''}`}>
      <span className={`bk-bar ${color}`} aria-hidden="true" />
      {person ? (
        <span className="bk-who">
          <span className="bk-name"><b>{name.last}</b> {name.rest}</span>
          <span className="bk-club">{person.club || '—'}</span>
        </span>
      ) : <span className="bk-who bk-empty">{bye ? 'Bye' : '—'}</span>}
      {person && !bye && (
        <span className="bk-score">
          <span className="bk-digits">{scoreDigits(score)}</span>
          {Array.from({ length: score?.shido || 0 }, (_, i) => <i className="bk-shido" key={i} />)}
        </span>
      )}
      {win && method && <span className="bk-method">{method}</span>}
      {win && <span className="bk-win" aria-label="Qalib">◂</span>}
    </div>
  );
}

export function BracketCard({ bracket, match, number, onPick, active }) {
  const decided = Boolean(match.winner);
  const ready = Boolean(match.a && match.b) && !match.bye;
  const shownMethod = decided && !match.bye && match.method !== 'Bye' ? match.method : null;
  return (
    <button
      type="button"
      className={`bk-card${active ? ' active' : ''}${match.bye ? ' bye' : ''}${ready ? ' ready' : ''}`}
      onClick={() => ready && onPick?.(match.id)}
      aria-label={`Görüş ${number}`}
      disabled={!ready && !decided}
    >
      <span className="bk-no">{number}</span>
      <Side bracket={bracket} id={match.a} color="white" score={match.score?.a} method={shownMethod} win={decided && match.winner === match.a && !match.bye} lose={decided && match.winner !== match.a && !match.bye} />
      <Side bracket={bracket} id={match.b} color="blue" score={match.score?.b} method={shownMethod} bye={match.bye} win={decided && match.winner === match.b} lose={decided && match.winner !== match.b && !match.bye} />
    </button>
  );
}

export default function BracketView({ bracket, onSave }) {
  const [picked, setPicked] = useState(null);

  if (bracket.system === 'single') {
    return <p className="row-sub">Tək iştirakçı: {bracket.athletes[0]?.name || '—'}. Görüş yoxdur.</p>;
  }

  const numbers = matchNumbers(bracket);
  const pickedMatch = bracket.matches.find((m) => m.id === picked);
  const detail = pickedMatch && onSave && (
    <div className="bk-detail">
      <MatchCard key={`${pickedMatch.id}-${pickedMatch.winner}-${pickedMatch.a}-${pickedMatch.b}`} bracket={bracket} match={pickedMatch} number={numbers.get(pickedMatch.id)} onSave={onSave} />
      <button type="button" className="btn sm" onClick={() => setPicked(null)}>Bağla</button>
    </div>
  );

  if (bracket.system === 'round_robin') {
    return (
      <>
        <div className="bk-dark bk-rr">
          {bracket.matches.map((m) => (
            <BracketCard key={m.id} bracket={bracket} match={m} number={numbers.get(m.id)} onPick={setPicked} active={picked === m.id} />
          ))}
        </div>
        {detail}
      </>
    );
  }

  const size = 2 ** bracket.rounds;
  const rounds = [];
  for (let r = 1; r <= bracket.rounds; r += 1) {
    rounds.push(bracket.matches.filter((m) => m.round === r && isMain(m)).sort((x, y) => x.idx - y.idx));
  }
  const bronze = bracket.matches.find((m) => m.bronze && !m.rep);
  const repechage = orderedMatches(bracket).filter((m) => m.rep);
  const result = placements(bracket);

  return (
    <>
      <div className="bk-dark">
        <div className="bk-scroll" role="group" aria-label="Turnir tablosu">
          <div className="bk-tree" style={{ gridTemplateColumns: `repeat(${bracket.rounds}, 236px)`, gridTemplateRows: `auto repeat(${size / 2}, 84px)` }}>
            {rounds.map((matches, r) => (
              <div className="bk-head" key={`h${r}`} style={{ gridColumn: r + 1, gridRow: 1 }}>{roundName(bracket, matches[0])}</div>
            ))}
            {rounds.flatMap((matches, r) => matches.map((m) => {
              const span = 2 ** r;
              const first = m.idx * span + 2;
              return (
                <div
                  key={m.id}
                  className={`bk-cell${r < bracket.rounds - 1 ? ' has-out' : ''}${r > 0 ? ' has-in' : ''}${m.idx % 2 === 0 ? ' up' : ' down'}`}
                  style={{ gridColumn: r + 1, gridRow: `${first} / span ${span}` }}
                >
                  <BracketCard bracket={bracket} match={m} number={numbers.get(m.id)} onPick={setPicked} active={picked === m.id} />
                  {r < bracket.rounds - 1 && <span className="bk-vj" aria-hidden="true" />}
                </div>
              );
            }))}
          </div>
        </div>
        {repechage.length > 0 && (
          <div className="bk-bronze">
            <div className="bk-head">Təsəllü və bürünc görüşləri</div>
            <div className="bk-rep">
              {repechage.map((m) => (
                <BracketCard key={m.id} bracket={bracket} match={m} number={numbers.get(m.id)} onPick={setPicked} active={picked === m.id} />
              ))}
            </div>
          </div>
        )}
        {bronze && (
          <div className="bk-bronze">
            <div className="bk-head">Bürünc görüşü</div>
            <BracketCard bracket={bracket} match={bronze} number={numbers.get(bronze.id)} onPick={setPicked} active={picked === bronze.id} />
          </div>
        )}
      </div>
      {bracket.matches.some((m) => m.score) && (
        <p className="bk-legend">Hesab: üç rəqəm ardıcıl İppon, Vaza-ari, Yuko deməkdir (012 = 0 ippon, 1 vaza-ari, 2 yuko). Sarı zolaq şidodur.</p>
      )}
      {detail}
      {result.complete && (
        <p className="row-sub" style={{ marginTop: 10 }}>
          {result.places.map((p) => `${p.place}. ${p.name}`).join(' · ')}
        </p>
      )}
    </>
  );
}
