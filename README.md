# sky-co-jewelry

## Quote form anti-spam hardening

This repository includes:

- A Turnstile-enabled quote form component at `components/QuoteForm.tsx`.
- API verification + honeypot + in-memory rate limiting at `app/api/quote/route.ts`.
- Apps Script webhook code (with optional `?key=` secret validation and `Location` column support) in `scripts/apps-script-webhook.js`.
- Required environment variables listed in `.env.example`.

### Cloudflare Turnstile setup

1. In Cloudflare Dashboard: **Turnstile → Add site**.
2. Add your domains (`skycojewelry.com`, Vercel domain, etc.).
3. Choose widget type (Managed recommended).
4. Copy your keys and set Vercel env vars:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`

### Vercel env vars

Set these in Vercel project settings:

- `SHEETS_WEBHOOK_URL`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

### Apps Script deploy/update

1. Replace your Apps Script code with `scripts/apps-script-webhook.js`.
2. Set `WEBHOOK_SECRET` to a long random value.
3. Deploy → Manage deployments → Edit → New version → Deploy.
4. Ensure deployed URL matches `SHEETS_WEBHOOK_URL` (including `?key=...`).

### Quick test (PowerShell)

```powershell
$uri = "https://YOUR_VERCEL_SITE_URL/api/quote"
$body = @{
  name = "Test Lead"
  email = "test@test.com"
  phone = "5125551234"
  message = "Ring inquiry"
  location = "Georgetown"
  company = ""
  turnstileToken = "paste_real_turnstile_token_here"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body
```
