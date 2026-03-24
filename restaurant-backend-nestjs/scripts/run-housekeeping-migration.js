require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../migrations/create-housekeeping-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📝 Creating housekeeping tables...');
    
    // Execute SQL
    await connection.query(sql);
    
    console.log('✅ Tables created successfully!');

    // Verify tables exist
    console.log('\n📊 Verifying tables:');
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE '%housekeeping%' OR SHOW TABLES LIKE '%room_qr%'
    `);
    
    // Check room_qr_tbl
    const [roomQrCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'room_qr_tbl'
    `, [process.env.DB_DATABASE || 'restaurant_db']);
    
    if (roomQrCheck[0].count > 0) {
      console.log('✅ room_qr_tbl exists');
      const [roomQrDesc] = await connection.execute('DESCRIBE room_qr_tbl');
      console.table(roomQrDesc.map(col => ({ Field: col.Field, Type: col.Type, Null: col.Null, Key: col.Key })));
    }

    // Check housekeeping_requests_tbl
    const [requestsCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'housekeeping_requests_tbl'
    `, [process.env.DB_DATABASE || 'restaurant_db']);
    
    if (requestsCheck[0].count > 0) {
      console.log('\n✅ housekeeping_requests_tbl exists');
      const [requestsDesc] = await connection.execute('DESCRIBE housekeeping_requests_tbl');
      console.table(requestsDesc.map(col => ({ Field: col.Field, Type: col.Type, Null: col.Null, Key: col.Key })));
    }

    console.log('\n✅ Database migration complete!');
    console.log('👉 Refresh the Housekeeping Messages page - it should work now!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql.substring(0, 200));
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTables();
