import { getPurposeOptions, isCommodityContext } from './purpose-field.js';

const notice = document.querySelector("#notice");
const purposeSelect = document.querySelector('#intent-form [name="landUse"]');
const purposeController = (() => {
  if (!purposeSelect) return { refresh() {}, restore() {}, value(fallback = '') { return fallback; }, isCommodity() { return false; } };
  const label = purposeSelect.closest('label');
  const labelText = [...(label?.childNodes || [])].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (labelText) labelText.textContent = labelText.textContent.replace(/\bLand use\b/g, 'Purpose');
  purposeSelect.setAttribute('aria-label', 'Purpose');
  const landOptions = [...purposeSelect.options].map(option => ({ value: option.value, label: option.textContent }));
  const manualLabel = document.createElement('label');
  manualLabel.className = 'purpose-manual-field';
  manualLabel.hidden = true;
  manualLabel.textContent = 'Custom purpose';
  const manualInput = document.createElement('input');
  manualInput.name = 'purposeManual';
  manualInput.maxLength = 200;
  manualInput.placeholder = 'Enter a purpose';
  manualInput.autocomplete = 'off';
  manualInput.setAttribute('aria-label', 'Custom purpose');
  manualLabel.append(manualInput);
  label?.after(manualLabel);
  let commodity = null;
  function context() {
    const project = document.querySelector('#intent-project')?.selectedOptions?.[0];
    return {
      projectName: project?.textContent || '',
      goal: document.querySelector('#intent-form [name="goal"]')?.value || '',
      sector: document.querySelector('#intent-form [name="sector"]')?.value || '',
    };
  }
  function syncManual() {
    const manual = purposeSelect.value === '__manual__';
    manualLabel.hidden = !manual;
    manualInput.required = manual;
  }
  function refresh({ value, preserveCurrent = true } = {}) {
    const nextCommodity = isCommodityContext(context());
    const modeChanged = commodity !== null && commodity !== nextCommodity;
    const requested = value !== undefined
      ? String(value || '').trim()
      : (modeChanged && !preserveCurrent ? '' : purposeSelect.value);
    commodity = nextCommodity;
    const options = getPurposeOptions({ commodity, landOptions })
      .filter(option => option.value !== 'other');
    purposeSelect.replaceChildren(
      ...options.map(option => new Option(option.label, option.value)),
      new Option('Other / add manually', '__manual__'),
    );
    if (options.some(option => option.value === requested)) {
      purposeSelect.value = requested;
      manualInput.value = '';
    } else if (requested && requested !== '__manual__' && requested !== 'other') {
      purposeSelect.value = '__manual__';
      manualInput.value = requested;
    } else {
      purposeSelect.value = options[0]?.value || '__manual__';
      manualInput.value = '';
    }
    purposeSelect.title = commodity
      ? 'Choose the commercial role for this commodity or product project.'
      : 'Choose the purpose of this project.';
    syncManual();
  }
  purposeSelect.addEventListener('change', syncManual);
  refresh({ preserveCurrent: false });
  return {
    refresh,
    restore(value) { refresh({ value: value ?? '', preserveCurrent: false }); },
    value(fallback = '') {
      return purposeSelect.value === '__manual__' ? manualInput.value.trim() || fallback : purposeSelect.value || fallback;
    },
    isCommodity() { return commodity === true; },
  };
})();
purposeController.refresh({ preserveCurrent: false });
const plotAreaInput = document.querySelector('[name="plotAreaMinSqm"]');
if (plotAreaInput?.parentElement) plotAreaInput.parentElement.firstChild.textContent = 'Minimum plot area (square metres)';
const zoneInput = document.querySelector('#intent-form [name="zone"]');
if (zoneInput) {
  const zoneLabel = zoneInput.closest('label');
  const preset = document.createElement('select');
  preset.name = 'zonePreset';
  preset.innerHTML = '<option value="">Any suitable Oman location</option><option>Muscat / Barka</option><option>Duqm SEZ</option><option>Sohar Freezone</option><option>Khazaen Economic City</option><option>Knowledge Oasis Muscat</option><option>Salalah Free Zone</option><option value="other">Other / enter manually</option>';
  const custom = document.createElement('input');
  custom.name = 'zone'; custom.maxLength = 200; custom.placeholder = 'Enter a zone, city, estate, or plot area'; custom.hidden = true;
  zoneInput.replaceWith(preset, custom);
  const syncZone = () => { const manual = preset.value === 'other'; custom.hidden = !manual; custom.required = manual; if (!manual) custom.value = preset.value; if (manual) custom.value = ''; };
  preset.addEventListener('change', syncZone); syncZone();
}
const savedIntentList = document.querySelector('#intents');
if (savedIntentList && !savedIntentList.previousElementSibling?.classList.contains('saved-intents-label')) {
  const savedLabel = document.createElement('p'); savedLabel.className = 'eyebrow saved-intents-label'; savedLabel.textContent = 'SAVED REQUIREMENTS'; savedIntentList.before(savedLabel);
}
const sectionNav = document.querySelector(".left-nav");
const sidebarStorageKey = "oman-tracker-sidebar";
try {
  const saved = JSON.parse(localStorage.getItem(sidebarStorageKey) || "null");
  if (saved?.width) document.documentElement.style.setProperty("--sidebar-width", `${Math.max(190, Math.min(420, Number(saved.width)))}px`);
  if (saved?.collapsed) sectionNav?.classList.add("sidebar-collapsed");
} catch { /* Browser storage is optional. */ }
const trackerMenu = document.querySelector("#tracker-sidebar");
const dashboardMenuLink = trackerMenu?.querySelector('a[href="/tracker/dashboard.html"]');
const projectsMenuLink = trackerMenu?.querySelector('a[href="/tracker/projects.html"]');
if (dashboardMenuLink && projectsMenuLink) dashboardMenuLink.after(projectsMenuLink);
if (trackerMenu && !trackerMenu.querySelector('a[href="/tracker/official-leads.html"]')) { const leadsLink = document.createElement('a'); leadsLink.href = '/tracker/official-leads.html'; leadsLink.textContent = 'Official leads'; if (projectsMenuLink) projectsMenuLink.after(leadsLink); else trackerMenu.append(leadsLink); }
if (sectionNav && !sectionNav.querySelector('a[href="/board"]')) { const boardLink = document.createElement("a"); boardLink.href = "/board"; boardLink.className = "agent-board-link"; boardLink.textContent = "Agent board"; sectionNav.append(boardLink); }
const sidebarToggle = document.querySelector("#toggle-sidebar");
const sidebarResizer = document.querySelector("#sidebar-resizer");
function saveSidebarState() {
  try { localStorage.setItem(sidebarStorageKey, JSON.stringify({ width: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width")), collapsed: sectionNav?.classList.contains("sidebar-collapsed") })); } catch { /* Ignore storage failures. */ }
}
sidebarToggle?.addEventListener("click", () => {
  sectionNav?.classList.toggle("sidebar-collapsed");
  const expanded = !sectionNav?.classList.contains("sidebar-collapsed");
  sidebarToggle.setAttribute("aria-expanded", String(expanded)); sidebarToggle.title = expanded ? "Hide menu" : "Show menu"; sidebarToggle.textContent = expanded ? "‹" : "›"; saveSidebarState();
});
let resizingSidebar = false;
sidebarResizer?.addEventListener("pointerdown", event => { if (sectionNav?.classList.contains("sidebar-collapsed")) return; resizingSidebar = true; sidebarResizer.setPointerCapture?.(event.pointerId); document.body.classList.add("resizing-sidebar"); });
sidebarResizer?.addEventListener("pointermove", event => { if (!resizingSidebar) return; const width = Math.max(190, Math.min(420, event.clientX)); document.documentElement.style.setProperty("--sidebar-width", `${width}px`); });
sidebarResizer?.addEventListener("pointerup", () => { if (!resizingSidebar) return; resizingSidebar = false; document.body.classList.remove("resizing-sidebar"); saveSidebarState(); });
function syncSectionNav() {
  const hash = window.location.hash || (window.location.pathname.endsWith("/discovery.html") ? "#discovery" : "#workspace");
  const page = hash === "#discovery" ? "discovery" : hash === "#parcels" ? "parcels" : hash === "#project-panel" ? "projects" : hash === "#research-runs" ? "runs" : "dashboard";
  document.querySelector("#workspace")?.setAttribute("data-page", page);
  sectionNav?.querySelectorAll("a").forEach(link => link.classList.toggle("active", link.getAttribute("href") === hash));
}
sectionNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", event => {
  const href = link.getAttribute("href") || "";
  if (href.startsWith("/tracker/") || href === "/board") return;
  event.preventDefault();
  history.pushState({}, "", href);
  syncSectionNav();
  document.querySelector(link.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
}));
window.addEventListener("hashchange", syncSectionNav);
window.addEventListener("popstate", syncSectionNav);
syncSectionNav();
document.documentElement.classList.add("sidebar-ready");
function showNotice(message, error = false) {
  notice.textContent = message;
  notice.className = error ? "error" : "success";
}
async function api(path, options = {}) {
  const { timeoutMs = 20000, ...requestOptions } = options;
  const response = await fetch(path, { ...requestOptions, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (response.status === 401) {
    window.location.replace("/auth/login.html");
    throw new Error("Please sign in again.");
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? body.message ?? "Request failed");
  return body;
}
function record(title, details, badge) {
  const item = document.createElement("article"); item.className = "record";
  const copy = document.createElement("div");
  const heading = document.createElement("h3"); heading.textContent = title;
  const description = document.createElement("p"); description.textContent = details;
  const label = document.createElement("span"); label.textContent = badge;
  copy.append(heading, description); item.append(copy, label); return item;
}
function projectRecord(project) {
  const item = document.createElement("article"); item.className = "record project-record";
  const copy = document.createElement("div");
  const heading = document.createElement("h3"); heading.textContent = project.name;
  const description = document.createElement("p"); description.textContent = `${project.countryIso2} · ${project.id.slice(0, 8)} · ${project.status}`;
  copy.append(heading, description);
  const actions = document.createElement("div"); actions.className = "record-actions";
  const status = document.createElement("span"); status.textContent = project.status;
  const edit = document.createElement("button"); edit.type = "button"; edit.className = "record-action"; edit.textContent = "Edit";
  edit.addEventListener("click", () => {
    const form = document.querySelector("#project-edit-form");
    form.elements.id.value = project.id; form.elements.name.value = project.name; form.elements.countryIso2.value = project.countryIso2;
    form.classList.remove("hidden"); form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "record-action danger"; remove.textContent = "Delete";
  remove.disabled = project.status !== "active";
  remove.title = remove.disabled ? "Only active projects can be deleted here" : "Delete an empty project";
  remove.addEventListener("click", async () => {
    if (!window.confirm(`Delete “${project.name}”? Only an empty project can be deleted.`)) return;
    remove.disabled = true;
    try { await api(`/v1/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" }); showNotice("Research project deleted."); await refresh(); }
    catch (error) { showNotice(error.message, true); remove.disabled = false; }
  });
  actions.append(status, edit, remove); item.append(copy, actions); return item;
}
async function refresh() {
  const [projects, parcels, summary] = await Promise.all([api("/v1/projects"), api("/v1/parcels"), api("/v1/dashboard/summary")]);
  document.querySelector("#project-count")?.replaceChildren(String(summary.projectCount));
  document.querySelector("#parcel-count")?.replaceChildren(String(summary.parcelCount));
  const projectList = document.querySelector("#projects");
  const parcelList = document.querySelector("#parcels-list");
  const selector = document.querySelector("#project-selector");
  const intentSelector = document.querySelector("#intent-project");
  projectList?.replaceChildren(...projects.map(projectRecord));
  parcelList?.replaceChildren(...parcels.map(p => record(p.name, `${p.targetItLoadMw} MW IT load`, p.lifecycleStage.replaceAll("_", " "))));
  selector?.replaceChildren(...projects.map(p => new Option(p.name, p.id)));
  const discoverySelector = document.querySelector('#discovery-project');
  const previousProject = discoverySelector?.value;
  discoverySelector?.replaceChildren(...projects.filter(p => p.countryIso2 === 'OM' && p.status === 'active').map(p => new Option(p.name,p.id)));
  if (discoverySelector && [...discoverySelector.options].some(option => option.value === previousProject)) discoverySelector.value = previousProject;
  const activeProjects = projects.filter(p => p.status === 'active' && p.countryIso2 === 'OM');
  if (discoverySelector && !discoverySelector.value && activeProjects[0]) discoverySelector.value = activeProjects[0].id;
  const previousIntentProject = intentSelector?.value;
  intentSelector?.replaceChildren(...activeProjects.map(p => new Option(p.name, p.id)));
  if (intentSelector && [...intentSelector.options].some(option => option.value === previousIntentProject)) intentSelector.value = previousIntentProject;
  if (intentSelector && !intentSelector.value && activeProjects[0]) intentSelector.value = activeProjects[0].id;
  purposeController.refresh({ preserveCurrent: false });
  if (!projects.length) { if (projectList) projectList.textContent = "Create the Oman workspace to begin parcel screening."; selector?.replaceChildren(new Option("Create a project first", "")); }
  if (!parcels.length && parcelList) parcelList.textContent = "No parcels yet. Add only sites with a target IT load of at least 10 MW.";
  await loadBestIntentProject(activeProjects);
}
for (const kind of ["project", "parcel"]) {
  const form = document.querySelector(`#${kind}-form`);
  if (!form) continue;
  document.querySelector(`#toggle-${kind}`)?.addEventListener("click", () => form.classList.toggle("hidden"));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    if (button.disabled) return;
    button.disabled = true;
    const fields = Object.fromEntries(new FormData(form));
    const payload = kind === "project" ? { name: fields.name, countryIso2: fields.countryIso2.toUpperCase() }
      : { researchProjectId: fields.researchProjectId, name: fields.name, targetItLoadMw: Number(fields.targetItLoadMw) };
    try {
      await api(`/v1/${kind === "project" ? "projects" : "parcels"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      form.reset(); await refresh(); showNotice(kind === "project" ? "Research project created." : "Candidate parcel created.");
    } catch (error) { showNotice(error.message, true); }
    finally { button.disabled = false; }
  });
}
const projectEditForm = document.querySelector("#project-edit-form");
projectEditForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const button = projectEditForm.querySelector("button[type=submit]");
  button.disabled = true;
  const fields = Object.fromEntries(new FormData(projectEditForm));
  try {
    await api(`/v1/projects/${encodeURIComponent(fields.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: fields.name, countryIso2: fields.countryIso2.toUpperCase() }) });
    projectEditForm.classList.add("hidden"); showNotice("Research project updated."); await refresh();
  } catch (error) { showNotice(error.message, true); }
  finally { button.disabled = false; }
});
document.querySelector("#cancel-project-edit")?.addEventListener("click", () => projectEditForm.classList.add("hidden"));
document.querySelector("#sign-out")?.addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try { await api("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); window.location.replace("/auth/login.html"); }
  catch (error) { showNotice(error.message, true); }
  finally { button.disabled = false; }
});
window.addEventListener("pageshow", event => { if (event.persisted) window.location.reload(); });
const discoveryForm = document.querySelector('#discovery-form');
const discoveryStatus = document.querySelector('#discovery-status');
const intentForm = document.querySelector('#intent-form');
const intentSelector = document.querySelector('#intent-project');
const discoveryIntentSelector = document.querySelector('#discovery-intent');
const intentList = document.querySelector('#intents');
let savedIntents = [];
let promotions = [];
let discoveryEvidence = [];
let displayedRun = null;
let historyRequest = 0;
let agentEventSource = null;
let agentEventRunId = null;
const agentLiveStates = {};
let agentEventLog = [];
function post(path,body,options={}) { return api(path,{...options,method:'POST',headers:{'content-type':'application/json',...(options.headers||{})},body:JSON.stringify(body)}); }
const agentDefinitions = [
  ['intent', 'IntentAgent', 'Normalize the saved requirement'],
  ['exa', 'ExaSearchAgent', 'Find official opportunity sources'],
  ['unique', 'UniquenessAgent', 'Collapse duplicate URLs and source content'],
  ['fetch', 'SourceFetchAgent', 'Retrieve one official source at a time'],
  ['extract', 'EvidenceExtractionAgent', 'Extract source-backed facts'],
  ['site', 'SiteIdentificationAgent', 'Find site, plot, zone, or coordinates'],
  ['allocation', 'AllocationAgent', 'Find lease, usufruct, tender, or application route'],
  ['utilities', 'UtilityEvidenceAgent', 'Gather power, fibre, water, and road evidence'],
  ['contact', 'AuthorityContactAgent', 'Find the responsible authority and contact route'],
  ['conflict', 'ConflictAgent', 'Compare sources and flag contradictions'],
  ['assemble', 'OpportunityAssemblerAgent', 'Build one complete opportunity record'],
  ['rank', 'RankingAgent', 'Rank opportunities against the saved intent'],
];
function renderAgentOperations(run) {
  const blocks = document.querySelector('#agent-blocks');
  const inspector = document.querySelector('#agent-inspector');
  const state = document.querySelector('#agent-run-state');
  if (!blocks || !inspector || !state) return;
  const output = run?.output || [];
  const runEvidence = discoveryEvidence.filter(item => item.run_id === run?.id);
  const complete = run?.status === 'completed';
  const extractionComplete = output.length > 0 && runEvidence.length >= output.length;
  const states = {
    intent: run ? 'complete' : 'sleeping', exa: complete ? 'complete' : (run ? 'working' : 'sleeping'),
    unique: complete ? 'complete' : 'sleeping', fetch: complete && !extractionComplete ? 'queued' : (extractionComplete ? 'complete' : 'sleeping'),
    extract: extractionComplete ? 'complete' : (complete ? 'queued' : 'sleeping'), site: extractionComplete ? 'queued' : 'sleeping',
    allocation: 'sleeping', utilities: 'sleeping', contact: 'sleeping', conflict: 'sleeping', assemble: 'sleeping', rank: 'sleeping',
  };
  const labels = { sleeping: 'Sleeping', queued: 'Queued', working: 'Working', complete: 'Complete' };
  for (const [agent, liveState] of Object.entries(agentLiveStates)) {
    const definition = agentDefinitions.find(([, name]) => name === agent);
    if (definition && ['sleeping', 'queued', 'working', 'complete'].includes(liveState)) states[definition[0]] = liveState;
  }
  state.textContent = !run ? 'Waiting' : (complete ? (extractionComplete ? 'Gathering complete' : 'Evidence queued') : 'Run active');
  state.className = `agent-state ${complete && extractionComplete ? 'complete' : (run ? 'working' : 'sleeping')}`;
  blocks.replaceChildren(...agentDefinitions.map(([id, name, task]) => {
    const card = document.createElement('button'); card.type = 'button'; card.dataset.agent = name; card.className = `agent-block agent-${states[id]}`;
    card.innerHTML = `<strong>${name}</strong><span class="agent-block-status">${labels[states[id]]}</span><small>${task}</small>`;
    card.addEventListener('click', () => {
      inspector.replaceChildren();
      const title = document.createElement('strong'); title.textContent = name;
      const status = document.createElement('span'); status.className = `agent-state ${states[id]}`; status.textContent = labels[states[id]];
      const detail = document.createElement('p'); detail.textContent = `${task}. Input: ${id === 'exa' ? 'saved intent and Oman scope' : 'previous agent event'}. Output: ${states[id] === 'complete' ? 'record saved for the next hand-off.' : 'waiting for its wake event.'}`;
      inspector.append(title, status, detail);
    });
    return card;
  }));
  const first = blocks.querySelector('button'); first?.click();
  if (run?.id && agentEventRunId !== run.id) {
    agentEventSource?.close();
    agentEventRunId = run.id;
    agentEventLog = [];
    agentEventSource = new EventSource(`/v1/discovery/events?runId=${encodeURIComponent(run.id)}`);
    agentEventSource.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.phase !== 'connected') {
          agentEventLog = [...agentEventLog.slice(-39), payload];
          const log = document.querySelector('#agent-event-log');
          if (log) {
            log.replaceChildren(...agentEventLog.map(item => {
              const line = document.createElement('div'); line.className = 'agent-event-line';
              const time = document.createElement('time'); time.textContent = new Date(item.at).toLocaleTimeString();
              const agent = document.createElement('strong'); agent.textContent = item.agent;
              const phase = document.createElement('span'); phase.textContent = item.phase.replaceAll('_', ' ');
              const action = document.createElement('span'); action.textContent = item.action || item.phase.replaceAll('_', ' ');
              const detail = document.createElement('small'); detail.textContent = `${item.detail || ''}${item.operation ? ` · ${item.operation}` : ''}${item.recordCount !== undefined ? ` · ${item.recordCount} records` : ''}`;
              line.append(time, agent, phase, action, detail); return line;
            }));
          }
        }
        const state = payload.phase === 'woke' || payload.phase === 'working' || payload.phase === 'provider_called' ? 'working' : payload.phase === 'output_saved' ? 'complete' : payload.phase === 'sleeping' ? 'sleeping' : null;
        if (state && payload.agent !== 'AgentView') {
          agentLiveStates[payload.agent] = state;
          const card = document.querySelector(`[data-agent="${CSS.escape(payload.agent)}"]`);
          if (card) { card.className = `agent-block agent-${state}`; card.querySelector('.agent-block-status').textContent = labels[state]; }
          document.querySelector('#agent-run-state').textContent = `${payload.agent}: ${payload.phase.replaceAll('_', ' ')}`;
        }
      } catch { /* Ignore malformed telemetry; the persisted run remains authoritative. */ }
    };
  }
}
function renderIntents(intents) {
  savedIntents = intents;
  const previousIntent = discoveryIntentSelector.value;
  const intentOptions = [new Option(
    intents.length ? 'Select a saved requirement' : 'Save a requirement first',
    '',
  ), ...intents.map(intent => new Option(
    `${intent.goal} · ${intent.criteria?.targetItLoadMw || '—'} MW`, intent.id,
  ))];
  if (false) intentOptions.push(...intents.map(intent => new Option(
    `${intent.goal} Â· ${intent.criteria?.targetItLoadMw || 'â€”'} MW`, intent.id,
  )));
  discoveryIntentSelector.replaceChildren(...intentOptions);
  if ([...discoveryIntentSelector.options].some(option => option.value === previousIntent)) discoveryIntentSelector.value = previousIntent;
  if (!discoveryIntentSelector.value && intents[0]) discoveryIntentSelector.value = intents[0].id;
  if (intents[0]) {
    intentSelector.value = intents[0].researchProjectId;
    const discoveryProject = document.querySelector('#discovery-project');
    if (discoveryProject) discoveryProject.value = intents[0].researchProjectId;
    discoveryIntentSelector.value = intents[0].id;
  }
  purposeController.restore(intents[0]?.criteria?.landUse);
  syncDiscoveryTarget(intents);
  intentList.replaceChildren(...intents.map(intent => {
    const item = record(
      intent.goal,
      `${intent.geography} · ${intent.sector || 'Unspecified sector'} · ${intent.criteria?.targetItLoadMw || '—'} MW target`,
      `${intent.priority} priority`,
    );
    item.classList.add('saved-intent-card');
    const criteria = intent.criteria || {};
    const detail = document.createElement('small');
    detail.className = 'saved-intent-details';
    detail.textContent = [
      criteria.landUse ? `Purpose: ${criteria.landUse}` : '',
      criteria.zone ? `Area: ${criteria.zone}` : '',
      criteria.plotAreaMinSqm ? `Plot: ${criteria.plotAreaMinSqm.toLocaleString()} m² minimum` : '',
    ].filter(Boolean).join(' · ') || 'No additional site criteria saved';
    item.firstElementChild.append(detail);
    return item;
  }));
  if (!intents.length) intentList.textContent = 'No saved intent for this project yet.';
}
function syncDiscoveryTarget(intents) {
  const selected = intents.find(intent => intent.id === discoveryIntentSelector.value);
  const target = selected?.criteria?.targetItLoadMw;
  if (target !== undefined) document.querySelector('#discovery-form [name=targetItLoadMw]').value = target;
  const criteria = selected?.criteria || {};
  const utilities = Array.isArray(criteria.utilities) && criteria.utilities.length ? criteria.utilities.join(', ') : 'No utility preference saved';
  document.querySelector('#land-requirement-summary').textContent = selected
    ? `Purpose: ${criteria.landUse || 'specified in intent'} · Zone: ${criteria.zone || 'All Oman'} · Minimum area: ${criteria.plotAreaMinSqm ? `${criteria.plotAreaMinSqm} m²` : 'not specified'} · Tenure: ${criteria.tenureRoute || 'any'} · Required evidence: ${utilities}`
    : 'Save a land requirement to populate the structured search criteria.';
  renderQueryPreview();
}
function renderQueryPreview() {
  const preview = document.querySelector('#query-preview');
  if (!preview) return;
  const selected = savedIntents.find(intent => intent.id === discoveryIntentSelector.value);
  const criteria = selected?.criteria || {};
  const tokens = ['Oman', document.querySelector('#discovery-form [name=region]')?.value || 'All Oman', criteria.landUse || 'data centre', criteria.zone, criteria.plotAreaMinSqm ? `${criteria.plotAreaMinSqm} square metre plot` : '', criteria.tenureRoute && criteria.tenureRoute !== 'any' ? criteria.tenureRoute : ''];
  if (Array.isArray(criteria.utilities)) tokens.push(...criteria.utilities.map(value => `${value} infrastructure`));
  tokens.push('land plot site');
  preview.textContent = tokens.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
async function loadIntents(projectId = intentSelector.value) {
  if (!projectId) { intentList.textContent = 'Create an active project before saving an intent.'; return; }
  renderIntents(await api(`/v1/intents?researchProjectId=${encodeURIComponent(projectId)}`));
}
async function loadBestIntentProject(projects) {
  const ordered = [...projects.filter(project => project.id === intentSelector.value), ...projects.filter(project => project.id !== intentSelector.value)];
  for (const project of ordered) {
    const intents = await api(`/v1/intents?researchProjectId=${encodeURIComponent(project.id)}`);
    if (intents.length) {
      intentSelector.value = project.id;
      document.querySelector('#discovery-project').value = project.id;
      purposeController.refresh({ preserveCurrent: false });
      renderIntents(intents);
      return;
    }
  }
  renderIntents([]);
}
function normaliseRun(run) {
  const output = Array.isArray(run.output) ? run.output : (() => { try { return JSON.parse(run.output || '[]'); } catch { return []; } })();
  const criteria = run.criteria && typeof run.criteria === 'object' ? run.criteria : (() => { try { return JSON.parse(run.criteria || '{}'); } catch { return {}; } })();
  return {...run, output, criteria};
}
function renderMinimalRun(run) {
  const output = normaliseRun(run).output;
  const container = document.querySelector('#discovery-results');
  container.replaceChildren();
  if (!output.length) { container.textContent = 'This run returned no matching official sources.'; return; }
  for (const candidate of output) {
    const card = document.createElement('article'); card.className = 'record';
    const title = document.createElement('h3'); title.textContent = candidate.title || 'Official source';
    const summary = document.createElement('p'); summary.textContent = candidate.summary || 'Review this source before identifying a physical parcel.';
    const link = document.createElement('a'); link.className = 'source-link'; link.textContent = 'Open source'; link.href = candidate.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    card.append(title, summary, link); container.append(card);
  }
}
function renderRun(run) {
  run = normaliseRun(run);
  displayedRun = run;
  const container = document.querySelector('#discovery-results');
  container.replaceChildren();
  discoveryStatus.textContent = run.error || `${run.output.length} leads · ${run.tool === 'exa' ? 'Live Exa search' : 'Saved official-source catalogue'} · ${run.criteria.targetItLoadMw} MW target. No hard gates have been cleared.`;
  if (run.status === 'running') discoveryStatus.textContent = 'This run has not completed. If it was interrupted, start a new search.';
  if (run.status === 'completed' && !run.output.length) {
    discoveryStatus.textContent += run.tool === 'official_catalogue'
      ? ' No matching saved source. Use Live web search (Exa) for residential or other land-use intents.'
      : ' No matching official sources were returned. Broaden the area or keywords.';
    return;
  }
  if (!run.output.length) return;
  const wrap = document.createElement('div'); wrap.className = 'results-table-wrap';
  const table = document.createElement('table'); table.className = 'results-table';
  table.innerHTML = '<caption>Official land leads — review each source before promoting a candidate</caption><thead><tr><th scope="col">Rank</th><th scope="col">Source</th><th scope="col">Publisher</th><th scope="col">Evidence excerpt</th><th scope="col">Stage</th><th scope="col">Retrieved</th><th scope="col">Review / action</th></tr></thead>';
  const body = document.createElement('tbody'); table.append(body);
  run.output.forEach((candidate, index) => {
    const row = document.createElement('tr');
    const rank = document.createElement('th'); rank.scope = 'row'; rank.textContent = `#${candidate.rank || index + 1}`; row.append(rank);
    const source = document.createElement('td');
    const title = document.createElement('strong'); title.textContent = candidate.title || 'Untitled source';
    const summary = document.createElement('p'); summary.className = 'table-summary'; summary.textContent = candidate.summary || 'No summary captured.';
    const link = document.createElement('a'); link.href = candidate.url; link.textContent = 'Open source ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    source.append(title, summary, link); row.append(source);
    const publisher = document.createElement('td'); publisher.textContent = candidate.publisher || 'Unknown publisher'; row.append(publisher);
    const evidence = document.createElement('td'); evidence.className = 'table-evidence'; evidence.textContent = candidate.evidenceExcerpt || 'No excerpt captured; open the source and review it.'; row.append(evidence);
    const stage = document.createElement('td'); stage.textContent = candidate.kind === 'area_lead' ? 'Zone lead' : 'Unverified lead'; stage.className = candidate.kind === 'area_lead' ? 'stage-zone' : 'stage-unverified'; row.append(stage);
    const retrieved = document.createElement('td'); retrieved.className = 'result-meta'; retrieved.textContent = candidate.sourceCheckedAt ? `Checked ${candidate.sourceCheckedAt}` : (candidate.retrievedAt ? new Date(candidate.retrievedAt).toLocaleString() : 'Not recorded'); row.append(retrieved);
    const action = document.createElement('td');
    const validateButton = document.createElement('button'); validateButton.type = 'button'; validateButton.className = 'secondary-button'; validateButton.textContent = 'Validate with Firecrawl';
    const validationStatus = document.createElement('p'); validationStatus.className = 'validation-status'; validationStatus.setAttribute('role', 'status');
    action.append(validateButton, validationStatus);
    validateButton.addEventListener('click', async () => {
      if (validateButton.disabled) return;
      validateButton.disabled = true; validationStatus.textContent = 'EvidenceExtractionAgent is validating this source…';
      try {
        const evidence = await post('/v1/discovery/evidence', {runId: run.id, index});
        stage.textContent = 'Evidence extracted'; stage.className = 'stage-validated';
        validationStatus.textContent = evidence.evidenceExcerpt;
        const evidenceDetails = document.createElement('div'); evidenceDetails.className = 'evidence-details';
        const evidenceSummary = document.createElement('summary'); evidenceSummary.textContent = 'View extracted evidence';
        const evidenceText = document.createElement('p'); evidenceText.textContent = `${evidence.pageType} · ${evidence.locationText || 'Location not stated'} · ${evidence.tenureLanguage || 'Tenure not stated'} · ${evidence.infrastructureLanguage || 'Infrastructure not stated'}`;
        evidenceDetails.append(evidenceSummary, evidenceText); action.append(evidenceDetails);
      } catch (error) { validationStatus.textContent = error.message; } finally { validateButton.disabled = false; }
    });
    const promotion = promotions.find(p => p.source_url === candidate.url);
    if (promotion) {
      action.textContent = `Added as parcel ${promotion.parcel_id.slice(0, 8)}. Provenance retained.`;
      action.className = 'table-action-saved';
      row.append(action); body.append(row); return;
    }
    const details = document.createElement('div'); details.className = 'table-details';
    const detailsSummary = document.createElement('summary'); detailsSummary.textContent = 'Identify parcel';
    const form = document.createElement('form');
    for (const [name, labelText, placeholder, maxLength] of [['name', 'Parcel name', 'Actual site name or plot number', 200], ['location', 'Specific location reference', 'Plot number, coordinates or boundary description', 1000]]) {
      const label = document.createElement('label'); label.textContent = labelText;
      const input = document.createElement('input'); input.name = name; input.required = true; input.maxLength = maxLength; input.placeholder = placeholder; if (name === 'location') input.minLength = 5;
      label.append(input); form.append(label);
    }
    const review = document.createElement('label'); const check = document.createElement('input'); check.type = 'checkbox'; check.required = true;
    review.append(check, document.createTextNode('I reviewed the source and identified a physical site.'));
    const button = document.createElement('button'); button.type = 'submit'; button.textContent = 'Add candidate parcel';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    form.append(review, button, status); details.append(detailsSummary, form); action.append(details); row.append(action); body.append(row);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (button.disabled) return; button.disabled = true;
      try {
        const fields = Object.fromEntries(new FormData(form));
        const saved = await post('/v1/discovery/promote', {runId: run.id, index, ...fields});
        promotions.push({source_url: candidate.url, parcel_id: saved.id});
        status.textContent = 'Parcel saved. Refreshing workspace…'; await refresh(); renderRun(run); showNotice('Candidate parcel saved with source provenance. Utility capacity remains unconfirmed.');
      } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
    });
  });
  wrap.append(table); container.append(wrap);
}

function renderRunCards(run) {
  run = normaliseRun(run);
  displayedRun = run;
  const container = document.querySelector('#discovery-results');
  container.replaceChildren();
  discoveryStatus.textContent = run.error || `${run.output.length} leads · ${run.tool === 'exa' ? 'Live Exa search' : 'Saved official-source catalogue'} · ${run.criteria.targetItLoadMw} MW target. No hard gates have been cleared.`;
  if (run.status === 'running') discoveryStatus.textContent = 'This run has not completed. If it was interrupted, start a new search.';
  if (run.status === 'completed' && !run.output.length) discoveryStatus.textContent += run.tool === 'official_catalogue'
    ? ' No matching saved source. This catalogue currently covers Khazaen, Sohar and Duqm economic/free-zone leads; use Live web search (Exa) for residential or other land-use intents.'
    : ' No matching official sources were returned. Broaden the area or keywords.';
  run.output.forEach((candidate,index) => {
    const item = record(`#${candidate.rank || index + 1} ${candidate.title}`,candidate.summary,candidate.kind === 'area_lead' ? 'Area lead' : 'Needs review');
    const copy = item.firstElementChild;
    const link = document.createElement('a'); link.href = candidate.url; link.textContent = 'Open source'; link.title = `Open ${candidate.publisher} source`; link.className = 'source-link'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const provenance = document.createElement('p'); provenance.className = 'result-meta'; provenance.textContent = candidate.sourceCheckedAt ? `Source checked ${candidate.sourceCheckedAt}; catalogue lead.` : `Retrieved ${new Date(candidate.retrievedAt).toLocaleString()}; source content needs review.`;
    const evidence = document.createElement('p'); evidence.className = 'result-evidence'; evidence.textContent = candidate.evidenceExcerpt ? `Evidence excerpt: ${candidate.evidenceExcerpt}` : 'No evidence excerpt captured yet. Open the source and review it.';
    const next = document.createElement('p'); next.className = 'result-next'; next.textContent = 'Next gate: confirm a specific plot, permitted use and availability. Then collect utility, fibre, water, environmental and road evidence.';
    copy.append(link,provenance,evidence,next);
    const promotion = promotions.find(p => p.source_url === candidate.url);
    if (promotion) { const saved = document.createElement('p'); saved.textContent = `Already added as parcel ${promotion.parcel_id.slice(0,8)}. Source and research-run provenance retained.`; copy.append(saved); return; }
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Identify a specific parcel from this lead';
    const form = document.createElement('form');
    for (const [name,labelText,placeholder,maxLength] of [['name','Parcel name','Actual site name or plot number',200],['location','Specific location reference','Plot number, coordinates or boundary description — not just the zone name',1000]]) {
      const label = document.createElement('label'); label.textContent = labelText;
      const input = document.createElement('input'); input.name=name; input.required=true; input.maxLength=maxLength; input.placeholder=placeholder; if(name==='location') input.minLength=5;
      label.append(input); form.append(label);
    }
    const label = document.createElement('label'); const check = document.createElement('input'); check.type='checkbox'; check.required=true;
    label.append(check,document.createTextNode('I reviewed the source and identified a physical site. This is not an availability or power confirmation.'));
    const button = document.createElement('button'); button.type='submit'; button.textContent='Add candidate parcel';
    const status = document.createElement('p'); status.setAttribute('role','status');
    form.append(label,button,status); details.append(summary,form); copy.append(details);
    form.addEventListener('submit',async event => {
      event.preventDefault(); if(button.disabled) return; button.disabled=true;
      try {
        const fields = Object.fromEntries(new FormData(form));
        const saved = await post('/v1/discovery/promote',{runId:run.id,index,...fields});
        promotions.push({source_url:candidate.url,parcel_id:saved.id});
        status.textContent='Parcel saved. Refreshing workspace…'; await refresh(); renderRun(run); showNotice('Candidate parcel saved with source provenance. Utility capacity remains unconfirmed.');
      } catch(error) {status.textContent=error.message;} finally {button.disabled=false;}
    });
  });
}
async function loadHistory() {
  const sequence = ++historyRequest;
  const projectId = document.querySelector('#discovery-project').value;
  if(!projectId) {discoveryStatus.textContent='Create an active Oman research project first.'; return;}
  const result = await api(`/v1/discovery?projectId=${encodeURIComponent(projectId)}`);
  if(sequence !== historyRequest) return;
  promotions=result.promotions;
  discoveryEvidence=result.evidence || [];
  result.runs = result.runs.map(normaliseRun);
  const history = document.querySelector('#discovery-history');
  if (!history) { if (result.runs.length) { renderRun(result.runs[0]); renderAgentOperations(result.runs[0]); } return; }
  history.replaceChildren();
  for(const run of result.runs) {
    const item = record(run.query,`${new Date(run.created_at).toLocaleString()} · ${run.tool} · ${run.output.length} leads`,run.status);
    const button=document.createElement('button');
    button.type='button';
    button.textContent='Open run';
    button.addEventListener('click', () => {
      try {
        renderRun(run);
        renderAgentOperations(run);
        document.querySelector('#discovery-results')?.scrollIntoView({behavior:'smooth',block:'start'});
      } catch (error) {
        console.error('Unable to render discovery run', error);
        renderMinimalRun(run);
        discoveryStatus.textContent = 'This saved run could not be displayed. Start a new official-source search.';
        discoveryStatus.className = 'error';
      }
    });
    const inlineSources = document.createElement('div');
    for (const candidate of run.output) {
      const source = document.createElement('a');
      source.className = 'source-link'; source.textContent = `Open source: ${candidate.title || 'official source'}`;
      source.href = candidate.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
      inlineSources.append(source);
    }
    item.firstElementChild.append(button, inlineSources); history.append(item);
  }
  if(!result.runs.length) history.textContent='No research runs yet.';
  if(result.runs.length) { renderRun(result.runs[0]); renderAgentOperations(result.runs[0]); }
  else {displayedRun=null;document.querySelector('#discovery-results').replaceChildren(); discoveryStatus.textContent='Choose your area and select Find leads.'; renderAgentOperations(null);}
}
document.querySelector('#discovery-project').addEventListener('change',()=>{
  intentSelector.value = document.querySelector('#discovery-project').value;
  purposeController.refresh({ preserveCurrent: false });
  Promise.all([loadHistory(), loadIntents(document.querySelector('#discovery-project').value)]).catch(error=>showNotice(error.message,true));
});
intentSelector.addEventListener('change',()=>{
  document.querySelector('#discovery-project').value = intentSelector.value;
  purposeController.refresh({ preserveCurrent: false });
  Promise.all([loadHistory(), loadIntents()]).catch(error=>showNotice(error.message,true));
});
discoveryIntentSelector.addEventListener('change', async () => {
  const projectId = document.querySelector('#discovery-project').value;
  if (projectId) {
    try { const intents = await api(`/v1/intents?researchProjectId=${encodeURIComponent(projectId)}`); syncDiscoveryTarget(intents); }
    catch (error) { showNotice(error.message, true); }
  }
});
document.querySelector('#discovery-form [name=region]')?.addEventListener('change', renderQueryPreview);
intentForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = intentForm.querySelector('button[type=submit]');
  if (button.disabled) return;
  button.disabled = true;
  const fields = Object.fromEntries(new FormData(intentForm));
  try {
    const purpose = purposeController.value(fields.landUse);
    const utilities = ['powerRequired', 'fibreRequired', 'waterRequired', 'roadsRequired']
      .filter(name => fields[name] === 'on')
      .map(name => ({powerRequired:'power', fibreRequired:'fibre', waterRequired:'water', roadsRequired:'roads'}[name]));
    const createdIntent = await post('/v1/intents', {
      researchProjectId: fields.researchProjectId,
      goal: fields.goal,
      opportunityKind: purposeController.isCommodity()
        ? ({ buyer: 'buyer', seller: 'seller', developer: 'project', investor: 'investor' }[purpose] || 'project')
        : 'land_site',
      geography: fields.geography,
      sector: fields.sector,
      criteria: { targetItLoadMw: Number(fields.targetItLoadMw), landUse: purpose, zone: fields.zone, plotAreaMinSqm: fields.plotAreaMinSqm ? Number(fields.plotAreaMinSqm) : null, tenureRoute: fields.tenureRoute, utilities },
      exclusions: fields.exclusions,
      priority: fields.priority,
    });
    document.querySelector('#discovery-form [name=targetItLoadMw]').value = fields.targetItLoadMw;
    try {
      await loadIntents();
      if (createdIntent?.id && !savedIntents.some(intent => intent.id === createdIntent.id)) {
        renderIntents([createdIntent, ...savedIntents]);
      }
    }
    catch { renderIntents([createdIntent, ...savedIntents]); }
    showNotice('Search intent saved. Discovery can now use this requirement.');
  } catch (error) { showNotice(error.message, true); }
  finally { button.disabled = false; }
});
discoveryForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=discoveryForm.querySelector('button[type=submit]');if(button.disabled)return;
  if (!discoveryIntentSelector.value) { discoveryStatus.textContent='Save a search intent for this project before finding leads.'; document.querySelector('#intent-panel')?.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  button.disabled=true;
  const selectedIntent = savedIntents.find(intent => intent.id === discoveryIntentSelector.value);
  const landCriteria = selectedIntent?.criteria || {targetItLoadMw:Number(document.querySelector('#discovery-form [name=targetItLoadMw]').value)};
  const fields=Object.fromEntries(new FormData(discoveryForm));discoveryStatus.textContent='Finding and saving leads…';
  renderAgentOperations({ id: null, status: 'running', output: [], criteria: landCriteria });
  try {const run=await post('/v1/discovery/search',{...fields,targetItLoadMw:Number(fields.targetItLoadMw),landCriteria},{timeoutMs:650000});await loadHistory();renderRun(run);renderAgentOperations(run);}
  catch(error){discoveryStatus.textContent=error.message;}finally{button.disabled=false;}
});
refresh().then(async()=>{
  const capabilities=await api('/v1/discovery/capabilities');
  document.querySelector('#search-capability').textContent=capabilities.liveSearch ? 'Live Exa search is available. Each click makes one bounded request to official-source domains.' : 'Browse 3 saved official area sources now. Live web search is not configured; it requires EXA_API_KEY on this server.';
  const option=document.querySelector('#live-search-option');option.disabled=!capabilities.liveSearch;if(capabilities.liveSearch) option.textContent='Live web search (Exa)';
  if (capabilities.liveSearch) document.querySelector('#discovery-mode').value = 'exa';
  await loadHistory();showNotice('');
}).catch(error=>showNotice(error.message,true));
setInterval(() => {
  if (document.visibilityState !== 'hidden' && document.querySelector('#discovery-project')?.value) {
    loadHistory().catch(error => showNotice(error.message, true));
  }
}, 15000);
