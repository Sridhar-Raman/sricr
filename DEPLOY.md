# Deploying SRI.CR for free

Three free pieces. Total cost: **$0** (a custom `sricr.com` name is the only paid extra, about $10–12 a year, optional).

| Piece | Service | Free address you get |
|---|---|---|
| Database | MongoDB Atlas (you already have it) | – |
| API (`server/`) | Render | `https://sricr-api.onrender.com` |
| Website (`client/`) | Vercel (or Netlify) | `https://sricr.vercel.app` |

## 0. Put the code on GitHub (once)

The folder is not a git repository yet. `.env` files are already ignored, so your secrets are not uploaded.

```bash
cd Appointment_project
git init
git add .
git status          # check that no .env file is listed
git commit -m "SRI.CR appointment app"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/sricr.git
git branch -M main
git push -u origin main
```

## 1. Database: allow the host to connect

Atlas → **Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)**. Free hosts have changing IP
addresses, so a fixed list does not work. The database password protects it. Use a strong one.

## 2. API on Render

1. render.com → **New → Blueprint** → pick the GitHub repo. It reads `render.yaml`.
2. Fill in the values it asks for:
   - `MONGODB_URI`: your Atlas connection string (the same one as in `server/.env`)
   - `CLIENT_ORIGIN`: `https://sricr.vercel.app` (change it in step 4 if the address differs; add the .com later with a comma)
   - `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: your Brevo values
3. `JWT_SECRET` is generated for you. Do not reuse the development one.
4. After the deploy, open `https://<your-service>.onrender.com/api/health`. It should say `{"status":"ok"}`.

**Free plan limits.** The service sleeps after 15 minutes without visits, and the first request afterwards takes
about 30–60 seconds. Reminder emails are sent by a job inside the API, so they only go out while it is awake. To keep
it awake, add a free monitor at uptimerobot.com that requests `/api/health` every 5 minutes. The paid Starter plan
(about $7 a month) removes both limits.

## 3. Create the first admin

On your own computer, with the same `MONGODB_URI` in `server/.env`:

```bash
cd server
npm run seed:admin
```

(If you already ran it against this Atlas database, the admin exists.)

## 4. Website on Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. **Root Directory:** `client`. Framework: Vite (detected). Build command and output directory stay default.
3. **Environment Variable:** `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash, no `/api`).
4. Deploy. If the address it gives you is not `sricr.vercel.app`, set Render's `CLIENT_ORIGIN` to the real address and redeploy the API.

Pages like `/app/calendar` work on refresh because `client/vercel.json` sends every path to the app.

Netlify instead: base directory `client`, build `npm run build`, publish `client/dist`, same `VITE_API_URL`; add a
`_redirects` file containing `/* /index.html 200` in `client/public/`.

## 5. Add sricr.com later

1. Buy `sricr.com` at a registrar (Namecheap, Cloudflare, GoDaddy). First check that the name is free.
2. Vercel → Project → **Settings → Domains → Add** `sricr.com` and `www.sricr.com`, and add the DNS records it shows
   at your registrar. HTTPS is automatic.
3. Render → Environment → `CLIENT_ORIGIN` = `https://sricr.com,https://www.sricr.com,https://sricr.vercel.app`.
   The first entry is used for links in emails.
4. In Brevo you can also verify the domain (Senders, Domains → Domains) so emails come from `no-reply@sricr.com`.

## Checklist before real users

- [ ] Strong `JWT_SECRET` (the blueprint generates one) and a strong Atlas password
- [ ] `server/.env` was never committed (`git status` showed no `.env`)
- [ ] Brevo test email works: `cd server && npm run test:mail -- you@example.com`
- [ ] `BUSINESS_TIMEZONE` is correct for your business (the blueprint sets `Asia/Kolkata`)
- [ ] Rotate any password that was ever pasted in a chat or committed
