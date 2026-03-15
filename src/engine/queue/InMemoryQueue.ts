import type { QueueJob } from "./types.js";

export class InMemoryQueue {
  private readonly jobs: QueueJob[] = [];

  enqueue(job: QueueJob): void {
    this.jobs.push(job);
  }

  dequeueNext(): QueueJob | undefined {
    return this.jobs.shift();
  }

  size(): number {
    return this.jobs.length;
  }
}
