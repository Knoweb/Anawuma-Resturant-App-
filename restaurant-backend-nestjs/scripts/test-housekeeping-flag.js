require('dotenv').config();
const mysql = require('mysql2/promise');

async function testHousekeepingFlag() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('✅ Connected to database\n');

    // Check column exists
    console.log('📋 Checking if enable_housekeeping column exists:');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'restaurant_tbl' 
      AND COLUMN_NAME = 'enable_housekeeping'
    `, [process.env.DB_DATABASE || 'restaurant_db']);
    
    if (columns.length === 0) {
      console.log('❌ Column does NOT exist!');
      process.exit(1);
    }
    
    console.log('✅ Column exists:');
    console.table(columns);

    // Check actual values
    console.log('\n📊 Restaurant housekeeping settings:');
    const [restaurants] = await connection.execute(`
      SELECT restaurant_id, enable_housekeeping 
      FROM restaurant_tbl
    `);
    
    console.table(restaurants);

    // Check a specific restaurant (assumes restaurant_id = 1)
    console.log('\n🔍 Detailed check for restaurant_id = 1:');
    const [details] = await connection.execute(`
      SELECT * FROM restaurant_tbl WHERE restaurant_id = 1
    `);
    
    if (details.length > 0) {
      const restaurant = details[0];
      console.log('enable_housekeeping value:', restaurant.enable_housekeeping);
      console.log('Type:', typeof restaurant.enable_housekeeping);
      console.log('Truthy?', !!restaurant.enable_housekeeping);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testHousekeepingFlag();
