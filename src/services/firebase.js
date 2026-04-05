import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, writeBatch, onSnapshot, getDoc, deleteDoc } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAXOAoXKqKdaMXi-Q3KiIeQpgyEQul-ghU",
  authDomain: "mu-accounting.firebaseapp.com",
  projectId: "mu-accounting",
  storageBucket: "mu-accounting.firebasestorage.app",
  messagingSenderId: "1092326885356",
  appId: "1:1092326885356:web:01aa2097783d8e8e07a2c9"
};

export const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function fsGetCol(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  } catch (e) {
    console.error("fsGetCol error:", colName, e);
    return null;
  }
}

export function fsListenCol(colName, cb) {
  return onSnapshot(collection(db, colName), (snap) => {
    const data = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
    cb(data);
  }, (err) => {
    console.error("fsListenCol error:", colName, err);
  });
}

export async function fsGetDoc(colName, id) {
  try {
    const snap = await getDoc(doc(db, colName, id));
    return snap.exists() ? { _docId: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.error("fsGetDoc error:", colName, id, e);
    return null;
  }
}

export async function fsSetDoc(colName, id, data) {
  try {
    const { _docId, ...clean } = data;
    await setDoc(doc(db, colName, id), clean, { merge: true });
    return true;
  } catch (e) {
    console.error("fsSetDoc error:", colName, id, e);
    return false;
  }
}

export async function fsUpdateDoc(colName, id, data) {
  try {
    await updateDoc(doc(db, colName, id), data);
    return true;
  } catch (e) {
    console.error("fsUpdateDoc error:", colName, id, e);
    return false;
  }
}

export async function fsBatchSet(colName, items) {
  try {
    for (let i = 0; i < items.length; i += 450) {
      const batch = writeBatch(db);
      items.slice(i, i + 450).forEach(item => {
        const id = item._docId || item.id;
        if (!id) return;
        const { _docId, ...clean } = item;
        batch.set(doc(db, colName, id), clean, { merge: true });
      });
      await batch.commit();
    }
    return true;
  } catch (e) {
    console.error("fsBatchSet error:", colName, e);
    return false;
  }
}

export async function fsDelDoc(colName, id) {
  try {
    await deleteDoc(doc(db, colName, id));
    return true;
  } catch (e) {
    console.error("fsDelDoc error:", colName, id, e);
    return false;
  }
}

export { db };
