require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifyTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('📊 Checking created tables:\n');

    // Check room_qr_tbl
    const [roomQr] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'room_qr_tbl'
    `, [process.env.DB_DATABASE || 'restaurant_db']);
    
    if (roomQr[0].count > 0) {
      console.log('✅ room_qr_tbl exists');
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM room_qr_tbl');
      console.log(`   Records: ${rows[0].count}`);
    } else {
      console.log('❌ room_qr_tbl does NOT exist');
    }

    // Check housekeeping_requests_tbl
    const [requests] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'housekeeping_requests_tbl'
    `, [process.env.DB_DATABASE || 'restaurant_db']);
    
    if (requests[0].count > 0) {
      console.log('✅ housekeeping_requests_tbl exists');
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM housekeeping_requests_tbl');
      console.log(`   Records: ${rows[0].count}`);
    } else {
      console.log('❌ housekeeping_requests_tbl does NOT exist');
    }

    console.log('\n✅ Migration verification complete!');
    console.log('👉 Refresh the browser - the Housekeeping page should now work!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyTables();
