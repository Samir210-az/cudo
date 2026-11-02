import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, phoneToEmail } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!auth) {
      setSession(null);
      return undefined;
    }
    return onAuthStateChanged(auth, (user) => setSession(user ? { user } : null));
  }, []);

  const value = useMemo(
    () => ({
      session,
      async signIn(phone, pin) {
        try {
          await signInWithEmailAndPassword(auth, phoneToEmail(phone), pin);
        } catch (error) {
          if (error.code === 'auth/too-many-requests') {
            throw new Error('Çox cəhd edildi. Bir neçə dəqiqə gözləyin.');
          }
          throw new Error('Telefon nömrəsi və ya PİN yanlışdır.');
        }
      },
      signOut: () => firebaseSignOut(auth),
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
