import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';

export const ROOT_CLUB = 'cudo-klub';

export const eq = (field, value) => where(field, '==', value);
export const range = (field, from, to) => [where(field, '>=', from), where(field, '<', to)];
export { where };

const withId = (snap) => ({ id: snap.id, ...snap.data() });
const defined = (data) => Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

let activeClub = null;
export const setActiveClub = (id) => {
  activeClub = id || null;
};

function clubId(club = activeClub) {
  if (!club) throw new Error('Klub seçilməyib.');
  return club;
}

const colRef = (name, club) => collection(firestore, 'clubs', clubId(club), name);
const docRef = (name, id) => doc(firestore, 'clubs', clubId(), name, id);

export async function listFor(club, name, ...constraints) {
  const ref = colRef(name, club);
  const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref);
  return snap.docs.map(withId);
}

export const list = (name, ...constraints) => listFor(activeClub, name, ...constraints);

export async function get(name, id) {
  const snap = await getDoc(docRef(name, id));
  if (!snap.exists()) throw new Error('Qeyd tapılmadı.');
  return withId(snap);
}

export async function add(name, data) {
  const ref = await addDoc(colRef(name), defined(data));
  return ref.id;
}

export async function addMany(name, rows) {
  const batch = writeBatch(firestore);
  rows.forEach((row) => batch.set(doc(colRef(name)), defined(row)));
  await batch.commit();
}

export const update = (name, id, data) => updateDoc(docRef(name, id), defined(data));
export const remove = (name, id) => deleteDoc(docRef(name, id));

export async function removeWhere(name, field, value) {
  const snap = await getDocs(query(colRef(name), eq(field, value)));
  if (snap.empty) return;
  const batch = writeBatch(firestore);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function exists(name, field, value) {
  const rows = await list(name, eq(field, value));
  return rows.length > 0;
}

export const byName = (a, b) =>
  `${a.last_name || a.full_name || ''} ${a.first_name || ''}`.localeCompare(
    `${b.last_name || b.full_name || ''} ${b.first_name || ''}`,
    'az',
  );

export const indexById = (rows) => new Map(rows.map((r) => [r.id, r]));

export async function listClubs() {
  const snap = await getDocs(collection(firestore, 'clubs'));
  return snap.docs
    .map(withId)
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id));
}

export async function getClub(id) {
  const snap = await getDoc(doc(firestore, 'clubs', id));
  return snap.exists() ? withId(snap) : null;
}

export const createClub = (id, data) => setDoc(doc(firestore, 'clubs', id), defined(data));

// Ana klubun ictimai səhifəsi köçürmə tamamlanana qədər köhnə settings/club sənədindən oxuya bilir.
export async function getPublicClub(id) {
  try {
    const club = await getClub(id);
    if (club) return club;
  } catch (error) {
    if (id !== ROOT_CLUB) throw error;
  }
  if (id !== ROOT_CLUB) return null;
  const legacy = await getDoc(doc(firestore, 'settings', 'club'));
  return legacy.exists() ? { id, ...legacy.data() } : null;
}

export const getSettings = async () => (await getClub(clubId())) || {};

export const saveSettings = (data) =>
  setDoc(doc(firestore, 'clubs', clubId()), defined(data), { merge: true });

export const saveScan = (childId, dataUrl) =>
  setDoc(docRef('idScans', childId), { data: dataUrl, saved_at: new Date().toISOString() });

export async function getScan(childId) {
  const snap = await getDoc(docRef('idScans', childId));
  return snap.exists() ? snap.data().data : null;
}

export const removeScan = (childId) => deleteDoc(docRef('idScans', childId));

export async function getAttendance(date) {
  const snap = await getDoc(docRef('attendance', date));
  return snap.exists() ? snap.data().present || [] : null;
}

export const saveAttendance = (date, present) =>
  setDoc(docRef('attendance', date), { date, present, updated_at: new Date().toISOString() });
