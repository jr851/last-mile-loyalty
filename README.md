# ⚠️ DEPRECATED — DO NOT USE THIS REPO

**This repository has been superseded by [`jr851/loyalty-app`](https://github.com/jr851/loyalty-app) (private).**

All code has been synced to `loyalty-app`, which is the repo connected to Vercel for production deployments at [lastmileloyalty.com](https://lastmileloyalty.com).

**Do not push changes here.** Push to `jr851/loyalty-app` instead.

---

# Loyalty App

A self-service loyalty programme builder for cafés and small businesses. Built with Next.js, Supabase, and Tailwind CSS.

## Quick Start

### 1. Set Up Supabase

Visit https://supabase.com and create a new project. Then:

1. Go to the SQL editor
2. Paste the SQL from `../SUPABASE_SCHEMA.md`
3. Run it to create all tables
4. Copy your project URL and anon key

### 2. Configure Environment

Create a `.env.local` file in this directory:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you should see the home page with login/signup links.

## Project Structure

```
loyalty-app/
├── app/               # Next.js app directory
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Home page
│   ├── globals.css    # Global styles
│   ├── owner/         # Owner routes (setup, dashboard, etc.)
│   ├── customer/      # Customer routes (enrol, card, redeem)
│   ├── staff/         # Staff routes (stamp, redeem)
│   └── admin/         # Admin routes (overview)
├── lib/
│   ├── supabase.ts    # Supabase client
│   ├── types.ts       # TypeScript types
│   └── utils.ts       # Helpers
├── components/        # React components
│   └── ui/            # Reusable UI components
├── public/            # Static files
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── postcss.config.js
```

## Phase 1: Owner Setup Wizard

**Goal:** Owner can sign up, complete setup wizard, and get a QR code.

Tasks to build:
- [ ] Owner signup/login page
- [ ] Owner setup wizard (2 steps: branding + reward rule)
- [ ] QR code generation
- [ ] Owner dashboard skeleton

Routes to create:
- `/owner/login`
- `/owner/signup`
- `/owner/setup` (step 1)
- `/owner/setup/reward` (step 2)
- `/owner/dashboard`
- `/owner/qr`

## Build Plan

See `../BUILDPLAN.md` for the full 4-week implementation plan.

## Notes for Development

1. **Authentication:** Using Supabase Auth. Owners sign up with email/password.
2. **QR Codes:** Using `qrcode.react` library. QR encodes: `{business_slug}/{customer_id}`
3. **Staff Access:** No staff accounts. Just share a PIN-protected link with WhatsApp.
4. **Live Updates:** Supabase subscriptions for real-time dashboard updates.
5. **Deployment:** Push to Cloudflare Pages when ready to test with real cafés.

## Git Workflow

This is a collaborative build — commit frequently with clear messages so we can track progress.

```bash
git add .
git commit -m "Phase 1: Add owner signup page"
git push
```

## Troubleshooting

**"Missing Supabase environment variables"**
- Check `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after updating `.env.local`

**"Cannot connect to Supabase"**
- Verify project URL and anon key are correct
- Check Supabase project is "Active" (not paused)
- Verify tables were created by checking the "Tables" view in Supabase dashboard

**QR code not displaying**
- Check `qrcode.react` is installed (`npm list qrcode.react`)
- Ensure the data being encoded is not too long
