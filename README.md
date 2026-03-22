# AWE — Approval Workflow Engine · Backend

> A type-safe, queue-driven backend for designing, publishing, and executing multi-step approval workflows.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Available Scripts](#available-scripts)
9. [API Reference](#api-reference)
10. [Workflow Engine](#workflow-engine)
11. [Node Types](#node-types)
12. [Database Schema](#database-schema)
13. [Project Structure](#project-structure)
14. [Contributing](#contributing)
15. [License](#license)

---

## Overview

**AWE (Approval Workflow Engine)** is the backend service powering an approval-workflow platform. It lets organisations:

- **Model** complex approval processes as directed graphs of typed nodes.
- **Publish** versioned, validated workflow definitions.
- **Execute** those definitions as live instances — automatically progressing through decision, script, and service nodes, and pausing when human input is required.
- **Audit** every state transition for compliance and debugging.

The engine evaluates routing decisions with **FEEL** (Friendly Enough Expression Language), runs custom scripts via **JDoodle**, and processes every node execution through a **BullMQ / Redis** job queue for reliable, concurrent throughput.

---

## Features

| Area | Capability |
|---|---|
| **Workflow design** | Create multi-node workflows with start, end, decision, script, service, and user task nodes |
| **Versioning** | Draft → Valid → Published → Active lifecycle per workflow version |
| **Execution engine** | Queue-backed, transactional node execution with context propagation |
| **Decision logic** | FEEL expression evaluation for dynamic edge routing |
| **Script execution** | Run code snippets on external sandboxes via JDoodle API |
| **User tasks** | Pause execution pending human approval; resume when the task is completed |
| **Context management** | Typed variable scopes (`constants`, `fetchables`, `urls`) shared across nodes |
| **Multi-environment** | Each system has Development / Staging / Production environments |
| **Authentication** | JWT access + refresh tokens and API key authentication |
| **Validation** | Zod schema validation on all incoming request bodies and route params |
| **Soft deletes** | All entities use `is_deleted` / `deleted_on` flags rather than hard deletes |
| **Structured errors** | Typed error classes map to HTTP status codes via a global error middleware |
| **Test coverage** | Jest + Supertest integration test suite with markdown report generation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│          (Browser / Mobile / API Key consumer)          │
└───────────────────────┬─────────────────────────────────┘
                        │  HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                   Express HTTP API                       │
│  Routes → Controllers → Services → Repositories         │
│       (JWT / API Key middleware, Zod validation)         │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
       ┌───────────▼──────┐  ┌────────▼────────┐
       │   PostgreSQL DB  │  │  BullMQ Queue   │
       │  (Kysely ORM)    │  │  (Redis-backed) │
       └──────────────────┘  └────────┬────────┘
                                      │
                           ┌──────────▼──────────┐
                           │  Execution Worker    │
                           │  ┌────────────────┐ │
                           │  │ ExecutionEngine│ │
                           │  │ ┌────────────┐ │ │
                           │  │ │ Executors  │ │ │
                           │  │ │ Start      │ │ │
                           │  │ │ Decision   │ │ │
                           │  │ │ Script     │ │ │
                           │  │ │ Service    │ │ │
                           │  │ │ User Task  │ │ │
                           │  │ │ End        │ │ │
                           │  │ └────────────┘ │ │
                           │  └────────────────┘ │
                           └─────────────────────┘
```

### Request / execution flow

1. **API call** is authenticated (JWT or API Key) and validated (Zod).
2. The relevant **service** orchestrates business logic using **repositories** that speak to PostgreSQL via Kysely.
3. When a workflow instance is created or advanced, the service enqueues a **BullMQ job** carrying the `taskId`.
4. The **ExecutionWorker** picks up the job and calls `ExecutionEngine.runNode()`.
5. The engine resolves the correct **executor** for the node type, runs it inside a **database transaction**, and persists the new state.
6. If the instance is set to auto-advance, the engine enqueues the next node immediately; otherwise, the instance is paused until a human resumes it via the API.

---

## Tech Stack

| Category | Technology |
|---|---|
| **Language** | TypeScript 5.x (ESM, ES2020 target) |
| **Runtime** | Node.js |
| **HTTP framework** | Express 5 |
| **Database** | PostgreSQL via `pg` + **Kysely** type-safe query builder |
| **DB type generation** | `kysely-codegen` |
| **Job queue** | **BullMQ** 5 backed by **ioredis** |
| **Expression language** | **@bpmn-io/feelin** (FEEL evaluator) |
| **Auth** | **jsonwebtoken** (JWT) · **argon2** (password/key hashing) |
| **Validation** | **Zod** 4 |
| **HTTP client** | **axios** |
| **Testing** | **Jest** 30 + **ts-jest** + **supertest** |
| **Dev runner** | **tsx** (watch mode TypeScript executor) |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| PostgreSQL | ≥ 15 |
| Redis | ≥ 7 |

You will also need:
- A **JDoodle** account for script-node execution (free tier available at [jdoodle.com](https://www.jdoodle.com/))
- The database migrated / schema applied before starting the server

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/approval-workflow-engine/awe-backend.git
cd awe-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example below into a `.env` file at the project root and fill in your values (see [Environment Variables](#environment-variables) for details):

```bash
cp .env.example .env   # if an example file exists, otherwise create .env manually
```

### 4. Start the development server

```bash
npm run dev
```

The server starts with hot-reload via `tsx watch`. Default port is determined by your environment (commonly `3000` or `8080`).

### 5. Verify the server is running

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

---

## Environment Variables

Create a `.env` file at the project root with the following keys:

```ini
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/awe

# ── Frontend (CORS) ───────────────────────────────────────
FRONTEND_URL=http://localhost:3000

# ── JWT ───────────────────────────────────────────────────
JWT_ACCESS_SECRET=<run: npm run tokengen>
JWT_REFRESH_SECRET=<run: npm run tokengen>
JWT_ACCESS_EXPIRES_MINS=15
JWT_REFRESH_EXPIRES_DAYS=7

# ── API Keys ──────────────────────────────────────────────
API_KEY_PREFIX=awe_

# ── Redis / BullMQ ────────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# ── Execution queue ───────────────────────────────────────
EXECUTION_QUEUE_NAME=execution-queue

# ── JDoodle (script node execution) ───────────────────────
JDOODLE_CLIENT_ID=<your jdoodle client id>
JDOODLE_CLIENT_SECRET=<your jdoodle client secret>
```

> **Tip:** Generate cryptographically secure JWT secrets with:
> ```bash
> npm run tokengen
> ```

All variables listed above are **required**. The server will throw on startup if any are missing.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in watch / hot-reload mode (via `tsx`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run codegen` | Re-generate `src/types/database.ts` from the live DB schema |
| `npm run tokengen` | Print a random 32-byte hex string (useful for JWT secrets) |
| `npm test` | Run the full Jest test suite |
| `npm run test:watch` | Run tests in interactive watch mode |
| `npm run test:coverage` | Run tests and generate a coverage report |
| `npm run test:report` | Run tests and generate `test-report.md` |

---

## API Reference

All endpoints are prefixed with `/api/v1`. Every successful response is wrapped by the response formatter:

```json
{
  "success": true,
  "data": { }
}
```

Error responses follow:

```json
{
  "success": false,
  "message": "Human-readable description",
  "details": [ ]
}
```

---

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Server liveness check |

---

### Authentication — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/login` | — | Authenticate with email + password; returns `accessToken`, `refreshToken`, and system info |
| `POST` | `/refresh` | — | Exchange a valid refresh token for a new access token |
| `POST` | `/logout` | — | Invalidate the current refresh token |

---

### Systems & API Keys — `/api/v1/systems`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Register a new organisation and system; creates Dev / Staging / Prod environments automatically |
| `GET` | `/me` | ✅ JWT | Return the authenticated actor's system information |
| `GET` | `/api-keys` | ✅ JWT | List all API keys for the authenticated actor |
| `POST` | `/api-keys` | ✅ JWT | Generate a new API key |
| `PATCH` | `/api-keys/:keyId/revoke` | ✅ JWT | Revoke an existing API key |

---

### Workflows — `/api/v1/workflows`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create a new workflow |
| `GET` | `/` | ✅ | List all workflows |
| `GET` | `/:workflowId` | ✅ | Get workflow details including all versions |
| `PATCH` | `/:workflowId` | ✅ | Update workflow metadata (name, description) |
| `DELETE` | `/:workflowId` | ✅ | Soft-delete a workflow |
| `PATCH` | `/:workflowId/status` | — | Change workflow status |
| `POST` | `/validate` | — | Validate a workflow graph structure |

#### Workflow Versions — `/api/v1/workflows/:workflowId/versions`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create a new draft version (includes nodes and edges) |
| `GET` | `/:version` | ✅ | Retrieve a specific version |
| `PATCH` | `/:version` | ✅ | Update version details |
| `PATCH` | `/:version/status` | ✅ | Transition version status (`draft` → `valid` → `published` → `active`) |
| `POST` | `/:version/validate` | ✅ | Validate the version graph and mark it `valid` |

---

### Instances — `/api/v1/instances`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | List all workflow instances |
| `POST` | `/` | ✅ | Create and immediately start a new workflow instance |
| `GET` | `/:instanceId` | ✅ | Get an instance with its current execution state and context variables |
| `POST` | `/:instanceId/advance` | ✅ | Manually advance a paused instance to the next node |

---

### Tasks — `/api/v1/tasks`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | List all pending user tasks assigned to the authenticated actor |
| `GET` | `/:taskId` | ✅ | Get details of a specific task |
| `POST` | `/:taskId/complete` | ✅ | Submit task completion with output variables |

---

### Authentication methods

The auth middleware accepts either:

- **Bearer JWT** — `Authorization: Bearer <accessToken>`
- **API Key** — `Authorization: ApiKey <key>` (key is prefixed with the configured `API_KEY_PREFIX`)

---

## Workflow Engine

The execution engine is the core of AWE. It runs each node inside a **single database transaction** to guarantee consistency.

### Lifecycle of an instance

```
POST /instances
      │
      ▼
 Create Instance (status: in_progress)
      │
      ▼
 Enqueue START node task ──► BullMQ
                                │
                                ▼
                         ExecutionWorker
                                │
                          runNode(START)
                                │
                          ┌─────▼──────┐
                          │ auto_advance│
                          │  = true?   │
                          └─────┬──────┘
                          Yes   │   No
                          ──────┘   └──► status: paused
                          │             (awaits POST /advance)
                          ▼
                   Enqueue NEXT node
                          │
                          ▼
                     … repeats …
                          │
                          ▼
                    runNode(END)
                          │
                          ▼
                 status: completed ✅
```

### Context variables

Every instance carries a `current_variables` JSON object with three scopes:

| Scope | Purpose |
|---|---|
| `constants` | Named values produced or consumed by node executors (persisted across nodes) |
| `fetchables` | Keys that should be resolved by HTTP fetch before evaluation |
| `urls` | URL templates referenced by fetchables |

The `ContextManager.merge()` helper writes executor output variables into `constants`, merging with any existing values.

### Error handling

If a node executor throws, the instance is marked `failed` and execution stops. The error message is stored in the `TaskExecution` record for debugging.

---

## Node Types

| Type | Description | Key configuration |
|---|---|---|
| `start` | Entry point of every workflow. Copies instance `input_variables` into the execution context. | — |
| `end` | Terminal node. Finalises the instance with `output_variables`. | — |
| `decision` | Evaluates a FEEL expression against the current context and routes to the first matching edge. | `expression: string` |
| `script` | Executes arbitrary code via JDoodle and maps the result into context variables. | `language`, `script`, `versionIndex`, output variable mapping |
| `service` | Makes an HTTP call to an external service and maps the response into context variables. | `url`, `method`, `headers`, `body`, output variable mapping |
| `user` | Pauses the instance pending human input. Resumes when a user completes the task via `POST /tasks/:id/complete`. | `input_schema`, `output_schema` |

---

## Database Schema

Key entity relationships (simplified):

```
Organization
  └─► System
        └─► Environment
              └─► Workflow
                    └─► WorkflowVersion
                          ├─► Node (many)
                          └─► Edge (many, connects Nodes)

WorkflowVersion
  └─► Instance (execution)
        ├─► Task (one per node visit)
        │     └─► TaskExecution (one per attempt)
        └─► InstanceTransitionLog

Actor
  ├─► Organization (organization_account)
  └─► ApiKey        (api_key_client)
```

### Instance status flow

```
in_progress ──► paused ──► in_progress ──► completed
     │
     └──────────────────────────────────────► failed
     └──────────────────────────────────────► terminated
```

### Workflow version status flow

```
draft ──► valid ──► published ──► active
```

> **Note:** `src/types/database.ts` is auto-generated by `kysely-codegen`. Do **not** edit it manually — regenerate it after schema changes with `npm run codegen`.

---

## Project Structure

```
awe-backend/
├── src/
│   ├── index.ts                   # HTTP server entry point
│   ├── app.ts                     # Express app setup (routes, middleware)
│   ├── config.ts                  # Environment variable validation
│   ├── database.ts                # Kysely + pg Pool setup
│   │
│   ├── config/
│   │   ├── jdoodle.config.ts      # JDoodle API config
│   │   └── redis.ts               # ioredis connection options
│   │
│   ├── controllers/               # Route handlers (thin layer, delegates to services)
│   ├── routes/                    # Express Router definitions
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # JWT / API Key authentication
│   │   ├── error.middleware.ts    # Global error handler → structured JSON
│   │   └── responseFormatter.middleware.ts
│   │
│   ├── services/                  # Business logic
│   ├── repositories/              # Data access (Kysely queries, soft-delete helpers)
│   │
│   ├── engine/
│   │   ├── ExecutionEngine.ts     # Core node execution orchestrator
│   │   ├── ContextManager.ts      # Variable scope management
│   │   ├── queue/
│   │   │   ├── BullMQQueue.ts     # Job queue wrapper
│   │   │   └── ExecutionWorker.ts # BullMQ worker (concurrency: 10)
│   │   └── executors/
│   │       ├── BaseExecutor.ts
│   │       ├── StartNodeExecutor.ts
│   │       ├── EndNodeExecutor.ts
│   │       ├── DecisionNodeExecutor.ts
│   │       └── ScriptNodeExecutor.ts
│   │
│   ├── schemas/                   # Zod validation schemas
│   ├── types/
│   │   ├── database.ts            # ⚠ Auto-generated — do not edit
│   │   ├── models.ts              # Kysely Selectable type aliases
│   │   ├── enums.ts               # Status/type constants
│   │   ├── engine.ts              # ExecutorResult, ContextVariables, etc.
│   │   └── workflow.ts            # Workflow-specific types
│   │
│   ├── utils/
│   │   ├── contextResolver.ts     # Build FEEL evaluation context (incl. HTTP fetchables)
│   │   ├── feel.utils.ts          # FEEL expression helpers
│   │   ├── graph.utils.ts         # Graph traversal helpers
│   │   ├── converter.utils.ts     # JSON ↔ object conversions
│   │   └── inputValidator.utils.ts
│   │
│   └── errors/                    # Typed error classes (AppError, NotFoundError, …)
│
├── tests/                         # Jest + Supertest test suite
│   └── reporters/
│       └── generateReport.ts      # Produces test-report.md from test-report.json
│
├── .env                           # ⚠ Not committed — create from the template above
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow existing patterns:
   - **Controllers** are thin — delegate to services.
   - **Services** orchestrate business logic and pass an optional `Transaction<DB>` to repositories.
   - **Repositories** own all Kysely queries; soft-delete with `is_deleted = true`.
   - UUID route params are validated with `z.uuidv4()`.
   - All responses go through `responseFormatter` middleware.
3. Add or update tests in `tests/`.
4. Run `npm test` before submitting a PR.

---

## License

This project is licensed under the **ISC License**. See `package.json` for details.
