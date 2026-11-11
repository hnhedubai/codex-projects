export function createCprofileFirecrawlWorker({
  query,
  fetcher,
  workerId = `cprofile-firecrawl-${process.pid}`,
  leaseSeconds = 180,
  maxConcurrent = 1,
  eventBus = null,
} = {}) {
  let running = false;
  const concurrency = 1;
  const emit = event => eventBus?.publish({ agent: 'CprofileFirecrawlWorker', ...event });
  const companyTypes = new Set(['SOE', 'Private company', 'Public company', 'Government authority', 'Nonprofit', 'Joint venture', 'Subsidiary', 'Unknown']);
  const roleTypes = new Set(['buyer', 'seller', 'investor', 'developer', 'landowner', 'operator', 'supplier', 'offtaker', 'authority', 'utility', 'logistics_provider', 'adviser', 'broker', 'epc_contractor', 'financier', 'manufacturer', 'other']);
  const activityTypes = new Set(['manufacturing', 'trading', 'logistics', 'investment', 'development', 'operations', 'advisory', 'government', 'utility', 'other']);
  const highlightTypes = new Set(['business', 'role', 'project', 'market', 'contact', 'other']);
  const linkTypes = new Set(['website', 'linkedin', 'x', 'facebook', 'youtube', 'instagram', 'registry', 'government_profile', 'other']);
  const text = (value, limit = 2000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  const confidence = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : null;

  async function persistExtracted(companyId, snapshotId, sourceUrl, extracted) {
    if (!extracted || typeof extracted !== 'object') return [];
    const writes = [];
    if (companyTypes.has(extracted.companyType) && extracted.companyType !== 'Unknown') {
      writes.push(query('select * from tracker.set_cprofile_type($1, $2)', [companyId, extracted.companyType]));
    }
    for (const activity of Array.isArray(extracted.activities) ? extracted.activities.slice(0, 30) : []) {
      const activityName = text(activity?.activityName, 300);
      const evidence = text(activity?.evidenceExcerpt, 1000);
      if (!activityName || !evidence || !activityTypes.has(activity?.activityType)) continue;
      writes.push(query('select * from tracker.record_cprofile_activity_observation($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [
        companyId, activity.activityType, activityName, text(activity.productOrService), text(activity.sector, 300), text(activity.geography, 300),
        ['active', 'historical', 'planned', 'unknown'].includes(activity.activityStatus) ? activity.activityStatus : 'unknown',
        ['own_account', 'intermediary', 'agent', 'unclear'].includes(activity.roleContext) ? activity.roleContext : 'unclear',
        text(activity.description, 2000), confidence(activity.confidence), sourceUrl, evidence,
      ]));
    }
    for (const role of Array.isArray(extracted.roles) ? extracted.roles.slice(0, 30) : []) {
      const evidence = text(role?.evidenceExcerpt, 1000);
      if (!evidence || !roleTypes.has(role?.roleType)) continue;
      writes.push(query('select * from tracker.record_cprofile_role_observation($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [
        companyId, role.roleType, 'global', null,
        ['claimed', 'observed', 'verified', 'rejected', 'needs_human_review'].includes(role.roleStatus) ? role.roleStatus : 'observed',
        confidence(role.confidence), sourceUrl, evidence, null, null,
      ]));
    }
    for (const highlight of Array.isArray(extracted.highlights) ? extracted.highlights.slice(0, 30) : []) {
      const highlightText = text(highlight?.highlightText, 1000);
      const evidence = text(highlight?.evidenceExcerpt, 1000);
      if (!highlightText || !evidence || !highlightTypes.has(highlight?.highlightType)) continue;
      writes.push(query('select * from tracker.record_cprofile_highlight($1,$2,$3,$4,$5,$6,$7,$8)', [
        companyId, highlight.highlightType, highlightText, snapshotId, sourceUrl, evidence, confidence(highlight.confidence), 'observed',
      ]));
    }
    for (const person of Array.isArray(extracted.people) ? extracted.people.slice(0, 30) : []) {
      const personName = text(person?.personName, 300);
      const jobTitle = text(person?.jobTitle, 300);
      const evidence = text(person?.evidenceExcerpt, 1000);
      if (!personName || !jobTitle || !evidence) continue;
      writes.push(query('select * from tracker.record_cprofile_person_observation($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [
        companyId, personName, jobTitle, text(person.department, 300), text(person.email, 300), text(person.phone, 300), text(person.linkedinUrl, 1000), snapshotId, sourceUrl, evidence, confidence(person.confidence), 'observed',
      ]));
    }
    for (const link of Array.isArray(extracted.externalLinks) ? extracted.externalLinks.slice(0, 30) : []) {
      const url = text(link?.url, 2000);
      const evidence = text(link?.evidenceExcerpt, 1000);
      if (!url || !evidence || !linkTypes.has(link?.linkType)) continue;
      writes.push(query('select * from tracker.record_cprofile_external_link($1,$2,$3,$4,$5,$6,$7,$8)', [
        companyId, link.linkType, url, 'officially_linked', snapshotId, sourceUrl, evidence, confidence(link.confidence),
      ]));
    }
    return Promise.allSettled(writes);
  }

  async function processJob(job, claimedWorkerId) {
    const providerStartedAt = new Date();
    emit({ phase: 'working', detail: 'Fetching company Markdown from Firecrawl.', companyId: job.company_id, jobId: job.id, operation: 'firecrawl.scrape.markdown' });
    try {
      const fetched = await fetcher.fetchSource({ url: job.source_url, mode: 'company' });
      const providerCompletedAt = new Date();
      const contentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fetched.content));
      const hash = [...new Uint8Array(contentHash)].map(value => value.toString(16).padStart(2, '0')).join('');
      const dbWriteStartedAt = new Date();
      const saved = await query(
        'select * from tracker.complete_cprofile_firecrawl_job($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [job.id, claimedWorkerId, fetched.sourceUrl || job.source_url, fetched.finalUrl || job.canonical_url, fetched.metadata?.requestId || null, hash, fetched.content, fetched.fetchedAt || new Date().toISOString(), fetched.statusCode || 200, JSON.stringify(fetched.metadata || {})],
      );
      const dbWriteCompletedAt = new Date();
      const snapshotId = saved.rows?.[0]?.id || null;
      const extractionResults = await persistExtracted(job.company_id, snapshotId, fetched.finalUrl || job.canonical_url, fetched.extracted);
      const extractionFailures = extractionResults.filter(result => result.status === 'rejected');
      emit({ phase: 'output_saved', detail: 'Company Markdown snapshot persisted.', companyId: job.company_id, jobId: job.id, operation: 'db.complete_cprofile_firecrawl_job' });
      if (extractionFailures.length) emit({ phase: 'partial', detail: `${extractionFailures.length} extracted company facts could not be stored.`, companyId: job.company_id, jobId: job.id, operation: 'db.record_cprofile_extracted_fact' });
      await query('select * from tracker.record_cprofile_firecrawl_task_metrics($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        job.id, job.company_id, providerStartedAt.toISOString(), providerCompletedAt.toISOString(), dbWriteStartedAt.toISOString(), dbWriteCompletedAt.toISOString(), 'completed', null, JSON.stringify({ extractionFailures: extractionFailures.length }),
      ]).catch(() => {});
      return { job, fetched, row: saved.rows?.[0] || null, extractionFailures: extractionFailures.length };
    } catch (error) {
      const safeError = error?.message || 'Firecrawl Markdown fetch failed.';
      const providerCompletedAt = new Date();
      const dbWriteStartedAt = new Date();
      await query(
        'select * from tracker.fail_cprofile_firecrawl_job($1, $2, $3, $4)',
        [job.id, claimedWorkerId, safeError, 300],
      );
      const dbWriteCompletedAt = new Date();
      await query('select * from tracker.record_cprofile_firecrawl_task_metrics($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        job.id, job.company_id, providerStartedAt.toISOString(), providerCompletedAt.toISOString(), dbWriteStartedAt.toISOString(), dbWriteCompletedAt.toISOString(), 'failed', safeError, JSON.stringify({}),
      ]).catch(() => {});
      emit({ phase: 'failed', detail: safeError, companyId: job.company_id, jobId: job.id, operation: 'db.fail_cprofile_firecrawl_job' });
      return { job, error };
    }
  }

  async function runOnce() {
    if (running || !fetcher?.capabilities?.().enabled) return null;
    running = true;
    try {
      await query('select tracker.enqueue_due_cprofile_firecrawl_jobs($1) as enqueued', [1]);
      const jobs = [];
      for (let index = 0; index < concurrency; index += 1) {
        const { rows } = await query(
          'select * from tracker.claim_cprofile_firecrawl_job($1, $2)',
          [`${workerId}-${index + 1}`, leaseSeconds],
        );
        if (!rows?.[0]) break;
        jobs.push({ row: rows[0], claimedWorkerId: `${workerId}-${index + 1}` });
      }
      if (!jobs.length) return null;
      return (await Promise.all(jobs.map(({ row, claimedWorkerId }) => processJob(row, claimedWorkerId)))).filter(Boolean);
    } finally {
      running = false;
    }
  }

  return {
    runOnce,
    kick: runOnce,
    capabilities() { return { enabled: Boolean(fetcher?.capabilities?.().enabled), maxConcurrent: concurrency }; },
  };
}
