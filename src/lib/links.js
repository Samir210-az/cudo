import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';

const LINKS = 'registrationLinks';

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 28);
}

export const linkUrl = (token) => `${window.location.origin}/qeydiyyat/${token}`;

const withId = (snap) => ({ id: snap.id, ...snap.data() });
const entries = (token) => collection(firestore, LINKS, token, 'athletes');

export async function fetchLink(token) {
  const snap = await getDoc(doc(firestore, LINKS, token));
  if (!snap.exists()) throw new Error('Link etibarsızdır və ya qeydiyyat bağlanıb.');
  return withId(snap);
}

export async function listEntries(token) {
  const snap = await getDocs(entries(token));
  return snap.docs.map(withId).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

export async function saveEntry(token, id, data) {
  if (id) {
    await setDoc(doc(entries(token), id), data);
    return id;
  }
  const ref = await addDoc(entries(token), data);
  return ref.id;
}

export const deleteEntry = (token, id) => deleteDoc(doc(entries(token), id));

export async function listLinks(competitionId) {
  const snap = await getDocs(query(collection(firestore, LINKS), where('competition_id', '==', competitionId)));
  return snap.docs.map(withId).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

export async function createLink(competition, clubName) {
  const token = newToken();
  await setDoc(doc(firestore, LINKS, token), {
    competition_id: competition.id,
    competition_name: competition.name,
    club_name: clubName.trim(),
    active: true,
    created_at: new Date().toISOString(),
  });
  return token;
}

export const setLinkActive = (token, active) => setDoc(doc(firestore, LINKS, token), { active }, { merge: true });

export async function removeLink(token) {
  const snap = await getDocs(entries(token));
  const batch = writeBatch(firestore);
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(firestore, LINKS, token));
  await batch.commit();
}
