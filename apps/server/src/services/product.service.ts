import { prisma } from '../config/prisma';
import type { ProductInput } from '../utils/product-input';
import { enqueueProductSync } from '../queue/product-sync.queue';

// Never return the generated search_vector column.
const productSelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  price: true,
  createdAt: true,
  modifiedAt: true,
} as const;

const isNotFound = (err: unknown) => (err as { code?: string })?.code === 'P2025';

export async function listProducts(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.products.findMany({
      select: productSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.products.count(),
  ]);
  return { items, total, page, pageSize };
}

export function getProduct(id: string) {
  return prisma.products.findUnique({ where: { id }, select: productSelect });
}

export async function createProduct(input: ProductInput) {
  const product = await prisma.products.create({ data: input, select: productSelect });
  await enqueueProductSync(product.id);
  return product;
}

// Returns null when the product doesn't exist.
export async function updateProduct(id: string, input: Partial<ProductInput>) {
  try {
    const product = await prisma.products.update({ where: { id }, data: input, select: productSelect });
    await enqueueProductSync(id);
    return product;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// Returns false when the product doesn't exist.
export async function deleteProductById(id: string) {
  try {
    await prisma.products.delete({ where: { id } });
    await enqueueProductSync(id);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}
