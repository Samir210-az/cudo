export { getSettings as fetchSettings } from './db';

export const initials = (c) => `${c.last_name?.[0] || ''}${c.first_name?.[0] || ''}`.toUpperCase();

export const avatarTone = (c) => {
  const seed = `${c.last_name || ''}${c.first_name || ''}`.split('').reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return `t${seed % 5}`;
};
