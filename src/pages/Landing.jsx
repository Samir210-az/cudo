import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui';
import { getSettings } from '../lib/db';
import { configured } from '../lib/firebase';
import { formatPhone, normalizePhone } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { useSecretTaps } from '../lib/useSecretTaps';

const photo = (id, width) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${width}`;

const HERO = '1785005845398-4e6af1243f05';
const GALLERY = [
  { id: '1782849159378-a068078370bf', alt: 'İki cüdoçu rəngli matın üzərində güləşir' },
  { id: '1656653121475-e33829581294', alt: 'Ağ kimonoda cüdoçu qara kəmərini bağlayır' },
  { id: HERO, alt: 'Cüdoçu zalda atma texnikasını yerinə yetirir' },
];

const TILES = [
  {
    title: 'Yıxılmağı öyrənmək',
    text: 'Cüdoda ilk öyrənilən şey düzgün yıxılmaqdır (ukemi). Bu bacarıq zədə riskini azaldır və uşağa mat üzərində özünü əmin hiss etməyə kömək edir.',
  },
  {
    title: 'Ağ kəmərdən qara kəmərə',
    text: 'Hər kəmər dərəcəsi imtahanla qazanılır. Uşaq öz irəliləyişini gözlə görür və növbəti hədəfi bilir.',
  },
  {
    title: 'Yarışlar',
    text: 'Klubun şagirdləri turnirlərdə iştirak edir. Yarışlarda uşaqlar çəki kateqoriyalarına görə eyni çəkidə rəqiblərlə qarşılaşır.',
  },
];

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      el?.classList.add('in');
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function useParallax(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const query = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    const update = () => {
      frame = 0;
      el.style.transform = query.matches ? `translate3d(0, ${Math.min(window.scrollY, 900) * 0.22}px, 0)` : '';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}

function Band({ id, tone = 'light', title, children }) {
  const ref = useReveal();
  return (
    <section id={id} className={`band band-${tone}`}>
      <div className="wrap reveal" ref={ref}>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

const hideBroken = (e) => {
  const figure = e.currentTarget.closest('figure');
  if (figure) figure.style.display = 'none';
};

export default function Landing() {
  const navigate = useNavigate();
  const heroMedia = useRef(null);
  useParallax(heroMedia);
  const unlock = () => navigate('/giris');
  const tapNavLogo = useSecretTaps(unlock);
  const tapHeroLogo = useSecretTaps(unlock);

  const { data: settings } = useQuery(async () => {
    if (!configured) return null;
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });

  const name = settings?.club_name || 'Cüdo Klub';
  const phone = settings?.phone ? normalizePhone(settings.phone) : '';
  const whatsapp = settings?.whatsapp ? normalizePhone(settings.whatsapp) : '';
  const scheduleLines = (settings?.schedule || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const hasInfo = Boolean(settings?.about || scheduleLines.length);
  const hasContact = Boolean(settings?.address || phone);

  useEffect(() => {
    document.title = name;
  }, [name]);

  return (
    <div className="site">
      <header className="hero">
        <div className="hero-media" ref={heroMedia} aria-hidden="true">
          <img
            src={photo(HERO, 1600)}
            srcSet={`${photo(HERO, 800)} 800w, ${photo(HERO, 1280)} 1280w, ${photo(HERO, 1920)} 1920w`}
            sizes="100vw"
            alt=""
            fetchPriority="high"
          />
        </div>

        <div className="site-nav">
          <div className="site-nav-inner">
            <button type="button" className="logo-btn nav-brand" onClick={tapNavLogo} aria-label={name}>
              {name}
            </button>
            <nav className="site-nav-links" aria-label="Səhifə bölmələri">
              <a href="#cudo">Cüdo</a>
              {hasInfo && <a href="#melumat">Cədvəl</a>}
              {hasContact && <a href="#elaqe">Əlaqə</a>}
            </nav>
          </div>
        </div>

        <div className="hero-inner">
          <button type="button" className="logo-btn hero-logo" onClick={tapHeroLogo} aria-label={name}>
            <img src="/logo-512.webp" alt="" width="512" height="627" />
          </button>
          <span className="kicker">Uşaq və yeniyetmələr üçün</span>
          <h1>{name}</h1>
          <p>{settings?.tagline || 'Cüdo məşqləri: güc, çeviklik və özünə inam.'}</p>
          <div className="hero-actions">
            {phone && (
              <a className="btn primary" href={`tel:+994${phone.slice(1)}`}>
                <Icon name="phone" /> Zəng et
              </a>
            )}
            {whatsapp && (
              <a className="btn" href={`https://wa.me/994${whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
            <a className="btn" href="#cudo">
              Cüdo haqqında
            </a>
          </div>
        </div>
      </header>

      <Band id="cudo" tone="sky" title="Cüdo nədir">
        <p className="lead">
          Cüdo 1882-ci ildə Yaponiyada Cigoro Kano tərəfindən yaradılıb və 1964-cü ildən Olimpiya oyunlarının proqramındadır.
        </p>
        <div className="tiles">
          {TILES.map((tile, i) => (
            <article className={`tile tile-${i + 1}`} key={tile.title}>
              <span className="tile-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{tile.title}</h3>
              <p>{tile.text}</p>
            </article>
          ))}
        </div>
      </Band>

      {hasInfo && (
        <Band id="melumat" tone="dark" title={scheduleLines.length ? 'Məşq cədvəli' : 'Klub haqqında'}>
          <div className="split">
            {scheduleLines.length > 0 && (
              <ul className="schedule">
                {scheduleLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {settings.about && (
              <div>
                {scheduleLines.length > 0 && <h3 className="sub">Klub haqqında</h3>}
                <p className="prose">{settings.about}</p>
              </div>
            )}
          </div>
        </Band>
      )}

      <Band id="qalereya" tone="gold" title="Matın üzərində">
        <div className="gallery">
          {GALLERY.map((item) => (
            <figure key={item.id}>
              <img
                src={photo(item.id, 900)}
                srcSet={`${photo(item.id, 600)} 600w, ${photo(item.id, 900)} 900w, ${photo(item.id, 1400)} 1400w`}
                sizes="(min-width: 800px) 33vw, 100vw"
                alt={item.alt}
                loading="lazy"
                onError={hideBroken}
              />
            </figure>
          ))}
        </div>
      </Band>

      {hasContact && (
        <Band id="elaqe" tone="red" title="Əlaqə">
          <div className="contact">
            {phone && (
              <a className="contact-phone" href={`tel:+994${phone.slice(1)}`}>
                {formatPhone(phone)}
              </a>
            )}
            {settings.address && (
              <p className="contact-address">
                <Icon name="pin" /> {settings.address}
              </p>
            )}
            {whatsapp && (
              <a className="btn" href={`https://wa.me/994${whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp-da yaz
              </a>
            )}
          </div>
        </Band>
      )}

      <footer className="site-foot">
        <a href="https://aze-ai.az" target="_blank" rel="noopener noreferrer">
          By securtiy_group
        </a>
      </footer>
    </div>
  );
}
