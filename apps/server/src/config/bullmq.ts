import { Queue, Worker, type Processor } from 'bullmq';
import { env } from '../utils/env';

// Shared connection options; BullMQ opens its own connection per Queue/Worker.
// maxRetriesPerRequest: null is required by BullMQ for workers.
export const connection = {
  url: env.required('REDIS'),
  maxRetriesPerRequest: null,
};

export const createQueue = <T = unknown>(name: string) =>
  new Queue<T>(name, { connection });

export const createWorker = <T = unknown>(
  name: string,
  processor: Processor<T>,
) => new Worker<T>(name, processor, { connection });
