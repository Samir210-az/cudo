import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, phoneToEmail } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      async signIn(phone, pin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: phoneToEmail(phone),
          password: pin,
        });
        if (error) {
          if (error.status === 429) throw new Error('Çox cəhd edildi. Bir neçə dəqiqə gözləyin.');
          throw new Error('Telefon nömrəsi və ya PİN yanlışdır.');
        }
      },
      signOut: () => supabase.auth.signOut(),
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
