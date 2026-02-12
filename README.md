# Perth Sharehouse Manager

A comprehensive, production-ready web application for managing sharehouses in Perth, Western Australia.

## Features

### Property Management
- **Multi-house support**: Manage multiple properties from a single dashboard
- **Room & Bed hierarchy**: Houses → Rooms → Beds with individual pricing
- **Flexible pricing**: Set rent at house, room, or bed level
- **Occupancy tracking**: Real-time availability status

### Tenant Management
- **Full tenant profiles**: Personal info, emergency contacts, visa details
- **Document storage**: ID, contracts, and other documents in Supabase Storage
- **Status tracking**: Prospect → Active → Past tenant lifecycle
- **Candidate pipeline**: Track potential tenants through the application process

### Leasing
- **Reservations**: Book beds in advance before move-in
- **Flexible leases**: Fixed-term or ongoing agreements
- **Pro-rata calculations**: Automatic first/last week rent calculations
- **Contract generation**: Template-based contract PDFs

### Financial Management
- **Weekly rent system**: Perth-standard Monday-Sunday weeks
- **Automatic charge generation**: Weekly cron job creates rent charges
- **Payment tracking**: Record payments with auto-allocation to charges
- **Bond management**: Track deposits, deductions, and refunds
- **Bill splitting**: 5 modes - equal, by bed, by rent proportion, custom, usage-based

### Maintenance
- **Ticket system**: Create, assign, and track maintenance requests
- **Priority levels**: Low, Medium, High, Urgent
- **Photo attachments**: Document issues with photos
- **Status workflow**: Open → In Progress → Completed

### Analytics & Reporting
- **Occupancy rates**: By house and overall
- **Financial KPIs**: Revenue, collection rate, arrears
- **Tenant turnover**: Track move-ins and move-outs
- **Rent roll reports**: Weekly rent expectations

### Other Features
- **Cleaning roster**: Weekly rotation schedule
- **Key management**: Track key inventory and assignments
- **Alerts system**: Overdue rent, expiring leases, visa expiry
- **Public portal**: Show available beds to prospective tenants

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS
- **Storage**: Supabase Storage
- **Styling**: TailwindCSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Date handling**: date-fns with Australia/Perth timezone

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sharehouse-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

4. Set up the database:
```bash
# Using Supabase CLI
supabase db push

# Or run the migration manually in Supabase SQL Editor
# Copy contents of supabase/migrations/001_initial_schema.sql
```

5. (Optional) Seed the database:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Project Structure

```
├── app/
│   ├── (auth)/              # Auth pages (login)
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── houses/          # Property management
│   │   ├── tenants/         # Tenant management
│   │   ├── leases/          # Lease management
│   │   ├── payments/        # Payment tracking
│   │   ├── bills/           # Bill management
│   │   ├── maintenance/     # Maintenance tickets
│   │   ├── analytics/       # Reports & analytics
│   │   └── settings/        # App settings
│   ├── (public)/            # Public pages
│   │   └── availability/    # Public room listings
│   ├── api/
│   │   └── cron/            # Cron job endpoints
│   └── actions/             # Server actions
├── components/
│   ├── layout/              # Layout components
│   ├── providers/           # React providers
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── engines/             # Business logic
│   ├── services/            # Data access layer
│   ├── supabase/            # Supabase clients
│   └── utils.ts             # Utility functions
├── types/
│   └── database.ts          # TypeScript types
├── zod-schemas/
│   └── index.ts             # Zod validation schemas
└── supabase/
    └── migrations/          # Database migrations
```

## Cron Jobs

The application requires two cron jobs:

### Weekly Rent Generation (Mondays at 00:05 AWST)
```bash
curl -X POST https://your-domain/api/cron/weekly \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Daily Alert Checks (Daily at 06:00 AWST)
```bash
curl -X POST https://your-domain/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

Use Vercel Cron, GitHub Actions, or any cron service to schedule these.

## Role-Based Access

- **Admin**: Full access to all features
- **Manager**: Manage properties, tenants, and finances
- **Maintenance**: View tickets and update maintenance status

RLS policies enforce access control at the database level.

## Timezone

All dates and times use the `Australia/Perth` timezone (AWST/UTC+8).

The rent week runs Monday 00:00 to Sunday 23:59 AWST.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
