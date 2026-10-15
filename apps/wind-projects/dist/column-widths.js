const storageKey = 'wind-projects.column-widths.v1';
const minimum = 90;
const maximum = 800;
export function normalizeWidths(value, defaults) {
  return defaults.map((fallback, i) => typeof value?.[i] === 'number' && Number.isFinite(value[i])
    ? Math.round(Math.max(minimum, Math.min(maximum, value[i]))) : fallback);
}
export function enableColumnResize(table, toolbar, notify) {
  if (!table || !toolbar) return;
  const headers = [...table.querySelectorAll('th')];
  const defaults = headers.map(th => Math.max(minimum, Math.round(th.getBoundingClientRect().width)));
  let widths = [...defaults];
  try { widths = normalizeWidths(JSON.parse(localStorage.getItem(storageKey)), defaults); } catch {}
  const group = document.createElement('colgroup');
  const columns = headers.map(() => group.appendChild(document.createElement('col')));
  table.prepend(group);
  table.classList.add('resizable-table');
  for (const cell of table.querySelectorAll('td, th')) {
    const fullText = [...cell.childNodes].map(node => node.textContent.trim()).filter(Boolean).join(' · ');
    cell.title = fullText;
    const content = document.createElement('div');
    content.className = 'table-cell-content';
    while (cell.firstChild) content.appendChild(cell.firstChild);
    cell.appendChild(content);
    for (const button of content.querySelectorAll('button')) button.title = fullText;
  }
  const viewport = table.parentElement;
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Project table — scroll horizontally to see more columns');
  const handles = [];
  const apply = () => {
    columns.forEach((col, i) => { col.style.width = `${widths[i]}px`; handles[i]?.setAttribute('aria-valuenow', String(widths[i])); });
    table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
  };
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(widths)); } catch { notify('Widths changed, but browser storage is unavailable.'); } };
  headers.forEach((th, i) => {
    const handle = document.createElement('span');
    handle.className = 'column-resizer';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', `Resize ${th.textContent.trim()} column`);
    handle.setAttribute('aria-valuemin', String(minimum));
    handle.setAttribute('aria-valuemax', String(maximum));
    handle.title = 'Drag to resize. Arrow keys adjust width. Double-click to reset this column.';
    handles.push(handle);
    th.appendChild(handle);
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX, startWidth = widths[i];
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('column-resizing');
      const move = event => {
        widths[i] = Math.round(Math.max(minimum, Math.min(maximum, startWidth + event.clientX - startX)));
        apply();
      };
      const finish = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', finish);
        handle.removeEventListener('lostpointercapture', finish);
        if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        document.body.classList.remove('column-resizing');
        save();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
      handle.addEventListener('lostpointercapture', finish);
    });
    handle.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const delta = (e.shiftKey ? 50 : 10) * (e.key === 'ArrowLeft' ? -1 : 1);
      widths[i] = e.key === 'Home' ? minimum : e.key === 'End' ? maximum : Math.max(minimum, Math.min(maximum, widths[i] + delta));
      apply(); save();
    });
    handle.addEventListener('dblclick', () => { widths[i] = defaults[i]; apply(); save(); });
  });
  const controls = document.createElement('div');
  controls.className = 'column-width-controls';
  const hint = document.createElement('small');
  hint.textContent = 'Drag header edges to resize';
  const reset = document.createElement('button');
  reset.className = 'quiet';
  reset.textContent = 'Reset widths';
  reset.addEventListener('click', () => { widths = [...defaults]; apply(); save(); notify('Column widths reset.'); });
  controls.append(hint, reset);
  for (const [label, direction] of [['←', -1], ['→', 1]]) {
    const button = document.createElement('button');
    button.className = 'quiet';
    button.textContent = label;
    const description = `Scroll columns ${direction < 0 ? 'left' : 'right'}`;
    button.title = description;
    button.setAttribute('aria-label', description);
    button.addEventListener('click', () => {
      viewport.scrollBy({left: direction * Math.max(200, viewport.clientWidth * 0.65), behavior: 'smooth'});
    });
    controls.appendChild(button);
  }
  toolbar.appendChild(controls);
  apply();
}
