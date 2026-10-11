const DB_NAME = "autocharracter-mvs";
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("searches")) {
        db.createObjectStore("searches", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("characters")) {
        db.createObjectStore("characters", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSearch(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("searches", "readwrite");
    tx.objectStore("searches").add({ ...record, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function recentSearches(limit = 12) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("searches", "readonly");
    const req = tx.objectStore("searches").getAll();
    req.onsuccess = () => {
      const rows = (req.result || []).sort((a, b) => b.savedAt - a.savedAt).slice(0, limit);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheCharacter(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("characters", "readwrite");
    tx.objectStore("characters").put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedCharacter(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("characters", "readonly");
    const req = tx.objectStore("characters").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
