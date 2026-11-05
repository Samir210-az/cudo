import { ROOT_CLUB, getSettings } from './db';

export const BRAND = 'HÜNƏR İDMAN KLUBU';

export async function fetchSettings() {
  const club = await getSettings();
  return { ...club, brand_name: BRAND, is_branch: Boolean(club.id) && club.id !== ROOT_CLUB };
}

export const initials = (c) => `${c.last_name?.[0] || ''}${c.first_name?.[0] || ''}`.toUpperCase();

export const avatarTone = (c) => {
  const seed = `${c.last_name || ''}${c.first_name || ''}`.split('').reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return `t${seed % 5}`;
};
