# TaskPulse

> 🇹🇷 Bu dosyanın Türkçesi: [README-TR.md](README-TR.md)

**TaskPulse** is a modern, full-stack Task Management and Real-Time Notification platform built with NestJS 11, Next.js 16 (React 19), Drizzle ORM (PostgreSQL), and raw WebSockets with an automated background scheduler. The repository is structured as a clean **pnpm monorepo**.

---

## 🚀 Key Features

- **Full-Stack Monorepo**: Housing `apps/api` (NestJS REST & WebSocket API), `apps/web` (Next.js 16 App Router UI), and `packages/shared` (shared contracts, constants, types, and unified API client).
- **Real-Time Notifications & Background Scheduler**:
  - `@nestjs/schedule` cron scheduler (`NotificationsScheduler`) checks for due tasks every second.
  - PostgreSQL transaction with unique constraints (`(taskId, type)`) prevents duplicate notifications and handles race conditions safely.
  - Raw WebSocket (`ws://.../ws`) delivers instant `task.due` push alerts directly to the user's active session.
  - Client-side Web Audio API alarm sound (`alarm-sound`), interactive modal popup (`DueAlertModal`), and real-time unread badge counter (`NotificationBell`).
- **Task Management (Tasks CRUD)**:
  - Create, list, paginate, filter, inspect, and update tasks.
  - Status lifecycle management (`pending`, `in_progress`, `completed`) and soft deletes (`is_deleted`).
- **Dual-Transport JWT Authentication**:
  - **Web Client**: Secure `httpOnly`, `SameSite=Lax`, `Secure` cookies immune to XSS token theft (access token: 15 min, refresh token: 30 days).
  - **Mobile / External API Client**: Standard `Bearer` token header transport (`/api/v1/auth/mobile/*`).
  - Database-tracked token rotation, family-wide revocation on reuse detection, and a 10-second grace period for network races.
  - Role-based access control (RBAC: `admin`, `user`).
- **Modern Next.js 16 UI**:
  - Dedicated pages for Tasks, Task Details, Notifications, and Profile.
  - Route protection via Next.js `middleware.ts`.
  - Multi-language (i18n) support: Turkish (`TR`) and English (`EN`) through `LanguageContext`.
- **Media & Avatar Uploads**: Automated WebP re-encoding and EXIF metadata stripping via Sharp.
- **Observability & Logging**: Daily rotating and compressed log files using Winston (`app-%DATE%.log`, `error-%DATE%.log`).
- **Standardized API Envelope**: Unified response interceptor (`ResponseTransformInterceptor`), exception filter (`AllExceptionsFilter`), and interactive Swagger UI (`/api/docs`).

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 11 (v11.9.0 recommended)
- **Docker** & **Docker Compose**

### 1. Setup Instructions

```bash
# 1. Prepare environment variables
cp .env.example .env

# 2. Install all dependencies across the monorepo
pnpm install

# 3. Spin up the development database (PostgreSQL only)
docker compose -f docker-compose.dev.yml up -d

# 4. Build the shared package (api & web build against shared's dist)
pnpm --filter shared build

# 5. Apply database migrations
pnpm --filter api db:migrate

# 6. Start development servers (runs api on :3000 and web on :3001 in parallel)
pnpm dev
```

### 2. Creating the Initial User

You can create an initial administrator or user in two ways:

**Option A: Via CLI Script:**
```bash
pnpm --filter api user:create admin@example.com secret123 "Admin" admin
```

