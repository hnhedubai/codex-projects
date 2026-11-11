import './page-shell.js';

const pageStyles = document.createElement('link');
pageStyles.rel = 'stylesheet';
pageStyles.href = '/tracker/official-leads.css';
document.head.append(pageStyles);

const projectSelect = document.querySelector('#leads-project');
const notice = document.querySelector('#leads-notice');
const summary = document.querySelector('#leads-run-summary');
const results = document.querySelector('#official-leads-results');

const api = async (path, options = {}) => {
  const response = await fetch(path, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  if (response.status === 401) { window.location.replace('/auth/login.html'); throw new Error('Please sign in again.'); }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || body.message || 'Request failed');
  return body;
};
const text = (value, fallback = 'Not stated') => String(value || fallback);
const setNotice = (message, error = false) => { notice.textContent = message; notice.className = error ? 'error' : 'success'; };

function renderContacts(contacts, target, candidate) {
  target.replaceChildren(...contacts.map(contact => {
    const item = document.createElement('div'); item.className = 'lead-contact-card';
    const role = document.createElement('strong'); role.textContent = contact.role || 'Authority route';
    const details = document.createElement('p'); details.textContent = [contact.organisation, contact.email, contact.phone].filter(Boolean).join(' - ') || 'No direct email or phone found.';
    const source = document.createElement('a'); source.href = contact.source_url || candidate.url; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = 'View source';
    item.append(role, details, source); return item;
  }));
}

function buildLeadRow(run, candidate, index) {
  const row = document.createElement('tr');
  const number = document.createElement('td'); number.textContent = String(index + 1);
  const lead = document.createElement('td');
  const heading = document.createElement('strong'); heading.textContent = text(candidate.title, 'Official land lead');
  const source = document.createElement('a'); source.href = candidate.url; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = 'Open official source';
  lead.append(heading, source);
  const publisher = document.createElement('td'); publisher.textContent = text(candidate.publisher, 'Official publisher');
  const kind = document.createElement('td'); kind.textContent = candidate.kind === 'area_lead' ? 'Zone lead' : 'Unverified lead';
  const evidence = document.createElement('td'); evidence.textContent = text(candidate.evidenceExcerpt || candidate.summary, 'No excerpt captured yet.');
  const contactsCell = document.createElement('td');
  const contactStatus = document.createElement('p'); contactStatus.className = 'validation-status';
  const contacts = document.createElement('div'); contacts.className = 'lead-contacts';
  contactsCell.append(contactStatus, contacts);
  row.append(number, lead, publisher, kind, evidence, contactsCell);
  contactStatus.textContent = 'AuthorityContactAgent is searching...';
  api('/v1/discovery/contacts', { method: 'POST', body: JSON.stringify({ runId: run.id, index }) })
    .then(data => { contactStatus.textContent = `${data.contacts.length} contact route${data.contacts.length === 1 ? '' : 's'} found.`; renderContacts(data.contacts, contacts, candidate); })
    .catch(error => { contactStatus.textContent = `Contact search unavailable: ${error.message}`; });
  return row;
}

function renderRun(run) {
  summary.replaceChildren(); results.replaceChildren();
  if (!run) { summary.textContent = 'No research runs exist for this project yet. Run a discovery search first.'; return; }
  const title = document.createElement('strong'); title.textContent = `${run.output.length} lead${run.output.length === 1 ? '' : 's'} - ${run.status}`;
  const meta = document.createElement('span'); meta.textContent = `${run.tool === 'exa' ? 'Live Exa search' : 'Saved official-source catalogue'} - ${new Date(run.created_at).toLocaleString()} - ${run.criteria?.targetItLoadMw || '-'} MW target`;
  summary.append(title, meta);
  if (!run.output.length) { results.textContent = run.error || 'This run returned no official land leads.'; return; }
  const wrap = document.createElement('div'); wrap.className = 'leads-table-scroll';
  const table = document.createElement('table'); table.className = 'leads-table';
  table.innerHTML = '<thead><tr><th>#</th><th>Lead / source</th><th>Publisher</th><th>Type</th><th>Evidence excerpt</th><th>Authority contacts</th></tr></thead>';
  const body = document.createElement('tbody'); run.output.forEach((candidate, index) => body.append(buildLeadRow(run, candidate, index)));
  table.append(body); wrap.append(table); results.append(wrap);
}

async function loadRuns() {
  if (!projectSelect.value) return renderRun(null);
  const data = await api(`/v1/discovery?projectId=${encodeURIComponent(projectSelect.value)}`);
  renderRun(data.runs?.[0] || null);
}

async function loadProjects() {
  try {
    const projects = (await api('/v1/projects')).filter(project => project.countryIso2 === 'OM' && project.status === 'active');
    projectSelect.replaceChildren(...projects.map(project => new Option(project.name, project.id)));
    const saved = localStorage.getItem('oman-tracker-active-project');
    if (saved && projects.some(project => project.id === saved)) projectSelect.value = saved;
    if (!projectSelect.value && projects[0]) projectSelect.value = projects[0].id;
    if (!projects.length) { renderRun(null); setNotice('Create an active Oman project first.', true); return; }
    localStorage.setItem('oman-tracker-active-project', projectSelect.value); await loadRuns();
  } catch (error) { setNotice(error.message, true); results.textContent = 'Official leads could not be loaded.'; }
}

projectSelect.addEventListener('change', () => { localStorage.setItem('oman-tracker-active-project', projectSelect.value); loadRuns().catch(error => setNotice(error.message, true)); });
loadProjects();
