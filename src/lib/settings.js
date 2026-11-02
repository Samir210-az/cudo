import { supabase, unwrap } from './supabase';

export const fetchSettings = async () =>
  unwrap(await supabase.from('club_settings').select('*').eq('id', 1).maybeSingle());

export const initials = (c) => `${c.last_name?.[0] || ''}${c.first_name?.[0] || ''}`.toUpperCase();
