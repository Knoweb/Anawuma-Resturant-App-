require('dotenv').config();
const mysql = require('mysql2/promise');

async function addAllFeatureFlags() {
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

    // Add enable_steward column
    console.log('\n📝 Adding enable_steward column...');
    try {
      await connection.execute(`
        ALTER TABLE restaurant_tbl
        ADD COLUMN enable_steward TINYINT(1) DEFAULT 1 COMMENT 'Enable Steward module'
      `);
      console.log('✅ enable_steward column added');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  enable_steward already exists');
      } else {
        throw error;
      }
    }

    // Add enable_kds column
    console.log('\n📝 Adding enable_kds column...');
    try {
      await connection.execute(`
        ALTER TABLE restaurant_tbl
        ADD COLUMN enable_kds TINYINT(1) DEFAULT 1 COMMENT 'Enable Kitchen Display System'
      `);
      console.log('✅ enable_kds column added');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  enable_kds already exists');
      } else {
        throw error;
      }
    }

    // Add enable_reports column
    console.log('\n📝 Adding enable_reports column...');
    try {
      await connection.execute(`
        ALTER TABLE restaurant_tbl
        ADD COLUMN enable_reports TINYINT(1) DEFAULT 1 COMMENT 'Enable Reports module'
      `);
      console.log('✅ enable_reports column added');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  enable_reports already exists');
      } else {
        throw error;
      }
    }

    // Enable all features for all restaurants
    console.log('\n🔧 Enabling all features for all restaurants...');
    const [result] = await connection.execute(`
      UPDATE restaurant_tbl 
      SET enable_steward = 1, enable_kds = 1, enable_reports = 1
    `);
    console.log(`✅ Updated ${result.affectedRows} restaurant(s)`);

    // Show current status
    console.log('\n📊 Current Restaurant Feature Flags:');
    const [restaurants] = await connection.execute(`
      SELECT restaurant_id, restaurant_name, 
             enable_steward, enable_housekeeping, enable_kds, enable_reports 
      FROM restaurant_tbl
    `);
    
    console.table(restaurants);

    console.log('\n✅ All feature flag columns are now present!');
    console.log('👉 Backend should now start without errors.');

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

addAllFeatureFlags();
