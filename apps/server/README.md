# server

Express API on [Bun](https://bun.com) for product search and product CRUD.

- **Postgres** (via Prisma) is the source of truth, with its own full-text search.
- **Elasticsearch** is a search index kept in sync with Postgres.
- **Redis** (via BullMQ) carries the sync jobs.

## Setup

```sh
bun install
cp .env.example .env              # fill in the values below
bunx prisma migrate deploy        # create tables, search column, outbox trigger
bunx prisma generate              # generate the Prisma client into ./generated
bun run seed                      # load seed.csv into Postgres + Elasticsearch
bun run dev                       # http://localhost:8000
```

### Environment variables

| Variable | Example | Used for |
|---|---|---|
| `PORT` | `8000` | API port (defaults to 4000 if unset) |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` | Postgres (Prisma) |
| `REDIS` | `rediss://default:PASSWORD@HOST:6379` | BullMQ queues |
| `ELASTICSEARCH_URL` | `https://HOST:443` | Elasticsearch cluster |
| `ELASTICSEARCH_API_KEY` | `base64-api-key` | Elasticsearch auth |

The server refuses to start if `REDIS`, `ELASTICSEARCH_URL` or `ELASTICSEARCH_API_KEY` is missing. Bun loads `.env` automatically; Prisma's CLI loads it through `prisma7.config.ts`.

### Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start the API with file watching |
| `bun run start` | Start the API |
| `bun run seed` | **Reset** products: empties the table and recreates the Elasticsearch index, then loads `seed.csv` (10k rows) |
| `bun run studio` | Prisma Studio on http://localhost:5555 |

## API

Every JSON response uses the same shape: `{ "success": boolean, "data": ..., "error": string | null }`.

### Search

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/search/postgres` | Postgres full-text search |
| `GET` | `/api/search/elasticsearch` | Elasticsearch search, plus `facets` (category counts, price ranges) |
| `GET` | `/api/search/suggest?q=` | Autocomplete on product names (Elasticsearch) |

Search query parameters:

| Param | Required | Notes |
|---|---|---|
| `q` | yes | Up to 200 characters. Postgres accepts web-search syntax: `"phrase"`, `or`, `-exclude` |
| `type` | no | Exact category, e.g. `Footwear` |
| `minPrice`, `maxPrice` | no | Non-negative; `minPrice` must be ≤ `maxPrice` |
| `sort` | no | `relevance` (default), `price_asc`, `price_desc`, `newest` |
| `page` | no | Starts at 1; `page × pageSize` is capped at 10,000 |
| `pageSize` | no | 1–100, default 20 |

Each search response includes `engine`, `tookMs`, `total`, `page`, `pageSize` and `hits[]`. Each hit has `id`, `name`, `description`, `type`, `price`, `score` and `highlight`. Highlighted terms are wrapped in `\u0002 … \u0003` marker characters instead of HTML, so the client can render them safely.

```sh
curl 'http://localhost:8000/api/search/elasticsearch?q=boots&type=Footwear&minPrice=50&maxPrice=150&sort=price_asc'
```

### Products

| Method | Path | Body | Success |
|---|---|---|---|
| `GET` | `/api/products?page=1&pageSize=20` | – | `200` `{ items, total, page, pageSize }`, newest first |
| `GET` | `/api/products/:id` | – | `200` product |
| `POST` | `/api/products` | `{ name, description, type, price }` (all required) | `201` product |
| `PATCH` | `/api/products/:id` | any subset of those fields | `200` product |
| `DELETE` | `/api/products/:id` | – | `204` |

Validation errors return `400` with a message, and unknown IDs return `404`. Limits: `name` up to 200 characters, `description` up to 2,000, `type` up to 50, `price` from 0 to 1,000,000.

```sh
curl -X POST localhost:8000/api/products -H 'content-type: application/json' \
  -d '{"name":"Acme Trail Lantern","description":"A rugged camping lantern.","type":"Outdoors","price":19.5}'
```

> ⚠️ The product endpoints have no authentication or rate limiting yet.

### Health

`GET /api/health` returns `{ "status": "ok", "uptime": <seconds> }`.

## How Elasticsearch stays in sync

Postgres is the source of truth. Every write reaches Elasticsearch through this pipeline, whether it comes from the API, Prisma Studio or raw SQL:

```
INSERT / UPDATE / DELETE on products
  └─ trigger products_outbox (same transaction) → row in product_outbox
       └─ outbox relay (polls every 1s) → BullMQ "product-sync" job { id }
            └─ worker reads the product from Postgres
                 ├─ row exists → index it into Elasticsearch (full overwrite)
                 └─ row gone   → delete it from Elasticsearch

Every 15 min: the "product-reconcile" job compares Postgres with Elasticsearch
  and queues sync jobs for missing, outdated (modifiedAt differs) or orphaned docs.
```

- **No lost changes:** the outbox row is committed atomically with the product write. The relay deletes outbox rows only after their jobs are in Redis, so if Redis is down the rows wait and are retried.
- **Duplicates are harmless:** a job carries only the product ID, and the worker always writes Postgres's *current* state. Duplicate, retried or out-of-order jobs therefore can't leave stale data. Failed jobs retry 5 times with exponential backoff.
- **Delay:** a change takes about 1–3 seconds to appear in Elasticsearch search results. Postgres search sees it immediately.
- **Where it runs:** the relay and both workers start in-process from `index.ts`. In production you'd move them into a separate worker process.

## Search design

**Elasticsearch** (`src/search/`)

| Field | Indexed as | Used for |
|---|---|---|
| `name` | stemmed English + synonyms (synonyms applied only at search time) | main relevance, boosted ×3 |
| `name.plain` | lowercased, not stemmed | typo tolerance (`fuzziness: AUTO`) |
| `name.autocomplete` | 2–20 character prefixes of each word | autocomplete |
| `name.keyword` | exact keyword | exact match, sorting |
| `description` | stemmed English + synonyms | relevance |
| `type` | keyword | filter, category facet |
| `price` | float | filter, sort, price-range facet |

Changing analyzers or synonyms means recreating the index (`recreateProductIndex()`), then reloading the data, for example with `bun run seed`.

**Postgres**: `search_vector` is a generated `tsvector` column. It weights `name` as A, `description` as B and `type` as C, and has a GIN index. Queries use `websearch_to_tsquery` and `ts_rank`, and `ts_headline` for highlights. There's no typo tolerance and there are no synonyms.

## Project structure

```
index.ts                       entry: starts API, outbox relay, sync + reconcile workers
prisma/
  schema.prisma                Products, ProductOutbox
  migrations/                  includes hand-written SQL: tsvector column, outbox trigger
  seed.ts                      CSV → Postgres + Elasticsearch
seed.csv                       10,000 generated products
src/
  app.ts                       Express app, error handling
  routes/index.ts              all routes
  controllers/                 HTTP layer: validation, status codes
  services/                    product CRUD, Postgres/Elasticsearch search, index ops, reconcile
  search/
    indices/products.mapping.ts   Elasticsearch settings, analyzers, synonyms, mappings
    queries/                      productSearch, productSuggest, aggregations
  queue/                       BullMQ queues: product-sync, product-reconcile
  worker/                      outbox relay, sync worker, reconcile worker
  config/                      Prisma, Elasticsearch, BullMQ clients
  utils/                       env, request validation
```

## Gotchas

- **Prisma client output:** the client is generated into `./generated/prisma` (git-ignored). Run `bunx prisma generate` after any schema change.
- **Hand-written migration SQL:** Prisma doesn't model the `search_vector` generated column or the outbox trigger. Both live in migration SQL. Keep `@default(dbgenerated())` on `searchVector` in the schema, or Prisma will try to drop the column's expression.
- **Elasticsearch client under Bun:** the client uses `HttpConnection`, because the default Undici connection crashes under Bun.
- **Interactive migrations:** `prisma migrate dev` can stop and wait for input. Prefer `--create-only`, then `prisma migrate deploy`.
