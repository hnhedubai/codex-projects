const importedCompaniesStorageKey = "en590-buyer-desk-imported-companies-v1";
let companies = loadStoredCompanies();
let contacts = [];
let rejected = [];

const tableColumns = {
  companies: [["company", "Company"], ["type", "Type"], ["country", "Country"], ["batch", "Batch"], ["notes", "Evidence notes"], ["sources", "Sources"]],
  contacts: [["company", "Company"], ["name", "Name"], ["role", "Role"], ["email", "Email"], ["phone", "Phone / channel"], ["country", "Country"], ["notes", "Verification note"], ["source", "Source"]],
  rejected: [["name", "Name"], ["country", "Country"], ["reason", "Reason"], ["notes", "Evidence / exclusion note"], ["source", "Source"]]
};
const columnStorageKey = "en590-buyer-desk-visible-columns";
let visibleColumns = loadVisibleColumns();

function loadStoredCompanies() {
  try {
    const stored = JSON.parse(localStorage.getItem(importedCompaniesStorageKey) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function saveStoredCompanies() {
  try { localStorage.setItem(importedCompaniesStorageKey, JSON.stringify(companies)); } catch {}
}

function loadVisibleColumns() {
  const defaults = Object.fromEntries(Object.entries(tableColumns).map(([table, columns]) => [table, columns.map(([key]) => key)]));
  try {
    const stored = JSON.parse(localStorage.getItem(columnStorageKey) || "{}");
    return Object.fromEntries(Object.entries(defaults).map(([table, keys]) => {
      const selected = keys.filter((key) => stored[table]?.includes(key));
      return [table, selected.length ? selected : keys];
    }));
  } catch { return defaults; }
}

function saveVisibleColumns() { localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumns)); }
function isColumnVisible(table, key) { return visibleColumns[table].includes(key); }
function markColumn(element, table, key) {
  element.dataset.column = key;
  element.classList.toggle("column-hidden", !isColumnVisible(table, key));
}
function applyColumnVisibility(table) {
  document.querySelectorAll(`[data-table="${table}"] [data-column]`).forEach((element) => element.classList.toggle("column-hidden", !isColumnVisible(table, element.dataset.column)));
}
function renderColumnPickers() {
  for (const [table, columns] of Object.entries(tableColumns)) {
    const container = document.querySelector(`[data-column-options="${table}"]`);
    if (!container) continue;
    container.replaceChildren(...columns.map(([key, label]) => {
      const labelElement = document.createElement("label");
      labelElement.className = "column-option";
      const input = document.createElement("input");
      input.type = "checkbox"; input.checked = isColumnVisible(table, key);
      input.addEventListener("change", () => {
        const selected = new Set(visibleColumns[table]);
        if (input.checked) selected.add(key); else selected.delete(key);
        if (!selected.size) { input.checked = true; return; }
        visibleColumns[table] = columns.map(([candidate]) => candidate).filter((candidate) => selected.has(candidate));
        saveVisibleColumns(); applyColumnVisibility(table);
      });
      labelElement.append(input, document.createTextNode(label));
      return labelElement;
    }));
  }
}

const notice = document.querySelector("#notice");

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.className = isError ? "error" : "success";
}

function renderCompanies() {
  const body = document.querySelector("#companies-body");
  const empty = document.querySelector("#companies-empty");
  body.replaceChildren(...companies.map((company) => {
    const row = document.createElement("tr");
    const name = document.createElement("th");
    const title = document.createElement("strong");
    title.textContent = company.company || "Unnamed company";
    name.append(title);
    if (company.website) {
      const link = document.createElement("a");
      link.href = company.website;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Website";
      name.append(link);
    }
    markColumn(name, "companies", "company"); row.append(name);
    for (const [key, value] of [["type", company.type], ["country", company.country], ["batch", company.batch], ["notes", company.notes]]) {
      const cell = document.createElement("td");
      cell.textContent = value || "Unavailable";
      markColumn(cell, "companies", key);
      row.append(cell);
    }
    const sources = document.createElement("td");
    for (const source of Array.isArray(company.sources) ? company.sources : []) {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Source";
      sources.append(link);
    }
    if (!sources.childElementCount) sources.textContent = "Unavailable";
    markColumn(sources, "companies", "sources");
    row.append(sources);
    row.dataset.table = "companies";
    return row;
  }));
  empty.classList.toggle("hidden", companies.length > 0);
  for (const [id, value] of [["company-count", companies.length], ["companies-tab-count", companies.length], ["contact-count", contacts.length], ["contacts-tab-count", contacts.length], ["rejected-count", rejected.length], ["rejected-tab-count", rejected.length]]) document.querySelector(`#${id}`).textContent = value;
}

