import { Worker, type Job } from "bullmq";
import type { ConnectionOptions, Queue } from "bullmq";
import { executionEngine } from "../ExecutionEngine.js";
import Config from "../../config.js";
import type { QueueJobData } from "../../types/engine.js";

export class ExecutionWorker {
  private readonly worker: Worker<QueueJobData>;

  constructor(
    private readonly queue: Queue<QueueJobData>,
    connection: ConnectionOptions,
  ) {
    this.worker = new Worker<QueueJobData>(
      Config.EXECUTION_QUEUE_NAME,
      (job: Job<QueueJobData>) => this.processJob(job),
      { connection, concurrency: 10 },
    );

    this.worker.on("failed", (job, err) => {
      console.error(`[Worker] BullMQ job ${job?.id} failed:`, err.message);
    });

    this.worker.on("completed", (job) => {
      console.log(`[Worker] BullMQ job ${job.id} completed`);
    });

    console.log(
      `[Worker] ExecutionWorker started, listening on queue "${Config.EXECUTION_QUEUE_NAME}" (concurrency=10)`,
    );
  }

  async close(): Promise<void> {
    await this.worker.close();
  }

  private async processJob(job: Job<QueueJobData>): Promise<void> {
    const { taskId } = job.data;
    await executionEngine.executeTask(taskId);
  }
}
