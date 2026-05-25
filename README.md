# Lake Bloom Confidence

Netlify can deploy this repo directly from the repository root.

## Netlify Import Settings

When importing the GitHub repo into Netlify:

- Base directory: leave blank
- Build command: leave blank
- Publish directory: `lake-bloom-confidence/frontend/site`
- Functions directory: `lake-bloom-confidence/netlify/functions`

The root `netlify.toml` already provides those settings, so Netlify should detect them automatically.

## Required Environment Variable

Set this in Netlify:

```text
BACKEND_URL=https://your-deployed-fastapi-backend-url
```

The frontend calls `/.netlify/functions/api`, and that Netlify Function forwards requests to `BACKEND_URL`.

If `BACKEND_URL` is not set, the site still opens with demo data, but live backend calls will not work.

## Deploy The Backend On Render

This repo includes a root `render.yaml` Blueprint for the FastAPI backend.

1. Push this repo to GitHub.
2. Open Render.
3. Choose **New > Blueprint**.
4. Select this GitHub repo.
5. Render should detect `render.yaml`.
6. Deploy the `lake-bloom-confidence-api` service.
7. Copy the public service URL, for example:

```text
https://lake-bloom-confidence-api.onrender.com
```

8. Put that URL into Netlify as `BACKEND_URL`.
