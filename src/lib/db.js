import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';

export const eq = (field, value) => where(field, '==', value);
export const range = (field, from, to) => [where(field, '>=', from), where(field, '<', to)];
export { where };

const withId = (snap) => ({ id: snap.id, ...snap.data() });
const defined = (data) => Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

export async function list(name, ...constraints) {
  const ref = collection(firestore, name);
  const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref);
  return snap.docs.map(withId);
}

export async function get(name, id) {
  const snap = await getDoc(doc(firestore, name, id));
  if (!snap.exists()) throw new Error('Qeyd tapılmadı.');
  return withId(snap);
}

export async function add(name, data) {
  const ref = await addDoc(collection(firestore, name), defined(data));
  return ref.id;
}

export async function addMany(name, rows) {
  const batch = writeBatch(firestore);
  rows.forEach((row) => batch.set(doc(collection(firestore, name)), defined(row)));
  await batch.commit();
}

export const update = (name, id, data) => updateDoc(doc(firestore, name, id), defined(data));
export const remove = (name, id) => deleteDoc(doc(firestore, name, id));

export async function removeWhere(name, field, value) {
  const snap = await getDocs(query(collection(firestore, name), eq(field, value)));
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

export async function getSettings() {
  const snap = await getDoc(doc(firestore, 'settings', 'club'));
  return snap.exists() ? snap.data() : {};
}

export const saveSettings = (data) =>
  setDoc(doc(firestore, 'settings', 'club'), defined(data), { merge: true });

export const saveScan = (childId, dataUrl) =>
  setDoc(doc(firestore, 'idScans', childId), { data: dataUrl, saved_at: new Date().toISOString() });

export async function getScan(childId) {
  const snap = await getDoc(doc(firestore, 'idScans', childId));
  return snap.exists() ? snap.data().data : null;
}

export const removeScan = (childId) => deleteDoc(doc(firestore, 'idScans', childId));
