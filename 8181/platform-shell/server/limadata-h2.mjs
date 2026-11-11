import { readFile, writeFile, rename, unlink, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const ENDPOINT = 'https://api.limadata.com/api/v1/find/email_work';
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
let saveQueue = Promise.resolve();

async function persistJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const backup = `${filePath}.${process.pid}.backup`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await writeFile(temp, content, 'utf8');
    try {
      await rename(temp, filePath);
    } catch (error) {
      // Windows may refuse to replace an existing destination with rename().
      // Preserve the old file before using the exact-file fallback.
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
      let hadOriginal = true;
      try { await copyFile(filePath, backup); }
      catch (copyError) {
        if (copyError.code !== 'ENOENT') throw copyError;
        hadOriginal = false;
      }
      try {
        // Direct replacement is the most reliable Windows fallback. The
        // original is already backed up, so a failed write can be restored.
        await writeFile(filePath, content, 'utf8');
      } catch (replaceError) {
        if (hadOriginal) await copyFile(backup, filePath).catch(() => {});
        throw replaceError;
      } finally {
        await unlink(backup).catch(() => {});
      }
    }
  } finally {
    await unlink(temp).catch(() => {});
  }
}

function envValue(text, key) {
  const line = String(text || '').split(/\r?\n/).find((item) => item.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : '';
}

export function normalizeDomain(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  return DOMAIN_RE.test(raw) ? raw : '';
}

export async function loadLimaKey({ root = process.cwd() } = {}) {
  for (const keyName of ['LD_API_KEY', 'LIMADATA_API_KEY']) if (process.env[keyName]?.trim()) return process.env[keyName].trim();
  for (const filePath of [path.join(root, 'apps', 'api', '.env'), path.join(root, '..', 'apps', 'api', '.env')]) {
    try {
      const text = await readFile(filePath, 'utf8');
      for (const keyName of ['LD_API_KEY', 'LIMADATA_API_KEY']) {
        const key = envValue(text, keyName);
        if (key) return key;
      }
    } catch { /* try the next supported local secret location */ }
  }
  return '';
}

export function extractWorkEmail(payload) {
  const candidates = [
    payload?.email,
    payload?.work_email,
    payload?.email_work,
    payload?.data?.email,
    payload?.data?.work_email,
    payload?.data?.email_work,
    payload?.result?.email,
    payload?.result?.work_email,
    payload?.result?.email_work,
  ];
  return candidates.map((value) => String(value || '').trim().toLowerCase()).find((value) => EMAIL_RE.test(value)) || '';
}

export async function findLimaWorkEmail({ fullName, companyDomain, apiKey, fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  const name = String(fullName || '').trim();
  const domain = normalizeDomain(companyDomain);
  if (!name || !domain) throw Object.assign(new Error('fullName and companyDomain are required.'), { status: 422 });
  if (name.length > 160) throw Object.assign(new Error('fullName is too long.'), { status: 422 });
  if (!apiKey) throw Object.assign(new Error('LimaData is not configured. Set LD_API_KEY or LIMADATA_API_KEY on the server.'), { status: 503 });
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller && Number.isFinite(timeoutMs) && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ full_name: name, company_domain: domain }),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    throw Object.assign(new Error(timedOut ? 'LimaData request timed out.' : 'LimaData request could not be completed.'), { status: 502, cause: error });
  } finally {
    if (timer) clearTimeout(timer);
  }
  let payload = null;
  try { payload = await response.json(); } catch (error) {
    if (response.status === 404) return { email: '', payload: null, status: 404, notFound: true, endpoint: ENDPOINT, fullName: name, companyDomain: domain };
    throw Object.assign(new Error(`LimaData returned a non-JSON response (HTTP ${response.status}).`), { status: 502, cause: error });
  }
  if (!response.ok) throw Object.assign(new Error(payload?.message || payload?.error || `LimaData returned HTTP ${response.status}.`), { status: response.status, payload });
  return { email: extractWorkEmail(payload), payload, status: response.status, endpoint: ENDPOINT, fullName: name, companyDomain: domain };
}

