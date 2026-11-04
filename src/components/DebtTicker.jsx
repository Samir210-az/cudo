import { Link } from 'react-router-dom';
import { fmtDate, fullName } from '../lib/format';

export default function DebtTicker({ rows }) {
  const items = rows.map((r) => `${fullName(r.child)} (${r.lastPaid ? `son ödəniş ${fmtDate(r.lastPaid)}` : 'ödəniş qeydi yoxdur'})`);
  const text = items.join('   •   ');
  const seconds = Math.max(16, Math.round(text.length * 0.26));

  return (
    <Link to="/panel/maliyye?tab=debts" className="ticker" role="alert" aria-label={`Borc xəbərdarlığı: ${items.join(', ')}`}>
      <span className="ticker-label">Borc</span>
      <span className="ticker-view" aria-hidden="true">
        <span className="ticker-track" style={{ animationDuration: `${seconds}s` }}>
          <span>{text}</span>
          <span>{text}</span>
        </span>
      </span>
    </Link>
  );
}
