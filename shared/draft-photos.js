/* ═══════════════════════════════════════════
   draft-photos.js — persist member-form photos across refresh/quit
   ───────────────────────────────────────────
   Photo File/Blob objects can't be JSON-serialised into localStorage, but
   Blobs store natively in IndexedDB (structured clone). This module keeps the
   *compressed* blobs (one record per slot 0-2) so a returning user gets their
   photos back without re-uploading. All access is guarded with try/catch and
   resolves to safe defaults so IndexedDB being unavailable (private mode,
   quota, old browser) silently degrades to a text-only draft.

   window.draftPhotos = { save, load, clear }
   ═══════════════════════════════════════════ */
(function () {
  var DB_NAME = "linkinhk-member-draft";
  var DB_VERSION = 1;
  var STORE = "photos";

  function openDb() {
    return new Promise(function (resolve, reject) {
      try {
        if (!window.indexedDB) { reject(new Error("no-indexeddb")); return; }
        var req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: "id" });
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error("open-failed")); };
      } catch (err) {
        reject(err);
      }
    });
  }

  function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  // Persist one compressed photo slot. index 0-2; previewDataUrl is the data URL
  // already produced by the form's FileReader (avoids object-URL lifecycle).
  function save(index, file, previewDataUrl) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var store = tx(db, "readwrite");
          store.put({
            id: index,
            blob: file,
            name: file.name,
            type: file.type,
            previewDataUrl: previewDataUrl,
          });
          store.transaction.oncomplete = function () { db.close(); resolve(true); };
          store.transaction.onerror = function () { db.close(); resolve(false); };
        } catch (err) {
          try { db.close(); } catch (e) {}
          resolve(false);
        }
      });
    }).catch(function () { return false; });
  }

  // Returns ordered [{ file, previewDataUrl }] for slots that exist.
  function load() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var store = tx(db, "readonly");
          var req = store.getAll();
          req.onsuccess = function () {
            var rows = (req.result || []).slice().sort(function (a, b) { return a.id - b.id; });
            var items = rows.map(function (r) {
              var file;
              try {
                file = new File([r.blob], r.name || "photo.jpg", { type: r.type || "image/jpeg" });
              } catch (e) {
                file = r.blob; // Some browsers can't reconstruct File from Blob; the Blob is still usable.
              }
              return { file: file, previewDataUrl: r.previewDataUrl };
            });
            db.close();
            resolve(items);
          };
          req.onerror = function () { db.close(); resolve([]); };
        } catch (err) {
          try { db.close(); } catch (e) {}
          resolve([]);
        }
      });
    }).catch(function () { return []; });
  }

  // clear() wipes all slots; clear(index) removes one.
  function clear(index) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var store = tx(db, "readwrite");
          if (typeof index === "number") store.delete(index); else store.clear();
          store.transaction.oncomplete = function () { db.close(); resolve(true); };
          store.transaction.onerror = function () { db.close(); resolve(false); };
        } catch (err) {
          try { db.close(); } catch (e) {}
          resolve(false);
        }
      });
    }).catch(function () { return false; });
  }

  window.draftPhotos = { save: save, load: load, clear: clear };
})();
