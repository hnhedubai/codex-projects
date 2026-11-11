import './page-shell.js';
import { mountPortalViewControls } from './portal-view-controls.js';
import { mountPortalColumnResizer, renderPortalPagination, PORTAL_PAGE_SIZES } from './portal-table.js';

mountPortalViewControls();
const results = document.querySelector('#accounts-results');
const status = document.querySelector('#accounts-status');
const notice = document.querySelector('#accounts-notice');
const search = document.querySelector('#accounts-search');
const viewButtons = [...document.querySelectorAll('[data-portal-view-controls] [data-view]')];
const columns = [
  ['id', 'ID'],
  ['canonicalName', 'Canonical name'],
  ['legalName', 'Legal name'],
  ['displayName', 'Display name'],
  ['companyStatus', 'Company status'],
  ['legalForm', 'Legal form'],
  ['countryOfRegistration', 'Country'],
  ['websiteUrl', 'Website'],
  ['primaryDomain', 'Primary domain'],
  ['linkedinUrl', 'LinkedIn'],
  ['description', 'Description'],
  ['companyType', 'Company type'],
  ['roleType', 'Role'],
  ['roleStatus', 'Role status'],
  ['roleSourceUrl', 'Role source'],
  ['roleEvidence', 'Role evidence'],
  ['verificationStatus', 'Verification'],
  ['identityConfidence', 'Identity confidence'],
  ['firecrawlMarkdown', 'Firecrawl Markdown'],
  ['firecrawlMarkdownAt', 'Markdown date'],
  ['firecrawlMarkdownHash', 'Markdown hash'],
  ['firecrawlSourceUrl', 'Firecrawl source'],
  ['firstSeenAt', 'First seen'],
  ['lastSeenAt', 'Last seen'],
  ['createdAt', 'Created'],
  ['updatedAt', 'Updated'],
];
const keys = columns.map(([key]) => key);
const roleSortKeys = new Set(['roleType', 'roleStatus', 'roleSourceUrl', 'roleEvidence']);
const prefsKey = 'oman-tracker-account-table-preferences-v1';
const pagesKey = 'oman-tracker-account-pages-v1';
const defaults = { order: keys, visible: keys, widths: {}, favorites: [], pinned: [], sortKey: null, sortDirection: 'asc', pageSize: 25, page: 1, view: 'table' };
let prefs = loadPrefs();
let pages = loadPages();
let rows = [];
let totalCount = 0;
let searchTimer;
let loadSequence = 0;

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(prefsKey) || 'null') || {};
    const order = Array.isArray(saved.order) ? saved.order.filter(key => keys.includes(key)) : [];
    const savedVisible = Array.isArray(saved.visible) ? saved.visible.filter(key => keys.includes(key)) : [];
    const visible = savedVisible.length ? [...savedVisible, ...keys.filter(key => !savedVisible.includes(key))] : keys;
    const missing = keys.filter(key => !order.includes(key));
    const mergedOrder = [...order];
    const companyTypeIndex = mergedOrder.indexOf('companyType');
    if (companyTypeIndex >= 0) mergedOrder.splice(companyTypeIndex + 1, 0, ...missing);
    else mergedOrder.push(...missing);
    return {
      ...defaults,
      ...saved,
      order: mergedOrder,
      visible: visible.length ? visible : keys,
      pageSize: PORTAL_PAGE_SIZES.includes(Number(saved.pageSize)) ? Number(saved.pageSize) : 25,
      page: 1,
      view: ['table', 'kanban'].includes(saved.view) ? saved.view : 'table',
    };
  } catch {
    return { ...defaults };
  }
}

function loadPages() {
  try {
    const saved = JSON.parse(localStorage.getItem(pagesKey) || 'null');
    return saved?.pages && typeof saved.pages === 'object' ? saved.pages : {};
  } catch {
    return {};
  }
}

function savePrefs() {
  try { localStorage.setItem(prefsKey, JSON.stringify(prefs)); } catch {}
}

function savePages() {
  try { localStorage.setItem(pagesKey, JSON.stringify({ pages })); } catch {}
}

function label(key) { return columns.find(([candidate]) => candidate === key)?.[1] || key; }
function value(input) { return input === null || input === undefined || input === '' ? '\u2014' : String(input); }
function idOf(row) { return String(row.id || `${row.primaryDomain}|${row.canonicalName}`).toLowerCase(); }
function selected(kind, id) { return prefs[kind].includes(id); }
function toggle(kind, id) { prefs[kind] = selected(kind, id) ? prefs[kind].filter(item => item !== id) : [...prefs[kind], id]; savePrefs(); }

