# Luxury Art Gallery

A mobile-first, production-ready luxury art gallery built with Next.js 14 (App Router), React, TypeScript, and Tailwind CSS.

## Features

- **Dual Gallery System**: Separate Turkish and International galleries with localized content
- **Protected Access Gate**: Full name, phone, password, and KVKK consent before entering
- **Session Management**: JWT in HTTP-only cookie; middleware protects gallery routes
- **Gallery Views**: Category tabs, masonry grid, lightbox with prev/next navigation
- **Order System**: WhatsApp, Email, Instagram order options
- **Admin Panel**: Manage artworks, categories, access logs, and settings
- **Analytics**: Track visits, devices, and popular artworks
- **Data Storage**: JSON-based storage (no database required)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values (see Environment Variables section below).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── (turkish)/turkish/       # Turkish gallery routes
│   ├── (international)/international/  # International gallery routes
│   ├── admin/                   # Admin panel pages
│   ├── api/                     # API routes
│   └── styles/                  # Global styles
├── components/                  # React components
├── lib/                         # Utilities, types, data access
│   └── data/                    # JSON data files
└── public/                      # Static assets
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** (production) | Secret for signing session tokens |
| `NEXT_PUBLIC_ACCESS_PASSWORD` | No | Default gallery password |
| `ADMIN_PASSWORD` | No | Admin panel password (default: admin123) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | WhatsApp number for orders |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Email for order inquiries |
| `NEXT_PUBLIC_INSTAGRAM_USERNAME` | No | Instagram handle for DMs |
| `NEXT_PUBLIC_IMAGES_BASE` | No | Base URL for artwork images (default: /artworks) |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `JWT_SECRET` (required for production)
   - Other variables as needed
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## Admin Panel

Access the admin panel at `/admin`. Default password: `admin123`

Features:
- **Artworks**: Edit titles, descriptions, prices (TR/EN)
- **Categories**: Manage gallery categories
- **Access Logs**: View visitor information
- **Analytics**: Track gallery performance
- **Settings**: Change passwords and access gate settings

## License

Private - All rights reserved.
