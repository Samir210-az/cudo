import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { useQuery } from '../lib/hooks';
import { getSettings } from '../lib/db';
import { configured } from '../lib/firebase';
import { formatPhone, normalizePhone } from '../lib/format';

const HERO =
  'https://images.unsplash.com/photo-1785005845398-4e6af1243f05?auto=format&fit=crop&w=1600&q=70';

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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Section({ title, children }) {
  const ref = useReveal();
  return (
    <section className="section reveal" ref={ref}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function Landing() {
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

  useEffect(() => {
    document.title = name;
  }, [name]);

  return (
    <div className="site">
      <div className="hero" style={{ backgroundImage: `url(${HERO})` }}>
        <div className="site-nav">
          <strong>{name}</strong>
          <Link to="/giris">Admin girişi</Link>
        </div>
        <div className="hero-inner">
          <h1>{name}</h1>
          <p>{settings?.tagline || 'Uşaq və yeniyetmələr üçün cüdo məşqləri.'}</p>
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
      </div>

      {settings?.about && (
        <Section title="Klub haqqında">
          <p className="prose">{settings.about}</p>
        </Section>
      )}

      {settings?.schedule && (
        <Section title="Məşq cədvəli">
          <p className="prose">{settings.schedule}</p>
        </Section>
      )}

      {(settings?.address || phone) && (
        <Section title="Əlaqə">
          <div className="contact-list">
            {settings?.address && (
              <div className="contact-item">
                <Icon name="pin" /> {settings.address}
              </div>
            )}
            {phone && (
              <a className="contact-item" href={`tel:+994${phone.slice(1)}`}>
                <Icon name="phone" /> {formatPhone(phone)}
              </a>
            )}
          </div>
        </Section>
      )}

      <footer className="site-foot">
        <a href="https://aze-ai.az" target="_blank" rel="noopener noreferrer">
          By securtiy_group
        </a>
      </footer>
    </div>
  );
}
