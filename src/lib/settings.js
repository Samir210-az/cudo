export { getSettings as fetchSettings } from './db';

export const initials = (c) => `${c.last_name?.[0] || ''}${c.first_name?.[0] || ''}`.toUpperCase();
