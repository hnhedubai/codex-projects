export function createPostgresWorkSignal({ pool, onSignal, reconnectDelayMs = 1000 } = {}) {
  let client = null;
  let reconnectTimer = null;
  let stopped = false;

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelayMs);
    reconnectTimer.unref?.();
  };

  const releaseClient = () => {
    if (!client) return;
    const current = client;
    client = null;
    current.removeAllListeners?.('notification');
    current.removeAllListeners?.('error');
    current.release?.();
  };

  const connect = async () => {
    if (stopped || client) return;
    try {
      const next = await pool.connect();
      if (stopped) {
        next.release?.();
        return;
      }
      client = next;
      next.on?.('notification', notification => {
        if (notification?.channel === 'tracker_work_available') onSignal?.(notification.payload);
      });
      next.on?.('error', () => {
        releaseClient();
        scheduleReconnect();
      });
      await next.query('LISTEN tracker_work_available');
    } catch {
      releaseClient();
      scheduleReconnect();
    }
  };

  return {
    start: connect,
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      releaseClient();
    },
  };
}
