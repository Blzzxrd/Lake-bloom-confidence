# Lake Bloom Confidence

Remote-sensing screening and decision-support app for harmful algal bloom likelihood and assessment confidence.

The website does not claim toxin detection. Satellite estimates do not replace official advisories or lab testing.

## Deploy The Website To Netlify

This repo includes a static frontend that Netlify can host without a build step.

1. Push this folder to GitHub.
2. In Netlify, choose **Add new site > Import an existing project**.
3. Select the GitHub repo.
4. Use these settings:
   - Build command: leave blank
   - Publish directory: `frontend/site`
   - Functions directory: `netlify/functions`
5. Add one Netlify environment variable:
   - `BACKEND_URL`: your deployed FastAPI backend URL, for example `https://lake-bloom-api.example.com`
6. Deploy.

The deployed site uses a Netlify Function proxy at:

```text
/.netlify/functions/api
```

That proxy reads `BACKEND_URL` and forwards frontend calls to the deployed FastAPI backend. This avoids browser CORS surprises and keeps the backend URL configurable from Netlify.

The site works with demo data if no backend is configured. To test against a local backend outside Netlify, edit:

```text
frontend/site/config.js
```

Set:

```js
window.LBC_API_BASE_URL = "http://127.0.0.1:8000";
```

For Netlify production, leave `frontend/site/config.js` blank and use the `BACKEND_URL` environment variable instead.

## Backend Deployment Notes

The backend must be deployed separately on a service that can run FastAPI, PostgreSQL, and PostGIS, such as Render, Railway, Fly.io, or a VPS. After it is deployed, use its public HTTPS URL as Netlify's `BACKEND_URL`.

Example:

```text
BACKEND_URL=https://your-fastapi-backend.onrender.com
```

## Local Preview

Open this file in your browser:

```text
frontend/site/index.html
```

The backend code is in `backend/`.

## Backend API

Swagger docs are available when the backend is running:

```text
http://127.0.0.1:8000/docs
```

Required frontend endpoints:

- `GET /lakes`
- `GET /lakes/{lake_id}`
- `GET /lakes/{lake_id}/latest`
- `GET /lakes/{lake_id}/history`
- `GET /predictions/{prediction_id}/explain`
- `POST /reports`
- `GET /models/current`
