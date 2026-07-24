# Build Brief: PathoLearn Marketing Landing Page
*For use with Claude Code, inside the `kene-agu/patholearn` repo*

## Goal
Add a server-side-rendered (SSR/SSG) marketing landing page to the existing PathoLearn Next.js app. Currently the app is fully client-rendered, so there is no crawlable marketing page — this route fixes that and becomes the primary link for ads, grant applications, and institutional outreach.

## Decisions already made (do not revisit)
- **DUFUHS is NOT named anywhere** — pending institutional approval. The social proof strip exists only as an HTML comment placeholder. The institutions card says "a Nigerian medical university" instead. Leave both as-is.
- **Real assets exist.** Hero screenshot and logo are supplied — see Assets below. No placeholder slots needed.
- **Teaching Mode is not mentioned** — still in development. Add to the institutions card once it ships.
- **Copy is final** — see `patholearn-landing-page-copy.md`, which is synced to the reference HTML. Use it verbatim.

## Domain/routing structure — IMPORTANT
This page must be **exclusively marketing** — no login, no app functionality. The actual PathoLearn product stays completely separate.

Preferred structure: **subdomain split**
- `getpatholearn.com` (root) → marketing/landing page ONLY (this build)
- `app.getpatholearn.com` (or wherever the current live app already sits) → the actual product/dashboard/login, untouched

Inside the landing page, the **"Try PathoLearn"** button is simply an external link (`<a href="https://app.getpatholearn.com">`) that sends the user to the real app — it is NOT a route within this same app, and does NOT need auth logic, redirects, or shared session state.

**Before building:** confirm where the live app currently resolves (root domain vs. its own subdomain/Vercel URL). If the app is currently at root, this may mean either (a) standing up the landing page as a new, separate Vercel project on the root domain and moving the app to a subdomain, or (b) the landing page becomes a new project and the app keeps its current URL, with root domain repointed. Either way — **do this as a separate Vercel project/deploy from the main app**, not a route bolted onto the existing app's codebase, so the two stay fully decoupled (same pattern as the e-pharmacy build).

## Technical requirements
- **Rendering:** Must be statically generated or SSR (not client-only) so it's crawlable — use Next.js App Router static pages, no `"use client"` at the top level.
- **Styling:** Reuse existing Tailwind config, fonts, and color tokens from the app — no new design system.
- **SEO:** Add proper `<title>`, meta description, Open Graph tags, and alt text on all images (see SEO notes below).
- **Performance:** Compress/optimize any hero images or video; lazy-load below-the-fold sections.
- **CTAs as built:**
  - "Try PathoLearn" (nav + hero ghost) and "See it in action" → external link to the live app *(see open question 1)*
  - "Book a demo" (hero) and "Talk to us" (institutions card) → currently anchor to `#demo`; wire to a real contact form or Calendly if one exists
  - "Request a demo" (footer band) → `mailto:hello@getpatholearn.com`; confirm that address is live

## Page structure (as built)
Copy for every section is in `patholearn-landing-page-copy.md` — use it verbatim.

1. **Nav** — logo image (not a wordmark), sticky, blurred backdrop, "Try PathoLearn" CTA
2. **Hero** — centred: eyebrow, H1, subhead, two CTAs
3. **Hero screenshot** — full-width app screenshot, rounded card, no browser chrome, no caption
4. *(Social proof strip — HTML comment placeholder only, not built)*
5. **The problem** — two cards
6. **How it works** — three numbered steps
7. **Institutions & individuals** — two cards side by side
8. **Footer CTA** — dark band
9. **Footer** — logo image, About / Contact / Privacy

Sections deliberately removed and not to be reintroduced: the "Why faculty-curated" trust section and its attributes table, the competitor differentiation section, and any use of the word "verified" or reference to AI hallucination. See the copy doc's removal list.

## Assets (supplied)
| File | Destination | Notes |
|---|---|---|
| `patholearn-logo.png` | `/public/` | Transparent PNG, ~1093×889. Nav 34px tall, footer 26px. It's a square-ish mark, not a horizontal lockup |
| `patholearn-slide-view.jpeg` | `/public/` | Hero screenshot, 1490×671 original |

**Important:** the reference HTML has both images base64-embedded so it previews standalone. Strip those data URIs and use the real files via `next/image` with `priority` on the hero screenshot.

## Design reference
`patholearn-landing.html` is a visual reference, not production code. Port it to the existing Tailwind setup rather than copying the raw CSS. Preserve:
- **Palette** — derived from the logo: `#1860F0` brand blue (buttons, accents), `#4830F0` violet (eyebrow labels, list markers), `#0E1330` ink, `#F5F6FA` background
- **Type** — Fraunces (display) / IBM Plex Sans (body) / IBM Plex Mono (labels, buttons). Swap for our existing faces if they're already set.
- **Motion** — screenshot tilts up from 7° perspective on scroll-in with a single sheen sweep; staggered rise-ups (80ms offsets) via IntersectionObserver, firing once; nav border appears on scroll; button hover lifts
- **Accessibility floor** — full `prefers-reduced-motion` fallback, `focus-visible` rings, works at 375px

## SEO metadata to implement
- **Title:** PathoLearn — Histopathology Learning Platform for Medical Schools
- **Meta description:** PathoLearn is a histopathology learning platform for medical students. Real annotated slides, active-recall quizzes and spaced repetition, on any device.
- One H1 only (hero headline)
- `og:image` **must be an absolute URL** (e.g. `https://getpatholearn.com/patholearn-slide-view.jpeg`) — relative paths don't work for social previews. The reference HTML has a comment marking this spot.

## Open questions — resolve before building
1. **Where does "Try PathoLearn" point?** `app.getpatholearn.com` in the reference is a placeholder that does not exist. Either create the DNS record and add the domain in Vercel, or point these links at the app's current URL.
2. **Separate Vercel project or route in this repo?** Brief recommends separate; confirm.
3. **"For Individuals" copy** — heading was broadened from "For students" but the bullets still say "less cramming before exams" and the institutions card says "per student, per year". Confirm whether to reword for a wider audience.

## Review checklist (before any merge)
- Lighthouse run — motion and image weight are the main risks
- View-source confirms the copy is in the served HTML, not client-rendered (this is the whole point)
- Renders correctly at 375px
- Social proof placeholder comment still present and unfilled

## Deliverable & branching — IMPORTANT
- **Do NOT merge to `main`.** Build this on a new feature branch (e.g. `feature/landing-page`) and leave it there for review.
- Push the branch and let Vercel generate a **preview deployment URL** — share that for review instead of shipping live.
- No merge, no production deploy, until explicitly approved.
