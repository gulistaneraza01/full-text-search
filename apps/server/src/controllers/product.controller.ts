import type { Request, Response } from 'express';
import {
  createProduct,
  deleteProductById,
  getProduct,
  listProducts,
  updateProduct,
} from '../services/product.service';
import { isUuid, parseProductInput } from '../utils/product-input';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data, error: null });
const fail = (res: Response, status: number, error: string) => res.status(status).json({ success: false, data: null, error });

function positiveInt(value: unknown, fallback: number, max: number) {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : undefined;
}

export async function list(req: Request, res: Response) {
  const page = positiveInt(req.query.page, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = positiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (!page) return fail(res, 400, 'page must be a positive integer');
  if (!pageSize) return fail(res, 400, `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  ok(res, await listProducts(page, pageSize));
}

export async function getOne(req: Request<{ id: string }>, res: Response) {
  const product = isUuid(req.params.id) ? await getProduct(req.params.id) : null;
  if (!product) return fail(res, 404, 'Product not found');
  ok(res, product);
}

export async function create(req: Request, res: Response) {
  const input = parseProductInput(req.body, false);
  if (!input.ok) return fail(res, 400, input.error);
  ok(res, await createProduct(input.value), 201);
}

export async function update(req: Request<{ id: string }>, res: Response) {
  if (!isUuid(req.params.id)) return fail(res, 404, 'Product not found');
  const input = parseProductInput(req.body, true);
  if (!input.ok) return fail(res, 400, input.error);
  const product = await updateProduct(req.params.id, input.value);
  if (!product) return fail(res, 404, 'Product not found');
  ok(res, product);
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  const deleted = isUuid(req.params.id) && (await deleteProductById(req.params.id));
  if (!deleted) return fail(res, 404, 'Product not found');
  res.status(204).end();
}
