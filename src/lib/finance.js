import { addMonths } from './format';

export const EXPENSE_CATEGORIES = [
  'Zalın icarəsi',
  'Kommunal xidmətlər',
  'İnventar və geyim',
  'Yarış xərcləri',
  'Reklam',
  'Təmir',
  'Digər',
];

export const sum = (rows, field = 'amount') =>
  rows.reduce((total, row) => total + Number(row[field] || 0), 0);

export const isFrozen = (child, period) =>
  (child.freezes || []).some((f) => f.from <= period && (!f.to || period <= f.to));
export const isFrozenOn = (child, iso) =>
  (child.freezes || []).some((f) => {
    if (f.from > iso) return false;
    if (f.back) return iso < f.back;
    if (f.to) return `${iso.slice(0, 7)}-01` <= f.to;
    return true;
  });
export const openFreeze = (child) => (child.freezes || []).find((f) => !f.to) || null;

export function computeDebts(children, payments, period) {
  const paid = new Map();
  for (const p of payments) {
    if (p.period_month === period) {
      paid.set(p.child_id, (paid.get(p.child_id) || 0) + Number(p.amount));
    }
  }
  const monthEnd = addMonths(period, 1);
  return children
    .filter((c) => c.status === 'aktiv' && Number(c.monthly_fee) > 0 && c.joined_at < monthEnd && !isFrozen(c, period))
    .map((child) => {
      const fee = Number(child.monthly_fee);
      const paidSum = paid.get(child.id) || 0;
      return { child, fee, paid: paidSum, due: Math.max(fee - paidSum, 0) };
    });
}

export const onlyDebtors = (rows) => rows.filter((r) => r.due > 0);

export const OVERDUE_DAYS = 30;

const dayNumber = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

export function overdueChildren(children, payments, today, days = OVERDUE_DAYS) {
  const last = new Map();
  for (const p of payments) {
    if (!p.paid_on) continue;
    const prev = last.get(p.child_id);
    if (!prev || p.paid_on > prev) last.set(p.child_id, p.paid_on);
  }
  return children
    .filter((c) => c.status === 'aktiv' && Number(c.monthly_fee) > 0 && !openFreeze(c))
    .map((child) => {
      const lastPaid = last.get(child.id) || null;
      const since = lastPaid || child.joined_at;
      return { child, lastPaid, passed: since ? dayNumber(today) - dayNumber(since) : 0 };
    })
    .filter((r) => r.passed >= days)
    .sort((a, b) => b.passed - a.passed);
}
