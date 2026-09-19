'use strict';
module.exports = async (ctx, _config, { strapi }) => {
  const authorization = ctx.request.header.authorization || '';
  if (!authorization.startsWith('Bearer ')) return false;
  try {
    const token = await strapi
      .plugin('users-permissions')
      .service('jwt')
      .verify(authorization.slice(7));
    if (!token.id) return false;
    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: token.id }, populate: { role: true } });
    if (!user || user.blocked || user.role?.type !== 'business-manager')
      return false;
    ctx.state.manager = { id: user.id, username: user.username };
    return true;
  } catch {
    return false;
  }
};
