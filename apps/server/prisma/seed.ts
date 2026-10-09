// Seeds products from seed.csv into Postgres and Elasticsearch (same ids in both).
// Resets both stores first, so it's safe to re-run. Usage: bun run seed
import { prisma } from '../src/config/prisma';
import {
  bulkIndexProducts,
  recreateProductIndex,
} from '../src/services/product-index.service';

const BATCH_SIZE = 1000;
const CSV_PATH = new URL('../seed.csv', import.meta.url);

// Parses one CSV line: comma-separated, "quoted" fields with "" escapes, no newlines in fields.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      fields.push(field);
      field = '';
    } else field += c;
  }
  fields.push(field);
  return fields;
}

function readProducts(text: string) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (header !== 'name,description,type,price') {
    throw new Error(`Unexpected CSV header: ${header}`);
  }
  return lines.map((line, i) => {
    const [name, description, type, price] = parseCsvLine(line);
    const priceNum = Number(price);
    if (!name || !description || !type || !Number.isFinite(priceNum)) {
      throw new Error(`Invalid CSV row ${i + 2}: ${line}`);
    }
    return { id: crypto.randomUUID(), name, description, type, price: priceNum };
  });
}

async function main() {
  const products = readProducts(await Bun.file(CSV_PATH).text());
  console.log(`Parsed ${products.length} products from seed.csv`);

  await prisma.products.deleteMany();
  await recreateProductIndex();

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await prisma.products.createMany({ data: batch });

    // Read back so ES gets the DB-assigned createdAt/modifiedAt.
    const rows = await prisma.products.findMany({
      where: { id: { in: batch.map((p) => p.id) } },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        price: true,
        createdAt: true,
        modifiedAt: true,
      },
    });
    await bulkIndexProducts(rows);
    console.log(`Seeded ${Math.min(i + BATCH_SIZE, products.length)}/${products.length}`);
  }

  // Seed indexed ES directly, so the outbox rows its writes triggered are redundant.
  await prisma.productOutbox.deleteMany();
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