function appendRows(existing, incoming, keyFields) {
  const seen = new Set(existing.map((row) => keyFields.map((field) => row[field] || "").join("\u001f")));
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const key = keyFields.map((field) => row[field] || "").join("\u001f");
    if (!seen.has(key)) { existing.push(row); seen.add(key); }
  }
}

function renderContacts() {
  const body = document.querySelector("#contacts-body");
  const empty = document.querySelector("#contacts-empty");
  body.replaceChildren(...contacts.map((contact) => {
    const row = document.createElement("tr");
    for (const [key, value] of [["company", contact.company], ["name", contact.name], ["role", contact.role], ["email", contact.email], ["phone", contact.phone], ["country", contact.country], ["notes", contact.notes]]) {
      const cell = document.createElement("td"); cell.textContent = value || "Unavailable"; markColumn(cell, "contacts", key); row.append(cell);
    }
    const source = document.createElement("td");
    if (contact.source) { const link = document.createElement("a"); link.href = contact.source; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Source"; source.append(link); }
    else source.textContent = "Unavailable";
    markColumn(source, "contacts", "source");
    row.append(source); return row;
  }));
  empty.classList.toggle("hidden", contacts.length > 0);
}

function renderRejected() {
  const body = document.querySelector("#rejected-body");
  const empty = document.querySelector("#rejected-empty");
  body.replaceChildren(...rejected.map((item) => {
    const row = document.createElement("tr");
    for (const [key, value] of [["name", item.name], ["country", item.country], ["reason", item.reason], ["notes", item.notes]]) { const cell = document.createElement("td"); cell.textContent = value || "Unavailable"; markColumn(cell, "rejected", key); row.append(cell); }
    const source = document.createElement("td");
    if (item.source) { const link = document.createElement("a"); link.href = item.source; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Source"; source.append(link); }
    else source.textContent = "Unavailable";
    markColumn(source, "rejected", "source");
    row.append(source); return row;
  }));
  empty.classList.toggle("hidden", rejected.length > 0);
}

function importExaOutput(structured) {
  const rows = Array.isArray(structured) ? structured : structured?.companies;
  if (!Array.isArray(rows)) throw new Error("Expected an object containing a companies array.");
  appendRows(companies, rows.map((row) => ({ ...row, sources: Array.isArray(row.sources) ? row.sources : [] })), ["company", "country", "batch"]);
  saveStoredCompanies();
  renderCompanies();
  showNotice(`${companies.length} company record${companies.length === 1 ? "" : "s"} available after import.`);
}

window.importExaOutput = importExaOutput;

for (const button of document.querySelectorAll(".tab-button")) button.addEventListener("click", () => {
  for (const candidate of document.querySelectorAll(".tab-button")) {
    const active = candidate === button;
    candidate.classList.toggle("active", active);
    candidate.setAttribute("aria-selected", active);
    document.querySelector(`#${candidate.getAttribute("aria-controls")}`).classList.toggle("hidden", !active);
  }
});

document.querySelector("#destination-market").addEventListener("input", (event) => {
  document.querySelector("#market-label").textContent = event.target.value.trim() || "—";
});

document.querySelector("#import-output").addEventListener("click", () => {
  const raw = window.prompt("Paste the JSON value from finished.output.structured");
  if (!raw) return;
  try { importExaOutput(JSON.parse(raw)); }
  catch (error) { showNotice(error.message || "The Exa output was not valid JSON.", true); }
});

renderCompanies();
renderContacts();
renderRejected();
renderColumnPickers();
Promise.all([
  fetch("/en590-companies.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
  fetch("/en590-contacts.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
  fetch("/en590-rejected.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null)
]).then(([companyData, contactData, rejectedData]) => {
  if (companyData) importExaOutput(companyData);
  if (contactData) appendRows(contacts, contactData.contacts, ["company", "name", "email"]);
  if (rejectedData) appendRows(rejected, rejectedData.rejected, ["name", "reason"]);
  renderContacts(); renderRejected(); renderCompanies();
}).catch(() => { /* The dashboard remains usable before the first run. */ });
