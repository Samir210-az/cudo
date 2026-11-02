import { useEffect, useState } from 'react';

let deferredPrompt = null;
const subscribers = new Set();
const notify = () => subscribers.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function enablePanelApp() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.webmanifest';
    document.head.appendChild(link);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

if (typeof window !== 'undefined' && /^\/(panel|giris)/.test(window.location.pathname)) {
  enablePanelApp();
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function useInstall() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    subscribers.add(update);
    return () => subscribers.delete(update);
  }, []);

  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferredPrompt),
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
    async prompt() {
      if (!deferredPrompt) return 'unavailable';
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      notify();
      return outcome;
    },
  };
}
