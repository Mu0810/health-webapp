# Healthvibe

A nutrition and energy-availability tracker. Log food by photograph, and the app estimates its
macros, tracks them against targets computed from your own body metrics, and reports **Energy
Availability (EA)** — the sports-science measure of whether you are actually fuelling enough for your
activity level, rather than just counting calories.

Built with Next.js 16 (App Router), TypeScript, and Prisma over libSQL/SQLite.

---

## Contents

- [Why energy availability](#why-energy-availability)
- [Features](#features)
- [The maths](#the-maths)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Testing](#testing)
- [Known limitations](#known-limitations)

---

## Why energy availability

Most trackers stop at "calories in versus calories out". Energy availability asks a more useful
question: after exercise burn is subtracted, how much energy is left to run your body, normalised to
your fat-free mass?

```
EA = (Energy Intake − Exercise Energy Expenditure) / Fat-Free Mass     [kcal/kg FFM/day]
```

The app classifies the result on established thresholds (`lib/ThemeConfig.ts`):

| EA (kcal/kg FFM/day) | State | Meaning |
| --- | --- | --- |
| ≥ 45 | **Green** | Optimal availability |
| 30 – 45 | **Amber** | Reduced |
| < 30 | **Red** | Low energy availability |

That state drives the entire interface — colour, messaging, and nudges all follow it, so the number
is not buried in a dashboard.

---

## Features

**Photo-based food logging** — Upload a meal photo to `/api/vision`; an image-capable model returns
dish name, calories, protein, carbs, fats, an optional glycemic index, and a confidence rating. Files
are validated as images and capped at 8 MB before being read into memory.

**Personal targets from your own metrics** — BMI, BMR, TDEE, fat-free mass, and macro splits are
computed from age, gender, weight, height, activity level, and goal.

**Live EA and vitality tracking** — `lib/EAController.ts` is a reactive controller holding biometric
state (glucose, HRV, active burn, glucose history) alongside nutrition state, recomputing EA and a
vitality score as entries land.

**AI diet plans** — `/api/diet-plan` generates a structured seven-day plan honouring the user's
computed targets and diet type.

**Coaching chat** — `/api/coach` answers questions with the user's current profile and logs as
context.

**Contextual nudges and trends** — Glycemic-aware nudges, a smart menu, and a trends panel over
logged history.

**Works without an account** — Records key off a client-generated device id, so the app is usable
immediately with no signup.

---

## The maths

All of it lives in `lib/nutrition.ts` as pure functions — no React, no I/O — specifically so it can be
unit-tested in isolation.

**BMR — Mifflin-St Jeor**

```
male:    10·weight(kg) + 6.25·height(cm) − 5·age + 5
female:  10·weight(kg) + 6.25·height(cm) − 5·age − 161
```

**TDEE** — BMR times an activity multiplier:

| Activity level | Multiplier |
| --- | --- |
| sedentary | 1.2 |
| light | 1.375 |
| moderate | 1.55 |
| active | 1.725 |
| very active | 1.9 |

**Target calories** — TDEE with a goal adjustment: −500 kcal to lose, +300 kcal to gain, unchanged to
maintain.

**Fat-free mass** — body weight minus an estimated fat mass, which then becomes the denominator of the
EA calculation.

---

## Architecture

```
health-webapp/
├── app/
│   ├── api/
│   │   ├── vision/route.ts      food photo -> nutrition estimate
│   │   ├── diet-plan/route.ts   7-day structured meal plan
│   │   ├── coach/route.ts       contextual coaching chat
│   │   ├── logs/route.ts        food log CRUD
│   │   ├── profile/route.ts     profile read/write + computed targets
│   │   └── routes.test.ts       route handler tests
│   ├── layout.tsx
│   └── page.tsx
├── components/                  11 client components, each with a CSS module
│   ├── PersonalProfile.tsx      onboarding + metric capture
│   ├── VisionLogger.tsx         camera/upload flow
│   ├── DietPlanGenerator.tsx    plan request + rendering
│   ├── CoachChat.tsx            chat surface
│   ├── BiometricWave.tsx        glucose/HRV visualisation
│   ├── VitalityRing.tsx         composite vitality score
│   ├── EnergyTank.tsx           EA gauge
│   ├── TrendsPanel.tsx          history over time
│   ├── SmartMenu.tsx            suggestions
│   ├── ContextualNudge.tsx      state-driven prompts
│   └── WelcomeOverlay.tsx       first-run experience
├── lib/
│   ├── nutrition.ts             pure BMI/BMR/TDEE/macro math
│   ├── EAController.ts          reactive EA + biometric state hook
│   ├── ThemeConfig.ts           EA thresholds -> colour/label mapping
│   ├── openrouter.ts            OpenAI-compatible client w/ model fallback
│   ├── localStore.ts            local persistence
│   ├── device.ts                device-id generation
│   └── prisma.ts                Prisma client singleton
├── prisma/schema.prisma
└── Dockerfile
```

**Model fallback chain.** `lib/openrouter.ts` is the most load-bearing piece of infrastructure here.
OpenRouter's free tier is rate-limited rather than credit-limited, so any single free model returns
429 unpredictably. Rather than fail the request, the client walks an ordered **chain** of models and
returns the first successful completion, with separate chains for vision and text and a per-model
timeout. Both chains are overridable via environment variable, so the models can be retuned without a
redeploy.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Route Handlers) |
| Language | TypeScript |
| UI | React, CSS Modules, `classnames` |
| Database | Prisma with `@prisma/adapter-libsql` — SQLite locally, Turso/libSQL in production |
| AI | OpenRouter (OpenAI-compatible), free vision + text model chains |
| Tests | Vitest |
| Deploy | Vercel, or the included Dockerfile |

---

## Data model

Three models, keyed by a client-generated device id (`prisma/schema.prisma`):

- **`User`** — the device identity, with optional display name.
- **`Profile`** — raw inputs (age, gender, weight, height, activity level, goal, diet type) *and* the
  derived values persisted alongside them: `bmi`, `bmr`, `tdee`, `targetCalories`, `targetProtein`,
  `targetCarbs`, `targetFats`, `ffm`. One per user.
- **`FoodLog`** — a logged item with macros and optional glycemic index, indexed on
  `[userId, timestamp]` for efficient day and range queries.

Both child models cascade on user deletion.

---

## Getting started

**Prerequisites:** Node.js 18+, npm, and an [OpenRouter API key](https://openrouter.ai/keys) for the
AI features.

```bash
git clone https://github.com/Mu0810/health-webapp.git
cd health-webapp
npm install                 # runs `prisma generate` via postinstall

cp .env.example .env        # set OPENROUTER_API_KEY; DATABASE_URL defaults to a local SQLite file

npx prisma migrate dev
npm run dev                 # http://localhost:3000
```

Profile setup, logging, and EA tracking work without an API key. Photo analysis and diet-plan
generation require `OPENROUTER_API_KEY` and return a clear error without one.

| Script | Does |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | `prisma generate && next build` |
| `npm start` | production server |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint |

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` locally, or a `libsql://` URL for Turso |
| `DATABASE_AUTH_TOKEN` | remote only | required for hosted Turso, omit for a local file |
| `OPENROUTER_API_KEY` | for AI features | vision and diet-plan endpoints |
| `OPENROUTER_VISION_MODELS` | no | comma-separated override, priority order; must support image input |
| `OPENROUTER_TEXT_MODELS` | no | comma-separated override for diet-plan generation |
| `OPENROUTER_SITE_URL` | no | sent as `HTTP-Referer` for OpenRouter attribution |

On the text chain: a seven-day plan is a large structured output, and free models are often
rate-limited or too slow to finish inside the serverless time limit. Putting one fast paid model
first makes plan generation reliably fast for a fraction of a cent per plan.

---

## API reference

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/vision` | multipart image upload → nutrition estimate JSON |
| POST | `/api/diet-plan` | seven-day meal plan for the user's targets |
| POST | `/api/coach` | coaching response using profile + logs as context |
| GET/POST | `/api/logs` | read and append food logs |
| GET/POST | `/api/profile` | read and upsert profile with recomputed targets |

`/api/vision` sets `maxDuration = 60` to accommodate the fallback chain on Vercel.

---

## Testing

```bash
npm test
```

Three suites, covering the parts where correctness actually matters:

- **`lib/nutrition.test.ts`** — BMI, BMR, TDEE, and macro targets against hand-checked values.
- **`lib/ea.test.ts`** — the EA formula and its threshold classification.
- **`app/api/routes.test.ts`** — route handler behaviour including validation failures.

The nutrition and EA logic is deliberately pure so these tests need no database, network, or DOM.

---

## Known limitations

1. **No authentication.** Identity is a client-generated device id, so clearing site data or
   switching browsers starts a fresh profile, and records are not portable across devices. Real
   accounts are the obvious next step.
2. **Biometric values are not from a real device.** Glucose and HRV are modelled in
   `EAController.ts`, not read from a CGM or wearable. Treat them as a simulation of the interface a
   real integration would drive.
3. **Nutrition estimates are model guesses.** A photo cannot reveal portion size, oil, or hidden
   ingredients. The API returns a `confidence` field for exactly this reason — it should be surfaced
   prominently rather than presented as measurement.
4. **Free-tier AI is best-effort.** Even with the fallback chain, sustained rate limiting can make
   every model in a chain unavailable. Diet-plan generation is the most exposed, being the largest
   output.
5. **Not medical advice.** BMR and TDEE formulas are population estimates, and the EA thresholds are
   general guidance. This is a self-tracking tool, not a clinical one.
6. **The package is still named `hack-a-thon`** in `package.json`, which predates the project having
   a name.
