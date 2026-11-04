import { ROOT_CLUB, getClub, getSettings } from './db';

export async function fetchSettings() {
  const [club, root] = await Promise.all([getSettings(), getClub(ROOT_CLUB)]);
  return { ...club, brand_name: root?.club_name || 'Cüdo Klub', is_branch: Boolean(club.id) && club.id !== ROOT_CLUB };
}

export const initials = (c) => `${c.last_name?.[0] || ''}${c.first_name?.[0] || ''}`.toUpperCase();

export const avatarTone = (c) => {
  const seed = `${c.last_name || ''}${c.first_name || ''}`.split('').reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return `t${seed % 5}`;
};
