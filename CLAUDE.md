# dispatch-core

Bulk email dispatch platform built on Laravel 12 with SendGrid Marketing Campaigns integration.

## Project Purpose

A web application for bulk email sending via SendGrid. Provides a dashboard with delivery stats, user/role management, email template management, CSV/Excel list uploads, and flexible scheduling.

## Tech Stack

### Backend
- **Laravel 12** — PHP ^8.2
- **Inertia.js** (`inertiajs/inertia-laravel ^2.0`) — server-driven SPA routing, no separate API layer
- **SendGrid Marketing Campaigns API** — bulk send, delivery tracking (undelivered, bounces, etc.)
- **Ziggy** (`tightenco/ziggy`) — exposes named Laravel routes to JS

### Frontend
- **React 19** with TypeScript — via `@inertiajs/react`
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** — component library built on Radix UI primitives (`components.json` present)
- **Lucide React** — icon set (`lucide-react`)
- **Vite 6** — asset bundler with `laravel-vite-plugin`

> **Note:** Redux and React Query are planned dependencies — add them as features require. Current `package.json` does not yet include them; install with `npm install @reduxjs/toolkit react-redux @tanstack/react-query`.

### Tooling
- **Laravel Pint** — PHP code style (PSR-12)
- **ESLint + Prettier** — JS/TS linting and formatting
- `npm run lint` / `npm run format` — fix JS/TS style
- `./vendor/bin/pint` — fix PHP style

## Project Structure

```
app/
  Http/
    Controllers/    # Inertia controllers
    Middleware/
    Requests/       # Form request validation
  Models/
  Providers/
resources/
  js/
    pages/          # Inertia page components (React)
    components/     # Shared UI components (shadcn + custom)
    layouts/        # App shell layouts
    hooks/          # Custom React hooks
    types/          # TypeScript type definitions
    lib/            # Utility helpers (cn, etc.)
    app.tsx         # Inertia client entrypoint
    ssr.jsx         # SSR entrypoint
  views/
    app.blade.php   # Root Blade template
routes/
  web.php           # Main routes
  auth.php          # Auth routes
  settings.php      # Settings routes
database/
  migrations/
  seeders/
  factories/
```

## Domain Concepts

### Roles
Three roles are enforced across the app:
- **Admin** — full access; manages users, roles, templates, and campaigns
- **Manager** — can manage templates and send campaigns; cannot manage users
- **User** — limited access; typically view-only or restricted send access

### Email Templates
- Stored in the database; created, edited, and deleted through the UI
- Selected when composing a bulk send campaign
- Support variable substitution for personalisation

### Email Lists
- Uploaded as **CSV or Excel** files containing recipient email addresses (and optional merge fields)
- Parsed server-side; stored temporarily or persisted per campaign

### Campaigns / Bulk Send
- Ties together: a template, an email list, sender identity, and a schedule
- Sent via SendGrid Marketing Campaigns API
- Stats (sent, delivered, undelivered, bounces, opens, clicks) pulled back from SendGrid and shown on the dashboard

### Scheduling
Options when creating a campaign:
- **Send now** — immediate dispatch
- **Daily** — recurring at a chosen time
- **Weekly** — recurring on a chosen day + time
- **Custom weekdays** — select specific days of the week + time
- **Custom datetime** — one-off future send

## Development Commands

```bash
# Install dependencies
composer install
npm install

# Start dev servers (Laravel + Vite)
composer run dev        # or: php artisan serve & npm run dev

# Build for production
npm run build

# Run migrations
php artisan migrate

# Run tests
php artisan test

# Code style
./vendor/bin/pint       # PHP
npm run format          # JS/TS (Prettier)
npm run lint            # JS/TS (ESLint)
```

## Environment Variables

Key `.env` values to configure:

```env
APP_NAME=dispatch-core
APP_URL=http://localhost

DB_CONNECTION=sqlite      # default; switch to mysql/postgres for production

SENDGRID_API_KEY=         # SendGrid API key with Marketing Campaigns permissions
SENDGRID_FROM_EMAIL=      # Verified sender email
SENDGRID_FROM_NAME=       # Verified sender name
```

## Conventions

- **Page components** live in `resources/js/pages/` and are named in `kebab-case.tsx` to match Inertia's render calls (`Inertia::render('dashboard')`)
- **shadcn components** are added via `npx shadcn@latest add <component>` — do not hand-write Radix primitives
- **Route model binding** and **Form Requests** are preferred over inline validation
- **Policies** enforce role-based access; check/add policies in `app/Policies/` before adding controller actions
- Gate/policy checks use the three roles: `admin`, `manager`, `user`
- SendGrid interactions are encapsulated in a dedicated service class (e.g., `app/Services/SendGridService.php`) — do not call the SendGrid SDK directly from controllers
