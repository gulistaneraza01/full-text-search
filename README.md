# Full-Text Search: Postgres vs Elasticsearch

A monorepo that searches the same 10,000-product catalogue with **Postgres full-text search** and **Elasticsearch**, side by side. It includes a search API, a product CRUD API that keeps Elasticsearch in sync with Postgres, and a Next.js UI that compares both engines' results and speed.

```
┌──────────────┐   /api/*    ┌──────────────────────┐
│  apps/client │ ──────────► │  apps/server (API)   │
│  Next.js UI  │  (rewrite)  │  Express on Bun      │
└──────────────┘             └──┬────────┬───────┬──┘
                                │        │       │
                    source of   │        │       │ search index
                    truth       ▼        ▼       ▼
                         ┌──────────┐ ┌─────┐ ┌────────────────┐
                         │ Postgres │ │Redis│ │ Elasticsearch  │
                         │ (Neon)   │ │queue│ │ (Elastic Cloud)│
                         └──────────┘ └─────┘ └────────────────┘
```

| App | What it is | Docs |
|---|---|---|
| [`apps/server`](apps/server) | Express API: search (Postgres + Elasticsearch), autocomplete, product CRUD, Postgres → Elasticsearch sync | [server README](apps/server/README.md) |
| [`apps/client`](apps/client) | Next.js UI: one search box, results from both engines side by side, facets, autocomplete | [client README](apps/client/README.md) |
| `apps/docs`, `packages/*` | Unused leftovers from the Turborepo starter | – |

## Quick start

Prerequisites: [Bun](https://bun.com) 1.4+, plus a Postgres database, a Redis instance and an Elasticsearch 9 cluster (the project uses Neon, Upstash and Elastic Cloud, but any will do).

```sh
bun install

# 1. Configure the server
cp apps/server/.env.example apps/server/.env    # then fill in the values

# 2. Create the tables, then load 10k products into Postgres + Elasticsearch
cd apps/server
bunx prisma migrate deploy
bunx prisma generate
bun run seed
cd ../..

# 3. Run everything
bun run dev        # turbo: API on :8000, UI on :3000
```

Open http://localhost:3000 and try `wireless earbuds`, `skilet` (typo) or `trainers` (synonym).

## What to look at

| Topic | Where |
|---|---|
| Elasticsearch index: analyzers, synonyms, autocomplete, fuzzy field | `apps/server/src/search/indices/products.mapping.ts` |
| Elasticsearch queries: search, suggest, facets | `apps/server/src/search/queries/` |
| Postgres full-text search: generated `tsvector`, GIN index, `ts_rank` | `apps/server/src/services/product-pg-search.service.ts` + migrations |
| Keeping Elasticsearch in sync: outbox trigger → relay → queue → worker, plus reconcile | `apps/server/src/worker/`, `apps/server/src/queue/` |
| UI | `apps/client/app/` |

## Root scripts

| Command | What it does |
|---|---|
| `bun run dev` | Runs every app's `dev` script through Turborepo |
| `bun run build` | Builds all apps |
| `bun run lint` | Lints all apps |
| `bun run check-types` | Type-checks all apps |
| `bun run format` | Formats `ts`, `tsx` and `md` files with Prettier |
