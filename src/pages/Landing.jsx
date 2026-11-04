import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui';
import { ROOT_CLUB, getPublicClub, listClubs } from '../lib/db';
import { configured } from '../lib/firebase';
import { formatPhone, normalizePhone } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { useSecretTaps } from '../lib/useSecretTaps';

const unsplash = (id, width) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${width}`;
const pexels = (id, width) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

const HERO = '1785005845398-4e6af1243f05';

const GALLERY = [
  { src: (w) => pexels(6765015, w), alt: 'İki uşaq dojoda cüdo məşqi edir' },
  { src: (w) => pexels(6765024, w), alt: 'Cüdoçu rəqibini atma texnikası ilə yerə yıxır' },
  { src: (w) => unsplash('1782849159378-a068078370bf', w), alt: 'İki cüdoçu rəngli matın üzərində güləşir' },
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
    title: 'Çəki kateqoriyaları',
    text: 'Cüdo yarışlarında uşaqlar çəkiyə görə kateqoriyalara bölünür və eyni çəkidə rəqiblərlə qarşılaşır.',
  },
];

const TIME_RE = /\d{1,2}[:.]\d{2}/;

const DEFAULT_SCHEDULE = ['Bazar ertəsi', 'Çərşənbə', 'Cümə'];
const DEFAULT_ABOUT = 'Məşqlər peşəkar məşqçilər tərəfindən keçirilir.';

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

function useParallax(wrapRef, mediaRef, { factor = 0.22, centered = false } = {}) {
  useEffect(() => {
    const wrap = wrapRef.current;
    const media = mediaRef.current;
    if (!wrap || !media) return undefined;
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!motionOk.matches) {
        media.style.transform = '';
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const viewport = window.innerHeight;
      if (rect.bottom < -50 || rect.top > viewport + 50) return;
      const wide = window.innerWidth >= 900;
      if (centered) {
        const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
        media.style.transform = `translate3d(0, ${(-progress * (wide ? 90 : 40)).toFixed(1)}px, 0)`;
      } else if (wide) {
        media.style.transform = `translate3d(0, ${Math.min(window.scrollY, 900) * factor}px, 0)`;
      } else {
        media.style.transform = '';
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [wrapRef, mediaRef, factor, centered]);
}

function Logo({ height }) {
  return (
    <span className="logo-wrap" style={{ height }}>
      <img src="/logo-128.webp" alt="" width={Math.round(height * 0.817)} height={height} />
    </span>
  );
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

function PhotoBand({ src, srcSet, children }) {
  const wrap = useRef(null);
  const media = useRef(null);
  useParallax(wrap, media, { centered: true });
  return (
    <section className="photo-band" ref={wrap}>
      <img ref={media} src={src} srcSet={srcSet} sizes="100vw" alt="" loading="lazy" />
      <div className="photo-band-text">{children}</div>
    </section>
  );
}

const hideBroken = (e) => {
  const figure = e.currentTarget.closest('figure');
  if (figure) figure.style.display = 'none';
};

export default function Landing() {
  const navigate = useNavigate();
  const heroWrap = useRef(null);
  const heroMedia = useRef(null);
  useParallax(heroWrap, heroMedia);
  const tapLogo = useSecretTaps(() => navigate('/giris'));

  const { data } = useQuery(async () => {
    if (!configured) return null;
    const [settings, clubs] = await Promise.all([
      getPublicClub(ROOT_CLUB).catch(() => null),
      listClubs().catch(() => []),
    ]);
    return { settings, branches: clubs.filter((c) => c.id !== ROOT_CLUB && (c.address || c.phone || c.schedule)) };
  });
  const settings = data?.settings;
  const branches = data?.branches || [];

  const name = settings?.club_name || 'Cüdo Klub';
  const phone = settings?.phone ? normalizePhone(settings.phone) : '';
  const whatsapp = settings?.whatsapp ? normalizePhone(settings.whatsapp) : '';
  const savedSchedule = (settings?.schedule || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const scheduleLines = savedSchedule.length ? savedSchedule : DEFAULT_SCHEDULE;
  const about = settings?.about || DEFAULT_ABOUT;
  const contactBranches = branches.filter((b) => b.address || b.phone);
  const hasContact = Boolean(settings?.address || phone || contactBranches.length);
  const scheduleGroups = [
    { id: ROOT_CLUB, name, lines: scheduleLines },
    ...branches
      .map((b) => ({ id: b.id, name: b.club_name, lines: (b.schedule || '').split('\n').map((l) => l.trim()).filter(Boolean) }))
      .filter((g) => g.lines.length),
  ];

  useEffect(() => {
    document.title = name;
  }, [name]);

  return (
    <div className="site">
      <header className="hero" ref={heroWrap}>
        <div className="hero-media" ref={heroMedia} aria-hidden="true">
          <img
            src={unsplash(HERO, 1600)}
            srcSet={`${unsplash(HERO, 800)} 800w, ${unsplash(HERO, 1280)} 1280w, ${unsplash(HERO, 1920)} 1920w`}
            sizes="100vw"
            alt=""
            fetchPriority="high"
          />
        </div>

        <div className="site-nav">
          <div className="site-nav-inner">
            <button type="button" className="logo-btn nav-brand" onClick={tapLogo} aria-label={name}>
              <Logo height={54} />
              <span>{name}</span>
            </button>
            <nav className="site-nav-links" aria-label="Səhifə bölmələri">
              <a href="#cudo">Cüdo</a>
              <a href="#melumat">Məşqlər</a>
              {hasContact && <a href="#elaqe">Əlaqə</a>}
            </nav>
          </div>
        </div>

        <div className="hero-inner">
          <span className="kicker">Uşaq və yeniyetmələr üçün</span>
          <h1>{name}</h1>
          <p>{settings?.tagline || 'Güc, çeviklik və özünə inam.'}</p>
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

      <PhotoBand src={pexels(6765030, 1600)} srcSet={`${pexels(6765030, 800)} 800w, ${pexels(6765030, 1600)} 1600w`}>
        <p className="band-quote">
          <span>Güc.</span> <span className="q2">Çeviklik.</span> <span className="q3">Özünə inam.</span>
        </p>
      </PhotoBand>

      <Band id="melumat" tone="dark" title="Məşqlər">
        <div className="split">
          <div className="schedule-groups">
            {scheduleGroups.map((group) => (
              <div key={group.id}>
                {scheduleGroups.length > 1 && <h3 className="sub">{group.name}</h3>}
                <ul className="schedule">
                  {group.lines.map((line, i) => (
                    <li key={i} className={TIME_RE.test(line) ? 'is-time' : undefined}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <h3 className="sub">Klub haqqında</h3>
            <p className="prose">{about}</p>
          </div>
        </div>
      </Band>

      <Band id="qalereya" tone="gold" title="Matın üzərində">
        <div className="gallery">
          {GALLERY.map((item) => (
            <figure key={item.alt}>
              <img
                src={item.src(900)}
                srcSet={`${item.src(600)} 600w, ${item.src(900)} 900w, ${item.src(1400)} 1400w`}
                sizes="(min-width: 800px) 33vw, 100vw"
                alt={item.alt}
                loading="lazy"
                onError={hideBroken}
              />
            </figure>
          ))}
        </div>
      </Band>

      <PhotoBand
        src={unsplash('1656653121475-e33829581294', 1600)}
        srcSet={`${unsplash('1656653121475-e33829581294', 800)} 800w, ${unsplash('1656653121475-e33829581294', 1600)} 1600w`}
      >
        <p className="band-quote">
          Sən də <span className="q2">matın üzərinə</span> <span className="q3">çıx.</span>
        </p>
      </PhotoBand>

      {hasContact && (
        <Band id="elaqe" tone="red" title="Əlaqə">
          <div className="contact">
            {phone && (
              <a className="contact-phone" href={`tel:+994${phone.slice(1)}`}>
                {formatPhone(phone)}
              </a>
            )}
            {settings?.address && (
              <p className="contact-address">
                <Icon name="pin" /> {settings.address}
              </p>
            )}
            {whatsapp && (
              <a className="btn" href={`https://wa.me/994${whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp-da yaz
              </a>
            )}
            {contactBranches.length > 0 && (
              <div className="branches">
                <h3 className="sub">Filiallar</h3>
                {contactBranches.map((branch) => {
                  const branchPhone = branch.phone ? normalizePhone(branch.phone) : '';
                  return (
                    <article className="branch" key={branch.id}>
                      <h4>{branch.club_name}</h4>
                      {branch.address && (
                        <p className="contact-address">
                          <Icon name="pin" /> {branch.address}
                        </p>
                      )}
                      {branchPhone && (
                        <a className="branch-phone" href={`tel:+994${branchPhone.slice(1)}`}>
                          {formatPhone(branchPhone)}
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </Band>
      )}

      <footer className="site-foot">
        <Logo height={72} />
        <a href="https://aze-ai.az" target="_blank" rel="noopener noreferrer">
          By securtiy_group
        </a>
      </footer>
    </div>
  );
}
