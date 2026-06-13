// EventBus pub/sub minimal, zéro-alloc dans emit (réutilise une copie pré-allouée
// uniquement si la liste change pendant l'itération). Aucune dépendance externe.

const channels = new Map(); // channel -> Set<handler>

export function on(channel, handler) {
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  set.add(handler);
  return () => off(channel, handler);
}

export function off(channel, handler) {
  const set = channels.get(channel);
  if (set) set.delete(handler);
}

export function once(channel, handler) {
  const unsub = on(channel, (payload) => {
    unsub();
    handler(payload);
  });
  return unsub;
}

export function emit(channel, payload) {
  const set = channels.get(channel);
  if (!set || set.size === 0) return;
  // Snapshot uniquement si nécessaire pour tolérer off() pendant l'itération.
  for (const handler of set) {
    try {
      handler(payload);
    } catch (err) {
      // Un abonné défaillant ne doit jamais casser la chaîne.
      console.error(`[eventBus] handler error on "${channel}"`, err);
    }
  }
}

export function clear(channel) {
  if (channel === undefined) channels.clear();
  else channels.delete(channel);
}

export default { on, off, once, emit, clear };
