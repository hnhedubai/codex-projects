import './page-shell.js';
import { mountPortalViewControls } from './portal-view-controls.js';
import { installPortalResizeDelegation } from './portal-table.js';
mountPortalViewControls();
const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = '/tracker/contacts-clean.css'; document.head.append(sheet);
window.__contactTableEnhanced = true;

const results = document.querySelector('#contacts-results');
const notice = document.querySelector('#contacts-notice');
document.querySelector('#contacts-count')?.remove();
const columns = [['organisation','Organisation'],['person_name','Contact'],['role','Role'],['department','Department'],['email','Email'],['email_verification_status','Email status'],['email_verification_score','Email score'],['phone','Phone'],['contact_type','Type'],['confidence','Confidence'],['verification_status','Source verification'],['evidence_excerpt','Evidence'],['website_url','Website'],['linkedin_url','LinkedIn'],['source_url','Source'],['rank','Rank'],['created_at','Created'],['email_verification_checked_at','Checked'],['email_next_verification_at','Next check']];
const prefsKey = 'oman-tracker-contact-table-preferences-v1';
const pagesKey = 'oman-tracker-contact-pages-v1';
const keys = columns.map(([key]) => key);
const defaults = { order: keys, visible: keys, widths: {}, favorites: [], pinned: [], sortKey: null, sortDirection: 'asc', pageSize: 25, page: 1 };
let prefs = loadPrefs();
let pages = loadPages();
let totalCount = 0;
let currentRows = [];
let loadSequence = 0;
let liveEventSource = null;
let liveReconnectTimer = null;
let syncToken = null;
let syncPollTimer = null;
let syncPollBusy = false;
let canForceReverify = false;

installPortalResizeDelegation({ prefs, onResize: applyWidths, onCommit: savePrefs });

const allowedPageSizes = new Set([25, 50, 100, 200, 500]);
if (!allowedPageSizes.has(prefs.pageSize)) {
  prefs.pageSize = 25;
  savePrefs();
}
if (!prefs.pinnedRows || typeof prefs.pinnedRows !== 'object' || Array.isArray(prefs.pinnedRows)) {
  prefs.pinnedRows = {};
}
document.querySelector('[data-view="list"]')?.remove();
const pageSizeObserver = new MutationObserver(() => {
  document.querySelectorAll('.contacts-pagination select option').forEach(option => {
    if (!allowedPageSizes.has(Number(option.value))) option.remove();
  });
});
pageSizeObserver.observe(results, { childList: true, subtree: true });

function rememberPinnedRows() {
  for (const row of currentRows) {
    const id = idOf(row);
    if (prefs.pinned.includes(id)) prefs.pinnedRows[id] = row;
  }
  savePrefs();
}

function rowsWithPinnedFirst() {
  rememberPinnedRows();
  const pinnedRows = prefs.pinned
    .map(id => prefs.pinnedRows[id])
    .filter(Boolean);
  const pinnedIds = new Set(pinnedRows.map(idOf));
  const unpinnedRows = currentRows.filter(row => !pinnedIds.has(idOf(row)));
  if (prefs.page !== 1) return unpinnedRows;
  return [...pinnedRows, ...unpinnedRows.slice(0, Math.max(0, prefs.pageSize - pinnedRows.length))];
}

