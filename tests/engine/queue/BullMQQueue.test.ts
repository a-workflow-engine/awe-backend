import { BullMQQueue, EXECUTION_QUEUE_NAME } from "../../../src/engine/queue/BullMQQueue.js";

const mockQueueAdd = jest.fn().mockResolvedValue({});
const mockQueueClose = jest.fn().mockResolvedValue(undefined);

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    close: mockQueueClose,
  })),
  Worker: jest.fn(),
}));

describe("BullMQQueue", () => {
  let bullMQQueue: BullMQQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    bullMQQueue = new BullMQQueue({ host: "localhost", port: 6379 });
  });

  describe("enqueue()", () => {
    it("calls queue.add() with the job data and correct options", async () => {
      const job = {
        instanceId: "inst-1",
        nodeId: "node-1",
        context: { global: {}, next: {} },
      };
      await bullMQQueue.enqueue(job);
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "execute-node",
        job,
        expect.objectContaining({ jobId: "inst-1-node-1" }),
      );
    });

    it("sets jobId to instanceId-nodeId for deduplication", async () => {
      const job = { instanceId: "aaa", nodeId: "bbb", context: { global: {}, next: {} } };
      await bullMQQueue.enqueue(job);
      const callArgs = mockQueueAdd.mock.calls[0][2];
      expect(callArgs.jobId).toBe("aaa-bbb");
    });

    it("sets attempts: 3 and exponential backoff", async () => {
      await bullMQQueue.enqueue({ instanceId: "x", nodeId: "y", context: { global: {}, next: {} } });
      const opts = mockQueueAdd.mock.calls[0][2];
      expect(opts.attempts).toBe(3);
      expect(opts.backoff).toMatchObject({ type: "exponential" });
    });

    it("uses the EXECUTION_QUEUE_NAME constant as the queue name", () => {
      const { Queue } = jest.requireMock("bullmq");
      const constructorArgs = Queue.mock.calls[0][0];
      expect(constructorArgs).toBe(EXECUTION_QUEUE_NAME);
    });
  });

  describe("close()", () => {
    it("calls queue.close()", async () => {
      await bullMQQueue.close();
      expect(mockQueueClose).toHaveBeenCalledTimes(1);
    });
  });
});
