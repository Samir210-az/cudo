const NAMES = { 1: 'Qızıl medal', 2: 'Gümüş medal', 3: 'Bürünc medal' };

export default function Medal({ place, title }) {
  if (!NAMES[place]) return null;
  const label = title ? `${NAMES[place]} · ${title}` : NAMES[place];
  return <span className={`medal m${place}`} title={label} role="img" aria-label={label}>{place}</span>;
}
