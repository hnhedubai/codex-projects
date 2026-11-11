export function createReoonVerificationWorker({ query, verifier, workerId = `reoon-worker-${process.pid}`, leaseSeconds = 180, eventBus = null } = {}) {
  let running = false;

  const emit = (event) => eventBus?.publish({ agent: 'ReoonVerificationWorker', ...event });

  async function runOnce() {
    if (running || !verifier?.capabilities?.().enabled) return null;
    running = true;
    try {
      await query(
        'select tracker.enqueue_due_contact_email_verifications($1) as enqueued',
        [25],
      );
      const { rows } = await query(
        'select * from tracker.claim_contact_email_verification($1, $2)',
        [workerId, leaseSeconds],
      );
      const job = rows?.[0];
      if (!job) return null;

      emit({ phase: 'working', detail: 'Verifying one newly landed contact email with Reoon Power Mode.', contactId: job.contact_id, jobId: job.id, operation: 'reoon.verify.power' });
      try {
        const result = await verifier.verifyPower(job.email_snapshot);
        const saved = await query(
          'select * from tracker.record_contact_email_verification($1, $2, $3)',
          [job.id, workerId, JSON.stringify(result)],
        );
        emit({ phase: 'output_saved', detail: `Reoon returned ${result.status}.`, contactId: job.contact_id, jobId: job.id, status: result.status, operation: 'db.record_contact_email_verification' });
        return { job, result, row: saved.rows?.[0] || null };
      } catch (error) {
        const safeError = error?.message || 'Reoon verification failed.';
        await query(
          'select * from tracker.fail_contact_email_verification($1, $2, $3)',
          [job.id, workerId, safeError],
        );
        emit({ phase: 'failed', detail: safeError, contactId: job.contact_id, jobId: job.id, operation: 'db.fail_contact_email_verification' });
        return { job, error };
      }
    } finally {
      running = false;
    }
  }

  return {
    runOnce,
    kick: runOnce,
  };
}
