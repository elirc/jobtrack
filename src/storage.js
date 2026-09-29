/**
 * `window.storage` shim.
 *
 * The app is written against an async key-value API that some hosts provide
 * natively. In a plain browser it doesn't exist, so this installs a
 * localStorage-backed implementation with the same contract — including the
 * part the app depends on: **get() rejects when the key is absent.**
 *
 * If the host already provides `window.storage`, this leaves it alone.
 */
export function installStorage(target = typeof window !== "undefined" ? window : globalThis) {
  if (!target || target.storage) return target && target.storage;

  const store = target.localStorage;

  const shim = {
    async get(key) {
      const value = store.getItem(key);
      if (value === null) {
        throw new Error(`storage: no value for key "${key}"`);
      }
      return { key, value };
    },

    async set(key, value) {
      store.setItem(key, String(value));
      return { key, value: String(value) };
    },

    async delete(key) {
      store.removeItem(key);
      return { key };
    },
  };

  target.storage = shim;
  return shim;
}
