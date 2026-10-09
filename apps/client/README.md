# client

Next.js 16 UI that runs one query against Postgres, Elasticsearch and OpenSearch and shows the results side by side, plus a product admin.

- **Search box** with Elasticsearch autocomplete, usable from the keyboard (↑ ↓ Enter Esc)
- **Engine switch:** Compare (all three), or Postgres, Elasticsearch or OpenSearch alone
- **Per engine:** result count, response time and a "fastest" badge
- **Sidebar facets:** category and price ranges, from Elasticsearch/OpenSearch aggregations
- **Highlighted matches** and pagination
- **URL holds all state** (`?q=&engine=&sort=&type=&minPrice=&maxPrice=&page=`), so any search can be bookmarked or shared

## Run

The API ([apps/server](../server)) must be running first.

```sh
bun install
bun dev            # http://localhost:3000
```

| Env var | Default | Used for |
|---|---|---|
| `API_URL` | `http://localhost:8000` | Express API base URL |

## How it talks to the API

- **Search results:** Server Components fetch them from `API_URL` on the Next.js server. All selected engines are queried in parallel, so if one fails the others' results still show.
- **Autocomplete:** runs in the browser and calls `/api/search/suggest`. `next.config.ts` rewrites `/api/*` to `API_URL`, so no CORS setup is needed.

## Structure

```
app/
  page.tsx                  page shell; reads searchParams inside <Suspense> (Cache Components)
  _lib/search.ts            types, URL ↔ state helpers, API fetch
  _components/
    search-form.tsx         client: search box, autocomplete, engine switch, sort
    results.tsx             server: engine columns, facets, active filters, pagination
    highlight.tsx           renders \u0002…\u0003 markers as <mark> without inserting raw HTML
  globals.css               color tokens (light + dark), Tailwind v4 theme
```

> This Next.js version has breaking changes from older releases. Read `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).
