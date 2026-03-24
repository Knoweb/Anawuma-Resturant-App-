require('dotenv').config();
const mysql = require('mysql2/promise');

async function activateRestaurant() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('✅ Connected to database');

    // Check current status
    console.log('\n📊 Current subscription status:');
    const [before] = await connection.execute(`
      SELECT restaurant_id, restaurant_name, subscription_status, subscription_expiry_date 
      FROM restaurant_tbl 
      WHERE restaurant_id = 1
    `);
    console.table(before);

    // Activate subscription for restaurant_id = 1 (SeaSpray Café)
    console.log('\n🔧 Activating subscription...');
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
    const expiryDate = futureDate.toISOString().split('T')[0];

    await connection.execute(`
      UPDATE restaurant_tbl 
      SET subscription_status = 'active',
          subscription_expiry_date = ?
      WHERE restaurant_id = 1
    `, [expiryDate]);

    // Show updated status
    console.log('\n📊 Updated subscription status:');
    const [after] = await connection.execute(`
      SELECT restaurant_id, restaurant_name, subscription_status, subscription_expiry_date 
      FROM restaurant_tbl 
      WHERE restaurant_id = 1
    `);
    console.table(after);

    console.log('\n✅ Restaurant subscription is now active!');
    console.log('👉 Try logging in again with test@housekeeping.com / test123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

activateRestaurant();
