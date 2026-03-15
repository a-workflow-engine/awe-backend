import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import type { QueueJob } from "./types.js";

export const EXECUTION_QUEUE_NAME = "execution";

export class BullMQQueue {
  readonly queue: Queue<QueueJob>;

  constructor(connection: ConnectionOptions) {
    this.queue = new Queue<QueueJob>(EXECUTION_QUEUE_NAME, { connection });
  }

  async enqueue(job: QueueJob): Promise<void> {
    await this.queue.add("execute-node", job, {
      jobId: `${job.instanceId}-${job.nodeId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