**Option B: Via Web UI:**
Visit [http://localhost:3001/register](http://localhost:3001/register) directly in your browser to sign up.

### 3. Service Access Points

| Service | URL | Description |
| --- | --- | --- |
| 🌐 **Web Application** | [http://localhost:3001](http://localhost:3001) | Next.js 16 front-end |
| 📚 **Swagger API Docs** | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Interactive API documentation (dev only) |
| 🩺 **Health Check** | [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) | API & DB health check |
| 🔌 **WebSocket Gateway** | `ws://localhost:3000/ws` | Real-time event gateway |

---

## 💻 Commands

| Command | Working Directory | Description |
| --- | --- | --- |
| `pnpm dev` | root | Runs `api` and `web` in parallel in development mode |
| `pnpm build` | root | Builds all packages (`shared`, `api`, `web`) |
| `pnpm check` | root | Runs TypeScript type checking across the workspace |
| `pnpm lint` | root | Runs ESLint |
| `pnpm format` | root | Formats code using Prettier |
| `pnpm --filter shared build` | packages/shared | Compiles the shared TypeScript package into `dist/` |
| `pnpm --filter api db:generate` | apps/api | Generates migration SQL files from Drizzle schema |
| `pnpm --filter api db:migrate` | apps/api | Executes pending Drizzle migrations |
| `pnpm --filter api db:studio` | apps/api | Launches Drizzle Studio database UI |
| `pnpm --filter api user:create <email> <pwd> <name> [role]` | apps/api | Creates a new user directly in the database |

---

## 🏛️ Project Architecture

```text
taskPulse/
├── apps/
│   ├── api/                     # NestJS 11 Backend Application
│   │   ├── src/
│   │   │   ├── main.ts          # Bootstrap: CORS, Cookie, Pipes, Filters, WS Adapter, Swagger
│   │   │   ├── app.module.ts    # Application module orchestration
│   │   │   ├── core/            # Infrastructure modules
│   │   │   │   ├── config/      # Joi schema validation & Winston configuration
│   │   │   │   ├── db/          # Drizzle ORM module, schemas, migrations
│   │   │   │   ├── health/      # DB ping health check endpoint
│   │   │   │   ├── http/        # Guards, decorators, filters, interceptors, pipes
│   │   │   │   ├── realtime/    # EventsGateway (Raw WebSocket server)
│   │   │   │   ├── security/    # TokenService (JWT signing & verification)
│   │   │   │   ├── storage/     # StorageService (Sharp WebP re-encoding & disk I/O)
│   │   │   │   └── utils/       # Utility helpers (bcrypt, duration parsing)
│   │   │   └── modules/         # Feature business logic modules
│   │   │       ├── auth/        # Auth, session management, cookie & bearer flows
│   │   │       ├── tasks/       # Tasks CRUD, status updates, pagination, soft deletes
│   │   │       ├── notifications/# Notifications & NotificationsScheduler (Cron)
│   │   │       ├── uploads/     # File & avatar upload endpoints
│   │   │       └── example/     # Starter reference module
│   │   └── Dockerfile           # API production Dockerfile
│   │
│   └── web/                     # Next.js 16 (React 19) Frontend Application
│       ├── src/
│       │   ├── app/             # Next.js App Router pages
│       │   │   ├── page.tsx     # Home / Task summary dashboard
│       │   │   ├── register/    # Login and Registration page
│       │   │   ├── tasks/       # Tasks listing & creation form
│       │   │   ├── tasks/[id]/  # Task detail, edit & deletion view
│       │   │   ├── notifications/# Notifications center & batch read
│       │   │   └── profile/     # User profile & avatar upload
│       │   ├── components/      # UI components (Navbar, TopBar, DueAlertModal, NotificationBell)
│       │   ├── context/         # React Context (LanguageContext: TR / EN)
│       │   ├── constants/       # UI texts & translations (ui.ts, ui.en.ts)
│       │   ├── hooks/           # Custom hooks (useTaskDueSocket)
│       │   ├── lib/             # API client, Web Audio alarm, formatters
│       │   └── middleware.ts    # Route protection & session checking middleware
│       └── .env.local           # Web environment variables
│
├── packages/
│   └── shared/                  # Shared Contract Library
│       ├── src/
│       │   ├── api-client/      # createApiClient (Web cookie) & createMobileApiClient (Bearer)
│       │   ├── constants/       # TASK_STATUSES, NOTIFICATION_TYPES, USER_ROLES, etc.
│       │   └── types/           # Task, Notification, User, ApiResponse interfaces
│       └── package.json
│
├── docker-compose.dev.yml       # Development PostgreSQL service
├── docker-compose.yml           # Production configuration (Traefik + API + Postgres)
└── pnpm-workspace.yaml          # pnpm workspace definition
```

### Two Core Architectural Rules

1. **Modules only import each other through `index.ts`**: Never import `modules/auth/auth.service` from `modules/tasks`; import from `modules/auth`.
2. **`core` never depends on feature modules**: Core provides foundational infrastructure and remains strictly agnostic of product domain logic.

---

## 🔔 Real-Time Task Due Notification Flow

```text
[User] -> Creates a Task (dueAt: Scheduled Time)
                   │
                   ▼ (Every second)
    [NotificationsScheduler (Cron)]
                   │
dueAt <= NOW && status != 'completed' && reminderSentAt == null
                   │
                   ▼ (Database Transaction)
  ┌────────────────────────────────────────────────────────┐
  │ 1. Set reminderSentAt = NOW on tasks table             │
  │ 2. Insert notification row with type 'task_due'        │
  └────────────────────────────────────────────────────────┘
                   │
                   ▼ (WebSocket)
          [EventsGateway.sendToUser]
                   │
                   ▼ 'task.due' Event
    [Next.js Client: useTaskDueSocket]
                   │
  ┌────────────────┴───────────────────────────────────────┐
  │ 🔊 playAlarmSound() -> Plays Web Audio alarm sound     │
  │ 💬 DueAlertModal    -> Pops up modal alert on screen   │
  │ 🔔 NotificationBell -> Increments unread counter badge │
  └────────────────────────────────────────────────────────┘
                   │
                   ▼ (User clicks notification)
  [PATCH /api/v1/notifications/:id/read] -> Redirects to Task Detail (/tasks/:id)
```

---

## 🔐 Authentication & Security

- **Web Clients**: All authentication state is carried in `httpOnly`, `SameSite=Lax`, `Secure` cookies (`access_token` and `refresh_token`). Tokens are never sent in the response body.
- **Mobile & External Clients**: Dedicated endpoints under `/api/v1/auth/mobile/*` return tokens in the response body for storage in secure vaults (Keychain / Keystore), sent via `Authorization: Bearer <token>`.
- **Token Rotation & Reuse Detection**: Every refresh rotates the token pair and invalidates the previous refresh token. If a previously consumed token is reused, all active tokens for that family are immediately revoked. A 10-second grace period prevents transient network race conditions from invalidating sessions accidentally.

---

## 📡 API Endpoints Summary

All feature endpoints are prefixed with `/api/v1`:

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — User registration (Cookie)
- `POST /api/v1/auth/login` — User sign-in (Cookie)
- `POST /api/v1/auth/refresh` — Token rotation (Cookie)
- `POST /api/v1/auth/logout` — Invalidate session and clear cookies
- `GET /api/v1/auth/me` — Authenticated user details
- `PATCH /api/v1/auth/me` — Update profile (name, surname, birthday)
- `POST /api/v1/auth/mobile/*` — Mobile Bearer token variants

### Tasks (`/api/v1/tasks`)
- `GET /api/v1/tasks` — List tasks with pagination & status filters (`page`, `limit`, `status`, `search`)
- `POST /api/v1/tasks` — Create a new task (`title`, `description`, `dueAt`)
- `GET /api/v1/tasks/:id` — Get task by ID
- `PATCH /api/v1/tasks/:id` — Update task details or status
- `DELETE /api/v1/tasks/:id` — Soft-delete task (`is_deleted = true`)

### Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications` — List notifications (paginated)
- `GET /api/v1/notifications/unread-count` — Count of unread notifications
- `PATCH /api/v1/notifications/:id/read` — Mark a single notification as read
- `PATCH /api/v1/notifications/read-all` — Mark all notifications as read

### Uploads (`/api/v1/uploads`)
- `POST /api/v1/uploads/image` — Upload image (converted to WebP via Sharp)
- Uploaded files are served statically from `/api/uploads/:userId/:filename`.

---

## 🗄️ Database & Drizzle ORM

Database schema files reside in `apps/api/src/core/db/schema/`:
- `users`: User credentials, profile data, roles.
- `tasks`: Tasks, status enum (`pending`, `in_progress`, `completed`), `due_at`, `reminder_sent_at`.
- `notifications`: Notifications linked to tasks, read status (`read_at`), notification type.
- `refresh_tokens`: Stored refresh tokens and families for reuse detection.

### Migration Commands

```bash
pnpm --filter api db:generate    # Generate SQL migrations from schema
pnpm --filter api db:migrate     # Apply migrations to database
pnpm --filter api db:studio      # Open Drizzle Studio web GUI
```

---

## 📦 Shared Library & API Client

`packages/shared` unifies types and API calls between frontend and backend:
- **Constants & Enums**: `TASK_STATUSES`, `NOTIFICATION_TYPES`, `USER_ROLES` shared across both sides.
- **Centralized API Client**:
  - `createApiClient` handles credentials and cookies automatically.
  - Automatically handles `401 Unauthorized` responses via single-flight refresh queue without duplicating refresh calls.

---

## 🌐 Internationalization (i18n)

TaskPulse features built-in multi-language support:
- `apps/web/src/context/language-context.tsx`: Manages active language state (`tr` or `en`) persistently.
- `apps/web/src/constants/ui.ts` & `ui.en.ts`: Complete translation dictionary for all UI text, modals, and notifications.

---

## 🚢 Production Deployment

Production is deployed using `docker-compose.yml`, which expects an external Traefik reverse proxy attached to the `traefik-net` network:

```bash
# 1. Fill in production secrets in .env
cp .env.example .env

# 2. Build and launch services
docker compose up -d --build

# 3. Run production database migrations
docker compose exec api node dist/core/db/migrate.js
```

---

## 📝 Commit Standards

Commits adhere to the **Conventional Commits** specification:
`<type>(<scope>): <description>`

- `feat`: New feature or endpoint
- `fix`: Bug fix
- `docs`: Documentation updates
- `refactor`: Code changes without functional differences
- `style`: Code style / formatting
- `chore`: Tooling, dependency, or config updates