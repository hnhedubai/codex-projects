const shellStyles = document.createElement('link'); shellStyles.rel = 'stylesheet'; shellStyles.href = '/board/board-shell.css'; document.head.append(shellStyles);
const boardTextFixes = [['\u00e2\u20ac\u00a6','...'],['\u00c2\u00b7',' - '],['\u00e2\u0080\u0094',' - '],['\u00e2\u0086\u0092',' -> '],['\u00c2\u00b2','2'],['\u00e2\u0080\u00b9','<'],['\u00e2\u0080\u00ba','>']];
function normalizeBoardText(){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{let text=node.nodeValue;boardTextFixes.forEach(([bad,good])=>{text=text.split(bad).join(good)});if(text!==node.nodeValue)node.nodeValue=text})}
new MutationObserver(normalizeBoardText).observe(document.body,{childList:true,subtree:true,characterData:true}); normalizeBoardText();
const boardMenuLink = document.querySelector('.board-left-nav a[href="/board"]');
if (boardMenuLink) {
  boardMenuLink.classList.add('agent-board-link');
}
const definitions = [
  ['IntentAgent', 'Normalize the saved requirement'], ['ExaSearchAgent', 'Find official opportunity sources'], ['UniquenessAgent', 'Collapse duplicate URLs and source content'], ['SourceFetchAgent', 'Retrieve one official source at a time'], ['EvidenceExtractionAgent', 'Extract source-backed facts'], ['SiteIdentificationAgent', 'Find site, plot, zone, or coordinates'], ['AllocationAgent', 'Find lease, usufruct, tender, or application route'], ['UtilityEvidenceAgent', 'Gather power, fibre, water, and road evidence'], ['AuthorityContactAgent', 'Find the responsible authority and contact route'], ['ConflictAgent', 'Compare sources and flag contradictions'], ['OpportunityAssemblerAgent', 'Build one complete opportunity record'], ['RankingAgent', 'Rank opportunities against the saved intent'],
];
const labels = { sleeping: 'Sleeping', queued: 'Queued', working: 'Working', complete: 'Complete', blocked: 'Paused', failed: 'Failed' };
let currentRunId = null;
let source = null;
let events = [];
let currentRun = null;
let controlProjectId = null;
let enabledAgents = new Set();
let connectedRunId = null;
let currentIntent = null;
let queueEntries = [];

