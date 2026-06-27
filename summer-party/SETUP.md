# 初夏 Party 報名表單 — Backend Setup (n8n + Airtable)

The frontend form lives in this folder (`index.html` + `main.jsx`) and is wired into the Vite
build. It posts the sign-up as JSON to an **n8n webhook**, and n8n writes a row to **Airtable** —
the exact same pattern the other forms (`member-form`, `availability-form`) already use.

This doc is the checklist to make the backend half work. Two things must exist: an **Airtable
table** and an **n8n workflow**.

---

## What the form sends

The form does `POST <n8n-webhook>` with `Content-Type: application/json` and this body:

```json
{
  "event_id": "2026-07-18-summer-party",
  "event_name": "2026.07.18 Linkinhk 特約初夏 Party",
  "submitted_at": "2026-06-26T09:30:00.000Z",
  "name": "陳大文",
  "gender": "男",
  "phone": "91234567",
  "occupation": "設計師",
  "mbti": "E",
  "styling_advice": "需要",
  "consent": true
}
```

The form treats the submit as **successful** when the webhook replies `HTTP 2xx` and the JSON body
is *not* `{ "success": false }`. n8n's default webhook 200 response already satisfies this, so no
special response node is required.

### Webhook URL / environment

The URL is built by `shared/config.js` → `window.webhookUrl("summer-party")`:

| Environment | Hostname                                   | Webhook path           |
| ----------- | ------------------------------------------ | ---------------------- |
| **Prod**    | `www.linkinhk.com`                         | `summer-party`         |
| **UAT**     | `localhost`, `127.0.0.1`, `*.pages.dev`, `uat.*` | `uat-summer-party` |

Full URL = `https://linkinhk.app.n8n.cloud/webhook/<path>`. So you need the path **`summer-party`**
for production, and **`uat-summer-party`** for testing — mirroring how the other forms split UAT/prod.

---

## Step 1 — Airtable table

Create a table (e.g. **`Event Signups`**) in the same base your other forms use. Suggested fields:

| Field name      | Type                        | From payload     |
| --------------- | --------------------------- | ---------------- |
| `姓名`           | Single line text            | `name`           |
| `性別`           | Single select (`男`, `女`)   | `gender`         |
| `電話 / WhatsApp`| Phone / Single line text    | `phone`          |
| `職業`           | Single line text            | `occupation`     |
| `MBTI`          | Single select (`E`, `I`)     | `mbti`           |
| `穿搭意見`        | Single select (`需要`, `不需要`) | `styling_advice` |
| `同意條款`        | Checkbox                    | `consent`        |
| `Submitted At`  | Date (include time)         | `submitted_at`   |
| `Event`         | Single line text            | `event_name`     |
| `Event ID`      | Single line text            | `event_id`       |

> `Event ID` / `Event` let one table hold future events too — just change `EVENT_ID` / `EVENT_NAME`
> at the top of `main.jsx` for the next event and filter Airtable by `Event ID`.

---

## Step 2 — n8n workflow

Build a workflow (you can duplicate the existing `availability` / `member-form` one to reuse the
Airtable credential, then swap the two nodes):

1. **Webhook node** (trigger)
   - HTTP Method: `POST`
   - Path: `summer-party`
   - Respond: `Immediately` (default 200 is enough — see note above).

2. **Airtable node** → Resource: `Record`, Operation: `Create`
   - Use the **same Airtable credential** as the other forms.
   - Base: your base · Table: `Event Signups`.
   - Map each Airtable field to the webhook value. n8n nests posted JSON under `body`, so use:
     - `姓名` → `{{ $json.body.name }}`
     - `性別` → `{{ $json.body.gender }}`
     - `電話 / WhatsApp` → `{{ $json.body.phone }}`
     - `職業` → `{{ $json.body.occupation }}`
     - `MBTI` → `{{ $json.body.mbti }}`
     - `穿搭意見` → `{{ $json.body.styling_advice }}`
     - `同意條款` → `{{ $json.body.consent }}`
     - `Submitted At` → `{{ $json.body.submitted_at }}`
     - `Event` → `{{ $json.body.event_name }}`
     - `Event ID` → `{{ $json.body.event_id }}`
   - Enable **Typecast / "Map fields by name"** so the single-select values are created if missing.

3. **Activate** the workflow.

### UAT variant

So you can test from `localhost` / Cloudflare previews without writing to the prod table, duplicate
the workflow with the Webhook path **`uat-summer-party`** (optionally pointing the Airtable node at
a `Event Signups (UAT)` table or view). Activate it too.

---

## Step 3 — Test end-to-end

1. `npm run dev`, open `http://localhost:5173/summer-party/` (note the yellow **UAT** banner — it
   posts to `uat-summer-party`).
2. Fill the form, submit → you should see the "多謝報名！" success screen, and a new row in the
   UAT Airtable table.
3. In n8n, open the workflow's **Executions** tab to confirm the webhook fired and the Airtable
   step succeeded.
4. Repeat on production once deployed (posts to `summer-party`).

If submission errors, the form shows a Cantonese error message + an IG DM link with a diagnostic
detail line (shared `describeError` / `ErrorReportLink`) — the detail tells you the HTTP status.
