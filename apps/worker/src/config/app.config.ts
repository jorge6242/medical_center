export const appConfig = () => ({
  worker: {
    port: Number(process.env['WORKER_PORT'] ?? 4001),
  },
});
