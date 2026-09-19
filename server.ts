import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/createApp';

dotenv.config();

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Vite Middleware Integration for development and static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BlazeStore Server] Running on port ${PORT} (host: 0.0.0.0)`);
  });
}

startServer().catch((err) => {
  console.error('[BlazeStore Server] Failed to start:', err);
});