function loadPrefs() { try { const saved = JSON.parse(localStorage.getItem(prefsKey) || 'null'); if (!saved) return {...defaults}; const order = (saved.order || []).filter(key => keys.includes(key)); const savedVisible = Array.isArray(saved.visible) ? saved.visible : keys; const visible = [...savedVisible, 'email_verification_status'].filter((key, index, list) => keys.includes(key) && list.indexOf(key) === index); return {...defaults, ...saved, order: [...order, ...keys.filter(key => !order.includes(key))], visible: visible.length ? visible : keys, pageSize: [25,50,100,200,500].includes(Number(saved.pageSize)) ? Number(saved.pageSize) : 25, page: 1}; } catch { return {...defaults}; } }
function loadPages() { try { const saved = JSON.parse(localStorage.getItem(pagesKey) || 'null'); return saved?.pages && typeof saved.pages === 'object' ? saved.pages : {}; } catch { return {}; } }
function savePrefs() { try { localStorage.setItem(prefsKey, JSON.stringify(prefs)); } catch {} }
function savePages() { try { localStorage.setItem(pagesKey, JSON.stringify({ pages })); } catch {} }
function pageKey() { return [prefs.pageSize, prefs.page, prefs.sortKey || 'created_at', prefs.sortDirection].join(':'); }
function label(key) { return columns.find(([candidate]) => candidate === key)?.[1] || key; }
function value(input) { return input === null || input === undefined || input === '' ? '-' : String(input); }
function idOf(row) { return [row.id, row.run_id, row.result_index, row.organisation, row.person_name, row.email].map(value => String(value || '').trim().toLowerCase()).join('\u001f'); }
function has(kind, id) { return prefs[kind].includes(id); }
function saveToggle(kind, id) { prefs[kind] = has(kind, id) ? prefs[kind].filter(value => value !== id) : [...prefs[kind], id]; savePrefs(); }
function escapeUrl(url) { return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : ''; }
function addLink(cell, url) { const safe = escapeUrl(url); if (!safe) { cell.textContent = '-'; return; } const link = document.createElement('a'); link.href = safe; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open'; cell.append(link); }
function emailVerificationBadge(row) {
  const status = row.email_verification_status;
  const badge = document.createElement('span');
  badge.className = `email-verification-badge email-verification-${status || 'pending'}`;
  const labels = { safe: 'Safe', role_account: 'Role', catch_all: 'Catch-all', inbox_full: 'Inbox full', unknown: 'Unknown', invalid: 'Invalid', disabled: 'Disabled', disposable: 'Disposable', spamtrap: 'Spamtrap' };
  const label = labels[status] || (row.email ? 'Pending' : 'No email');
  badge.textContent = label;
  const checked = row.email_verification_checked_at ? new Date(row.email_verification_checked_at).toLocaleString() : 'Not checked';
  const next = row.email_next_verification_at ? new Date(row.email_next_verification_at).toLocaleString() : 'No automatic re-check';
  const score = row.email_verification_score === null || row.email_verification_score === undefined ? '' : `; Score: ${row.email_verification_score}`;
  badge.title = `${label}; Checked: ${checked}; Next: ${next}${score}`;
  badge.setAttribute('aria-label', badge.title);
  return badge;
}
async function forceReverify(contactId) { const reason = window.prompt('Reason for forced email re-verification:'); if (!reason?.trim()) return; const response = await fetch('/v1/discovery/contacts/reverify', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000), body: JSON.stringify({ contactId, reason: reason.trim() }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Re-verification could not be queued.'); pages = {}; savePages(); await loadPage(true); }
function action(text, icon, className, pressed, handler) { const button = document.createElement('button'); button.type = 'button'; button.className = `contact-table-action ${className}`; button.textContent = icon; button.title = text; button.setAttribute('aria-label', text); button.setAttribute('aria-pressed', String(pressed)); button.addEventListener('click', handler); return button; }
function resizeHandle(th, key) { const handle = document.createElement('span'); handle.className = 'contact-column-resizer'; handle.title = `Drag to resize ${key === '__actions__' ? 'Actions' : label(key)} column`; handle.setAttribute('role', 'separator'); handle.setAttribute('aria-label', handle.title); handle.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); handle.setPointerCapture?.(event.pointerId); const startX = event.clientX; const startWidth = th.getBoundingClientRect().width; const move = moveEvent => { prefs.widths[key] = Math.max(key === '__actions__' ? 64 : 90, Math.round(startWidth + moveEvent.clientX - startX)); applyWidths(); }; const stop = () => { handle.releasePointerCapture?.(event.pointerId); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', stop); savePrefs(); }; handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', stop); }); return handle; }
function applyWidths() { const table = document.querySelector('.contacts-table'); if (!table) return; let total = prefs.widths.__actions__ || 82; table.querySelectorAll('col[data-column]').forEach(col => { const width = prefs.widths[col.dataset.column] || 170; col.style.width = `${width}px`; col.style.minWidth = `${width}px`; total += width; }); table.style.width = `${total}px`; table.style.minWidth = `${total}px`; const actionCol = table.querySelector('.contact-actions-column'); if (actionCol) { actionCol.style.width = `${prefs.widths.__actions__ || 82}px`; actionCol.style.minWidth = actionCol.style.width; } }
function picker() { let manager = document.querySelector('#contact-column-manager'); if (!manager) { manager = document.createElement('details'); manager.id = 'contact-column-manager'; manager.className = 'table-column-manager'; const summary = document.createElement('summary'); summary.textContent = '⚙'; summary.title = 'Manage columns'; summary.setAttribute('aria-label', 'Manage contact table columns'); manager.append(summary, document.createElement('div')); manager.lastChild.className = 'table-column-options'; document.querySelector('.contacts-panel .panel-heading')?.append(manager); } const options = manager.querySelector('.table-column-options'); options.replaceChildren(); prefs.order.forEach(key => { const item = document.createElement('label'); item.className = 'table-column-option'; item.draggable = true; item.dataset.column = key; item.title = `Drag to reorder ${label(key)}`; const handle = document.createElement('span'); handle.className = 'column-drag-handle'; handle.textContent = '⋮⋮'; handle.setAttribute('aria-hidden', 'true'); const input = document.createElement('input'); input.type = 'checkbox'; input.checked = prefs.visible.includes(key); input.addEventListener('change', () => { const next = new Set(prefs.visible); input.checked ? next.add(key) : next.delete(key); if (!next.size) { input.checked = true; notice.textContent = 'At least one column must remain visible.'; return; } prefs.visible = prefs.order.filter(candidate => next.has(candidate)); savePrefs(); renderTable(); }); item.append(handle, input, document.createTextNode(label(key))); item.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', key)); item.addEventListener('dragover', event => { event.preventDefault(); item.classList.add('drop-target'); }); item.addEventListener('dragleave', () => item.classList.remove('drop-target')); item.addEventListener('drop', event => { event.preventDefault(); item.classList.remove('drop-target'); const dragged = event.dataTransfer.getData('text/plain'); const from = prefs.order.indexOf(dragged); const to = prefs.order.indexOf(key); if (from >= 0 && to >= 0 && from !== to) { prefs.order.splice(from, 1); prefs.order.splice(to, 0, dragged); prefs.visible = prefs.order.filter(candidate => prefs.visible.includes(candidate)); savePrefs(); renderTable(); } }); options.append(item); }); }
function renderPagination() { document.querySelector('.contacts-pagination')?.remove(); const pageCount = Math.max(1, Math.ceil(totalCount / prefs.pageSize)); const pagination = document.createElement('div'); pagination.className = 'contacts-pagination'; const labelEl = document.createElement('label'); labelEl.textContent = 'Rows'; const select = document.createElement('select'); [25,50,100,200,500].forEach(size => { const option = new Option(size, size, false, size === prefs.pageSize); select.append(option); }); select.setAttribute('aria-label', 'Rows per page'); select.addEventListener('change', () => { prefs.pageSize = Number(select.value); prefs.page = 1; savePrefs(); loadPage(); }); labelEl.append(select); const summary = document.createElement('span'); summary.className = 'contacts-page-summary'; const start = totalCount ? ((prefs.page - 1) * prefs.pageSize) + 1 : 0; summary.textContent = totalCount ? `Showing ${start}-${Math.min(start + prefs.pageSize - 1, totalCount)} of ${totalCount}` : 'No records'; const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '\u2039'; previous.title = 'Previous page'; previous.setAttribute('aria-label', 'Previous page'); previous.disabled = prefs.page <= 1; previous.addEventListener('click', () => { prefs.page--; loadPage(); }); const next = document.createElement('button'); next.type = 'button'; next.textContent = '\u203a'; next.title = 'Next page'; next.setAttribute('aria-label', 'Next page'); next.disabled = prefs.page >= pageCount; next.addEventListener('click', () => { prefs.page++; loadPage(); }); pagination.append(labelEl, summary, previous, next); results.append(pagination); }
function renderTable() { results.querySelector('.contacts-pagination')?.remove(); results.querySelector('.contacts-table-wrap')?.remove(); if (!currentRows.length) { results.prepend(Object.assign(document.createElement('p'), {textContent: 'No contact records found.'})); renderPagination(); return; } picker(); const visible = new Set(prefs.visible); const table = document.createElement('table'); table.className = 'contacts-table'; table.setAttribute('aria-label', 'Oman tracker contact profiles'); const group = document.createElement('colgroup'); const actionCol = document.createElement('col'); actionCol.className = 'contact-actions-column'; group.append(actionCol); prefs.order.forEach(key => { const col = document.createElement('col'); col.dataset.column = key; col.classList.toggle('column-hidden', !visible.has(key)); group.append(col); }); table.append(group); const head = document.createElement('thead'); const headRow = document.createElement('tr'); const actionHead = document.createElement('th'); actionHead.textContent = 'Actions'; actionHead.append(resizeHandle(actionHead, '__actions__')); headRow.append(actionHead); prefs.order.forEach(key => { const th = document.createElement('th'); th.dataset.column = key; th.classList.toggle('column-hidden', !visible.has(key)); const sort = document.createElement('button'); sort.type = 'button'; sort.className = 'contact-sort-button'; sort.textContent = `${label(key)}${prefs.sortKey === key ? (prefs.sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}`; sort.setAttribute('aria-label', `Sort by ${label(key)}`); sort.addEventListener('click', () => { prefs.sortDirection = prefs.sortKey === key && prefs.sortDirection === 'asc' ? 'desc' : 'asc'; prefs.sortKey = key; prefs.page = 1; savePrefs(); loadPage(true); }); th.append(sort, resizeHandle(th, key)); headRow.append(th); }); head.append(headRow); table.append(head); const body = document.createElement('tbody'); currentRows.forEach(rowData => { const id = idOf(rowData); const row = document.createElement('tr'); row.classList.toggle('is-pinned', has('pinned', id)); row.classList.toggle('is-favorite', has('favorites', id)); const actions = document.createElement('td'); actions.className = 'contact-row-actions'; actions.append(action(has('favorites', id) ? 'Remove favorite' : 'Favorite contact', has('favorites', id) ? '★' : '☆', 'favorite-contact', has('favorites', id), () => { saveToggle('favorites', id); renderTable(); }), action(has('pinned', id) ? 'Unpin contact' : 'Pin contact to top', has('pinned', id) ? '📌' : '📍', 'pin-contact', has('pinned', id), () => { saveToggle('pinned', id); currentRows.sort((a, b) => Number(has('pinned', idOf(b))) - Number(has('pinned', idOf(a)))); renderTable(); })); if (canForceReverify && rowData.email) actions.append(action('Force email re-verification', '↻', 'reverify-contact', false, () => { forceReverify(rowData.id).catch(error => { notice.textContent = error.message; }); })); row.append(actions); prefs.order.forEach(key => { const cell = document.createElement('td'); cell.dataset.column = key; cell.classList.toggle('column-hidden', !visible.has(key)); if (key === 'email_verification_status') cell.append(emailVerificationBadge(rowData)); else if (['website_url','linkedin_url','source_url'].includes(key)) addLink(cell, rowData[key]); else cell.textContent = value(rowData[key]); if (cell.textContent.length > 24) cell.title = cell.textContent; row.append(cell); }); body.append(row); }); table.append(body); const wrap = document.createElement('div'); wrap.className = 'contacts-table-wrap'; wrap.append(table); results.prepend(wrap); applyWidths(); renderPagination(); }
async function loadPage(force = false) {
  const requestSequence = ++loadSequence;
  const key = pageKey();
  const cached = pages[key];
  if (!force && cached?.contacts) {
    currentRows = cached.contacts;
    totalCount = cached.totalCount;
    syncToken = cached.syncToken || null;
    notice.textContent = '';
    renderTable();
    return;
  }

  const query = new URL('/v1/discovery/contacts', window.location.origin);
  query.searchParams.set('limit', prefs.pageSize);
  query.searchParams.set('offset', (prefs.page - 1) * prefs.pageSize);
  if (prefs.sortKey) {
    query.searchParams.set('sortKey', prefs.sortKey);
    query.searchParams.set('sortDirection', prefs.sortDirection);
  }

  notice.textContent = 'Loading contacts...';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(query, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (requestSequence !== loadSequence) return;
    if (!response.ok) throw new Error(data.error || 'Contacts could not be loaded.');

    currentRows = data.contacts || [];
    totalCount = Number(data.totalCount || currentRows.length);
    syncToken = data.syncToken || null;
    pages[key] = { contacts: currentRows, totalCount, syncToken, savedAt: new Date().toISOString() };
    savePages();
    notice.textContent = '';
    renderTable();
  } catch (error) {
    if (requestSequence !== loadSequence) return;
    notice.textContent = error.name === 'AbortError'
      ? 'Contacts took too long to load. Please retry.'
      : error.message || 'Contacts could not be loaded. Please retry.';
    if (cached?.contacts) {
      currentRows = cached.contacts;
      totalCount = cached.totalCount;
      syncToken = cached.syncToken || null;
      renderTable();
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
function handleLiveContactEvent(payload) { if (!payload || !['db.record_discovery_contacts', 'db.record_discovery_contact'].includes(payload.operation)) return; pages = {}; syncToken = null; savePages(); loadPage(true); }
const renderTableBase = renderTable;
renderTable = () => {
  document.querySelector('.contacts-pinned-label')?.remove();
  const rowsBeforePinning = currentRows;
  currentRows = rowsWithPinnedFirst();
  renderTableBase();
  if (prefs.page === 1 && prefs.pinned.some(id => prefs.pinnedRows[id])) {
    const label = document.createElement('div');
    label.className = 'contacts-pinned-label';
    label.textContent = 'Pinned contacts';
    results.querySelector('.contacts-table-wrap')?.before(label);
  }
  currentRows = rowsBeforePinning;
};
async function pollContactSync() { if (syncPollBusy || document.hidden) return; syncPollBusy = true; try { const response = await fetch('/v1/discovery/contacts/version', {credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000)}); const state = await response.json(); if (!response.ok || !state.syncToken) return; if (syncToken === null || state.syncToken !== syncToken) { const shouldReload = syncToken !== null || currentRows.length > 0; syncToken = state.syncToken; if (shouldReload) { pages = {}; savePages(); loadPage(true); } } } catch {} finally { syncPollBusy = false; } }
function startContactSyncPolling() { clearInterval(syncPollTimer); syncPollTimer = setInterval(pollContactSync, 15000); pollContactSync(); }
function connectLiveUpdates() { if (typeof EventSource === 'undefined') return; liveEventSource?.close(); liveEventSource = new EventSource('/v1/discovery/events'); liveEventSource.onmessage = event => { try { handleLiveContactEvent(JSON.parse(event.data)); } catch {} }; liveEventSource.onerror = () => { liveEventSource?.close(); liveEventSource = null; clearTimeout(liveReconnectTimer); liveReconnectTimer = setTimeout(connectLiveUpdates, 10000); }; }
const viewIcons = {table: ['▦', 'Table view'], kanban: ['▤', 'Kanban view'], list: ['☷', 'List view']}; document.querySelectorAll('[data-view]').forEach(control => { const [icon, labelText] = viewIcons[control.dataset.view] || [control.textContent, control.textContent]; control.textContent = icon; control.setAttribute('aria-label', labelText); control.title = labelText; control.addEventListener('click', () => { document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === control)); if (control.dataset.view !== 'table') { results.replaceChildren(); const grid = document.createElement('div'); grid.className = control.dataset.view === 'kanban' ? 'contacts-kanban' : 'contacts-list'; currentRows.forEach(row => { const card = document.createElement('article'); card.className = 'contact-card'; card.innerHTML = `<strong>${value(row.person_name || row.organisation)}</strong><span>${value(row.role)}</span><p>${value(row.organisation)} · ${value(row.department)}</p><p>${value(row.email)} · ${value(row.phone)}</p>`; grid.append(card); }); results.append(grid); } else renderTable(); }); });
const sidebar = document.querySelector('.left-nav'); const viewControls = document.querySelector('.contacts-views'); if (sidebar && viewControls) { viewControls.classList.add('contacts-sidebar-views'); const boardLink = sidebar.querySelector('.agent-board-link'); if (boardLink) boardLink.before(viewControls); else sidebar.querySelector('#tracker-sidebar')?.before(viewControls); }
async function loadReverificationCapability() { try { const response = await fetch('/v1/discovery/contacts/reverification-capability', { credentials: 'same-origin', cache: 'no-store' }); const data = await response.json(); canForceReverify = response.ok && data.canForce === true; } catch {} }
loadReverificationCapability().then(() => { renderTable(); });
loadPage();
connectLiveUpdates();
startContactSyncPolling();
window.addEventListener('beforeunload', () => { clearTimeout(liveReconnectTimer); clearInterval(syncPollTimer); liveEventSource?.close(); });
