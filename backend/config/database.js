module.exports = ({ env }) => {
  const databaseUrl = env('ESTETICA_DATABASE_URL');
  if (!databaseUrl) throw new Error('Falta ESTETICA_DATABASE_URL: la estética necesita una base PostgreSQL propia.');
  return ({
  connection: {
    client: 'postgres',
    connection: {
      connectionString: databaseUrl,
      ssl: env.bool('DATABASE_SSL', false) ? { rejectUnauthorized: true } : false,
    },
    pool: { min: 0, max: 8 },
  },
  });
};
