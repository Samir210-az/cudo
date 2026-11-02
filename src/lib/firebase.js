import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { normalizePhone } from './format';

const env = import.meta.env;
const projectId = env.VITE_FIREBASE_PROJECT_ID;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : undefined),
  projectId,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const configured = Boolean(config.apiKey && config.projectId && config.appId);

const app = configured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;

const LOGIN_DOMAIN = env.VITE_LOGIN_DOMAIN || 'cudo-klub.vercel.app';
export const phoneToEmail = (phone) => `${normalizePhone(phone)}@${LOGIN_DOMAIN}`;
export const emailToPhone = (email = '') => email.split('@')[0];
