import { Queue, Worker } from 'bullmq';
const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379), password: redisUrl.password || undefined };
export const notificationQueue = new Queue('assetra-notifications', { connection });

new Worker('assetra-notifications', async (job) => {
  if (job.name === 'warranty-reminder') console.info(`[Assetra] memproses pengingat garansi ${job.data.assetId}`);
  if (job.name === 'maintenance-reminder') console.info(`[Assetra] memproses pengingat maintenance ${job.data.assetId}`);
  return { processedAt: new Date().toISOString() };
}, { connection });

console.info('Assetra worker siap memproses antrean notifikasi.');
