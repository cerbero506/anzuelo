/**
 * Anzuelo: historial local (localStorage).
 * Si el navegador bloquea el almacenamiento (modo privado, políticas), usa memoria
 * y la app sigue funcionando; solo se pierde el historial al cerrar la pestaña.
 */
(function (root) {
  'use strict';

  const KEY_HISTORY = 'anzuelo.historial.v1';
  const KEY_ORG = 'anzuelo.dominioOrg.v1';
  const MAX_ITEMS = 50;
  const memory = {};

  function read(key, fallback) {
    try {
      const raw = root.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return key in memory ? memory[key] : fallback;
    }
  }

  function write(key, value) {
    memory[key] = value;
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  const Store = {
    /** @returns {Array<{id: string, date: string, subject: string, sender: string, url?: string, score: number, levelKey: string, levelLabel: string, exposed: boolean, report: string}>} */
    list() {
      const items = read(KEY_HISTORY, []);
      return Array.isArray(items) ? items : [];
    },
    add(entry) {
      const item = Object.assign({ id: String(Date.now()) + Math.random().toString(16).slice(2, 6) }, entry);
      const items = [item].concat(Store.list()).slice(0, MAX_ITEMS);
      return { item, persisted: write(KEY_HISTORY, items) };
    },
    remove(id) {
      write(KEY_HISTORY, Store.list().filter((i) => i.id !== id));
    },
    clear() {
      write(KEY_HISTORY, []);
    },
    getOrgDomain() {
      return read(KEY_ORG, '');
    },
    setOrgDomain(value) {
      write(KEY_ORG, String(value || ''));
    }
  };

  root.AnzueloStore = Store;
})(typeof self !== 'undefined' ? self : this);
