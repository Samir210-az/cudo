import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CompetitionModal from '../components/CompetitionModal';
import { Empty, ErrorBox, Icon, Loader, PageHead } from '../components/ui';
import { fmtDate, todayISO } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { list } from '../lib/db';

function CompetitionRow({ c }) {
  return (
    <Link className="row" to={`/panel/yarislar/${c.id}`}>
      <div className="row-main">
        <div className="row-title">{c.name}</div>
        <div className="row-sub">
          {fmtDate(c.held_on)}
          {c.location ? ` · ${c.location}` : ''}
        </div>
      </div>
      <span className="badge">{c.count} nəfər</span>
    </Link>
  );
}

export default function Competitions() {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useQuery(
    async () => {
      const [competitions, entries] = await Promise.all([list('competitions'), list('competitionEntries')]);
      const counts = new Map();
      entries.forEach((e) => counts.set(e.competition_id, (counts.get(e.competition_id) || 0) + 1));
      return competitions
        .map((c) => ({ ...c, count: counts.get(c.id) || 0 }))
        .sort((a, b) => b.held_on.localeCompare(a.held_on));
    },
    [],
  );

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const today = todayISO();
  const upcoming = data.filter((c) => c.held_on >= today).reverse();
  const past = data.filter((c) => c.held_on < today);

  return (
    <>
      <PageHead title="Yarışlar" subtitle="Yarışa gedən uşaqlar hər yarış üzrə ayrıca qruplaşır">
        <button type="button" className="btn primary" onClick={() => setAdding(true)}>
          <Icon name="plus" /> Yeni yarış
        </button>
      </PageHead>

      <div className="stack">
        <section className="card">
          <h2>Yaxınlaşan</h2>
          {upcoming.length ? <div className="list">{upcoming.map((c) => <CompetitionRow key={c.id} c={c} />)}</div> : <Empty>Planlaşdırılmış yarış yoxdur.</Empty>}
        </section>
        <section className="card">
          <h2>Keçmiş</h2>
          {past.length ? <div className="list">{past.map((c) => <CompetitionRow key={c.id} c={c} />)}</div> : <Empty>Keçmiş yarış yoxdur.</Empty>}
        </section>
      </div>

      {adding && (
        <CompetitionModal
          onClose={() => setAdding(false)}
          onSaved={(id) => navigate(`/panel/yarislar/${id}`)}
        />
      )}
    </>
  );
}
