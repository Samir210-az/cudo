export const BELTS = [
  { name: 'Ağ', bg: '#f3f4f6', fg: '#1a1f29', stripe: '#c5cbd5' },
  { name: 'Sarı', bg: '#f7d13a', fg: '#3b2f00', stripe: '#f2c200' },
  { name: 'Narıncı', bg: '#f28c28', fg: '#2b1600', stripe: '#f28c28' },
  { name: 'Yaşıl', bg: '#2f9e5b', fg: '#ffffff', stripe: '#2f9e5b' },
  { name: 'Mavi', bg: '#2f6fe0', fg: '#ffffff', stripe: '#2f6fe0' },
  { name: 'Qəhvəyi', bg: '#7a4a24', fg: '#ffffff', stripe: '#7a4a24' },
  { name: 'Qara', bg: '#14181f', fg: '#ffffff', stripe: '#14181f' },
];

export const beltRank = (name) => BELTS.findIndex((b) => b.name === name);

export const beltStyle = (name) => BELTS.find((b) => b.name === name) || null;
