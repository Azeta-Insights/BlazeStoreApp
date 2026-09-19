import { createApp } from './createApp';

const app = createApp();

export default function handler(req: any, res: any) {
  // Resolve Vercel rewrites when using catch-all [...all]
  if (req.url && req.url.includes('[...all]')) {
    const match = req.query?.match || req.query?.all;
    if (match) {
      const subPath = Array.isArray(match) ? match.join('/') : match;
      req.url = '/api/' + subPath.replace(/^\/+/, '');
    } else if (req.headers && req.headers['x-matched-path']) {
      req.url = req.headers['x-matched-path'] as string;
    } else if (req.headers && req.headers['x-forwarded-url']) {
      try {
        const u = new URL(req.headers['x-forwarded-url'] as string, 'http://localhost');
        req.url = u.pathname;
      } catch {}
    }
  }

  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  return app(req, res);
}
