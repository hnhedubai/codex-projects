const projectList = document.querySelector("#projects");
const parcelList = document.querySelector("#parcels-list");
const selector = document.querySelector("#project-selector");
const notice = document.querySelector("#notice");

async function api(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.className = isError ? "error" : "success";
}

function record(title, details, badge) {
  const item = document.createElement("article");
  item.className = "record";
  const copy = document.createElement("div");
  const heading = document.createElement("h3");
  const description = document.createElement("p");
  const label = document.createElement("span");
  heading.textContent = title;
  description.textContent = details;
  label.textContent = badge;
  copy.append(heading, description);
  item.append(copy, label);
  return item;
}

async function refresh() {
  const [projects, parcels] = await Promise.all([api("/v1/projects"), api("/v1/parcels")]);
  document.querySelector("#project-count").textContent = projects.length;
  document.querySelector("#parcel-count").textContent = parcels.length;
  projectList.replaceChildren(...projects.map((project) => record(project.name, `${project.countryIso2} · ${project.id.slice(0, 8)}`, project.status)));
  parcelList.replaceChildren(...parcels.map((parcel) => record(parcel.name, `${parcel.targetItLoadMw} MW IT load`, parcel.lifecycleStage.replaceAll("_", " "))));
  selector.replaceChildren(...projects.map((project) => new Option(project.name, project.id)));
  if (!projects.length) {
    projectList.textContent = "Create the Oman workspace to begin parcel screening.";
    selector.replaceChildren(new Option("Create a project first", ""));
  }
  if (!parcels.length) parcelList.textContent = "No parcels yet. Add only sites with a target IT load of at least 10 MW.";
}

for (const [button, form] of [["#toggle-project", "#project-form"], ["#toggle-parcel", "#parcel-form"]]) {
  document.querySelector(button).addEventListener("click", () => document.querySelector(form).classList.toggle("hidden"));
}

document.querySelector("#project-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  try {
    await api("/v1/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: fields.get("name"), countryIso2: fields.get("countryIso2").toUpperCase() }) });
    event.currentTarget.reset();
    showNotice("Research project created.");
    await refresh();
  } catch (error) { showNotice(error.message, true); }
});

document.querySelector("#parcel-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  try {
    await api("/v1/parcels", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ researchProjectId: fields.get("researchProjectId"), name: fields.get("name"), targetItLoadMw: Number(fields.get("targetItLoadMw")) }) });
    event.currentTarget.reset();
    showNotice("Candidate parcel created.");
    await refresh();
  } catch (error) { showNotice(error.message, true); }
});

refresh().catch((error) => showNotice(error.message, true));
