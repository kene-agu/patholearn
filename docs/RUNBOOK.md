# PathoLearn Runbook

Operational guide for running PathoLearn safely: how to test changes without
touching production, how to add slides, and how to keep the AI pipeline healthy.

---

## 1. Testing changes safely (don't push experiments to `main`)

`main` **is production** — every push deploys to real users. Never test directly
on it. Use Vercel Preview Deployments instead:

```bash
git checkout -b my-change          # 1. branch off main
# ...make changes...
git push -u origin my-change       # 2. push the branch
```

Vercel automatically builds a **unique preview URL** for the branch
(`patholearn-git-my-change-<scope>.vercel.app`). Open that on your phone/desktop
to test. Production is untouched.

When you're happy, merge the branch into `main` (via PR or `git merge`) — that is
what promotes the change to production.

> ⚠️ **Previews share production env vars by default.** A preview can still spend
> real Gemini credits and write to the real Supabase database. To isolate:
> - In Vercel → Settings → Environment Variables, scope a separate/capped
>   `GEMINI_API_KEY` to the **Preview** environment.
> - For full isolation, point Preview at a separate Supabase project.

CI (`.github/workflows/ci.yml`) runs type-check + slide guard + tests + build on
every push, so a broken commit is flagged before it can quietly break the site.

---

## 2. Adding or updating slides

Card grids render **thumbnails** (`/public/slides/thumbs/*.webp`), not the
full-res originals — that's what keeps the grid fast on mobile. Full-res
originals are kept for the analyzer/viewer.

After adding any image to `public/slides/`:

```bash
node scripts/generate-thumbs.mjs   # regenerate thumbnails
node scripts/check-slides.mjs      # verify every slide has one (CI runs this too)
git add public/slides
```

If you add a slide via `slideImages.ts` + `scripts/download-slides.mjs`, the
**Download slide images** GitHub Action now generates thumbnails automatically.

`check-slides.mjs` fails CI if any slide is missing a thumbnail — this is the
guard that prevents the "blank thumbnails on mobile" regression from recurring.

---

## 3. AI pipeline & Gemini credits

Slide analysis (`src/app/api/analyze/route.ts`) uses **Gemini 3.5 Flash** as the
primary model and **Groq** (Llama 4 Scout) as a degraded fallback. A response
tagged `pipeline: "groq"` ("Fallback pipeline" in the UI) means Gemini failed.

Gemini failures fall into four buckets — check Vercel logs for the
`Gemini [gemini-3.5-flash attempt ...]` line to tell which:

| Log signal | Meaning | Action |
|---|---|---|
| `429 ... prepayment credits are depleted` | **Out of credits** | Top up (below) |
| `429` (rate/quota) | Hit rate limit | Wait / raise quota |
| `503` | Google overloaded | Transient, no action |
| *(no Gemini error, fell to Groq)* | JSON truncated | Usually self-resolves |

### Topping up credits
1. https://aistudio.google.com/ → select the **PathoLearn** project.
2. Billing → **Buy credits** (project is on Tier 1 · Prepay).

### Early warning (so you're never surprised again)
- **Code:** when Gemini fails on credits, the admin is emailed even though Groq
  covers the request (`alertAdminError` with context `analyze-credits`,
  throttled to one email / 5 min). Requires `RESEND_API_KEY` + `ADMIN_EMAIL`.
- **Console:** set a budget in **Google Cloud → Billing → Budgets & alerts**
  (e.g. $10/mo with email alerts at 50% / 90% / 100%).

---

## 4. Required environment variables

| Variable | Used for |
|---|---|
| `GEMINI_API_KEY` | Primary slide-analysis model |
| `GROQ_API_KEY` | Fallback analysis model |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side subscription checks |
| `RESEND_API_KEY` + `ADMIN_EMAIL` | Admin error/credit alerts |
| `ERROR_ALERT_FROM` / `FEEDBACK_FROM` | Verified sender for alert emails (optional) |
