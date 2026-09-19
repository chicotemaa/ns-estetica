'use strict';
// Bounded per-process abuse control; database locking handles cross-process booking races.
module.exports = (config) => {
  const clients = new Map();
  return async (ctx, next) => {
    const now = Date.now();
    for (const [key, bucket] of clients)
      if (bucket.expires <= now) clients.delete(key);
    const key = ctx.request.ip;
    const bucket = clients.get(key) || { count: 0, expires: now + 60000 };
    if (
      bucket.count >= (config.max || 12) ||
      (!clients.has(key) && clients.size >= 10000)
    ) {
      ctx.status = 429;
      ctx.set('Retry-After', '60');
      ctx.body = {
        error: {
          message:
            'Demasiadas solicitudes. Esperá un minuto y volvé a intentar.',
        },
      };
      return;
    }
    bucket.count += 1;
    clients.set(key, bucket);
    await next();
  };
};
