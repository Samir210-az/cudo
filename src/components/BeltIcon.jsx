import { beltStyle } from '../lib/belts';

export default function BeltIcon({ name, size = 22 }) {
  const belt = beltStyle(name);
  if (!belt) return null;
  const edge = name === 'Ağ' ? '#98a1b0' : 'rgba(0,0,0,0.35)';
  return (
    <svg className="belt-icon" width={size * 1.5} height={size} viewBox="0 0 36 24" role="img" aria-label={`${belt.name} kəmər`}>
      <title>{belt.name} kəmər</title>
      <rect x="1" y="8" width="34" height="8" rx="2.5" fill={belt.bg} stroke={edge} strokeWidth="1" />
      <rect x="14" y="5" width="8" height="14" rx="2.5" fill={belt.bg} stroke={edge} strokeWidth="1" />
      <path d="M17 18l-3 5M19 18l3 5" stroke={edge} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
