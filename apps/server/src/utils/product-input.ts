export type ProductInput = {
  name: string;
  description: string;
  type: string;
  price: number;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const LIMITS = { name: 200, description: 2000, type: 50 } as const;
const MAX_PRICE = 1_000_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (id: string) => UUID_RE.test(id);

function checkField(key: keyof ProductInput, value: unknown): string | undefined {
  if (key === 'price') {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_PRICE
      ? undefined
      : `price must be a number between 0 and ${MAX_PRICE}`;
  }
  const max = LIMITS[key];
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
    ? undefined
    : `${key} must be a non-empty string of at most ${max} characters`;
}

const FIELDS = ['name', 'description', 'type', 'price'] as const;

// Validates a request body. partial = true for PATCH (only provided fields, at least one).
export function parseProductInput(body: unknown, partial: false): Result<ProductInput>;
export function parseProductInput(body: unknown, partial: true): Result<Partial<ProductInput>>;
export function parseProductInput(body: unknown, partial: boolean): Result<Partial<ProductInput>> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const input = body as Record<string, unknown>;
  const value: Partial<ProductInput> = {};

  for (const key of FIELDS) {
    if (input[key] === undefined) {
      if (!partial) return { ok: false, error: `${key} is required` };
      continue;
    }
    const error = checkField(key, input[key]);
    if (error) return { ok: false, error };
    value[key] = (typeof input[key] === 'string' ? (input[key] as string).trim() : input[key]) as never;
  }

  if (partial && Object.keys(value).length === 0) {
    return { ok: false, error: `Provide at least one of: ${FIELDS.join(', ')}` };
  }
  return { ok: true, value };
}
