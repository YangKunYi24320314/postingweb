const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'campushub',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};
