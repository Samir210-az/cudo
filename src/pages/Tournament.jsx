import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Categories from '../components/tournament/Categories';
import Draw from '../components/tournament/Draw';
import Matches from '../components/tournament/Matches';
import Registration from '../components/tournament/Registration';
import Results from '../components/tournament/Results';
import TournamentSettings from '../components/tournament/TournamentSettings';
import WeighIn from '../components/tournament/WeighIn';
import { ErrorBox, Loader, PageHead, useToast } from '../components/ui';
import { useAutoPublish } from '../lib/autoPublish';
import { eq, get, list } from '../lib/db';
import { fmtDate } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { readConfig } from '../lib/tournament';

const TABS = [
  ['qeydiyyat', '1. Qeydiyyat'],
  ['cekilis', '2. Çəkiliş'],
  ['kateqoriya', '3. Kateqoriyalar'],
  ['puskatma', '4. Püşkatma'],
  ['gorusler', '5. Görüşlər'],
  ['neticeler', '6. Nəticələr'],
  ['ayarlar', 'Ayarlar'],
];

const HINTS = {
  qeydiyyat: 'Məşqçilər öz linkləri ilə iştirakçıları özləri əlavə edir, siyahı avtomatik dolur. Sizin işiniz yalnız çatışan məlumatı tamamlamaqdır.',
  cekilis: 'Yarış günü hər idmançının real çəkisini yazın. Çəkisi yazılan idmançı püşkatmaya düşür.',
  kateqoriya: 'Kateqoriyalar yaşa, cinsə və çəkiyə görə avtomatik yaranır. Burada yalnız yoxlayırsınız.',
  puskatma: 'Hər kateqoriya üçün püşkatma edin. Tatami və saat avtomatik bölünür.',
  gorusler: 'Hər görüşün qalibini seçin. Dərc edilmiş cədvəl məşqçilərə avtomatik yenilənir.',
  neticeler: 'Yerlər, klub medalları və rəsmi protokol PDF-i.',
  ayarlar: 'Yaş qrupları, çəki cədvəli, tatami sayı, başlama saatı, bürünc qaydası.',
};

export default function Tournament() {
  const { id } = useParams();
  const [tab, setTab] = useState(() => TABS.find(([k]) => k === window.location.hash.slice(1))?.[0] || 'qeydiyyat');

  const { data, loading, error, reload } = useQuery(async () => {
    const [competition, athletes, brackets] = await Promise.all([
      get('competitions', id),
      list('tournamentAthletes', eq('competition_id', id)),
      list('tournamentBrackets', eq('competition_id', id)),
    ]);
    return { competition, athletes, brackets };
  }, [id]);

  const config = useMemo(() => (data ? readConfig(data.competition) : null), [data]);
  const notify = useToast();
  useAutoPublish(data, config, (err) => notify(`Dərc edilmiş cədvəl yenilənmədi: ${err.message}`, 'error'));

  if (loading && !data) return <Loader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { competition, athletes, brackets } = data;

  const choose = (key) => {
    setTab(key);
    window.history.replaceState(null, '', `#${key}`);
  };
  const shared = { competition, config, athletes, brackets, reload, goTo: choose };

  return (
    <div className="tdark">
      <PageHead
        title={`${competition.name} · turnir`}
        subtitle={[fmtDate(competition.held_on), competition.location, `${athletes.length} idmançı`].filter(Boolean).join(' · ')}
        back={<Link className="back-link" to={`/panel/yarislar/${id}`}>← Yarış</Link>}
      />
      <div className="tabs wrap" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" className="tab" aria-selected={tab === key} onClick={() => choose(key)}>{label}</button>
        ))}
      </div>
      <p className="step-hint">{HINTS[tab]}</p>
      {tab === 'qeydiyyat' && <Registration {...shared} />}
      {tab === 'cekilis' && <WeighIn {...shared} />}
      {tab === 'kateqoriya' && <Categories {...shared} />}
      {tab === 'puskatma' && <Draw {...shared} />}
      {tab === 'gorusler' && <Matches {...shared} />}
      {tab === 'neticeler' && <Results {...shared} />}
      {tab === 'ayarlar' && <TournamentSettings key={JSON.stringify(competition.tournament || {})} competition={competition} config={config} hasBrackets={brackets.length > 0} reload={reload} />}
    </div>
  );
}