function displayValue(key, input) {
  if (input === null || input === undefined || input === '') return '\u2014';
  if (key.endsWith('At')) {
    const date = new Date(input);
    return Number.isNaN(date.valueOf()) ? String(input) : date.toLocaleString();
  }
  return String(input);
}

function roleRecords(row) { return Array.isArray(row.roles) ? row.roles : []; }

function roleValues(row, field) {
  const values = roleRecords(row)
    .map(role => role[field])
    .filter(input => input !== null && input !== undefined && String(input).trim() !== '')
    .map(String);
  return [...new Set(values)];
}

function rowDisplayValue(key, row) {
  if (key === 'roleType') return roleValues(row, 'roleType').join(', ') || '\u2014';
  if (key === 'roleStatus') return roleValues(row, 'roleStatus').join(', ') || '\u2014';
  if (key === 'roleSourceUrl') return roleValues(row, 'sourceUrl').join(' | ') || '\u2014';
  if (key === 'roleEvidence') return roleValues(row, 'evidenceExcerpt').join(' | ') || '\u2014';
  return displayValue(key, row[key]);
}

function safeUrl(input) { return typeof input === 'string' && /^https?:\/\//i.test(input) ? input : ''; }
function sortValue(key, row) { return rowDisplayValue(key, row); }

function sortRows(input) {
  const direction = prefs.sortDirection === 'desc' ? -1 : 1;
  return [...input].sort((left, right) => {
    const lp = selected('pinned', idOf(left));
    const rp = selected('pinned', idOf(right));
    if (lp !== rp) return Number(rp) - Number(lp);
    if (!prefs.sortKey) return 0;
    return sortValue(prefs.sortKey, left).localeCompare(sortValue(prefs.sortKey, right), undefined, { numeric: true, sensitivity: 'base' }) * direction;
  });
}

function applyWidths() {
  const table = document.querySelector('.accounts-table');
  if (!table) return;
  let total = 0;
  table.querySelectorAll('col[data-column]').forEach(col => {
    const width = prefs.widths[col.dataset.column] || 170;
    col.style.width = `${width}px`;
    col.style.minWidth = `${width}px`;
    total += width;
  });
  table.style.width = `${total}px`;
  table.style.minWidth = `${total}px`;
}

function resizeHandle(th, key) { return mountPortalColumnResizer({ th, key, label: label(key), prefs, onResize: applyWidths, onCommit: savePrefs }); }

function moveColumn(fromKey, toKey) {
  const from = prefs.order.indexOf(fromKey);
  const to = prefs.order.indexOf(toKey);
  if (from < 0 || to < 0 || from === to) return;
  prefs.order.splice(from, 1);
  prefs.order.splice(to, 0, fromKey);
  prefs.visible = prefs.order.filter(key => prefs.visible.includes(key));
  savePrefs();
  render();
}

function picker() {
  let manager = document.querySelector('#account-column-manager');
  if (!manager) {
    manager = document.createElement('details');
    manager.id = 'account-column-manager';
    manager.className = 'table-column-manager';
    const summary = document.createElement('summary');
    summary.textContent = '\u2699';
    summary.title = 'Manage account columns';
    summary.setAttribute('aria-label', 'Manage account columns');
    const options = document.createElement('div');
    options.className = 'table-column-options';
    manager.append(summary, options);
    document.querySelector('.accounts-panel .panel-heading')?.append(manager);
  }
  const options = manager.querySelector('.table-column-options');
  options.replaceChildren();
  prefs.order.forEach(key => {
    const item = document.createElement('label');
    item.className = 'table-column-option';
    item.draggable = true;
    item.title = `Drag to reorder ${label(key)}`;
    const handle = document.createElement('span');
    handle.className = 'column-drag-handle';
    handle.textContent = '\u22ee\u22ee';
    handle.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = prefs.visible.includes(key);
    input.setAttribute('aria-label', `Show ${label(key)} column`);
    input.addEventListener('change', () => {
      const next = new Set(prefs.visible);
      input.checked ? next.add(key) : next.delete(key);
      if (!next.size) {
        input.checked = true;
        notice.textContent = 'At least one column must remain visible.';
        return;
      }
      prefs.visible = prefs.order.filter(candidate => next.has(candidate));
      savePrefs();
      render();
    });
    item.append(handle, input, document.createTextNode(label(key)));
    item.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', key));
    item.addEventListener('dragover', event => { event.preventDefault(); item.classList.add('drop-target'); });
    item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
    item.addEventListener('drop', event => {
      event.preventDefault();
      item.classList.remove('drop-target');
      moveColumn(event.dataTransfer.getData('text/plain'), key);
    });
    options.append(item);
  });
}

function linkCell(input, labelText = 'Open link') {
  const cell = document.createElement('td');
  const url = safeUrl(input);
  if (!url) {
    cell.textContent = '-';
    cell.title = '-';
    return cell;
  }
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = labelText;
  link.title = url;
  cell.title = url;
  cell.append(link);
  return cell;
}

function roleSourceCell(row) {
  const cell = document.createElement('td');
  const sources = roleRecords(row).filter(role => safeUrl(role.sourceUrl));
  if (!sources.length) {
    cell.textContent = '-';
    cell.title = '-';
    return cell;
  }
  sources.forEach((role, index) => {
    if (index) cell.append(document.createTextNode(' | '));
    const link = document.createElement('a');
    link.href = role.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = role.roleType ? `${role.roleType} source` : 'source';
    link.title = role.sourceUrl;
    cell.append(link);
  });
  cell.title = sources.map(role => role.sourceUrl).join(' | ');
  return cell;
}

function badge(input) {
  const badge = document.createElement('span');
  badge.className = `account-status ${input || 'unknown'}`;
  badge.textContent = value(input);
  return badge;
}

function action(text, icon, className, pressed, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `portal-table-action account-table-action ${className}${className === 'pin-account' ? ' portal-pin-action' : ''}`;
  button.textContent = className === 'pin-account' ? '\ud83d\udccd' : icon;
  button.title = text;
  button.setAttribute('aria-label', text);
  button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', handler);
  return button;
}

function renderPagination() {
  document.querySelector('.accounts-pagination')?.remove();
  results.after(renderPortalPagination({
    className: 'accounts-pagination',
    page: prefs.page,
    pageSize: prefs.pageSize,
    totalCount,
    hasNext: rows.length >= prefs.pageSize,
    onPageSize: size => { prefs.pageSize = size; prefs.page = 1; savePrefs(); load(); },
    onPrevious: () => { prefs.page--; savePrefs(); load(); },
    onNext: () => { prefs.page++; savePrefs(); load(); },
  }));
}

function renderTable() {
  results.replaceChildren();
  picker();
  if (!rows.length) {
    results.textContent = 'No accounts found.';
    renderPagination();
    return;
  }
  const visible = new Set(prefs.visible);
  const table = document.createElement('table');
  table.className = 'portal-data-table accounts-table';
  table.setAttribute('aria-label', 'CRM accounts');
  const group = document.createElement('colgroup');
  group.append(document.createElement('col'));
  prefs.order.forEach(key => {
    const col = document.createElement('col');
    col.dataset.column = key;
    col.classList.toggle('column-hidden', !visible.has(key));
    group.append(col);
  });
  table.append(group);

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const actionHead = document.createElement('th');
  actionHead.className = 'account-actions-heading';
  actionHead.textContent = 'Actions';
  headRow.append(actionHead);
  prefs.order.forEach(key => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.dataset.column = key;
    th.draggable = true;
    th.classList.toggle('column-hidden', !visible.has(key));
    const sort = document.createElement('button');
    sort.type = 'button';
    sort.className = 'portal-sort-button account-sort-button';
    sort.textContent = `${label(key)}${prefs.sortKey === key ? (prefs.sortDirection === 'desc' ? ' \u2193' : ' \u2191') : ''}`;
    sort.title = `Sort by ${label(key)}`;
    sort.setAttribute('aria-label', sort.title);
    sort.addEventListener('click', event => {
      event.stopPropagation();
      prefs.sortDirection = prefs.sortKey === key && prefs.sortDirection === 'asc' ? 'desc' : 'asc';
      prefs.sortKey = key;
      prefs.page = 1;
      savePrefs();
      load();
    });
    th.append(sort, resizeHandle(th, key));
    th.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', key));
    th.addEventListener('dragover', event => { event.preventDefault(); th.classList.add('drop-target'); });
    th.addEventListener('dragleave', () => th.classList.remove('drop-target'));
    th.addEventListener('drop', event => {
      event.preventDefault();
      th.classList.remove('drop-target');
      moveColumn(event.dataTransfer.getData('text/plain'), key);
    });
    headRow.append(th);
  });
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  sortRows(rows).forEach(row => {
    const tr = document.createElement('tr');
    const accountId = idOf(row);
    tr.classList.toggle('is-pinned', selected('pinned', accountId));
    tr.classList.toggle('is-favorite', selected('favorites', accountId));
    const actions = document.createElement('td');
    actions.className = 'account-row-actions';
    actions.append(
      action(selected('favorites', accountId) ? 'Remove favorite account' : 'Favorite account', selected('favorites', accountId) ? '\u2605' : '\u2606', 'favorite-account', selected('favorites', accountId), () => { toggle('favorites', accountId); render(); }),
      action('', '', 'pin-account', selected('pinned', accountId), () => { toggle('pinned', accountId); render(); }),
    );
    tr.append(actions);

    prefs.order.forEach(key => {
      const isLink = ['websiteUrl', 'linkedinUrl', 'firecrawlSourceUrl'].includes(key);
      const linkLabel = key === 'websiteUrl' ? 'Open website' : 'Open link';
      const cell = key === 'roleSourceUrl'
        ? roleSourceCell(row)
        : isLink
          ? linkCell(row[key], linkLabel)
          : document.createElement('td');
      cell.dataset.column = key;
      cell.classList.toggle('column-hidden', !visible.has(key));
      if (!isLink && key !== 'roleSourceUrl') {
        if (['companyStatus', 'verificationStatus'].includes(key)) cell.append(badge(row[key]));
        else cell.textContent = rowDisplayValue(key, row);
        cell.title = rowDisplayValue(key, row);
      }
      tr.append(cell);
    });
    body.append(tr);
  });
  table.append(body);
  const wrap = document.createElement('div');
  wrap.className = 'accounts-table-wrap portal-table-wrap';
  wrap.append(table);
  results.append(wrap);
  applyWidths();
  renderPagination();
}

