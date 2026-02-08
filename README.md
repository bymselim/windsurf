# Luxury Art Gallery

A mobile-first, production-ready luxury art gallery built with Next.js 14 (App Router), React, TypeScript, and Tailwind CSS.

## Features

- **Protected access gate**: Full name, phone, password, and KVKK consent before entering the gallery.
- **Session**: JWT in HTTP-only cookie + localStorage; middleware protects `/gallery`.
- **Gallery**: Category tabs (All, Stone, Balloon, Cosmo), masonry grid, lightbox with prev/next and order menu (WhatsApp, Email, Instagram).
- **Data**: Artworks are stored in a local array in `data/artworks.ts` (12 sample items). No database required.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables (optional)

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

- **NEXT_PUBLIC_ACCESS_PASSWORD**: Password required to enter the gallery. If omitted, any password works (demo only).
- **JWT_SECRET**: Secret for signing session tokens (defaults to a dev value if unset).
- **NEXT_PUBLIC_WHATSAPP_NUMBER**, **NEXT_PUBLIC_CONTACT_EMAIL**, **NEXT_PUBLIC_INSTAGRAM**: Used in the “Order This Artwork” menu.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter the access password (or any value if `NEXT_PUBLIC_ACCESS_PASSWORD` is not set) and proceed to the gallery.

## Project structure

- **`/app`**: App Router pages (`page.tsx` = access gate, `gallery/page.tsx` = gallery), layout, API routes.
- **`/components`**: AuthGate, KVKKModal, CategoryTabs, MasonryGrid, ArtworkModal, OrderMenu.
- **`/data`**: `artworks.ts` — local array of 12 sample artworks. Edit this file to add or change artworks.
- **`/lib`**: Auth (JWT + cookie), types.

## Customization

- **Artworks**: Edit `data/artworks.ts`. Use Cloudinary or `/public` URLs for `imageUrl`; add the host to `next.config.js` if using a custom domain.
- **Categories**: Edit `CATEGORIES` and `ArtworkCategory` in `lib/types.ts`, and add matching entries in `data/artworks.ts`.
- **KVKK text**: Edit the constant in `components/KVKKModal.tsx`.

## Environment variables summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ACCESS_PASSWORD` | No* | Gate password (*if unset, any password works for demo) |
| `JWT_SECRET` | No | Session signing secret (defaults to dev value) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | For "Order This Artwork" WhatsApp link |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | For "Order This Artwork" mailto link |
| `NEXT_PUBLIC_INSTAGRAM` | No | Instagram handle for order menu link |

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add env vars in Vercel (e.g. `NEXT_PUBLIC_ACCESS_PASSWORD`).
3. Deploy. No database or build step required.
