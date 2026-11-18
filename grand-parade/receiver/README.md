# Grand Parade / CALM Receiver

Separate Node.js receiving API for the GitHub Pages music site.

## Deploy on Render
Connect GitHub repo `DALingithub/DALingithub`. Create a **Web Service** with:
- **Root Directory:** `grand-parade/receiver`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- Environment variables: `CALM_API_KEY` = a strong random secret (keep private), `ALLOW_ORIGIN` = `https://dalingithub.github.io`

Render provides your base URL, such as `https://YOUR-SERVICE.onrender.com`.

## API

`POST /api/readings` requires `Authorization: Bearer YOUR_SECRET` and `Content-Type: application/json`:

```json
{"device_id":"CALM-01","index":0.43,"timestamp":"2026-11-18T18:00:00Z"}
```

Or send an array of up to 10 readings. `index` is a normalized **0–1 musical control**, not a verified black-carbon concentration or its units. CALM raw-to-normalized mapping needs discussion with the CALM team.

Browser connects via `GET /api/stream` (SSE). No key goes in the public webpage. `GET /health` reports service status. Public stream contains the normalized readings and anonymous channel IDs, **not personal information**.

This is an ephemeral relay for testing: restarts lose state; multiple Render instances won't share events. CORS protects allowed browser origins but **does not authenticate readers** of the public stream. Do not send private participant identifiers, precise locations, or sensitive health data.

Curl example:

```bash
curl -X POST https://YOUR-SERVICE.onrender.com/api/readings \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"CALM-01","index":0.43}'
```

Never put the POST key into HTML or client-side JavaScript.
