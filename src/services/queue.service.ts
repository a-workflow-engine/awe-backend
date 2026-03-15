import { BullMQQueue } from "../engine/queue/BullMQQueue.js";
import { ExecutionWorker } from "../engine/queue/ExecutionWorker.js";
import type { QueueJob } from "../engine/queue/types.js";
import { redisConnectionOptions } from "../config/redis.js";

const bullMQQueue = new BullMQQueue(redisConnectionOptions);
let workerInstance: ExecutionWorker | null = null;

export const queueService = {
  enqueue: async (job: QueueJob): Promise<void> => {
    await bullMQQueue.enqueue(job);
  },

  startWorker: (): void => {
    workerInstance = new ExecutionWorker(bullMQQueue.queue, redisConnectionOptions);
  },

  stopWorker: async (): Promise<void> => {
    await workerInstance?.close();
    workerInstance = null;
    await bullMQQueue.close();
  },
};
