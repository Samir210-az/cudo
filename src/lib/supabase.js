import { createClient } from '@supabase/supabase-js';
import { normalizePhone } from './format';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;

const LOGIN_DOMAIN = import.meta.env.VITE_LOGIN_DOMAIN || 'cudo-klub.vercel.app';
export const phoneToEmail = (phone) => `${normalizePhone(phone)}@${LOGIN_DOMAIN}`;
export const emailToPhone = (email = '') => email.split('@')[0];

export const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};
