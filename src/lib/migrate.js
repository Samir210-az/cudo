import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { ROOT_CLUB } from './db';
import { firestore } from './firebase';

const COLLECTIONS = [
  'children', 'payments', 'expenses', 'staff', 'salaryPayments',
  'attendance', 'competitions', 'competitionEntries', 'idScans',
];
const CHUNK_SIZE = { idScans: 3 };

// Köhnə qeydlər olduğu kimi qalır. Eyni id ilə kopyalanır, ona görə əməliyyatı təkrar işlətmək təhlükəsizdir.
// Klub sənədi ən sonda yazılır: yarımçıq qalarsa quraşdırma ekranı yenidən çıxır.
export async function migrateLegacy(onStep = () => {}) {
  const counts = {};
  for (const name of COLLECTIONS) {
    onStep(name);
    const source = await getDocs(collection(firestore, name));
    const size = CHUNK_SIZE[name] || 300;
    for (let i = 0; i < source.docs.length; i += size) {
      const batch = writeBatch(firestore);
      source.docs.slice(i, i + size).forEach((d) => {
        batch.set(doc(firestore, 'clubs', ROOT_CLUB, name, d.id), d.data());
      });
      await batch.commit();
    }
    const copied = await getDocs(collection(firestore, 'clubs', ROOT_CLUB, name));
    if (copied.size < source.size) {
      throw new Error(`${name}: ${source.size} qeydin yalnız ${copied.size} qədəri köçürüldü.`);
    }
    counts[name] = source.size;
  }

  const legacy = await getDoc(doc(firestore, 'settings', 'club'));
  await setDoc(doc(firestore, 'clubs', ROOT_CLUB), {
    club_name: 'Cüdo Klub',
    ...(legacy.exists() ? legacy.data() : {}),
    created_at: new Date().toISOString(),
  });
  return counts;
}
