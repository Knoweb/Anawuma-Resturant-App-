require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('📊 Checking restaurant_tbl schema:');
    const [desc] = await connection.execute('DESCRIBE restaurant_tbl');
    console.table(desc.filter(col => col.Field === 'restaurant_id'));

    console.log('\n📊 Full restaurant_id column details:');
    const [info] = await connection.execute(`
      SELECT COLUMN_TYPE, DATA_TYPE, COLUMN_KEY, EXTRA 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'restaurant_tbl' AND COLUMN_NAME = 'restaurant_id'
    `, [process.env.DB_DATABASE || 'restaurant_db']);
    console.table(info);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSchema();
