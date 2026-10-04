const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function bodyAsObject(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function createTrackerHttpHandler({ tracker, authenticate = async () => null }) {
  return {
    async fetch(request) {
      const principal = await authenticate(request);
      if (!principal) return json({ error: "unauthorized" }, 401);
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/v1/projects") {
        return json(await tracker.listProjects());
      }

      if (request.method === "GET" && url.pathname === "/v1/parcels") {
        return json(await tracker.listParcels());
      }

      if (request.method === "POST" && url.pathname === "/v1/projects") {
        const input = await bodyAsObject(request);
        if (!input?.name || !input?.countryIso2) {
          return json({ error: "name and countryIso2 are required" }, 422);
        }

        return json(
          await tracker.createProject({
            name: input.name,
            countryIso2: input.countryIso2,
          }),
          201,
        );
      }

      if (request.method === "POST" && url.pathname === "/v1/parcels") {
        const input = await bodyAsObject(request);
        const targetItLoadMw = Number(input?.targetItLoadMw);
        if (!Number.isFinite(targetItLoadMw) || targetItLoadMw < 10) {
          return json({ error: "targetItLoadMw must be at least 10 MW" }, 422);
        }
        if (!input?.researchProjectId || !input?.name) {
          return json(
            { error: "researchProjectId and name are required" },
            422,
          );
        }

        return json(
          await tracker.createParcel({
            researchProjectId: input.researchProjectId,
            name: input.name,
            targetItLoadMw,
          }),
          201,
        );
      }

      return json({ error: "not found" }, 404);
    },
  };
}
