/** Worker thread: receives jobs, plays them, posts the results back. */
import { parentPort } from 'node:worker_threads';
import type { Job } from './jobs';
import { runJob } from './jobs';

if (!parentPort) throw new Error('worker.ts must run as a worker thread');
const port = parentPort;
port.on('message', (job: Job | 'stop') => {
  if (job === 'stop') {
    port.close();
    return;
  }
  try {
    port.postMessage({ ok: true, result: runJob(job) });
  } catch (err) {
    port.postMessage({ ok: false, error: err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err), job });
  }
});
