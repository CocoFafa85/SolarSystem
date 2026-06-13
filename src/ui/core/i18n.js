// i18n minimal — résout des clés "a.b.c" depuis un dictionnaire chargé async.
// Aucun framework, aucun fallback caché : clé absente -> retourne la clé brute (visible).

let dict = {};
let currentLang = 'fr';

export async function loadLocale(lang = 'fr', baseUrl = 'locales') {
  const res = await fetch(`${baseUrl}/${lang}.json`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`i18n: locale "${lang}" introuvable`);
  dict = await res.json();
  currentLang = lang;
  document.documentElement.lang = lang;
}

export function t(key, vars) {
  const parts = key.split('.');
  let node = dict;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) node = node[p];
    else return key;
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Hydrate tous les éléments `[data-i18n="clé"]` du DOM passé en paramètre. */
export function hydrate(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    // format : "attr:clé,attr:clé"
    const spec = el.getAttribute('data-i18n-attr');
    spec.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

export function getLang() { return currentLang; }
