// Data + auth layer. Uses Firebase (Firestore + Auth) when configured,
// otherwise a local demo mode backed by localStorage.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, firebaseEnabled } from './firebase.js';
import { podium } from './engine.js';

export const isDemo = !firebaseEnabled;

// Plain usernames are mapped to this email domain, so admins can log in with "moon" instead of an email.
export const USERNAME_DOMAIN = 'efootball.local';
const toEmail = (u) => (u.includes('@') ? u : `${u}@${USERNAME_DOMAIN}`).toLowerCase();
const displayName = (email) => (email || '').replace(`@${USERNAME_DOMAIN}`, '');

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const CONFLICT_MSG = 'Someone else updated this tournament. Loaded the latest version.';

function friendly(e) {
  if (e instanceof ApiError) return e;
  console.error('[firebase]', e);
  const code = e?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-email'))
    return new ApiError('Wrong username or password.', 'AUTH');
  if (code.includes('operation-not-allowed'))
    return new ApiError('Email/Password login is not enabled. Turn it on in Firebase console → Authentication → Sign-in method.', 'AUTH');
  if (code.includes('too-many-requests')) return new ApiError('Too many attempts. Try again in a few minutes.', 'AUTH');
  if (code.includes('permission-denied')) return new ApiError('You do not have permission to do this. Is your account an admin?', 'PERM');
  if (code.includes('unavailable') || code.includes('network')) return new ApiError('Network problem. Check your connection.', 'NET');
  return new ApiError(e?.message || 'Something went wrong.', code);
}

function summary(t) {
  const nameOf = (id) => (id ? t.players.find((p) => p.id === id)?.name || null : null);
  const pod = podium(t);
  return {
    id: t.id,
    name: t.name,
    status: t.status,
    format: t.format || null,
    players: t.players.length,
    champion: nameOf(pod?.championId),
    championId: pod?.championId || null,
    runnerUp: nameOf(pod?.runnerUpId),
    runnerUpId: pod?.runnerUpId || null,
    third: nameOf(pod?.thirdId),
    thirdId: pod?.thirdId || null,
    updatedAt: t.updatedAt,
    version: t.version,
  };
}

// ---------------- Firebase ----------------
const tournamentsCol = () => collection(db, 'tournaments');

const firebaseApi = {
  subscribeList(cb, onErr) {
    const q = query(tournamentsCol(), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => summary(JSON.parse(d.data().data)))),
      (e) => onErr?.(friendly(e))
    );
  },

  subscribeTournament(id, cb, onErr) {
    return onSnapshot(
      doc(db, 'tournaments', id),
      (snap) => {
        // A missing doc in the local cache does not mean it is missing on the server; wait for the server answer
        if (!snap.exists() && snap.metadata.fromCache) return;
        cb(snap.exists() ? JSON.parse(snap.data().data) : null);
      },
      (e) => onErr?.(friendly(e))
    );
  },

  async get(id) {
    const snap = await getDoc(doc(db, 'tournaments', id));
    if (!snap.exists()) throw new ApiError('Tournament not found', 'NOT_FOUND');
    return JSON.parse(snap.data().data);
  },

  async save(t) {
    try {
      return await runTransaction(db, async (tx) => {
        const ref = doc(db, 'tournaments', t.id);
        const snap = await tx.get(ref);
        if (snap.exists() && snap.data().version !== t.version) throw new ApiError(CONFLICT_MSG, 'CONFLICT');
        const saved = { ...t, version: (t.version || 0) + 1, updatedAt: new Date().toISOString() };
        const { id, ...meta } = summary(saved);
        tx.set(ref, { ...meta, data: JSON.stringify(saved) });
        return { version: saved.version, updatedAt: saved.updatedAt };
      });
    } catch (e) {
      throw friendly(e);
    }
  },

  async remove(id) {
    try {
      const photos = await getDocs(query(collection(db, 'photos'), where('tournamentId', '==', id)));
      const batch = writeBatch(db);
      photos.forEach((p) => batch.delete(p.ref));
      batch.delete(doc(db, 'tournaments', id));
      await batch.commit();
    } catch (e) {
      throw friendly(e);
    }
  },

  // Player photos live in their own docs (photos/{tournamentId}_{playerId}) to keep tournament docs small.
  subscribePhotos(tournamentId, cb) {
    return onSnapshot(
      query(collection(db, 'photos'), where('tournamentId', '==', tournamentId)),
      (snap) => cb(Object.fromEntries(snap.docs.map((d) => [d.data().playerId, d.data().dataUrl]))),
      () => cb({})
    );
  },

  subscribePhoto(tournamentId, playerId, cb) {
    return onSnapshot(
      doc(db, 'photos', `${tournamentId}_${playerId}`),
      (snap) => cb(snap.exists() ? snap.data().dataUrl : null),
      () => cb(null)
    );
  },

  async savePhoto(tournamentId, playerId, dataUrl) {
    try {
      await setDoc(doc(db, 'photos', `${tournamentId}_${playerId}`), {
        tournamentId,
        playerId,
        dataUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      throw friendly(e);
    }
  },

  async removePhoto(tournamentId, playerId) {
    try {
      await deleteDoc(doc(db, 'photos', `${tournamentId}_${playerId}`));
    } catch (e) {
      throw friendly(e);
    }
  },

  async login(username, password) {
    try {
      await signInWithEmailAndPassword(auth, toEmail(username.trim()), password);
    } catch (e) {
      throw friendly(e);
    }
  },

  logout: () => signOut(auth),

  // cb receives null or { uid, email, name, isAdmin }
  onAuth(cb) {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return cb(null);
      let isAdmin = false;
      try {
        isAdmin = (await getDoc(doc(db, 'admins', u.uid))).exists();
      } catch {
        isAdmin = false;
      }
      cb({ uid: u.uid, email: u.email, name: displayName(u.email), isAdmin });
    });
  },
};

