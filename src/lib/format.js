export const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export const pad = (n) => String(n).padStart(2, '0');

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

export const addMonths = (iso, n) => {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};

export const fmtPeriod = (iso) => {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

export const fmtNum = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const [int, frac] = v.toFixed(2).split('.');
  const spaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac === '00' ? spaced : `${spaced},${frac}`;
};

export const fmtMoney = (n) => `${fmtNum(n)} ₼`;

export function calcAge(birth, now = new Date()) {
  const [y, m, d] = birth.split('-').map(Number);
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  if (month < m || (month === m && now.getDate() < d)) age -= 1;
  return age;
}

export function trainingDuration(joined, now = new Date()) {
  const [y, m, d] = joined.split('-').map(Number);
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  if (months < 0) return '—';
  if (months < 1) return '1 aydan az';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years && `${years} il`, rest && `${rest} ay`].filter(Boolean).join(' ');
}

export const fullName = (c) => `${c.last_name} ${c.first_name}`;

export function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('994')) digits = digits.slice(3);
  if (digits.length === 9) digits = `0${digits}`;
  return digits;
}

export const isValidPhone = (value) => /^0\d{9}$/.test(normalizePhone(value));

export function formatPhone(value) {
  const d = normalizePhone(value || '');
  if (d.length !== 10) return value || '—';
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

export const gradeLabel = (g) => (g === 0 ? 'Məktəbəqədər' : g ? `${g}-ci sinif` : '—');
