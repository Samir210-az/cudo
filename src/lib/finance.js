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

export function computeDebts(children, payments, period) {
  const paid = new Map();
  for (const p of payments) {
    if (p.period_month === period) {
      paid.set(p.child_id, (paid.get(p.child_id) || 0) + Number(p.amount));
    }
  }
  const monthEnd = addMonths(period, 1);
  return children
    .filter((c) => c.status === 'aktiv' && Number(c.monthly_fee) > 0 && c.joined_at < monthEnd)
    .map((child) => {
      const fee = Number(child.monthly_fee);
      const paidSum = paid.get(child.id) || 0;
      return { child, fee, paid: paidSum, due: Math.max(fee - paidSum, 0) };
    });
}

export const onlyDebtors = (rows) => rows.filter((r) => r.due > 0);
