import { default as cluster } from 'cluster';
import { default as worker } from 'worker_threads';
import { platform as detect } from 'os';
import { emitWarning } from 'process';

export const compat = () => {
  let workerThread = 0;
  let clusterThread = 0;

  try {
    workerThread = worker.threadId || 0;
  } catch {
    workerThread = 0;
  }

  try {
    clusterThread = (cluster.worker && cluster.worker.id) || 0;
  } catch {
    clusterThread = 0;
  }

  const platform = detect();

  if (platform !== 'linux') {
    const warning = 'Clustering only works on Linux and depends on its kernel features';
    const link = 'https://github.com/uNetworking/uWebSockets.js/discussions/214#discussioncomment-174403';

    if (workerThread === 1) {
      emitWarning(warning, {
        code: 'WORKER_THREADS',
        detail: link
      });
    }

    if (clusterThread === 1) {
      emitWarning(warning, {
        code: 'CLUSTER',
        detail: link
      });
    }
  }
};
