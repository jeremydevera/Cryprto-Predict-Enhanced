/**
 * local server entry file, for local development
 */
import app from './app.js'
import { startPoller } from './services/telegramPoller.js'
import { paperTrader } from './services/paperTradingService.js'

/**
 * start server with port
 */
const PORT = Number(process.env.PORT) || 3016;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
  startPoller()
})

server.on('error', (err: unknown) => {
  const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: unknown }).code : undefined;
  if (code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT in .env to a free port.`);
    process.exit(1);
  }
  throw err;
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  paperTrader.flushSave().finally(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  paperTrader.flushSave().finally(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

export default app;
