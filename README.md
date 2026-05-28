# PBK 20th Anniversary — Memory Wall

Static site celebrating Promega BioSystems Korea's 20th anniversary (2006–2026), hosted on Vercel with Supabase as the backend for messages and photos.

Built for the live presentation during Bill Linton's PBK visit on June 2, 2026.

## Stack

- **Frontend:** plain HTML + JS (no build step)
- **Hosting:** Vercel (auto-deploys from this repo)
- **Backend:** Supabase (Postgres for messages, Storage for photo files)
- **Visualization:** Chart.js (Maxwell shipment history)

## Features

- Bilingual (KO/EN) — top-right toggle
- Live message wall (PBK staff + worldwide Promega family)
- Photo gallery + per-team-member portraits
- Maxwell shipment chart (2005–2025, 10,084 units)
- Admin panel — reorder photos, delete entries (PIN: `pbk2026`)
- **Present mode** — fullscreen auto-advancing slideshow for the event day
- Web Audio API background music
- Image compression on upload (1400px JPEG)

## Configuration

The Supabase URL and anon key are inlined in `index.html` (anon key is safe to expose; RLS policies enforce access). To rotate, edit the two constants at the top of the `<script>` block.

## Deploy

Push to `main` — Vercel auto-deploys in ~30s.
