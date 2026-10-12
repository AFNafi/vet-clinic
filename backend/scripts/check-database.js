const oracledb = require('oracledb');
const { closeDatabase, getConnection, initializeDatabase } = require('../database');

async function checkDatabase() {
  try {
    await initializeDatabase();
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT SYS_CONTEXT('USERENV', 'SESSION_USER'),
                SYS_CONTEXT('USERENV', 'DB_NAME'),
                SYS_CONTEXT('USERENV', 'CON_NAME')
         FROM dual`,
        [],
        { outFormat: oracledb.OUT_FORMAT_ARRAY }
      );
      const [schemaName, databaseName, serviceName] = result.rows[0];
      console.log(`Oracle connection successful: ${schemaName}@${databaseName}/${serviceName}`);
    } finally {
      await connection.close();
    }
  } finally {
    await closeDatabase();
  }
}

checkDatabase().catch((error) => {
  console.error('Oracle connection check failed.', error);
  process.exitCode = 1;
});
