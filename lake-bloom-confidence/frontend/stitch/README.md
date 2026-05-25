# Google Stitch Integration

This folder contains the frontend handoff for Google Stitch. The backend is already implemented in `backend/` and exposes OpenAPI docs at:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/openapi.json
```

## MCP Setup

Configure the Stitch MCP server in your local Codex MCP configuration, not in this repository, because the API key is a secret.

Use the Stitch MCP server entry you provided in your local settings, then restart Codex so the tool becomes callable in the session. Once available, use `stitch-prompt.md` as the build prompt and `api-client.ts` as the API contract reference.

## Backend URL

For local development:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

For Docker Compose:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Integration Rules

- Do not claim toxin detection.
- Do not display the phrase `safe water`.
- Always show the official-advisory/lab-testing disclaimer.
- Treat the app as screening and decision support only.
- Use the backend labels exactly as returned by the API.
- When confidence is low, emphasize field verification and uncertainty.

## Files

- `stitch-prompt.md`: prompt to give Stitch for the web app.
- `api-client.ts`: typed frontend client for all required backend calls.
- `example-usage.tsx`: minimal React usage examples for Stitch-generated components.
