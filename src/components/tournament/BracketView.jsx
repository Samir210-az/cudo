import { roundName, placements } from '../../lib/tournament';

function Side({ bracket, id, win, lose }) {
  const person = bracket.athletes.find((a) => a.id === id);
  return (
    <div className={`side${win ? ' win' : ''}${lose ? ' lose' : ''}`}>
      {person ? (
        <>
          <span className="side-name">{person.name}</span>
          <span className="side-club">{person.club}</span>
        </>
      ) : <span className="side-empty">—</span>}
    </div>
  );
}

export function MatchBox({ bracket, match }) {
  const decided = Boolean(match.winner);
  return (
    <div className={`match-box${match.bye ? ' bye' : ''}`}>
      <Side bracket={bracket} id={match.a} win={decided && match.winner === match.a} lose={decided && match.winner !== match.a && !match.bye} />
      {match.bye ? <div className="side bye-label">Bye</div> : <Side bracket={bracket} id={match.b} win={decided && match.winner === match.b} lose={decided && match.winner !== match.b} />}
    </div>
  );
}

export default function BracketView({ bracket }) {
  if (bracket.system === 'single') {
    return <p className="row-sub">Tək iştirakçı: {bracket.athletes[0]?.name || '—'}. Görüş yoxdur.</p>;
  }

  if (bracket.system === 'round_robin') {
    return (
      <div className="rr">
        {bracket.matches.map((m) => <MatchBox key={m.id} bracket={bracket} match={m} />)}
      </div>
    );
  }

  const rounds = [];
  for (let r = 1; r <= bracket.rounds; r += 1) {
    rounds.push(bracket.matches.filter((m) => m.round === r && !m.bronze));
  }
  const bronze = bracket.matches.find((m) => m.bronze);
  const result = placements(bracket);

  return (
    <>
      <div className="bracket" role="group" aria-label="Turnir tablosu">
        {rounds.map((matches, i) => (
          <div className="bracket-col" key={i}>
            <div className="bracket-head">{roundName(bracket, matches[0])}</div>
            <div className="bracket-matches">
              {matches.map((m) => <MatchBox key={m.id} bracket={bracket} match={m} />)}
            </div>
          </div>
        ))}
      </div>
      {bronze && (
        <div style={{ marginTop: 10 }}>
          <div className="bracket-head">Bürünc görüşü</div>
          <MatchBox bracket={bracket} match={bronze} />
        </div>
      )}
      {result.complete && (
        <p className="row-sub" style={{ marginTop: 10 }}>
          {result.places.map((p) => `${p.place}. ${p.name}`).join(' · ')}
        </p>
      )}
    </>
  );
}
