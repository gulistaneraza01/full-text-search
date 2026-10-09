import { createWorker } from '../config/bullmq';
import { prisma } from '../config/prisma';
import {
  PRODUCT_SYNC_MAX_ATTEMPTS,
  PRODUCT_SYNC_QUEUE,
  type ProductSyncJob,
} from '../queue/product-sync.queue';
import { deleteProduct, indexProduct } from '../services/product-index.service';

export function startProductSyncWorker() {
  const worker = createWorker<ProductSyncJob>(PRODUCT_SYNC_QUEUE, async (job) => {
    const product = await prisma.products.findUnique({
      where: { id: job.data.id },
      select: { id: true, name: true, description: true, type: true, price: true, createdAt: true, modifiedAt: true },
    });
    if (product) await indexProduct(product);
    else await deleteProduct(job.data.id);
  });

  worker.on('failed', (job, err) => {
    console.error(
      `product-sync failed for ${job?.data.id} (attempt ${job?.attemptsMade}/${PRODUCT_SYNC_MAX_ATTEMPTS}):`,
      err.message,
    );
  });
  return worker;
}
