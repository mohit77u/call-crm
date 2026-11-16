import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../../config";
import { AppDataSource } from "../../database";
import { processLeadImport, markLeadImportFailed } from "./leads.service";

const QUEUE_NAME = "lead-imports";

let queue: Queue | null = null;
let worker: Worker | null = null;
let started = false;

export function importQueueEnabled() {
  return Boolean(config.redisUrl);
}

function connection() {
  // BullMQ requires maxRetriesPerRequest: null on the shared connection.
  return new IORedis(config.redisUrl!, { maxRetriesPerRequest: null });
}

export function getImportQueue() {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: connection() });
  return queue;
}

// jobId = import id keeps re-enqueues idempotent; attempts + exponential
// backoff plus BullMQ stalled-job recovery cover worker crashes/restarts.
export async function enqueueLeadImport(importId: number) {
  await getImportQueue().add(
    "process",
    { importId },
    {
      jobId: `import-${importId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    },
  );
  console.log(`[lead-imports] job enqueued: import-${importId}`);
}

export function startImportWorker() {
  if (started || !config.redisUrl) return;
  started = true;
  console.log("[lead-imports] worker started (Redis connected)");
  worker = new Worker(QUEUE_NAME, async (job) => {
    console.log(`[lead-imports] job started: ${job.id} (attempt ${job.attemptsMade + 1})`);
    const attempts = Number(job.opts.attempts ?? 1);
    await processLeadImport(Number(job.data.importId), { finalAttempt: job.attemptsMade + 1 >= attempts });
    console.log(`[lead-imports] job finished: ${job.id}`);
  }, {
    connection: connection(),
    concurrency: 2,
    // Lock is auto-renewed every 15s while the job runs; after a restart the
    // job is detected as stalled within ~1-1.5 min.
    lockDuration: 60 * 1000,
    lockRenewTime: 15 * 1000,
    stalledInterval: 15 * 1000,
    maxStalledCount: 20,
  });

  // Safety net: any import stuck on 'processing' whose job vanished or
  // permanently failed gets re-enqueued — imports are never lost.
  const sweep = async () => {
    try {
      const stuck = (await AppDataSource.query(
        `SELECT id FROM lead_imports WHERE status = 'processing' AND created_at < now() - interval '3 minutes'`,
      )) as { id: number }[];
      for (const row of stuck) {
        const jobId = `import-${row.id}`;
        const job = await getImportQueue().getJob(jobId);
        if (!job) {
          console.log(`[lead-imports] sweep: re-enqueueing lost job ${jobId}`);
          await enqueueLeadImport(row.id);
        } else {
          const state = await job.getState();
          if (state === "failed") {
            console.log(`[lead-imports] sweep: retrying failed job ${jobId}`);
            await job.retry();
            await AppDataSource.query("UPDATE lead_imports SET status = 'processing' WHERE id = $1", [row.id]);
          }
        }
      }
    } catch (e) {
      console.error("[lead-imports] sweep error:", e instanceof Error ? e.message : e);
    }
  };
  void sweep();
  setInterval(sweep, 5 * 60 * 1000).unref();
  worker.on("failed", (job, err) => {
    console.error(`[lead-imports] job ${job?.id} failed:`, err.message);
    // Only mark the import failed once BullMQ has exhausted all attempts —
    // earlier failures are retried automatically.
    const attempts = Number(job?.opts.attempts ?? 1);
    if (job && job.attemptsMade >= attempts) {
      void markLeadImportFailed(Number(job.data.importId), err.message).catch((e) =>
        console.error("[lead-imports] could not mark import failed:", e),
      );
    }
  });
  worker.on("error", (err) => {
    console.error("[lead-imports] worker error:", err.message);
  });
  worker.on("stalled", (jobId) => {
    console.warn(`[lead-imports] job stalled (worker restart/crash?): ${jobId}`);
  });
}
