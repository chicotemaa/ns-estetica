module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
      jwt: { expiresIn: '8h' },
      register: { allowedFields: [] },
      ratelimit: { interval: 60000, max: 8 },
    },
  },
});
