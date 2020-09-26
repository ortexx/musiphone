const database = {};

/**
 * Open an indexeddb database
 * 
 * @async
 * @returns {object}
 */
export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('musiphone', 1);
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore("songs", { keyPath: 'title' });
    };
  }); 
}

/**
 * Initialize the indexeddb database
 * 
 * @async
 */
export async function initDatabase() {
  database.db = await openDatabase();
}

/**
 * Get the database
 * 
 * @returns {object}
 */
export function getDatabase() {
  return database.db || null;
}

export default database;