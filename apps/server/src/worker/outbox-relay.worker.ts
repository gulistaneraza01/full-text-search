import { prisma } from '../config/prisma';
import { enqueueProductSyncs } from '../queue/product-sync.queue';

const BATCH_SIZE = 500;
const IDLE_POLL_MS = 1000;
const ERROR_RETRY_MS = 5000;

// Moves product_outbox rows into the product-sync queue.
// Order is enqueue → delete: a crash in between only re-enqueues (harmless, jobs are idempotent);
// rows are never deleted before their job is safely in Redis.
async function relayBatch() {
  const rows = await prisma.productOutbox.findMany({ orderBy: { id: 'asc' }, take: BATCH_SIZE });
  if (rows.length === 0) return 0;

  await enqueueProductSyncs(rows.map((r) => r.productId));
  await prisma.productOutbox.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  return rows.length;
}

// Polls the outbox until stopped. Returns a stop function.
export function startOutboxRelay() {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    let delay = IDLE_POLL_MS;
    try {
      // Full batch means more is waiting: go again immediately.
      if ((await relayBatch()) === BATCH_SIZE) delay = 0;
    } catch (err) {
      console.error('outbox relay failed, retrying:', (err as Error).message);
      delay = ERROR_RETRY_MS;
    }
    if (!stopped) timer = setTimeout(tick, delay);
  };

  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
