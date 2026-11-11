const NEON_API_ROOT = 'https://console.neon.tech/api/v2';

export function createNeonResourceMonitor({
  apiKey = process.env.NEON_API_KEY,
  orgId = process.env.NEON_ORG_ID,
  projectId = process.env.NEON_PROJECT_ID,
  fetchImpl = fetch,
  eventBus = null,
} = {}) {
  const enabled = Boolean(apiKey && orgId && projectId);
  const emit = event => eventBus?.publish({ agent: 'NeonResourceMonitor', ...event });

  async function check() {
    if (!enabled) return { enabled: false, reason: 'Neon monitoring is not configured.' };
    const headers = { accept: 'application/json', authorization: `Bearer ${apiKey}` };
    try {
      const projectResponse = await fetchImpl(`${NEON_API_ROOT}/projects/${encodeURIComponent(projectId)}`, { headers, signal: AbortSignal.timeout(10000) });
      if (!projectResponse.ok) throw new Error(`Neon resource check returned HTTP ${projectResponse.status}.`);
      const project = await projectResponse.json();
      const result = {
        enabled: true,
        projectId,
        status: project?.project?.status || project?.status || 'unknown',
        usage: project?.project?.usage || project?.usage || null,
        checkedAt: new Date().toISOString(),
      };
      emit({ phase: 'resource_check', detail: 'Neon resource check completed.', operation: 'neon.project.read', target: projectId, status: result.status });
      return result;
    } catch (error) {
      const safeError = error?.message || 'Neon resource check failed.';
      emit({ phase: 'failed', detail: safeError, operation: 'neon.project.read', target: projectId });
      return { enabled: true, projectId, error: safeError, checkedAt: new Date().toISOString() };
    }
  }

  return { capabilities() { return { enabled, provider: 'neon', projectId: enabled ? projectId : null }; }, check };
}