function renderCards() {
  results.replaceChildren();
  const grid = document.createElement('div');
  grid.className = 'accounts-kanban';
  sortRows(rows).forEach(row => {
    const card = document.createElement('article');
    card.className = 'account-card';
    const heading = document.createElement('h3');
    heading.textContent = value(row.canonicalName);
    const meta = document.createElement('p');
    meta.textContent = `${value(row.primaryDomain)} \u00b7 ${value(row.companyType || row.companyStatus)}`;
    const description = document.createElement('p');
    description.textContent = value(row.description || row.firecrawlMarkdown);
    card.append(heading, meta, description);
    grid.append(card);
  });
  results.append(grid);
  renderPagination();
}

function render() {
  viewButtons.forEach(button => button.classList.toggle('active', button.dataset.view === prefs.view));
  if (prefs.view === 'table') renderTable();
  else renderCards();
}

async function load() {
  const key = [prefs.pageSize, prefs.page, prefs.search || 'all', prefs.sortKey || 'updatedAt', prefs.sortDirection].join(':');
  const cached = pages[key]?.rows ? pages[key] : null;
  const requestId = ++loadSequence;
  if (cached) {
    rows = cached.rows;
    totalCount = cached.totalCount;
    render();
  } else {
    status.textContent = 'Loading accounts\u2026';
  }
  const query = new URL('/v1/accounts', window.location.origin);
  query.searchParams.set('limit', prefs.pageSize);
  query.searchParams.set('offset', (prefs.page - 1) * prefs.pageSize);
  if (prefs.search) query.searchParams.set('search', prefs.search);
  if (prefs.sortKey) {
    query.searchParams.set('sortKey', prefs.sortKey);
    query.searchParams.set('sortDirection', prefs.sortDirection);
  }
  try {
    const response = await fetch(query, { credentials: 'same-origin', cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Accounts could not be loaded.');
    if (requestId !== loadSequence) return;
    rows = Array.isArray(body) ? body : body.accounts || [];
    totalCount = Number(body.totalCount || rows.length);
    pages[key] = { rows, totalCount, savedAt: new Date().toISOString() };
    savePages();
    status.textContent = '';
    notice.textContent = '';
    render();
  } catch (error) {
    if (requestId !== loadSequence) return;
    status.textContent = '';
    if (cached) {
      notice.textContent = 'Live refresh failed; showing cached accounts.';
      render();
    } else {
      notice.textContent = error.message;
      results.textContent = 'Accounts could not be loaded.';
    }
  }
}

search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    prefs.search = search.value.trim();
    prefs.page = 1;
    pages = {};
    savePrefs();
    load();
  }, 250);
});

viewButtons.forEach(button => button.addEventListener('click', () => {
  prefs.view = button.dataset.view;
  savePrefs();
  render();
}));

load();
