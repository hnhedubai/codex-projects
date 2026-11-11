export function createAgentEventBus() {
  const listeners = new Map();
  const globalListeners = new Set();
  const recent = new Map();
  function publish(event) {
    const payload = { status: event.status || event.phase, action: event.action || event.phase, ...event, at: event.at || new Date().toISOString() };
    const history = recent.get(payload.runId) || [];
    recent.set(payload.runId, [...history.slice(-99), payload]);
    for (const listener of listeners.get(payload.runId) || []) listener(payload);
    for (const listener of globalListeners) listener(payload);
  }
  return {
    publish,
    recent(runId) { return recent.get(runId) || []; },
    subscribeAll(listener) { globalListeners.add(listener); return () => globalListeners.delete(listener); },
    subscribe(runId, listener) {
      const set = listeners.get(runId) || new Set();
      set.add(listener); listeners.set(runId, set);
      return () => { set.delete(listener); if (!set.size) listeners.delete(runId); };
    },
  };
}
