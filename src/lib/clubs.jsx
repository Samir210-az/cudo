import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ClubSetup from '../components/ClubSetup';
import { ErrorBox, Loader } from '../components/ui';
import { listClubs, setActiveClub } from './db';

const ClubContext = createContext(null);
const STORAGE_KEY = 'cudo.club';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // yaddaş əlçatmazdırsa seçim yalnız bu sessiyada qalır
  }
}

export function ClubProvider({ children }) {
  const [state, setState] = useState({ clubs: null, error: null });
  const [storedId, setStoredId] = useState(readStored);

  const reload = useCallback(async () => {
    try {
      setState({ clubs: await listClubs(), error: null });
    } catch (error) {
      setState({ clubs: null, error });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const { clubs, error } = state;
  const current = clubs?.find((c) => c.id === storedId) || clubs?.[0] || null;
  setActiveClub(current?.id);

  const switchClub = useCallback((id) => {
    writeStored(id);
    setStoredId(id);
  }, []);

  const value = useMemo(() => ({ clubs, current, switchClub, reload }), [clubs, current, switchClub, reload]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!clubs) return <Loader />;
  if (!clubs.length) return <ClubSetup onDone={reload} />;
  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export const useClub = () => useContext(ClubContext);
