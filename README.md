# Event-management — Festoon

Boutique celebration concierge and "Party-in-a-Box" platform: a 3D box builder, 60–90 minute SOS express kits, a party-size calculator, a 3D decor visualizer, group split-pay, OTP/TOTP sign-in, and an ops portal.

**Stack:** Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind v4, Framer Motion, React Three Fiber/Drei, Zustand, Zod, Prisma 6 + PostgreSQL with RLS, Upstash rate limiting, Razorpay and Stripe over REST.

## Quick start

```bash
cp .env.example .env.local          # fill in secrets (see below)
npm install                         # also runs `prisma generate`
npx prisma migrate dev --name init  # create tables (uses DIRECT_URL)
psql "$DIRECT_URL" -f prisma/sql/rls.sql   # row-level security policies
npm run db:seed                     # catalog, decor kits, demo SOS hubs + stock
npm run dev
```

Generate secrets with `openssl rand -base64 32` (for `SESSION_SECRET` and `DATA_ENCRYPTION_KEY`) and `openssl rand -hex 24` (for `HASH_PEPPER`). In development `OTP_PROVIDER=console` prints sign-in codes to the server log. Production refuses to start with the console OTP provider or without Upstash.

**Database role.** Superusers and `BYPASSRLS` roles skip row-level security. Connect the app as a restricted role (e.g. `app_user` with plain table grants). If your provider only gives you a privileged user, set `APP_DB_ROLE=app_user` and the app will `SET LOCAL ROLE` into it for every scoped transaction. When you go through a transaction pooler (Supabase on port 6543, or PgBouncer), add `?pgbouncer=true` to `DATABASE_URL`.

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest: pricing, dietary rules, WhatsApp encoder, TOTP (RFC 6238 vectors), calculator |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint (Next core-web-vitals + React Compiler rules) |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma |

## Architecture

```
Browser ──► proxy.ts ──► App Router pages (RSC) ──► lib/server/db.ts ─► Postgres (RLS)
  │          • CSRF origin check on /api mutations          ▲
  │          • optimistic gate for /dashboard, /admin       │ withUser(): SET LOCAL app.user_id/role
  │                                                         │ withSystem(): webhooks, OTP, split tokens
  ├─ Zustand (builder, persisted cart) ─► /api/* route handlers ─► Zod ─► rate limit ─► domain/engine
  ├─ R3F scenes (hero, builder preview, decor room) — client-only, quality-tiered
  └─ Razorpay Checkout / Stripe Checkout redirect ◄── payment created server-side
                                         webhooks ──► confirmPayment() (idempotent)
```

**Principles**

- **The server prices everything.** `lib/domain` and `lib/booking/quote.ts` are pure and shared. The client uses them for instant feedback, and the server recomputes from the catalog on every booking, so client totals are never trusted.
- **Progressive gate.** Anyone can build, price, and send a WhatsApp brief. Saving designs, booking, and paying require an OTP session. Staff need TOTP as well, enforced in `proxy.ts`, `requireUser()`, and the admin page.
- **Defense in depth.** Zod validates every input. Postgres RLS enforces ownership even if a handler forgets a `where`. PII is AES-256-GCM encrypted, and HMAC hashes are used for lookups.
- **Idempotent payments.** Bookings carry an idempotency key. `confirmPayment()` captures once and is safe to call from both the checkout callback and webhooks.

## Directory structure

```
prisma/
  schema.prisma            users, sessions, OTP, catalog, recipes, custom boxes, inventory,
                           zones/stock, orders/lines/events, payments, split-pay, decor, audit
  sql/rls.sql              row-level security policies (apply after migrate)
  seed.ts                  syncs code catalog → DB, demo hubs + stock
src/
  proxy.ts                 CSRF origin check + route gating (Next 16 "middleware")
  app/
    page.tsx               landing: 3D hero, features, inline calculator
    build/ sos/ plan/ decor/   feature pages
    checkout/ login/ pay/[token]/
    dashboard/             My celebrations, order detail, 2FA settings
    admin/                 ops portal (pipeline, inventory, decorator calendar) + server actions
    api/
      auth/{otp,totp}/…    request/verify OTP, TOTP setup/enable/verify, logout, me
      bookings/            booking engine entry point
      sos/availability/    geofence + live stock + queue depth
      split/[token]/       group-gift link read + contribute
      orders/[id]/…        invoice, pay balance
      payments/razorpay/verify/   checkout signature fast path
      webhooks/{razorpay,stripe}/ signed, idempotent
      boxes/               save custom designs
    manifest.ts            PWA manifest
  components/
    hero/HeroExperience.tsx      quality-tiered R3F hero with static SVG fallback
    three/                       CelebrationBox, PartyItem, Atmosphere (confetti, balloons),
                                 Lighting, HeroScene, BoxPreviewScene, DecorRoomScene
    builder/BoxBuilder.tsx       Build-Your-Box configurator
    booking/                     Checkout, SplitPayContribute
    features/                    SosExpress, PartyCalculator, DecorVisualizer
    auth/ dashboard/ layout/ ui/
  lib/
    domain/                catalog, box (spec, dietary, pricing tiers), party-calculator,
                           sos kits, order-status, money
    booking/               schema (Zod), quote, whatsapp encoder, engine, split, gateways/
    auth/                  token (jose JWT), session, otp, otp-delivery, totp
    server/                env, db (RLS scoping), crypto, rate-limit, http, sos, orders
    client/                checkout (Razorpay/Stripe), useHydrated
  stores/                  box-builder, cart (Zustand)
tailwind.config.ts         palette, fonts, glow shadows, animations
src/app/globals.css        Glass OS utilities: glass, glass-strong, glass-prism, grain
```

## Feature notes

- **Hero / 3D.** `detectQuality()` probes WebGL, memory, cores, `saveData`, pointer type, and reduced motion, then picks `high`, `low`, or `static`. `PerformanceMonitor` downgrades to `low` if the frame rate drops, and rendering pauses while the hero is offscreen. Lighting comes from a procedural Lightformer environment, and sleeve text is painted to a canvas texture, so the scenes make no HDR or font CDN requests.
- **Build-Your-Box.** Category slot rules live in `BOX_RULES`. A box only earns the Vegan, Eggless, or GF badge if every edible item in it qualifies, and any nut item raises the alert. Bulk tiers (5–20%) apply across every box line in the cart.
- **SOS express.** PIN code → `ServiceZone` geofence → opening hours and cutoff → per-item `ZoneStock`. Stock is reserved with conditional decrements inside the order transaction, so two orders can't take the last kit. These orders get `priority=10` in the packing queue.
- **WhatsApp Direct-Sync.** `encodeConciergeLink()` builds a structured brief and strips WhatsApp formatting characters from user text. It falls back from full → compact → minimal detail to keep the URL under 3,800 characters.
- **Split-pay.** Only the SHA-256 of the share token is stored. Guests see the event and progress but no address or contact details. The order moves to `NEW` once the link is fully funded.

## Before going live

- Replace the demo hubs in `prisma/seed.ts` with real geofences and stock.
- Register a WhatsApp **authentication** template (with a copy-code button) and set `OTP_PROVIDER`.
- Point Razorpay webhooks (`payment.captured`, `payment.failed`, `order.paid`) at `/api/webhooks/razorpay`, and Stripe `checkout.session.*` at `/api/webhooks/stripe`.
- Set `NEXT_PUBLIC_APP_URL` to the https origin. That enables HSTS and `upgrade-insecure-requests`.
- Retune the calculator's per-head heuristics in `lib/domain/party-calculator.ts` once you have real fulfilment data.