// ---------------- Demo (localStorage) ----------------
const LS_KEY = 'eft_demo_tournaments';
const LS_AUTH = 'eft_demo_auth';
const listeners = new Set();
const authListeners = new Set();
const later = (fn) => setTimeout(fn, 60);

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
};
const writeAll = (all) => {
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  listeners.forEach((l) => l());
};
const LS_PHOTOS = 'eft_demo_photos';
const readPhotos = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_PHOTOS) || '{}');
  } catch {
    return {};
  }
};
const writePhotos = (photos) => {
  localStorage.setItem(LS_PHOTOS, JSON.stringify(photos));
  listeners.forEach((l) => l());
};
const demoUser = () => (localStorage.getItem(LS_AUTH) ? { uid: 'demo', email: 'admin', name: 'admin', isAdmin: true } : null);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY || e.key === LS_PHOTOS) listeners.forEach((l) => l());
    if (e.key === LS_AUTH) authListeners.forEach((l) => l(demoUser()));
  });
}

const demoApi = {
  subscribeList(cb) {
    const emit = () =>
      cb(Object.values(readAll()).map(summary).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
    listeners.add(emit);
    later(emit);
    return () => listeners.delete(emit);
  },
  subscribeTournament(id, cb) {
    const emit = () => cb(readAll()[id] || null);
    listeners.add(emit);
    later(emit);
    return () => listeners.delete(emit);
  },
  async get(id) {
    const t = readAll()[id];
    if (!t) throw new ApiError('Tournament not found', 'NOT_FOUND');
    return t;
  },
  async save(t) {
    if (!demoUser()) throw new ApiError('Please log in.', 'AUTH');
    const all = readAll();
    const cur = all[t.id];
    if (cur && cur.version !== t.version) throw new ApiError(CONFLICT_MSG, 'CONFLICT');
    const saved = { ...t, version: (t.version || 0) + 1, updatedAt: new Date().toISOString() };
    all[t.id] = saved;
    writeAll(all);
    return { version: saved.version, updatedAt: saved.updatedAt };
  },
  async remove(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
    const photos = readPhotos();
    Object.keys(photos)
      .filter((k) => k.startsWith(`${id}_`))
      .forEach((k) => delete photos[k]);
    writePhotos(photos);
  },
  subscribePhotos(tournamentId, cb) {
    const emit = () => {
      const prefix = `${tournamentId}_`;
      cb(Object.fromEntries(Object.entries(readPhotos()).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v])));
    };
    listeners.add(emit);
    later(emit);
    return () => listeners.delete(emit);
  },
  subscribePhoto(tournamentId, playerId, cb) {
    const emit = () => cb(readPhotos()[`${tournamentId}_${playerId}`] || null);
    listeners.add(emit);
    later(emit);
    return () => listeners.delete(emit);
  },
  async savePhoto(tournamentId, playerId, dataUrl) {
    const photos = readPhotos();
    photos[`${tournamentId}_${playerId}`] = dataUrl;
    writePhotos(photos);
  },
  async removePhoto(tournamentId, playerId) {
    const photos = readPhotos();
    delete photos[`${tournamentId}_${playerId}`];
    writePhotos(photos);
  },
  async login(username, password) {
    if (username.trim() !== 'admin' || password !== 'admin') throw new ApiError('Wrong username or password.', 'AUTH');
    localStorage.setItem(LS_AUTH, '1');
    authListeners.forEach((l) => l(demoUser()));
  },
  async logout() {
    localStorage.removeItem(LS_AUTH);
    authListeners.forEach((l) => l(null));
  },
  onAuth(cb) {
    authListeners.add(cb);
    later(() => cb(demoUser()));
    return () => authListeners.delete(cb);
  },
};

export const api = isDemo ? demoApi : firebaseApi;
