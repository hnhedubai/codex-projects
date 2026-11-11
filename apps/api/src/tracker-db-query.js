function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

/**
 * Keep the database connection owner separate from the role used by tracker
 * application queries. The owner opens the connection and SET ROLE is applied
 * once per pooled client, so normal requests keep pool-level performance while
 * direct table access remains unavailable to the application role.
 */
export function createTrackerDatabaseQuery({ pool, role = process.env.TRACKER_DATABASE_ROLE || "tracker_runtime" }) {
  if (!role) return pool.query.bind(pool);

  const configuredClients = new WeakSet();
  const roleStatement = `set role ${quoteIdentifier(role)}`;

  return async function trackerQuery(text, values) {
    const client = await pool.connect();
    try {
      if (!configuredClients.has(client)) {
        await client.query(roleStatement);
        configuredClients.add(client);
      }
      return await client.query(text, values);
    } finally {
      client.release();
    }
  };
}
