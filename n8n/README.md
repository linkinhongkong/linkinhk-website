# n8n workflows — 初夏 Party sign-up

Two **import-ready** n8n workflows that receive the `/summer-party` form POST and create a row in
Airtable. They are **identical except** the webhook path and the Airtable base/table in the HTTP
node's URL:

| File | Webhook path | Airtable base / table |
| ---- | ------------ | --------------------- |
| `summer-party-prod.json` | `summer-party`     | `appmdriYp9QILilWm` / `tblKLcqrVt6zXzHej` |
| `summer-party-uat.json`  | `uat-summer-party` | `appADVF4OThQGcFtA` / `tblcmDXoMYdyW3rk5` |

## Flow

`Webhook (POST)` → `Airtable — Create record` (HTTP Request to the Airtable REST API).
The Webhook uses **responseMode: lastNode**, so it replies `200` with the created record only after
the Airtable write succeeds (and a non-2xx if it fails) — which is exactly what the form checks.

The HTTP node authenticates with the existing **`Airtable Personal Access Token account`**
credential (`airtableTokenApi`) — the same one the other forms use. The request body maps the
posted JSON to the Airtable columns and **drops empty values**, so the unused branch's blank fields
(e.g. an empty 生日 date for an existing member) are never sent. `typecast: true` lets single-select
options auto-create.

## How to import (do this once per file)

1. n8n → **Workflows → Import from File** → choose `summer-party-prod.json`.
2. Open the **“Airtable — Create record”** node → in **Credential**, pick
   `Airtable Personal Access Token account` (the import ships a placeholder id you must replace by
   selecting it). Save.
3. **Activate** the workflow (top-right toggle).
4. Repeat for `summer-party-uat.json`.

> The PAT must have access to **both** bases (`appADVF4OThQGcFtA` UAT and `appmdriYp9QILilWm` prod).
> If the prod base isn't on the token, add it in Airtable → token settings, or the create call 422/403s.

## Test (UAT first)

1. Open the form's UAT preview (or localhost) at `/summer-party` — the yellow UAT banner means it
   posts to `uat-summer-party`.
2. Submit once as a **new member** and once as an **existing member**.
3. Check the **UAT** table (`tblcmDXoMYdyW3rk5`) for the two rows, and the workflow's **Executions**
   tab in n8n. The form should land on the「多謝你嘅報名」screen.
4. Once happy, repeat on production (`/summer-party` on the live site → `summer-party` → prod table).

## Field mapping

`is_existing_member→現有會員 · instagram→Instagram · name→姓名 · sex→性別 · whatsapp→WhatsApp ·`
`university→學院 · birthday→生日 · mbti→MBTI · occupation→職業 · want_membership→想加入會員 ·`
`consent→同意條款 · submitted_at→Submitted At · event_name→Event · event_id→Event ID`