function api(path, options = {}) {
  return fetch(path, { ...options, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(async response => {
    if (response.status === 401) { location.href = '/auth/login.html'; throw new Error('Sign in required'); }
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Request failed');
    return body;
  });
}
function stateFor(run) {
  const states = Object.fromEntries(definitions.map(([name]) => [name, 'sleeping']));
  if (run) {
    states.IntentAgent = run.status === 'completed' ? 'complete' : run.status === 'failed' ? 'failed' : (enabledAgents.has('IntentAgent') ? 'queued' : 'blocked');
    states.ExaSearchAgent = 'sleeping';
    states.UniquenessAgent = run.status === 'completed' ? 'complete' : 'sleeping';
    states.SourceFetchAgent = run.status === 'completed' ? 'queued' : 'sleeping';
    states.EvidenceExtractionAgent = run.status === 'completed' ? 'queued' : 'sleeping';
  }
  for (const item of events) {
    if (!(item.agent in states)) continue;
    if (['woke', 'working', 'provider_called'].includes(item.phase)) states[item.agent] = 'working';
    if (['output_saved', 'output_staged'].includes(item.phase)) states[item.agent] = 'complete';
    if (item.phase === 'sleeping' && states[item.agent] !== 'complete') states[item.agent] = 'sleeping';
    if (item.phase === 'blocked') states[item.agent] = 'blocked';
    if (item.phase === 'failed') states[item.agent] = 'failed';
    if (item.phase === 'discarded') states[item.agent] = 'blocked';
  }
  return states;
}
function operationFor(name, state) {
  const latest = [...events].reverse().find(item => item.agent === name && item.operation);
  if (latest?.operation?.startsWith('db.')) return 'IDLE';
  if (latest?.operation?.startsWith('exa.')) return 'EXA';
  if (latest?.operation?.startsWith('firecrawl.')) return 'FIRECRAWL';
  if (latest?.operation === 'query_builder') return 'QUERY';
  if (latest?.operation?.startsWith('schema.')) return 'SCHEMA';
  return 'IDLE';
}
function databaseSignalFor(name, state) {
  const latest = [...events].reverse().find(item => item.agent === name && item.operation?.startsWith('db.'));
  if (latest?.operation?.includes('retrieve')) return 'RETRIEVE';
  if (latest?.operation?.includes('record') || latest?.operation?.includes('finish') || latest?.operation?.includes('save') || latest?.operation?.includes('insert') || latest?.operation?.includes('update')) return 'INSERT';
  return 'IDLE';
}
function runCriteria(run) {
  if (run?.criteria && typeof run.criteria === 'object') return run.criteria;
  try { return JSON.parse(run?.criteria || '{}'); } catch { return {}; }
}
function render(run) {
  const states = stateFor(run);
  const grid = document.querySelector('#board-agent-grid');
  grid.replaceChildren(...definitions.map(([name, task]) => {
    const card = document.createElement('article'); card.className = `board-agent-card ${states[name]}`;
    const title = document.createElement('strong'); title.textContent = name;
    const control = document.createElement('label'); control.className = `agent-control ${enabledAgents.has(name) ? 'go' : 'pause'}`; control.title = enabledAgents.has(name) ? 'Go: agent enabled for the next run' : 'Pause: agent will not run or receive a hand-off';
    const radio = document.createElement('input'); radio.type = 'checkbox'; radio.checked = enabledAgents.has(name); radio.setAttribute('role', 'switch'); radio.setAttribute('aria-label', `${name} ${radio.checked ? 'go' : 'pause'}`);
    const controlText = document.createElement('span'); controlText.textContent = radio.checked ? 'GO' : 'PAUSE';
    radio.addEventListener('change', async () => {
      if (!controlProjectId) { radio.checked = false; return; }
      const next = new Set(enabledAgents); if (radio.checked) next.add(name); else next.delete(name);
      radio.disabled = true;
      try {
        const saved = await api('/v1/discovery/agents', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: controlProjectId, enabledAgents: [...next] }) });
        enabledAgents = new Set(saved.enabledAgents); control.className = `agent-control ${enabledAgents.has(name) ? 'go' : 'pause'}`; controlText.textContent = enabledAgents.has(name) ? 'GO' : 'PAUSE'; radio.setAttribute('aria-label', `${name} ${enabledAgents.has(name) ? 'go' : 'pause'}`);
      } catch (error) { radio.checked = enabledAgents.has(name); controlText.textContent = enabledAgents.has(name) ? 'GO' : 'PAUSE'; }
      finally { radio.disabled = false; }
    });
    control.append(radio, controlText);
    const discard = document.createElement('button'); discard.type = 'button'; discard.className = 'agent-discard'; discard.textContent = events.some(item => item.agent === name && item.phase === 'discarded') ? 'DISCARDED' : 'DISCARD'; discard.disabled = !run?.id || discard.textContent === 'DISCARDED'; discard.title = 'Discard this agent operation for the current run';
    discard.addEventListener('click', async () => {
      if (!run?.id || discard.disabled) return;
      discard.disabled = true; discard.textContent = 'DISCARDING…';
      try { await api('/v1/discovery/discard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId: run.id, agent: name }) }); discard.textContent = 'DISCARDED'; }
      catch { discard.disabled = false; discard.textContent = 'DISCARD'; }
    });
    const badge = document.createElement('span'); badge.className = `agent-state ${states[name]}`; badge.textContent = labels[states[name]];
    const dbSignal = databaseSignalFor(name, states[name]);
    const db = document.createElement('span'); db.className = `agent-operation-pill db-pill db-${dbSignal.toLowerCase()}`; db.title = `Database: ${dbSignal.toLowerCase()}`;
    const dbLabel = document.createElement('span'); dbLabel.className = 'db-label'; dbLabel.textContent = 'DB'; db.append(dbLabel);
    const operation = document.createElement('span'); operation.className = `agent-operation-pill operation-${operationFor(name, states[name]).toLowerCase()}`; operation.textContent = operationFor(name, states[name]);
    const detail = document.createElement('small'); detail.textContent = task;
    card.append(title, badge, db, operation, control, discard, detail); return card;
  }));
  const active = Object.values(states).filter(value => value === 'working').length;
  document.querySelector('#board-agent-count').textContent = `${active} active`;
  document.querySelector('#board-event-count').textContent = `${events.length} events`;
  const status = document.querySelector('#board-run-state'); status.textContent = run ? (active ? 'Working' : run.status === 'completed' ? 'Completed' : run.status === 'failed' ? 'Failed' : 'Waiting') : 'Waiting'; status.className = `agent-state ${active ? 'working' : run?.status === 'failed' ? 'queued' : run ? 'complete' : 'sleeping'}`;
}
function renderEvents() {
  const log = document.querySelector('#board-event-log');
  log.replaceChildren(...events.slice(-10).reverse().map(item => {
    const row = document.createElement('div'); row.className = 'board-event';
    const time = document.createElement('time'); time.textContent = new Date(item.at).toLocaleTimeString();
    const copy = document.createElement('div'); const title = document.createElement('strong'); title.textContent = `${item.agent} · ${item.phase.replaceAll('_', ' ')}`;
    const detail = document.createElement('small'); detail.textContent = `${item.action || ''}${item.detail ? ` — ${item.detail}` : ''}${item.operation ? ` · ${item.operation}` : ''}`;
    copy.append(title, detail); row.append(time, copy); return row;
  }));
}
function connect(runId = null) {
  if (source && connectedRunId === runId) return;
  source?.close();
  connectedRunId = runId;
  source = new EventSource(runId ? `/v1/discovery/events?runId=${encodeURIComponent(runId)}` : '/v1/discovery/events');
  source.onmessage = message => { try { const event = JSON.parse(message.data); if (event.phase === 'connected') return; if (currentRunId !== event.runId) { currentRunId = event.runId; events = []; refresh(); } events.push(event); events = events.slice(-30); renderEvents(); render(currentRun); } catch {} };
}
async function refresh() {
  try {
    const projects = await api('/v1/projects');
    const histories = await Promise.all(projects.filter(project => project.countryIso2 === 'OM' && project.status === 'active').map(project => api(`/v1/discovery?projectId=${encodeURIComponent(project.id)}`).then(history => (history.runs || []).map(run => ({ ...run, projectName: project.name })))));
    const runs = histories.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); currentRun = runs[0] || null;
    const nextProjectId = currentRun?.research_project_id || currentRun?.researchProjectId || projects.find(project => project.countryIso2 === 'OM' && project.status === 'active')?.id || null;
    if (nextProjectId && nextProjectId !== controlProjectId) {
      const controls = await api(`/v1/discovery/agents?projectId=${encodeURIComponent(nextProjectId)}`);
      controlProjectId = nextProjectId; enabledAgents = new Set(controls.enabledAgents || []);
    }
    const currentIntentId = currentRun?.intent_id || currentRun?.intentId;
    if (nextProjectId && currentIntentId) {
      const intents = await api(`/v1/intents?researchProjectId=${encodeURIComponent(nextProjectId)}`);
      currentIntent = intents.find(intent => intent.id === currentIntentId) || null;
    } else currentIntent = null;
    queueEntries = nextProjectId ? ((await api(`/v1/discovery/queue?projectId=${encodeURIComponent(nextProjectId)}`)).entries || []) : [];
    if (currentRun?.id && currentRun.id !== currentRunId) {
      currentRunId = currentRun.id;
      events = [];
      connect(currentRun.id);
    }
    const queueStatus = document.querySelector('#board-queue-status');
    if (!queueEntries.length) queueStatus.textContent = 'Queue empty';
    else {
      queueStatus.textContent = `Queue: ${queueEntries.map(entry => `${entry.status === 'running' ? 'current' : 'waiting'} · ${entry.targetItLoadMw} MW · ${entry.region}`).join('  →  ')}`;
    }
    if (currentRun) {
      const displayStatus = currentRun.status === 'running' && enabledAgents.size === 0 ? 'paused' : currentRun.status;
      const headline = currentIntent?.goal || runCriteria(currentRun).goal || runCriteria(currentRun).keywords || 'Research discovery run';
      document.querySelector('#board-run-title').textContent = `${headline} · ${displayStatus}`;
      const criteria = runCriteria(currentRun);
      const target = criteria.targetItLoadMw ?? currentRun.target_it_load_mw;
      const plotArea = criteria.landCriteria?.plotAreaMinSqm ?? criteria.plotAreaMinSqm;
      const criteriaLabel = [target ? `${target} MW` : '', plotArea ? `${plotArea} m² min plot` : ''].filter(Boolean).join(' · ');
      document.querySelector('#board-run-meta').textContent = `${currentRun.projectName || 'Oman'} · ${currentRun.region || 'All Oman'} · ${currentRun.mode || 'search'}${criteriaLabel ? ` · ${criteriaLabel}` : ''} · ${Array.isArray(currentRun.output) ? currentRun.output.length : 0} leads · ${new Date(currentRun.created_at).toLocaleString()}`;
    } else { document.querySelector('#board-run-title').textContent = 'Waiting for a research run'; document.querySelector('#board-run-meta').textContent = 'No run selected'; }
    render(currentRun); renderEvents(); document.querySelector('#board-status').textContent = currentRun ? 'Connected · polling for the latest run' : 'Connected · waiting for a run';
  } catch (error) { document.querySelector('#board-status').textContent = error.message; }
}
document.querySelector('#sign-out').addEventListener('click', async event => { event.currentTarget.disabled = true; await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' }); location.href = '/auth/login.html'; });
connect(); refresh(); setInterval(refresh, 3000);
