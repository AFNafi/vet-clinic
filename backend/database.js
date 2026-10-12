require('dotenv').config();

const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

function databaseConfiguration() {
  const { DB_USER: user, DB_PASSWORD: password, DB_CONNECT_STRING: connectString } = process.env;
  const missing = [
    ['DB_USER', user],
    ['DB_PASSWORD', password],
    ['DB_CONNECT_STRING', connectString]
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required Oracle configuration: ${missing.join(', ')}.`);
  }

  return { user, password, connectString };
}

async function initializeDatabase() {
  if (pool) return pool;

  pool = await oracledb.createPool({
    ...databaseConfiguration(),
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1
  });

  try {
    const connection = await pool.getConnection();
    try {
      await connection.execute('SELECT 1 FROM dual');
    } finally {
      await connection.close();
    }
  } catch (error) {
    await pool.close(0);
    pool = undefined;
    throw error;
  }

  return pool;
}

async function getConnection() {
  if (!pool) {
    throw new Error('Oracle has not been initialized. Start the backend before querying the database.');
  }
  return pool.getConnection();
}

async function closeDatabase() {
  if (!pool) return;
  const activePool = pool;
  pool = undefined;
  await activePool.close(10);
}

module.exports = { closeDatabase, getConnection, initializeDatabase };
