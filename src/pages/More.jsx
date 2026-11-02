import { Link } from 'react-router-dom';
import { EXTRA_NAV } from '../components/AdminLayout';
import InstallButton from '../components/InstallButton';
import { Icon, PageHead } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function More() {
  const { signOut } = useAuth();
  return (
    <>
      <PageHead title="Daha çox" />
      <div className="install-row" style={{ marginBottom: 14 }}>
        <InstallButton className="btn primary" />
      </div>
      <div className="card">
        <div className="list">
          {EXTRA_NAV.map((item) => (
            <Link className="row" key={item.to} to={item.to}>
              <Icon name={item.icon} />
              <span className="row-main row-title">{item.label}</span>
            </Link>
          ))}
          <Link className="row" to="/">
            <Icon name="globe" />
            <span className="row-main row-title">Sayta bax</span>
          </Link>
          <button type="button" className="row nav-link" onClick={signOut} style={{ borderTop: '1px solid var(--line)', borderRadius: 0 }}>
            <Icon name="logout" />
            <span className="row-main row-title">Çıxış</span>
          </button>
        </div>
      </div>
    </>
  );
}