export async function saveH2ContactImport({ root, recordId, name, title = '', email, source = ENDPOINT, retrievedAt = new Date().toISOString(), companyDomain = '' } = {}) {
  const cleanRecordId = String(recordId || '').trim();
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanDomain = normalizeDomain(companyDomain);
  if (!cleanRecordId || !cleanName || cleanName.length > 160 || !EMAIL_RE.test(cleanEmail) || (companyDomain && !cleanDomain)) throw Object.assign(new Error('recordId, name, domain and a valid returned email are required.'), { status: 422 });
  const operation = saveQueue.then(async () => {
    const filePath = path.join(root, 'modules', 'h2-projects', 'data', 'contact-imports.json');
    let imports = {};
    try {
      imports = JSON.parse(await readFile(filePath, 'utf8'));
      if (!imports || Array.isArray(imports) || typeof imports !== 'object') throw new Error('Contact import store must be an object.');
    } catch (error) {
      if (error?.code === 'ENOENT') imports = {};
      else throw Object.assign(new Error('Contact import store is invalid; no records were changed.'), { status: 503, cause: error });
    }
    const list = Array.isArray(imports[cleanRecordId]) ? imports[cleanRecordId] : [];
    const index = list.findIndex((item) => String(item.name || '').trim().toLowerCase() === cleanName.toLowerCase() && (!cleanDomain || normalizeDomain(item.companyDomain) === cleanDomain));
    const contact = { name: cleanName, title: String(title || '').trim().slice(0, 160), email: cleanEmail, companyDomain: cleanDomain, lookupKey: `${cleanRecordId}|${cleanName.toLowerCase()}|${cleanDomain}`, emailType: 'LimaData work email found', status: 'LimaData returned a work email; Reoon verification remains separate', source: String(source || ENDPOINT).slice(0, 2000), retrievedAt };
    if (index >= 0) list[index] = { ...list[index], ...contact };
    else list.push(contact);
    imports[cleanRecordId] = list;
    await persistJson(filePath, imports);
    return contact;
  });
  // A failed write must not poison the queue for all later independent saves.
  saveQueue = operation.catch(() => {});
  return operation;
}

export async function findStoredH2ContactImport({ root, recordId, name, companyDomain } = {}) {
  const domain = normalizeDomain(companyDomain);
  if (!recordId || !name || !domain) return null;
  try {
    const imports = JSON.parse(await readFile(path.join(root, 'modules', 'h2-projects', 'data', 'contact-imports.json'), 'utf8'));
    const list = Array.isArray(imports?.[recordId]) ? imports[recordId] : [];
    return list.find((item) => String(item.name || '').trim().toLowerCase() === String(name).trim().toLowerCase() && normalizeDomain(item.companyDomain) === domain) || null;
  } catch { return null; }
}

export function allowedH2LookupDomains(record) {
  const urls = [record?.domainUrl];
  const domains = new Set(urls.map(normalizeDomain).filter(Boolean));
  for (const contact of record?.contacts || []) for (const value of [contact?.email, ...(Array.isArray(contact?.emails) ? contact.emails : [])]) {
    const domain = normalizeDomain(String(value || '').split('@')[1]); if (domain) domains.add(domain);
  }
  return domains;
}

function mergeImportedContact(target, imported) {
  if (!target || !imported) return;
  Object.assign(target, imported, {
    role: target.role,
    linkedin: target.linkedin,
    source: target.source || imported.source,
  });
}

export async function enrichH2Contact({ input = {}, records = [], root, apiKey, lookup = findLimaWorkEmail, register = async () => {} } = {}) {
  const recordId = String(input.recordId || '').trim();
  const name = String(input.name || input.fullName || '').trim();
  const domain = normalizeDomain(input.companyDomain);
  if (!recordId || !name || !String(input.companyDomain || '').trim()) throw Object.assign(new Error('recordId, name/fullName and companyDomain are required before a paid lookup.'), { status: 422 });
  if (!domain) throw Object.assign(new Error('A valid company domain is required before a paid lookup.'), { status: 422 });
  const record = records.find((item) => String(item.id) === recordId);
  if (!record) throw Object.assign(new Error('H2 project record was not found; no lookup was made.'), { status: 404 });
  const knownContact = (record.contacts || []).find((contact) => String(contact.name || '').trim().toLowerCase() === name.toLowerCase());
  if (!knownContact) throw Object.assign(new Error('The named contact is not attached to this H2 project; no lookup was made.'), { status: 422 });
  if (!allowedH2LookupDomains(record).has(domain)) throw Object.assign(new Error('The domain is not an established domain for this H2 project; no lookup was made.'), { status: 422 });
  const cached = await findStoredH2ContactImport({ root, recordId, name, companyDomain: domain });
  if (cached) {
    mergeImportedContact(knownContact, cached);
    await register({ module: '/h2-projects', recordId, name, email: cached.email, source: cached.source, provenance: 'automatic-contact-enrichment' }, [cached.email]);
    return { email: cached.email, status: 200, cached: true, saved: true, contact: cached };
  }
  const result = await lookup({ fullName: input.fullName || name, companyDomain: domain, apiKey });
  if (!result.email) return { email: '', status: result.status, cached: false, saved: false, message: 'LimaData returned no work email; nothing was saved.' };
  const contact = await saveH2ContactImport({ root, recordId, name, title: input.title, email: result.email, companyDomain: domain, source: input.source || result.endpoint });
  mergeImportedContact(knownContact, contact);
  await register({ module: '/h2-projects', recordId, name, email: contact.email, source: contact.source, provenance: 'automatic-contact-enrichment' }, [contact.email]);
  return { email: contact.email, status: result.status, cached: false, saved: true, contact };
}
