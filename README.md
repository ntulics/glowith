# Glowith

Glowith is a mobile-first social beauty marketplace MVP. It combines provider discovery, social portfolio browsing, messaging, booking management, deposit collection, location-aware search, and calendar/notification integration seams.

## Stack

- Next.js, React, TypeScript
- Tailwind CSS with ShadCN-style local UI primitives
- Framer Motion and Lucide icons
- PostgreSQL data model through Prisma
- API routes for providers, bookings, messages, maps, notifications, deposits, and calendar sync
- Azure-ready environment configuration for App Service, PostgreSQL, Azure Maps, and Azure Storage

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MVP Surface

- `GET /api/providers` supports query and category filtering.
- `POST /api/bookings` creates a pending booking and mock deposit intent.
- `GET|POST /api/messages` manages provider conversation previews.
- `POST /api/integrations/calendar` queues Google or Microsoft calendar sync.
- `POST /api/notifications/dispatch` routes WhatsApp, Postmark, SMTP2Go, or SMTP notifications.
- `GET /api/maps/search` returns Azure Maps-ready provider coordinates.

## Production Next Steps

- Connect Prisma repositories to Azure Database for PostgreSQL.
- Replace mock payment adapter with Yoco, Peach Payments, Adumo, and Tap to Pay adapters.
- Add NextAuth credentials and social providers, then Microsoft Entra External ID.
- Move uploaded portfolio media to Azure Storage with signed upload URLs.
- Add provider availability rules, cancellation policies, and deposit reconciliation.
