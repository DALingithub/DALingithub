# The Grand Parade — CALM data receiving API

The public music prototype is at https://dalingithub.github.io/DALingithub/grand-parade/.

The receiving service is deployed separately at https://grand-parade-api.onrender.com.

## What CALM should send

CALM should forward **raw SPS30 particulate mass-concentration measurements**, without any normalization. A POST can contain one measurement or an array of up to ten.

`POST https://grand-parade-api.onrender.com/api/readings`

Headers:
- `Authorization: Bearer <CALM_API_KEY>` — shared privately, never added to a client-side webpage
- `Content-Type: application/json`

### Example of an SPS30 reading

```json
{
  "device_id": "CALM-01",
  "timestamp": "2026-11-18T19:00:00Z",
  "pm1": 8.4,
  "pm2_5": 12.6,
  "pm10": 18.3
}
```

Requirements:
- `device_id`: an assigned anonymous channel from `CALM-01` to `CALM-10`.
- `timestamp`: ISO 8601 datetime with timezone, preferably UTC. If absent or invalid, the server substitutes receipt time. This is a prototype fallback; sending original sensor timestamps is preferred.
- `pm1`, `pm2_5`, `pm10`: nonnegative **numeric mass concentrations in µg/m³**. Send whichever of these fields are available; at least one is needed.
- Do not include participant names, GPS locations or other personal data.

The `index` field is **not required** for PM readings. Old prototype test messages containing `{"device_id":"CALM-01","index":0.9}` are still accepted.

### Receiver behaviour

The server checks the submitted fields and preserves raw PM measurements in each forwarded event, alongside a separate 0–1 `index` for the current music engine.

**Provisional, non-scientific musical mapping**, configured by `PM25_MUSIC_REF` (default: 35 µg/m³):
`index = clamp(selected_pm / PM25_MUSIC_REF, 0, 1)`.

Selection preference is `pm2_5`, then `pm10`, then `pm1`. This default is for technical demonstration **only**; the reference is not an air-quality guideline or a calibrated mapping. If only PM1 or PM10 is available, the same provisional scale is used and should be reviewed before artistic/public use. The receiver includes `mapping.field`, `mapping.reference_ug_m3`, and `mapping.provisional: true` in streamed messages. PM should not be described as black-carbon measurements: an SPS30 reports particulate matter, not black carbon.

A received event looks like:

```json
{
  "device_id":"CALM-01",
  "timestamp":"2026-11-18T19:00:00Z",
  "index":0.36,
  "source":"sps30_pm",
  "pm":{"pm1":8.4,"pm2_5":12.6,"pm10":18.3},
  "pm_unit":"ug/m3",
  "mapping":{"method":"linear_clamped_demo","field":"pm2_5","reference_ug_m3":35,"provisional":true}
}
```

Important: `index` is rounded here for illustration only; actual JSON carries normal floating-point values.

## Endpoints

- `POST /api/readings`: authenticated data intake.
- `GET /api/stream`: browser-readable Server-Sent Events stream; forwards raw and mapped values. **Anyone with the URL can read the stream.** No sensitive data should be sent.
- `GET /health`: health and connected-client counts.

Sample request:

```bash
curl -i -X POST 'https://grand-parade-api.onrender.com/api/readings' \
 -H "Authorization: Bearer $CALM_KEY" \
 -H "Content-Type: application/json" \
 -d '{"device_id":"CALM-01","timestamp":"2026-11-18T19:00:00Z","pm1":8.4,"pm2_5":12.6,"pm10":18.3}'
```

Expected response: HTTP 202 and `{"accepted":1,"subscribers":...}`.

## Render configuration

Repository: `DALingithub/DALingithub`

- Root Directory: `grand-parade/receiver`
- Runtime: Node
- Build: `npm install`
- Start: `npm start`
- Environment variable `CALM_API_KEY`: strong, private Bearer token
- Environment variable `ALLOW_ORIGIN`: `https://dalingithub.github.io`
- Optional `PM25_MUSIC_REF`: positive numeric value, defaults to 35

The relay keeps only the last received reading per device **in RAM**. It has no persistent database, and state is lost on restart. This is a prototype, not an archival store. Deploy a single instance; several instances will not synchronize SSE events. Free Render instances may sleep when idle.
