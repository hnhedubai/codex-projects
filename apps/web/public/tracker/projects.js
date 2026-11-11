import './page-shell.js';
import { attachResearchBriefField } from './research-brief.js';

const list = document.querySelector('#projects');
const form = document.querySelector('#project-form');
const notice = document.querySelector('#project-notice');
const researchBrief = attachResearchBriefField(form);
const api = async (path, options = {}) => {
  const response = await fetch(path, { ...options, credentials: 'same-origin', headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
};

function render(projects) {
  if (!projects.length) { list.textContent = 'No research projects yet. Create one to begin.'; return; }
  list.replaceChildren(...projects.map(project => {
    const row = document.createElement('article'); row.className = 'record project-record';
    const copy = document.createElement('div'); const title = document.createElement('h3'); title.textContent = project.name;
    const detail = document.createElement('p'); detail.textContent = project.countryIso2 + ' - ' + project.id.slice(0, 8);
    copy.append(title, detail);
    if (project.researchBrief) {
      const brief = document.createElement('p'); brief.className = 'project-brief-preview'; brief.title = project.researchBrief; brief.textContent = project.researchBrief;
      copy.append(brief);
    }
    const actions = document.createElement('div'); actions.className = 'record-actions';
    const status = document.createElement('span'); status.textContent = project.status;
    const edit = document.createElement('button'); edit.className = 'record-action'; edit.type = 'button'; edit.textContent = 'Edit';
    edit.onclick = () => { form.classList.remove('hidden'); form.dataset.id = project.id; form.elements.name.value = project.name; form.elements.countryIso2.value = project.countryIso2; researchBrief.value = project.researchBrief || ''; researchBrief.dispatchEvent(new Event('input')); form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    const remove = document.createElement('button'); remove.className = 'record-action danger'; remove.type = 'button'; remove.textContent = 'Delete';
    remove.onclick = async () => { if (!window.confirm('Delete this empty project?')) return; try { await api('/v1/projects/' + project.id, { method: 'DELETE' }); await load(); } catch (error) { notice.textContent = error.message; } };
    actions.append(status, edit, remove); row.append(copy, actions); return row;
  }));
}

async function load() {
  list.textContent = 'Loading projects...';
  try { render(await api('/v1/projects')); }
  catch (error) { list.textContent = 'Projects could not be loaded.'; notice.textContent = error.message; }
}

document.querySelector('#new-project').onclick = () => { form.reset(); researchBrief.value = ''; researchBrief.dispatchEvent(new Event('input')); delete form.dataset.id; form.classList.toggle('hidden'); };
form.onsubmit = async event => {
  event.preventDefault();
  const body = { name: form.elements.name.value.trim(), countryIso2: form.elements.countryIso2.value.trim().toUpperCase() };
  if (researchBrief.value.trim()) body.researchBrief = researchBrief.value.trim();
  try { await api(form.dataset.id ? '/v1/projects/' + form.dataset.id : '/v1/projects', { method: form.dataset.id ? 'PATCH' : 'POST', body: JSON.stringify(body) }); form.classList.add('hidden'); await load(); }
  catch (error) { notice.textContent = error.message; }
};
load();
