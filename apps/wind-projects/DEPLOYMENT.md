# Wind Projects deployment

The Wind Projects desk is packaged as one Node.js service. The same service
serves the frontend at `/wind-projects` and the backend API at
`/wind-projects/api/*`, so local and hosted deployment use one start command.

## Local development

From the repository root:

```powershell
npm run wind:start
```

Then open `http://localhost:9601/wind-projects`.

To use another port:

```powershell
$env:WIND_PORT='9601'
npm run wind:start
```

Run the application tests with:

```powershell
npm run wind:test
```

## Runtime configuration

Copy `apps/wind-projects/.env.example` to a private environment file or set
the variables in the hosting provider. Never commit provider keys.

- `WIND_PORT` — HTTP port supplied by the host; defaults to `9601`.
- `REOON_API_KEY` — optional server-side Reoon verification key.
- `APOLLO_API_KEY` — optional server-side Apollo enrichment key.
- `HUNTER_API_KEY` — optional server-side Hunter key.
- `REOON_ENV_FILE` — optional path to a trusted local env file.

The server binds to `127.0.0.1` for local use. A hosted deployment should
bind to the provider-provided host interface and preserve the same `/wind-projects`
and `/wind-projects/api/*` routes. The current server is intentionally local-only;
before public deployment, add authentication, HTTPS, a durable private store,
and provider-specific host binding.

## Future hosting checklist

1. Choose a Node-compatible host and confirm its required host binding.
2. Add a host-specific start command that runs `node apps/wind-projects/server.mjs`.
3. Set the provider keys as server-side secrets.
4. Move `private/contacts.json` to durable protected storage or a database.
5. Add authentication before exposing contact data publicly.
6. Run `npm run wind:test` and verify both the page and `/wind-projects/api/contacts`.

