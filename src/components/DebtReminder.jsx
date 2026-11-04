import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './ui';
import { overdueChildren, OVERDUE_DAYS } from '../lib/finance';
import { fmtDate, fullName, todayISO } from '../lib/format';
import { list } from '../lib/db';

const shownFor = new Set();

export default function DebtReminder({ clubId }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (shownFor.has(clubId)) return undefined;
    let alive = true;
    Promise.all([list('children'), list('payments')])
      .then(([kids, payments]) => {
        if (!alive) return;
        shownFor.add(clubId);
        setRows(overdueChildren(kids, payments, todayISO()));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [clubId]);

  if (!rows.length) return null;

  const close = () => setRows([]);

  return (
    <Modal title="Ödəniş xəbərdarlığı" onClose={close}>
      <p style={{ marginBottom: 10 }}>
        Son ödənişindən {OVERDUE_DAYS} gündən çox keçən uşaqlar ({rows.length}):
      </p>
      <div className="list">
        {rows.map((r) => (
          <div className="row" key={r.child.id}>
            <div className="row-main">
              <div className="row-title">{fullName(r.child)}</div>
              <div className="row-sub">
                {r.lastPaid ? `Son ödəniş: ${fmtDate(r.lastPaid)}` : 'Ödəniş qeydi yoxdur'} · {r.passed} gün
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <Link className="btn primary" to="/panel/maliyye" onClick={close}>Maliyyəyə keç</Link>
        <button type="button" className="btn" onClick={close}>Bağla</button>
      </div>
    </Modal>
  );
}
