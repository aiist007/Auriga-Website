import { handleApply } from './apply.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/apply') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      return handleApply(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
