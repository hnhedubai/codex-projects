export const PORTAL_PAGE_SIZES = [25, 50, 100, 200, 500];

export function portalDisplayValue(input) {
  return input === null || input === undefined || input === '' ? '—' : String(input);
}

export function movePortalColumn(order, fromKey, toKey) {
  const from = order.indexOf(fromKey);
  const to = order.indexOf(toKey);
  if (from < 0 || to < 0 || from === to) return false;
  order.splice(from, 1);
  order.splice(to, 0, fromKey);
  return true;
}

export function mountPortalColumnResizer({ th, key, label, prefs, onResize, onCommit, minWidth = 90 }) {
  const handle = document.createElement('span');
  handle.className = 'portal-column-resizer';
  handle.title = `Drag to resize ${label} column`;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-label', handle.title);
  handle.tabIndex = 0;

  let startX = 0;
  let startWidth = 0;
  let active = false;

  const stop = event => {
    if (!active) return;
    active = false;
    document.body.classList.remove('resizing-portal-column');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    onCommit?.(event);
  };

  const move = event => {
    if (!active) return;
    const width = Math.max(minWidth, Math.round(startWidth + event.clientX - startX));
    prefs.widths[key] = width;
    onResize?.(width);
  };

  handle.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    active = true;
    startX = event.clientX;
    startWidth = th.getBoundingClientRect().width;
    document.body.classList.add('resizing-portal-column');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  });

  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const width = Math.max(minWidth, Math.round((prefs.widths[key] || th.getBoundingClientRect().width) + (event.key === 'ArrowRight' ? 10 : -10)));
    prefs.widths[key] = width;
    onResize?.(width);
    onCommit?.(event);
  });

  return handle;
}

export function renderPortalPagination({ className, page, pageSize, totalCount, hasNext, onPageSize, onPrevious, onNext }) {
  const pagination = document.createElement('div');
  pagination.className = `${className} portal-pagination`;

  const label = document.createElement('label');
  label.append('Rows');
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Rows per page');
  PORTAL_PAGE_SIZES.forEach(size => select.append(new Option(size, size, false, size === pageSize)));
  select.addEventListener('change', () => onPageSize(Number(select.value)));
  label.append(select);

  const summary = document.createElement('span');
  const start = totalCount ? ((page - 1) * pageSize) + 1 : 0;
  summary.textContent = totalCount ? `Showing ${start}–${Math.min(page * pageSize, totalCount)} of ${totalCount}` : 'No records';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = '‹';
  previous.title = 'Previous page';
  previous.setAttribute('aria-label', 'Previous page');
  previous.disabled = page <= 1;
  previous.addEventListener('click', onPrevious);

  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = '›';
  next.title = 'Next page';
  next.setAttribute('aria-label', 'Next page');
  next.disabled = !hasNext;
  next.addEventListener('click', onNext);

  pagination.append(label, summary, previous, next);
  return pagination;
}

export function installPortalResizeDelegation({ prefs, onResize, onCommit }) {
  const start = event => {
    const handle = event.target.closest?.('.contact-column-resizer');
    if (!handle) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const th = handle.closest('th');
    if (!th) return;
    const key = th.dataset.column || '__actions__';
    const minWidth = key === '__actions__' ? 64 : 90;
    const startX = event.clientX;
    const startWidth = th.getBoundingClientRect().width;
    const move = moveEvent => {
      const width = Math.max(minWidth, Math.round(startWidth + moveEvent.clientX - startX));
      prefs.widths[key] = width;
      onResize?.();
    };
    const stop = stopEvent => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      document.body.classList.remove('resizing-portal-column');
      onCommit?.(stopEvent);
    };
    document.body.classList.add('resizing-portal-column');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };
  document.addEventListener('pointerdown', start, true);
  return () => document.removeEventListener('pointerdown', start, true);
}
