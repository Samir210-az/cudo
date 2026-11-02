import { useEffect } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon, Loader } from './ui';

const MAIN_NAV = [
  { to: '/panel', label: 'Panel', icon: 'home', end: true, color: '#5b97ff' },
  { to: '/panel/usaqlar', label: 'Uşaqlar', icon: 'users', color: '#f0546d' },
  { to: '/panel/davamiyyet', label: 'Davamiyyət', icon: 'check', color: '#2fb66d' },
  { to: '/panel/yarislar', label: 'Yarışlar', icon: 'trophy', color: '#e0a526' },
  { to: '/panel/maliyye', label: 'Maliyyə', icon: 'wallet', color: '#9a74f0' },
];

const EXTRA_NAV = [
  { to: '/panel/heyet', label: 'Heyət və maaş', icon: 'briefcase', color: '#22b8ba' },
  { to: '/panel/hesabat', label: 'Hesabat', icon: 'chart', color: '#5b97ff' },
  { to: '/panel/ayarlar', label: 'Ayarlar', icon: 'settings', color: '#98a4b8' },
];

const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

export default function AdminLayout() {
  const { session, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (session === undefined) return <Loader />;
  if (!session) return <Navigate to="/giris" replace />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/logo-128.webp" alt="" width="28" height="34" />
          <span>Cüdo Klub</span>
        </div>
        <nav aria-label="Əsas menyu">
          {[...MAIN_NAV, ...EXTRA_NAV].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass} style={{ '--c': item.color }}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/" className="nav-link">
            <Icon name="globe" />
            Sayta bax
          </NavLink>
          <button type="button" className="nav-link" onClick={signOut}>
            <Icon name="logout" />
            Çıxış
          </button>
        </div>
      </aside>

      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/logo-128.webp" alt="" width="28" height="34" />
          <span>Cüdo Klub</span>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Əsas menyu">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass} style={{ '--c': item.color }}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink to="/panel/daha" className={navClass} style={{ '--c': '#22b8ba' }}>
          <Icon name="menu" />
          <span>Daha</span>
        </NavLink>
      </nav>
    </div>
  );
}

export { EXTRA_NAV };
