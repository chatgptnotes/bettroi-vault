# DoubleTick → Brain webhook (Vercel)

Receives DoubleTick "Message Received" webhooks for your **business** WhatsApp number
(+91 8856945017) and ingests the text into `brain_chunks` (private / `off_limits`).

⚠️ **Do NOT point your patient/Adamrit DoubleTick number at this.** Business line only.

## Deploy (one time)

1. Install the Vercel CLI if needed: `npm i -g vercel`
2. From this folder:
   ```bash
   cd _Murali-Second-Brain/doubletick-webhook
   vercel            # link/create a new project (accept defaults)
   vercel deploy --prod
   ```
   Note the production URL it prints, e.g. `https://doubletick-brain-webhook.vercel.app`

3. Set the 4 environment variables in the Vercel project (Vercel dashboard → Project → Settings → Environment Variables), then redeploy:
   - `SUPABASE_URL`        — same as in your .env.local
   - `SUPABASE_SERVICE_KEY`— same as in your .env.local
   - `OPENAI_API_KEY`      — same as in your .env.local
   - `WEBHOOK_SECRET`      — a secret you choose, e.g. `a22220d8edcd8fc458e2fed772fa048f`

## Connect DoubleTick (one time)

1. Go to https://web.doubletick.io/ → Settings → Webhooks → **New webhook**
2. Webhook URL (include the secret as `?key=`):
   ```
   https://<your-vercel-url>/api/doubletick-webhook?key=<WEBHOOK_SECRET>
   ```
3. Select the **Message Received** event → Save.

## Test
Send a WhatsApp message to the business number from another phone. Within seconds it
should appear in `brain_chunks` (source_type `whatsapp`, project_tag `whatsapp-business`).
Then ask `@brain` about it.

## Notes
- Only the **text/caption** of messages is ingested. Media files (PDFs/images) are
  acknowledged but not yet extracted — can be added later (download `message.url` → firecrawl).
- Every ingested message is `off_limits: true` (only Murali's brain role can see it).
- Idempotent: re-delivery of the same `messageId` replaces, never duplicates.
- Security: the `?key=` secret blocks random callers. Keep the URL private.
