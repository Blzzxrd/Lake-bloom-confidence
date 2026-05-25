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
