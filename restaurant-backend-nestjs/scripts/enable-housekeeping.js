require('dotenv').config();
const mysql = require('mysql2/promise');

async function enableHousekeeping() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('✅ Connected to database');

    // Add enable_housekeeping column if it doesn't exist
    console.log('\n📝 Adding enable_housekeeping column...');
    
    try {
      await connection.execute(`
        ALTER TABLE restaurant_tbl
        ADD COLUMN enable_housekeeping TINYINT(1) DEFAULT 1 COMMENT 'Enable Housekeeping module'
      `);
      console.log('✅ Column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column already exists');
      } else {
        throw error;
      }
    }

    // Enable housekeeping for all restaurants
    console.log('\n🔧 Enabling housekeeping for all restaurants...');
    const [result] = await connection.execute(`
      UPDATE restaurant_tbl 
      SET enable_housekeeping = 1
    `);
    console.log(`✅ Updated ${result.affectedRows} restaurant(s)`);

    // Show current status
    console.log('\n📊 Current Restaurant Settings:');
    const [restaurants] = await connection.execute(`
      SELECT restaurant_id, enable_housekeeping 
      FROM restaurant_tbl
    `);
    
    console.table(restaurants);

    console.log('\n✅ Housekeeping module is now enabled!');
    console.log('👉 Please refresh your browser and log out/in to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Database connection closed');
    }
  }
}

enableHousekeeping();
