import { useCallback, useRef } from 'react';

export function useSecretTaps(onUnlock, { taps = 5, windowMs = 4000 } = {}) {
  const stamps = useRef([]);
  return useCallback(() => {
    const now = Date.now();
    stamps.current = [...stamps.current.filter((t) => now - t < windowMs), now];
    if (stamps.current.length >= taps) {
      stamps.current = [];
      onUnlock();
    }
  }, [onUnlock, taps, windowMs]);
}
